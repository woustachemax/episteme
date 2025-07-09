import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";

async function callPythonAnalyzer(content: string) {
    try {
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:3000';
            
        const response = await fetch(`${baseUrl}/api/python/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.log("analyzer err:", error);
        return { error: "Failed to analyze content" };
    }
}

async function callPythonFactChecker(content: string) {
    try {
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:3000';
            
        const response = await fetch(`${baseUrl}/api/python/fact-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.log("fact check err:", error);
        return { error: "Failed to perform fact check" };
    }
}

export async function POST(req: NextRequest) {
    console.log("api");
    
    try {
        const { query } = await req.json();

        if (!query) {
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
            console.log("rate limit err");
        }

        if (!process.env.OPENAI_API_KEY) {
            console.log("no openai key");
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        console.log("openai");
        const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: SEARCH_SYSTEM_PROMPT,
            prompt: query
        });

        const [analysis, factCheck] = await Promise.all([
            callPythonAnalyzer(result.text),
            callPythonFactChecker(result.text)
        ]);

        console.log("success");
        return NextResponse.json({
            content: result.text,
            query,
            analysis,
            factCheck
        });

    } catch (error) {
        console.log("api err:", error instanceof Error ? error.message : "unknown");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}