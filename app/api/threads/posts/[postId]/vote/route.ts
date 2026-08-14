import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import db from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { value } = await req.json() as { value?: number };

    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
    }

    const token = await getToken({ req }).catch(() => null);
    if (!token || !token.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = token.id as string;

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.postVote.findUnique({
        where: { postId_userId: { postId, userId } }
      });

      let delta: number;
      let userVote: number;

      if (!existing) {
        delta = value;
        userVote = value;
        await tx.postVote.create({ data: { postId, userId, value } });
      } else if (existing.value === value) {
        delta = -existing.value;
        userVote = 0;
        await tx.postVote.delete({ where: { id: existing.id } });
      } else {
        delta = value - existing.value;
        userVote = value;
        await tx.postVote.update({ where: { id: existing.id }, data: { value } });
      }

      const post = await tx.threadPost.update({
        where: { id: postId },
        data: { votes: { increment: delta } }
      });

      return { votes: post.votes, userVote };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
