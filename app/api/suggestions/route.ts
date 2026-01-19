import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { articleQuery, oldText, newText, reason } = await req.json();

        if (!articleQuery || !oldText || !newText || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const token = await getToken({ req });
        if (!token || !token.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }
        const userId = token.id as string;

        const article = await db.article.findUnique({
            where: { query: articleQuery }
        });

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        const suggestion = await db.articleSuggestion.create({
            data: {
                articleId: article.id,
                userId,
                oldText,
                newText,
                reason
            }
        });

        return NextResponse.json({ success: true, suggestion });
    } catch (error) {
        console.error("Suggestion error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const articleQuery = searchParams.get("articleQuery");

        if (!articleQuery) {
            return NextResponse.json({ error: "Article query required" }, { status: 400 });
        }

        const article = await db.article.findUnique({
            where: { query: articleQuery }
        });

        if (!article) {
            return NextResponse.json({ suggestions: [] });
        }

        const suggestions = await db.articleSuggestion.findMany({
            where: { articleId: article.id },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { votes: 'desc' }
        });

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Fetch suggestions error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { suggestionId, action } = await req.json();

        if (!suggestionId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const token = await getToken({ req });
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (action === 'vote') {
            const updated = await db.articleSuggestion.update({
                where: { id: suggestionId },
                data: { votes: { increment: 1 } }
            });
            return NextResponse.json({ success: true, suggestion: updated });
        }

        if (action === 'approve') {
            const updated = await db.articleSuggestion.update({
                where: { id: suggestionId },
                data: { status: 'APPROVED' }
            });
            return NextResponse.json({ success: true, suggestion: updated });
        }

        if (action === 'reject') {
            const updated = await db.articleSuggestion.update({
                where: { id: suggestionId },
                data: { status: 'REJECTED' }
            });
            return NextResponse.json({ success: true, suggestion: updated });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Update suggestion error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
