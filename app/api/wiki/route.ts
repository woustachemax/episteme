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
  }

  return null;
}

async function checkAIFactCheck(content: string, title: string, openaiKey: string): Promise<FactCheckResult | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checking assistant. Analyze the provided content and return a JSON object with: score (0-1, where 1 is fully factual), sources (array of claim sources if available), and summary (brief explanation).'
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent:\n${content.substring(0, 4000)}\n\nAnalyze this content for factual accuracy.`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (response.ok) {
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as { score?: number; sources?: string[]; summary?: string };
        return {
          provider: 'openai',
          score: parsed.score || 0.5,
          sources: parsed.sources || []
        };
      }
    }
  } catch (error) {
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query, useExternalFactCheck, useAIFactCheck, openaiKey } = await req.json() as { 
      query: string; 
      useExternalFactCheck?: boolean;
      useAIFactCheck?: boolean;
      openaiKey?: string;
    };

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

    recordSearch({ userId, ipAddress: ip, query }).catch(() => {});

    const result = await getWikiArticleWithBiasAnalysis(query);

    if (!result.success || !result.article || !result.biasAnalysis || !result.metadata || !result.formatted) {
      return NextResponse.json(
        { error: result.error || "Article not found" },
        { status: 404 }
      );
    }

    let article = result.article;
    const formatted = result.formatted;
    const biasAnalysis = result.biasAnalysis;
    const metadata = result.metadata;

    let factCheckProvider = 'local';
    let externalSources: string[] = [];
    
    if (useAIFactCheck && openaiKey) {
      const aiResult = await checkAIFactCheck(article.content, article.title, openaiKey);
      if (aiResult) {
        factCheckProvider = aiResult.provider;
        externalSources = aiResult.sources;
      }
    } else if (useExternalFactCheck) {
      const externalResult = await checkExternalFactCheck(article.content, article.title);
      if (externalResult) {
        factCheckProvider = externalResult.provider;
        externalSources = externalResult.sources;
      }
    }

    try {
      const existingArticle = await db.article.findUnique({
        where: { query: query.toLowerCase() }
      });

      if (existingArticle) {
        const approvedSuggestions = await db.articleSuggestion.findMany({
          where: { 
            articleId: existingArticle.id,
            status: 'APPROVED'
          }
        });

        if (approvedSuggestions.length > 0) {
          article.content = applyApprovedChanges(article.content as string, approvedSuggestions);
        }
      }

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
    }

    return NextResponse.json({
      content: article.content,
      formatted: {
        title: formatted.title,
        summary: formatted.summary,
        sections: formatted.sections.map(s => ({
          heading: s.heading,
          content: s.content
        })),
        keyFacts: formatted.keyFacts,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function applyApprovedChanges(content: any, suggestions: any): string {
  const contentStr: string = typeof content === 'string' ? content : String(content);
  let result: string = contentStr;
  
  if (Array.isArray(suggestions)) {
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i] as any;
      if (suggestion?.oldText && suggestion?.newText) {
        const oldStr = String((suggestion.oldText));
        const newStr = String((suggestion.newText));
        if (oldStr && result.indexOf(oldStr) !== -1) {
          result = result.split(oldStr).join(newStr);
        }
      }
    }
  }
  
  return result;
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
