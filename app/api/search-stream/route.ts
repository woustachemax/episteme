import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { searchWeb } from "@/lib/search-service";
import { resolveEntity } from "@/lib/entity-resolver";
import { normalizeQuery } from "@/lib/query-normalizer";
import db from "@/lib/db";
function analyzeContent(content: string) {
    try {
        const nameMatches = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g);
        const names = nameMatches ? [...new Set(nameMatches)] : [];
        
        const dateMatches = content.match(/\b(?:\d{1,2}[/-])?(?:\d{1,2}[/-])?\d{2,4}\b/g);
        const dates = dateMatches ? [...new Set(dateMatches)] : [];
        
        const wordMatches = content.match(/\b\w+\b/g);
        const wordCount = wordMatches ? wordMatches.length : 0;
        
        return {
            names: names.slice(0, 10),
            dates: dates.slice(0, 10),
            word_count: wordCount
        };
    } catch {
        return { error: "Failed to analyze content" };
    }
}

function factCheckContent(content: string) {
    try {
        const biasWords = [
            'amazing', 'terrible', 'best', 'worst', 'incredible', 'awful',
            'fantastic', 'horrible', 'perfect', 'useless', 'revolutionary',
            'groundbreaking', 'devastating', 'brilliant'
        ];
        
        const claimMatches = content.match(/[^.!?]*(?:\d{4}|\$[\d,]+|\d+(?:,\d{3})*)[^.!?]*[.!?]/g);
        const factualClaims = claimMatches ? claimMatches.slice(0, 5) : [];
        
        const foundBias: string[] = [];
        biasWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(content)) {
                foundBias.push(word);
            }
        });
        
        const confidence = Math.max(0.3, 1.0 - (foundBias.length * 0.1));
        
        return {
            factual_claims: factualClaims,
            bias_words_found: foundBias,
            confidence_score: Math.round(confidence * 100) / 100,
            total_claims: claimMatches ? claimMatches.length : 0
        };
    } catch {
        return { error: "Failed to perform fact check" };
    }
}

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const normalizedQuery = await normalizeQuery(query);

        const cachedArticle = await db.article.findUnique({
            where: { query: normalizedQuery },
            include: {
                suggestions: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'desc' }
                }
            }
        }).catch(err => {
            console.error("Database error fetching article:", err);
            return null;
        });

        if (cachedArticle) {
            return NextResponse.json({
                content: cachedArticle.content,
                query: normalizedQuery,
                analysis: cachedArticle.analysis,
                factCheck: cachedArticle.factCheck,
                sources_count: cachedArticle.sourcesCount,
                cached: true,
                suggestions: cachedArticle.suggestions
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const token = await getToken({ req });
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                   req.headers.get("x-real-ip") ||
                   "127.0.0.1";
        
        const userId = token?.id as string | undefined;
        const isLoggedIn = Boolean(userId);
        const identifier = userId || ip;

        const [rateLimitResult, entityInfo] = await Promise.allSettled([
            canSearch(identifier, isLoggedIn),
            resolveEntity(normalizedQuery)
        ]);

        if (rateLimitResult.status === 'fulfilled') {
            const { allowed, remaining } = rateLimitResult.value;
            if (!allowed) {
                return NextResponse.json(
                    { error: "Rate limit exceeded", remaining },
                    { status: 429 }
                );
            }
        }

        recordSearch({ userId, ipAddress: ip, query: normalizedQuery }).catch(err => 
            console.error("Failed to record search:", err)
        );

        const entity = entityInfo.status === 'fulfilled' 
            ? entityInfo.value 
            : { type: 'concept', confidence: 0, context: '', keywords: [], sources: [] };

        let searchResults: string;
        try {
            searchResults = await searchWeb(normalizedQuery, entity.sources);
        } catch (error) {
            console.error("Search failed:", error);
            return NextResponse.json(
                { error: "Failed to fetch web search results. Please try again." },
                { status: 500 }
            );
        }

        const enhancedPrompt = `Topic: ${normalizedQuery}

        ENTITY CLASSIFICATION:
        - Type: ${entity.type}
        - Confidence: ${entity.confidence}
        - Specific Context: ${entity.context}
        ${entity.keywords.length > 0 ? `- SEO Keywords to include: ${entity.keywords.join(', ')}` : ''}

        REAL-TIME WEB SEARCH RESULTS:
        ${searchResults}

        Generate a comprehensive, factually accurate, SEO-optimized Wikipedia-style article based on the entity type and verified sources above.`;

        const result = await Promise.race([
            generateText({
                model: openai("gpt-4"),
                system: SEARCH_SYSTEM_PROMPT,
                prompt: enhancedPrompt,
                maxTokens: 4000
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout after 120 seconds")), 120000)
            )
        ]) as Awaited<ReturnType<typeof generateText>>;

        const analysis = analyzeContent(result.text);
        const factCheck = factCheckContent(result.text);
        const sourcesCount = searchResults.split('SOURCE').length - 1;

        await db.article.create({
            data: {
                query: normalizedQuery,
                content: result.text,
                analysis,
                factCheck,
                sourcesCount
            }
        }).catch(err => console.error("Failed to cache article:", err));

        return NextResponse.json({
            content: result.text,
            query: normalizedQuery,
            analysis,
            factCheck,
            sources_count: sourcesCount,
            cached: false,
            suggestions: []
        });

    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
