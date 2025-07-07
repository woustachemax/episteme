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
    });
}

export async function POST(req: NextRequest) {
    const { query } = await req.json();
    const token = await getToken({ req });
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1";
    const userId = token?.id as string | undefined;
    const isLoggedIn = Boolean(userId);
    const identifier = userId || ip;

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

    const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: SEARCH_SYSTEM_PROMPT,
        prompt: query
    });

    let analysis = null;
    let factCheck = null;

    try {
        analysis = await callPythonAnalyzer(result.text);
    } catch (err: any) {
        console.error("Analyzer error:", err.message);
        analysis = { error: "Failed to analyze content" };
    }

    try {
        factCheck = await callPythonFactChecker(result.text);
    } catch (err: any) {
        console.error("Fact-check error:", err.message);
        factCheck = { error: "Failed to perform fact check" };
    }

    return NextResponse.json({
        content: result.text,
        query,
        analysis,
        factCheck
    });
}
