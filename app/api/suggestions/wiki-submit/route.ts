import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { articleQuery, oldText, newText, reason } = await req.json();

    if (!articleQuery || !oldText || !newText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = await getToken({ req });
    if (!token || !token.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const article = await db.article.findUnique({
      where: { query: articleQuery.toLowerCase() }
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const suggestion = await db.articleSuggestion.create({
      data: {
        articleId: article.id,
        userId: token.id as string,
        oldText,
        newText,
        reason: reason || "Community suggestion via Episteme - submitted to Wikipedia"
      }
    });

    const baseUrl = process.env.WIKIPEDIA_API_URL || "https://en.wikipedia.org";

    try {
      const wikiResponse = await fetch(`${baseUrl}/w/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'edit',
          title: article.query,
          appendtext: `\n<!-- Episteme suggestion from user: ${token.name || 'Anonymous'} -->\n<!-- Change: ${reason || 'Community improvement'} -->\n`,
          format: 'json',
          token: process.env.WIKIPEDIA_EDIT_TOKEN || ''
        }).toString()
      });

      const wikiData = await wikiResponse.json();

      if (!process.env.WIKIPEDIA_EDIT_TOKEN) {
        return NextResponse.json({
          success: true,
          suggestion,
          note: 'Suggestion queued. Wikipedia submission requires authentication token. Admin review needed.'
        });
      }

      return NextResponse.json({
        success: true,
        suggestion,
        wikiStatus: wikiData?.edit?.result === 'Success' ? 'submitted' : 'queued'
      });
    } catch (wikiErr) {
      console.error('Wiki API error:', wikiErr);
      return NextResponse.json({
        success: true,
        suggestion,
        note: 'Suggestion saved. Direct Wikipedia submission failed - queued for admin review.'
      });
    }
  } catch (error) {
    console.error("Wiki submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
