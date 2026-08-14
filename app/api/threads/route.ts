import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import db from "@/lib/db";

const authorSelect = { select: { id: true, name: true } } as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleQuery = searchParams.get("articleQuery");

    if (!articleQuery) {
      return NextResponse.json({ error: "Article query required" }, { status: 400 });
    }

    const article = await db.article.findUnique({
      where: { query: articleQuery.toLowerCase() }
    });

    if (!article) {
      return NextResponse.json({ threads: [] });
    }

    const threads = await db.divergenceThread.findMany({
      where: { articleId: article.id },
      orderBy: { divergenceIndex: 'asc' },
      include: {
        posts: {
          where: { parentId: null },
          orderBy: { votes: 'desc' },
          include: {
            authorUser: authorSelect,
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                authorUser: authorSelect,
                replies: {
                  orderBy: { createdAt: 'asc' },
                  include: { authorUser: authorSelect }
                }
              }
            }
          }
        }
      }
    });

    const token = await getToken({ req }).catch(() => null);
    const userId = token?.id as string | undefined;

    let userVotes = new Map<string, number>();
    if (userId) {
      const postIds = threads.flatMap(t =>
        t.posts.flatMap(p => [p.id, ...p.replies.flatMap(r => [r.id, ...r.replies.map(gr => gr.id)])])
      );
      if (postIds.length > 0) {
        const votes = await db.postVote.findMany({
          where: { userId, postId: { in: postIds } }
        });
        userVotes = new Map(votes.map(v => [v.postId, v.value]));
      }
    }

    const withUserVote = <T extends { id: string }>(post: T) => ({
      ...post,
      userVote: userVotes.get(post.id) ?? 0
    });

    const shaped = threads.map(thread => ({
      id: thread.id,
      divergenceIndex: thread.divergenceIndex,
      claim: thread.claim,
      wikipediaSays: thread.wikipediaSays,
      independentSays: thread.independentSays,
      citationIndexes: thread.citationIndexes,
      posts: thread.posts.map(post => ({
        ...withUserVote(post),
        replies: post.replies.map(reply => ({
          ...withUserVote(reply),
          replies: reply.replies.map(withUserVote)
        }))
      }))
    }));

    return NextResponse.json({ threads: shaped });
  } catch (error) {
    console.error("Fetch threads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
