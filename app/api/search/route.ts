import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { searchWeb } from "@/lib/search-service";
import { resolveEntity } from "@/lib/entity-resolver";

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
        console.log('analysis broke');
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
        // Calculate confidence: more bias words = lower confidence
        // Base confidence starts at 1.0, decreases by 0.15 per bias word, minimum 0.1
        const confidence = Math.max(0.1, 1.0 - (biasCount * 0.15)); 
        
        return {
            factual_claims: factualClaims,
            bias_words_found: uniqueBias.map(({ word, category }) => ({ word, category })),
            bias_score: Math.round((1 - confidence) * 100) / 100,
            confidence_score: Math.round(confidence * 100) / 100,
            total_claims: claimMatches ? claimMatches.length : 0
        };
    } catch {
        console.log('fact check broke');
        return { error: "Failed to perform fact check" };
    }
}

export async function POST(req: NextRequest) {
    console.log("hit api");
    
    try {
        const { query } = await req.json();

        if (!query) {
            console.log('no query');
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.log("no gemini key");
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
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
            resolveEntity(query)
        ]);

        if (rateLimitResult.status === 'fulfilled') {
            const { allowed, remaining } = rateLimitResult.value;
            if (!allowed) {
                console.log('rate limited');
                return NextResponse.json(
                    { error: "Rate limit exceeded", remaining },
                    { status: 429 }
                );
            }
        } else {
            console.log("rate limit check failed, allowing request");
        }

        recordSearch({ userId, ipAddress: ip, query }).catch(err => 
            console.error("Failed to record search:", err)
        );

        const entity = entityInfo.status === 'fulfilled' 
            ? entityInfo.value 
            : { type: 'concept', confidence: 0, context: '', keywords: [], sources: [] };
        
        console.log("Entity resolved:", entity.type, "confidence:", entity.confidence);

        console.log("searching web for:", query);
        let searchResults: string;
        try {
            searchResults = await searchWeb(query, entity.sources);
            console.log("got search results, length:", searchResults.length);
        } catch (error) {
            console.error("Search failed:", error);
            return NextResponse.json(
                { error: "Failed to fetch web search results. Please try again." },
                { status: 500 }
            );
        }

        const enhancedPrompt = `Topic: ${query}

        ENTITY CLASSIFICATION:
        - Type: ${entity.type}
        - Confidence: ${entity.confidence}
        - Specific Context: ${entity.context}
        ${entity.keywords.length > 0 ? `- SEO Keywords to include: ${entity.keywords.join(', ')}` : ''}

        REAL-TIME WEB SEARCH RESULTS:
        ${searchResults}

        Generate a comprehensive, factually accurate, SEO-optimized Wikipedia-style article based on the entity type and verified sources above.`;

        console.log("calling gemini with real search data");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const response = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${SEARCH_SYSTEM_PROMPT}\n\n${enhancedPrompt}` }]
                }
            ]
        });
        
        const result = {
            text: response.response.text()
        };

        console.log("analyzing");
        const [analysis, factCheck] = await Promise.all([
            Promise.resolve(analyzeContent(result.text)),
            Promise.resolve(factCheckContent(result.text))
        ]);

        console.log("done");
        return NextResponse.json({
            content: result.text,
            query,
            analysis,
            factCheck,
            sources_count: searchResults.split('SOURCE').length - 1 
        });

    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}