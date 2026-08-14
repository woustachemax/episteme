import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canReply } from "@/lib/rate-limit";
import { generateAgentReply } from "@/lib/agent-threads";
import db from "@/lib/db";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { threadId, parentId, content } = await req.json() as {
      threadId?: string;
      parentId?: string;
      content?: string;
    };

    if (!threadId || !content || !content.trim()) {
      return NextResponse.json({ error: "threadId and content are required" }, { status: 400 });
    }

    const token = await getToken({ req }).catch(() => null);
    if (!token || !token.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = token.id as string;

    const rateCheck = await canReply(userId).catch(() => ({ allowed: true, remaining: -1 }));
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Reply limit reached for today", remaining: rateCheck.remaining },
        { status: 429 }
      );
    }

    const thread = await db.divergenceThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const humanPost = await db.threadPost.create({
      data: {
        threadId,
        parentId: parentId || null,
        authorType: 'HUMAN',
        authorUserId: userId,
        content: content.trim()
      },
      include: { authorUser: { select: { id: true, name: true } } }
    });

    const agentReply = await generateAgentReply(threadId, humanPost).catch((error) => {
      console.error("Agent reply generation failed:", error);
      return null;
    });

    return NextResponse.json({
      success: true,
      post: { ...humanPost, userVote: 0, replies: [] },
      agentReply: agentReply ? { ...agentReply, userVote: 0, replies: [] } : null
    });
  } catch (error) {
    console.error("Create reply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
