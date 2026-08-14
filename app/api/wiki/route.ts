import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getWikiArticleWithBiasAnalysis, analyzeBias, type FormattedContent } from "@/lib/wiki-scraper";
import { synthesizeResearch, type ResearchResult } from "@/lib/research-synthesis";
import { searchWebSources } from "@/lib/search-service";
import { persistSeedThreads } from "@/lib/agent-threads";
import db from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const maxDuration = 60;

type ArticleWithApprovedSuggestions = Prisma.ArticleGetPayload<{
  include: { suggestions: true };
}>;

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

    const normalizedQuery = query.toLowerCase();

    const existingArticle = await db.article.findUnique({
      where: { query: normalizedQuery },
      include: { suggestions: { where: { status: 'APPROVED' } } }
    }).catch((): ArticleWithApprovedSuggestions | null => null);

    const cachedResearchCandidate = existingArticle?.research as ResearchResult | null | undefined;
    const willUseCachedResearch = Boolean(cachedResearchCandidate && cachedResearchCandidate.sources?.length);
    const cachedFormatted = existingArticle?.formatted as FormattedContent | null | undefined;
    const hasFullCache = Boolean(
      existingArticle && willUseCachedResearch && cachedFormatted && !useAIFactCheck && !useExternalFactCheck
    );

    if (hasFullCache && existingArticle) {
      const content = existingArticle.suggestions.length > 0
        ? applyApprovedChanges(existingArticle.content, existingArticle.suggestions)
        : existingArticle.content;
      const biasAnalysis = analyzeBias(content);
      const formatted = cachedFormatted!;

      return NextResponse.json({
        content,
        formatted,
        title: formatted.title,
        summary: formatted.summary,
        query,
        analysis: {
          names: formatted.metadata.categories.slice(0, 10),
          dates: formatted.metadata.categories.slice(0, 10),
          word_count: formatted.metadata.wordCount
        },
        factCheck: {
          provider: 'local',
          bias_words_found: biasAnalysis.biasWordsFound,
          bias_score: biasAnalysis.biasScore,
          confidence_score: biasAnalysis.confidence,
          total_claims: biasAnalysis.totalBiasWords,
          suspicious_patterns: biasAnalysis.suspiciousPatterns,
          summary: biasAnalysis.summary,
          external_sources: []
        },
        metadata: {
          categories: formatted.metadata.categories,
          relatedTopics: formatted.metadata.relatedTopics,
          wordCount: formatted.metadata.wordCount,
          factCheckAvailable: {
            local: true,
            external: Boolean(process.env.EXTERNAL_FACTCHECK_API_KEY)
          }
        },
        research: cachedResearchCandidate,
        cached: true
      });
    }

    const searchPromise = willUseCachedResearch
      ? Promise.resolve([])
      : searchWebSources(query).catch(() => []);

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

    if (existingArticle?.suggestions && existingArticle.suggestions.length > 0) {
      article.content = applyApprovedChanges(article.content as string, existingArticle.suggestions);
    }

    const research: ResearchResult = willUseCachedResearch
      ? cachedResearchCandidate!
      : await synthesizeResearch(query, article, await searchPromise).catch((error) => {
          console.error("Research synthesis failed:", error);
          const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`;
          return {
            synthesis: '',
            sources: [{ index: 1, type: 'wikipedia' as const, title: article.title, url: wikipediaUrl }],
            divergences: []
          };
        });

    const responseFormatted = {
      title: formatted.title,
      summary: formatted.summary,
      sections: formatted.sections.map(s => ({
        heading: s.heading,
        content: s.content
      })),
      keyFacts: formatted.keyFacts,
      metadata: formatted.metadata
    };

    try {
      const upsertedArticle = await db.article.upsert({
        where: { query: normalizedQuery },
        create: {
          query: normalizedQuery,
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
          }),
          research: research as object,
          formatted: responseFormatted as object
        },
        update: willUseCachedResearch ? { formatted: responseFormatted as object } : { research: research as object, formatted: responseFormatted as object }
      });

      if (!willUseCachedResearch) {
        await persistSeedThreads(upsertedArticle.id, research.divergences).catch((error) => {
          console.error("Failed to seed divergence threads:", error);
        });
      }
    } catch (dbErr) {
    }

    return NextResponse.json({
      content: article.content,
      formatted: responseFormatted,
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
      },
      research,
      cached: willUseCachedResearch
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
