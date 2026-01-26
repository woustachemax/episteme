import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getWikiArticleWithBiasAnalysis } from "@/lib/wiki-scraper";
import db from "@/lib/db";

interface FactCheckResult {
  provider: string;
  score: number;
  sources: string[];
}

async function checkExternalFactCheck(content: string, title: string): Promise<FactCheckResult | null> {
  const apiKey = process.env.EXTERNAL_FACTCHECK_API_KEY;
  const apiUrl = process.env.EXTERNAL_FACTCHECK_API_URL;

  if (!apiKey || !apiUrl) {
    return null; 
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, title })
    });

    if (response.ok) {
      const data = await response.json() as { score?: number; sources?: string[] };
      return {
        provider: 'external',
        score: data.score || 0.5,
        sources: data.sources || []
      };
    }
  } catch (error) {
    console.error('External fact-check request failed:', error);
  }

  return null;
}

export async function POST(req: NextRequest) {
  console.log("api call");
  
  try {
    const { query, useExternalFactCheck } = await req.json() as { query: string; useExternalFactCheck?: boolean };
    console.log("Query received:", query);

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const token = await getToken({ req }).catch(() => null);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
               req.headers.get("x-real-ip") ||
               "127.0.0.1";
    
    const userId = token?.id as string | undefined;
    const isLoggedIn = Boolean(userId);
    const identifier = userId || ip;

    const rateCheck = await canSearch(identifier, isLoggedIn).catch(() => ({ allowed: true, remaining: -1 }));
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", remaining: rateCheck.remaining },
        { status: 429 }
      );
    }

    recordSearch({ userId, ipAddress: ip, query }).catch(err => 
      console.error("Failed to record search:", err)
    );

    console.log("Fetching Wikipedia article...");
    const result = await getWikiArticleWithBiasAnalysis(query);

    if (!result.success || !result.article || !result.biasAnalysis || !result.metadata || !result.formatted) {
      return NextResponse.json(
        { error: result.error || "Article not found" },
        { status: 404 }
      );
    }

    const article = result.article;
    const formatted = result.formatted;
    const biasAnalysis = result.biasAnalysis;
    const metadata = result.metadata;

    let factCheckProvider = 'local';
    let externalSources: string[] = [];
    
    if (useExternalFactCheck) {
      const externalResult = await checkExternalFactCheck(article.content, article.title);
      if (externalResult) {
        factCheckProvider = externalResult.provider;
        externalSources = externalResult.sources;
      }
    }

    try {
      await db.article.upsert({
        where: { query: query.toLowerCase() },
        create: {
          query: query.toLowerCase(),
          content: article.content,
          sourcesCount: metadata.relatedTopics.length,
          analysis: JSON.stringify({
            title: formatted.title,
            summary: formatted.summary,
            sections: formatted.sections.length,
            neutralWords: biasAnalysis.neutralWords,
            suspiciousPatterns: biasAnalysis.suspiciousPatterns,
            confidence: biasAnalysis.confidence,
            categories: formatted.metadata.categories
          }),
          factCheck: JSON.stringify({
            provider: factCheckProvider,
            bias_words_found: biasAnalysis.biasWordsFound,
            bias_score: biasAnalysis.biasScore,
            confidence_score: biasAnalysis.confidence,
            summary: biasAnalysis.summary,
            total_bias_words: biasAnalysis.totalBiasWords,
            external_sources: externalSources
          })
        },
        update: {}
      });
    } catch (dbErr) {
      console.error("DB cache error:", dbErr);
    }

    return NextResponse.json({
      content: article.content,
      formatted: {
        title: formatted.title,
        summary: formatted.summary,
        sections: formatted.sections.map(s => ({
          heading: s.heading,
          content: s.content.substring(0, 500) 
        })),
        keyFacts: formatted.keyFacts.slice(0, 5),
        metadata: formatted.metadata
      },
      title: article.title,
      summary: article.summary,
      query,
      analysis: {
        names: formatted.metadata.categories.slice(0, 10),
        dates: formatted.metadata.categories.slice(0, 10),
        word_count: metadata.wordCount
      },
      factCheck: {
        provider: factCheckProvider,
        bias_words_found: biasAnalysis.biasWordsFound,
        bias_score: biasAnalysis.biasScore,
        confidence_score: biasAnalysis.confidence,
        total_claims: biasAnalysis.totalBiasWords,
        suspicious_patterns: biasAnalysis.suspiciousPatterns,
        summary: biasAnalysis.summary,
        external_sources: externalSources
      },
      metadata: {
        categories: metadata.categories,
        relatedTopics: metadata.relatedTopics,
        wordCount: metadata.wordCount,
        factCheckAvailable: {
          local: true,
          external: Boolean(process.env.EXTERNAL_FACTCHECK_API_KEY)
        }
      }
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
