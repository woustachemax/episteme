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