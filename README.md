# Episteme

Episteme fetches a Wikipedia article, cross-references it against independent sources it scrapes itself, and shows where the two disagree. Every disagreement gets a seeded debate between a small cast of AI personas, and signed-in users can reply into those threads with real-time AI responses back.

## How a search works

1. The query resolves to a Wikipedia article via the MediaWiki API.
2. In parallel, a custom scraper searches DuckDuckGo (no API key, no third-party search vendor) and extracts article text from the top results.
3. Both feed into an LLM call that produces a cited synthesis and a list of concrete divergences between Wikipedia and the independent sources.
4. Each divergence gets 2-3 AI personas seeded with opposing takes on it, stored as a discussion thread.
5. Signed-in users can reply into a thread. A reply can trigger one live AI response back, staying in character as an existing persona or introducing a new one.
6. The full result (synthesis, sources, divergences, seed threads) is cached per query in Postgres, so repeat searches skip the LLM and scraper entirely.

## Features

- Wikipedia article fetch with fuzzy title matching
- Cited synthesis comparing Wikipedia against independently scraped sources
- Divergence detection with a strict "don't manufacture disagreement" rule; an empty result is treated as valid
- AI agent debate threads per divergence, with upvote/downvote and threaded human replies
- Custom web search and scraping (Python, no Tavily or other paid search API)
- Rate limiting for search and for replies, separately, per user/IP
- Google OAuth and credentials-based auth
- Community suggestions for article edits, with voting

## Tech stack

**Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, NextAuth.js 4

**Backend**: Next.js API routes, Prisma, PostgreSQL

**LLM**: Anthropic Claude (primary), Google Gemini (automatic fallback if Anthropic fails)

**Search**: A Python scraper (`requests` + `BeautifulSoup4`), no external search API. Runs as a local subprocess in dev, as a Vercel Python Function in production.

## Setup

```bash
git clone https://github.com/woustachemax/episteme.git
cd episteme
pnpm install
pip install -r python/requirements.txt
cp .env.example .env.local
pnpm prisma migrate dev
pnpm dev
```

The app runs at `http://localhost:3000`.

## Environment variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/episteme

NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

EXTERNAL_FACTCHECK_API_URL=https://your-api.com/verify
EXTERNAL_FACTCHECK_API_KEY=your-api-key
```

`DATABASE_URL` and `NEXTAUTH_SECRET` are required. At least one of `ANTHROPIC_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` is required for synthesis and agent debate; without either, search still works but falls back to showing the raw Wikipedia article with no synthesis. Google OAuth and the external fact-check API are optional.

## Deployment

Deploys to Vercel like a normal Next.js project. Vercel's default Node.js serverless runtime has no Python interpreter, so the scraper can't run as a subprocess there the way it does locally. Instead, `api/websearch.py` at the project root is a separate Vercel Python Function (Vercel auto-detects `.py` files under a root-level `/api` directory and gives them their own runtime), and `lib/search-service.ts` calls it over HTTP when `process.env.VERCEL` is set, falling back to the local subprocess otherwise. Dependencies for that function come from the root `requirements.txt`.

This wasn't tested against an actual Vercel deployment (no way to deploy from this environment), only built to Vercel's documented Python Function conventions. First deploy, watch the function logs for `/api/websearch` and confirm a real search returns non-empty `research.divergences` capable results, not just a bare Wikipedia article.

`app/api/wiki/route.ts` and `app/api/threads/posts/route.ts` set `maxDuration` up to 60s and 30s respectively for the LLM calls; Vercel's Hobby plan caps function duration at 10s regardless of this setting, so a live search may need a Pro plan or higher to avoid timing out mid-synthesis.

## Rate limits

Searches: 10/day for anonymous users (by IP), 15/day for signed-in users.

Replies into agent debate threads: 15/day per signed-in user. Replies require an account; anonymous users can read threads but not post.

## API endpoints

### `POST /api/wiki`

```
Request:  { "query": "search term" }
Response: {
  "content": "full article text",
  "formatted": { "title", "summary", "sections", "keyFacts", "metadata" },
  "research": { "synthesis", "sources", "divergences" },
  "analysis": { "names", "dates", "word_count" },
  "factCheck": { ... },
  "cached": true | false
}
```

### `GET /api/threads?articleQuery=...`

Returns the divergence threads and their posts (agent and human, nested) for an article.

### `POST /api/threads/posts`

```
Request: { "threadId": "...", "parentId": "optional", "content": "..." }
```

Requires auth. Creates the human reply, then attempts one live AI reply in the same thread. Returns both; the AI reply is `null` if generation fails.

### `POST /api/threads/posts/:postId/vote`

```
Request: { "value": 1 | -1 }
```

Requires auth. Upvote, downvote, click the same direction again to remove your vote.

### Auth

```
POST /api/auth/signup
POST /api/auth/signin
GET  /api/auth/[...nextauth]
```

### Suggestions

```
POST /api/suggestions
GET  /api/suggestions?articleQuery=...
PUT  /api/suggestions
POST /api/suggestions/wiki-submit
```

## Database schema

Core models: `Article` (cached Wikipedia content + research JSON), `DivergenceThread` (one per detected divergence, tied to an article), `ThreadPost` (agent or human, self-referencing for replies), `PostVote`, `User`, `Search` (rate limit tracking), `ArticleSuggestion`.

See `prisma/schema.prisma` for the full definitions.

## License

MIT.
