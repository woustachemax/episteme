import { RESEARCH_SYNTHESIS_PROMPT } from "@/lib/prompts";
import { generateJson } from "@/lib/llm";
import type { WikiArticle } from "@/lib/wiki-scraper";
import type { WebSource } from "@/lib/search-service";

export interface ResearchSource {
  index: number;
  type: 'wikipedia' | 'independent';
  title: string;
  url: string;
}

export interface AgentPost {
  agentName: string;
  agentStance: string;
  content: string;
}

export interface ResearchDivergence {
  claim: string;
  wikipediaSays: string;
  independentSays: string;
  citationIndexes: number[];
  agentPosts: AgentPost[];
}

export interface ResearchResult {
  synthesis: string;
  sources: ResearchSource[];
  divergences: ResearchDivergence[];
}

function isAgentPost(value: unknown): value is AgentPost {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.agentName === 'string' &&
    typeof p.agentStance === 'string' &&
    typeof p.content === 'string'
  );
}

function isDivergence(value: unknown): value is ResearchDivergence {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.claim === 'string' &&
    typeof d.wikipediaSays === 'string' &&
    typeof d.independentSays === 'string' &&
    Array.isArray(d.citationIndexes) &&
    d.citationIndexes.every(n => typeof n === 'number') &&
    Array.isArray(d.agentPosts)
  );
}

function normalizeDivergence(value: ResearchDivergence): ResearchDivergence {
  return {
    ...value,
    agentPosts: (value.agentPosts ?? []).filter(isAgentPost)
  };
}

export async function synthesizeResearch(query: string, article: WikiArticle, independentResults: WebSource[]): Promise<ResearchResult> {
  const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`;
  const wikipediaSource: ResearchSource = { index: 1, type: 'wikipedia', title: article.title, url: wikipediaUrl };

  const independentSources: ResearchSource[] = independentResults.map((r, i) => ({
    index: i + 2,
    type: 'independent',
    title: r.title,
    url: r.url
  }));

  const sources = [wikipediaSource, ...independentSources];
  const fallback: ResearchResult = { synthesis: '', sources, divergences: [] };

  const hasLlmProvider = Boolean(process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (independentResults.length === 0 || !hasLlmProvider) {
    return fallback;
  }

  const sourceListText = [
    `SOURCE 1 (Wikipedia): ${article.title}\n${article.content.slice(0, 6000)}`,
    ...independentResults.map((r, i) => `SOURCE ${i + 2} (Independent): ${r.title}\nURL: ${r.url}\n${r.content}`)
  ].join('\n\n---\n\n');

  const userPrompt = `Topic: ${query}\n\nNUMBERED SOURCE LIST:\n\n${sourceListText}`;

  try {
    const text = await generateJson(`${RESEARCH_SYNTHESIS_PROMPT}\n\n${userPrompt}`);
    const parsed = JSON.parse(text) as { synthesis?: unknown; divergences?: unknown };

    const synthesis = typeof parsed.synthesis === 'string' ? parsed.synthesis : '';
    const divergences = Array.isArray(parsed.divergences)
      ? parsed.divergences.filter(isDivergence).map(normalizeDivergence)
      : [];

    return { synthesis, sources, divergences };
  } catch (error) {
    console.error('Research synthesis failed:', error);
    return fallback;
  }
}
