import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { spawn } from "child_process";
import path from "path";

function callPythonAnalyzer(content: string) {
    return new Promise((resolve, reject) => {
        const pythonPath = path.join(process.cwd(), "python/services/content_analyzer.py");
        const python = spawn("python3", [pythonPath, "--content", content]);

        let result = "";
        let error = "";

        python.stdout.on("data", (data) => {
            result += data.toString();
        });

        python.stderr.on("data", (data) => {
            error += data.toString();
        });

        python.on("close", (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(result));
                } catch {
                    reject(new Error("Failed to parse Python output (analyzer)"));
                }
            } else {
                reject(new Error(error || "Python analyzer script failed"));
            }
        });

        python.on("error", (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });
    });
}

function callPythonFactChecker(content: string) {
    return new Promise((resolve, reject) => {
        const pythonPath = path.join(process.cwd(), "python/services/fact_checker.py");
        const python = spawn("python3", [pythonPath, "--content", content]);

        let result = "";
        let error = "";

        python.stdout.on("data", (data) => {
            result += data.toString();
        });

        python.stderr.on("data", (data) => {
            error += data.toString();
        });

        python.on("close", (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(result));
                } catch {
                    reject(new Error("Failed to parse Python output (fact-checker)"));
                }
            } else {
                reject(new Error(error || "Python fact-checker script failed"));
            }
        });

        python.on("error", (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });
    });
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
        } catch (rateLimitError) {
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

        let analysis = null;
        try {
            analysis = await callPythonAnalyzer(result.text);
        } catch (err: any) {
            console.log("analyzer err");
            analysis = { error: "Failed to analyze content" };
        }

        let factCheck = null;
        try {
            factCheck = await callPythonFactChecker(result.text);
        } catch (err: any) {
            console.log("fact check err");
            factCheck = { error: "Failed to perform fact check" };
        }

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