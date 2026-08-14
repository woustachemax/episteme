import { AGENT_REPLY_PROMPT } from "@/lib/prompts";
import { generateJson } from "@/lib/llm";
import db from "@/lib/db";
import type { ResearchDivergence } from "@/lib/research-synthesis";
import type { ThreadPost } from "@prisma/client";

export async function persistSeedThreads(articleId: string, divergences: ResearchDivergence[]): Promise<void> {
  for (let index = 0; index < divergences.length; index++) {
    const divergence = divergences[index];
    try {
      const thread = await db.divergenceThread.upsert({
        where: { articleId_divergenceIndex: { articleId, divergenceIndex: index } },
        create: {
          articleId,
          divergenceIndex: index,
          claim: divergence.claim,
          wikipediaSays: divergence.wikipediaSays,
          independentSays: divergence.independentSays,
          citationIndexes: divergence.citationIndexes
        },
        update: {}
      });

      const existingPostCount = await db.threadPost.count({ where: { threadId: thread.id } });
      if (existingPostCount === 0 && divergence.agentPosts.length > 0) {
        await db.threadPost.createMany({
          data: divergence.agentPosts.map(post => ({
            threadId: thread.id,
            authorType: 'AGENT' as const,
            agentName: post.agentName,
            agentStance: post.agentStance,
            content: post.content
          }))
        });
      }
    } catch (error) {
      console.error(`Failed to persist seed thread for divergence ${index}:`, error);
    }
  }
}

export async function generateAgentReply(threadId: string, newHumanPost: ThreadPost): Promise<ThreadPost | null> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;

  try {
    const thread = await db.divergenceThread.findUnique({
      where: { id: threadId },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
          include: { authorUser: { select: { name: true } } }
        }
      }
    });
    if (!thread) return null;

    const threadContext = [
      `CLAIM: ${thread.claim}`,
      `WIKIPEDIA SAYS: ${thread.wikipediaSays}`,
      `INDEPENDENT SOURCES SAY: ${thread.independentSays}`,
      '',
      'THREAD SO FAR:',
      ...thread.posts.map(post =>
        post.authorType === 'AGENT'
          ? `[AGENT: ${post.agentName} (${post.agentStance})] ${post.content}`
          : `[HUMAN: ${post.authorUser?.name || 'User'}] ${post.content}`
      )
    ].join('\n');

    const text = await generateJson(`${AGENT_REPLY_PROMPT}\n\n${threadContext}`);
    const parsed = JSON.parse(text) as {
      agentName?: unknown;
      agentStance?: unknown;
      content?: unknown;
    };

    if (
      typeof parsed.agentName !== 'string' ||
      typeof parsed.agentStance !== 'string' ||
      typeof parsed.content !== 'string'
    ) {
      return null;
    }

    return await db.threadPost.create({
      data: {
        threadId,
        parentId: newHumanPost.id,
        authorType: 'AGENT',
        agentName: parsed.agentName,
        agentStance: parsed.agentStance,
        content: parsed.content
      }
    });
  } catch (error) {
    console.error('Agent reply generation failed:', error);
    return null;
  }
}
