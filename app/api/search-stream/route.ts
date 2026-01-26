import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
        const BIAS_WORDS = {
            positive: [
                'amazing', 'incredible', 'fantastic', 'brilliant', 'excellent', 'outstanding',
                'revolutionary', 'groundbreaking', 'remarkable', 'magnificent', 'superior',
                'best', 'greatest', 'perfect', 'unparalleled', 'legendary', 'iconic'
            ],
            negative: [
                'terrible', 'awful', 'horrible', 'dreadful', 'worst', 'useless', 'pathetic',
                'devastating', 'disastrous', 'inferior', 'failed', 'disaster', 'catastrophic',
                'atrocious', 'abysmal', 'execrable'
            ],
            opinion: [
                'believe', 'opinion', 'should', 'must', 'clearly', 'obviously', 'undoubtedly',
                'allegedly', 'reportedly', 'supposedly', 'claim', 'argued', 'insists'
            ]
        };
        
        const factualPatterns = [
            /(?:one of|among|considered|regarded as|widely|universally|generally).*?(?:best|greatest|top)/i,
            /(?:best|greatest|top).*?(?:of all time|ever|in history|in the world)/i,
            /(?:record|award|championship|title|achievement|accomplishment)/i,
            /(?:born|died|founded|established|created|invented).*?\d{4}/i,
            /(?:statistics|data|research|study|survey|report).*?(?:show|indicate|demonstrate)/i
        ];
        
        const claimMatches = content.match(/[^.!?]*(?:\d{4}|\$[\d,]+|\d+(?:,\d{3})*)[^.!?]*[.!?]/g);
        const factualClaims = claimMatches ? claimMatches.slice(0, 5) : [];
        
        const foundBias: Array<{ word: string; category: 'positive' | 'negative' | 'opinion'; context: string }> = [];
        
        Object.entries(BIAS_WORDS).forEach(([category, words]) => {
            words.forEach(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = [...content.matchAll(regex)];
                
                matches.forEach(match => {
                    if (!match.index) return;
                    
                    const start = Math.max(0, match.index - 50);
                    const end = Math.min(content.length, match.index + match[0].length + 50);
                    const context = content.substring(start, end).toLowerCase();
                    
                    const isFactual = factualPatterns.some(pattern => pattern.test(context));
                    
                    if (['best', 'greatest', 'worst', 'top'].includes(word.toLowerCase())) {
                        if (isFactual) {
                            return; 
                        }
                    }
                    
                    if (category === 'opinion' && isFactual) {
                        return; 
                    }
                    
                    foundBias.push({ 
                        word, 
                        category: category as 'positive' | 'negative' | 'opinion',
                        context: context.trim()
                    });
                });
            });
        });
        
        const uniqueBias = Array.from(
            new Map(foundBias.map(item => [item.word, item])).values()
        );
        
        const biasCount = uniqueBias.length;
        const confidence = Math.max(0.5, 1.0 - (biasCount * 0.05)); // Less harsh penalty
        
        return {
            factual_claims: factualClaims,
            bias_words_found: uniqueBias.map(({ word, category }) => ({ word, category })),
            confidence_score: Math.round(confidence * 100) / 100,
            total_claims: claimMatches ? claimMatches.length : 0
        };
    } catch {
        return { error: "Failed to perform fact check" };
    }
}

export async function POST(req: NextRequest) {
    console.log("api called");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Origin:", req.headers.get('origin'));
    console.log("Environment keys present:", {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasTavily: !!process.env.TAVILY_API_KEY,
      hasDB: !!process.env.DATABASE_URL
    });
    
    try {
        const { query } = await req.json();
        console.log("Query received:", query);

        if (!query) {
            console.log("No query provided");
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        let normalizedQuery: string;
        try {
            normalizedQuery = await normalizeQuery(query);
        } catch (error) {
            console.error("Query normalization failed, using original query:", error);
            normalizedQuery = query.trim().toLowerCase();
        }

        let cachedArticle = null;
        try {
            cachedArticle = await db.article.findUnique({
                where: { query: normalizedQuery },
                include: {
                    suggestions: {
                        where: { status: 'APPROVED' },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
        } catch (err) {
            console.error("Database error fetching article:", err);
        }

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

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }


        const token = await getToken({ req }).catch(err => {
            console.error("Token error:", err);
            return null;
        });
        
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
        let usedWebSearch = true;
        
        if (!process.env.TAVILY_API_KEY) {
            usedWebSearch = false;
            searchResults = `[Web search unavailable - using model knowledge only] 
Query: ${normalizedQuery}
Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Note: Use your training data and real-time knowledge to provide current information.`;
        } else {
            try {
                const searchTimeout = new Promise<string>((_, reject) => 
                    setTimeout(() => reject(new Error('Search timeout after 30 seconds')), 30000)
                );
                searchResults = await Promise.race([
                    searchWeb(normalizedQuery, entity.sources),
                    searchTimeout
                ]);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error("Web search failed:", errorMsg, error);
                usedWebSearch = false;
                searchResults = `[Web search unavailable - using model knowledge only] 
Query: ${normalizedQuery}
Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Note: Use your training data and real-time knowledge to provide current information.`;
            }
        }

        const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const enhancedPrompt = `Today's date: ${currentDate}
Topic: ${normalizedQuery}

        ENTITY CLASSIFICATION:
        - Type: ${entity.type}
        - Confidence: ${entity.confidence}
        - Specific Context: ${entity.context}
        ${entity.keywords.length > 0 ? `- SEO Keywords to include: ${entity.keywords.join(', ')}` : ''}

        ${usedWebSearch ? 'REAL-TIME WEB SEARCH RESULTS:' : 'FALLBACK MODE - USING MODEL KNOWLEDGE:'}
        ${searchResults}

        Generate a comprehensive, factually accurate, SEO-optimized Wikipedia-style article based on the entity type and ${usedWebSearch ? 'verified sources above' : 'your knowledge. Mark recent information (2025-2026) as current.'}.`;

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const result = await Promise.race([
            (async () => {
                const response = await model.generateContent({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: `${SEARCH_SYSTEM_PROMPT}\n\n${enhancedPrompt}` }
                            ]
                        }
                    ]
                });
                const text = response.response.text();
                return { text };
            })(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout after 110 seconds")), 110000)
            )
        ]) as { text: string };

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

        const response = NextResponse.json({
            content: result.text,
            query: normalizedQuery,
            analysis,
            factCheck,
            sources_count: sourcesCount,
            cached: false,
            suggestions: []
        });
        
        console.log("Generated response, adding CORS headers");
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        console.log("Response headers set:", {
          'Content-Type': response.headers.get('Content-Type'),
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
          'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
          'Content-Security-Policy-Report-Only': response.headers.get('Content-Security-Policy-Report-Only')
        });
        console.log("Sending response");
        
        return response;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("API_ERROR_OCCURRED");
        console.error("Timestamp:", new Date().toISOString());
        console.error("Message:", errorMsg);
        console.error("Stack:", errorStack);
        
        const errorResponse = NextResponse.json(
            { error: `Internal server error: ${errorMsg}` },
            { status: 500 }
        );
        
        errorResponse.headers.set('Access-Control-Allow-Origin', '*');
        errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        console.error("Error response headers set");
        
        return errorResponse;
    }
}

export async function OPTIONS(req: NextRequest) {
    console.log("=== CORS PREFLIGHT ===");
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
