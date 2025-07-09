import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";

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

        const token = await getToken({ req });
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                   req.headers.get("x-real-ip") ||
                   "127.0.0.1";
        
        const userId = token?.id as string | undefined;
        const isLoggedIn = Boolean(userId);
        const identifier = userId || ip;

        try {
            const { allowed, remaining } = await canSearch(identifier, isLoggedIn);

            if (!allowed) {
                console.log('rate limited');
                return NextResponse.json(
                    { error: "Rate limit exceeded", remaining },
                    { status: 429 }
                );
            }

            await recordSearch({
                userId,
                ipAddress: ip,
                query
            });
        } catch {
            console.log("rate limit broke");
        }

        if (!process.env.OPENAI_API_KEY) {
            console.log("no openai key");
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        console.log("calling openai");
        const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: SEARCH_SYSTEM_PROMPT,
            prompt: query
        });

        console.log("analyzing");
        const analysis = analyzeContent(result.text);
        const factCheck = factCheckContent(result.text);

        console.log("done");
        return NextResponse.json({
            content: result.text,
            query,
            analysis,
            factCheck
        });

    } catch (error) {
        console.log("err cus of api");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}