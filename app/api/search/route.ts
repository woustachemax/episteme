import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
import { canSearch, recordSearch } from "@/lib/rate-limit";
// import { middleware } from "@/middleware";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
    const { query } = await req.json();
    const token = await getToken({ req });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
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

  return NextResponse.json({
    content: result.text,
    query
  });
}
