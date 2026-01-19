# Episteme

An AI-powered platform for unbiased, comprehensive information on any topic. Combines real-time web search with AI content generation to create Wikipedia-style articles with fact-checking and bias detection.

## Features

- AI-Generated Articles: Comprehensive Wikipedia-style content using GPT-4 with real-time web search
- Article Caching: Automatically caches articles to prevent duplicate API calls for the same query
- Query Normalization: Intelligently normalizes similar queries (e.g., "vini jr", "vinicius jr") to use cached articles
- Community Suggestions: Users can suggest edits to articles with voting and approval system
- Real-Time Web Search: Tavily API integration for live data fetching from multiple sources
- Entity Resolution: Automatically detects entity types (company, person, concept) and adjusts search strategy
- Authentication: Google OAuth and credentials-based signup/signin
- Rate Limiting: Smart usage controls for anonymous and authenticated users
- Content Analysis: Bias detection, fact-checking, and confidence scoring
- Responsive Design: Mobile-friendly interface with sidebar navigation

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js
- Framer Motion
- React Markdown

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Neon)
- Vercel AI SDK

### AI & Services
- OpenAI GPT-4
- Tavily API (web search)
- Real-time content analysis

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Tavily API key
- Google OAuth credentials (optional)

### Setup

1. Clone the repository
```bash
git clone https://github.com/woustachemax/episteme.git
cd episteme
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env.local
```

Required environment variables:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="your-openai-api-key"
TAVILY_API_KEY="your-tavily-api-key"
```

4. Setup database
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start development server
```bash
npm run dev
```

## Usage

### Basic Search
1. Enter any topic in the search bar
2. AI generates a comprehensive article with sources
3. View analysis, fact-check scores, and community suggestions

### Article Suggestions
1. Select text from an article
2. Click to open suggestions modal
3. Propose edits with replacement text and reason
4. Community can vote and approve suggestions

### Authentication
- Anonymous users: Limited searches per day
- Authenticated users: Increased search limits and ability to submit suggestions

## Recent Features

### Query Normalization
Automatically normalizes similar queries to prevent duplicate API calls:
- "vini jr" → "vinicius junior"
- "elon" → "elon musk" (if article exists)
- "bezos" → "jeffrey bezos" (if article exists)

### Article Caching
All searched articles are cached in the database. Subsequent searches for the same or normalized query return cached results instantly.

### Community Suggestions System
- Users can suggest edits to any article
- Selected text is stored in localStorage for easy editing
- Voting system for community feedback
- Approval workflow for suggestions

### Mobile Experience
- Responsive sidebar with authentication options
- Optimized search interface for small screens
- Touch-friendly interactions

### Error Handling
- Comprehensive error handling with timeouts
- Graceful fallbacks for database and API failures
- Detailed error messages for debugging

## Architecture

```
Frontend (React/Next.js)
    ↓
API Routes (/api/search-stream)
    ↓
Query Normalization → Database Cache Check
    ↓
Entity Resolution → Web Search (Tavily)
    ↓
AI Generation (GPT-4) → Article Creation
    ↓
Database Storage → Response
```

## API Endpoints

- `/api/search-stream` - Main search endpoint with caching
- `/api/suggestions` - Article suggestion management
- `/api/auth/[...nextauth]` - Authentication handlers
- `/api/auth/signup` - User registration

## Database Schema

- Users: Authentication and profile data
- Articles: Cached search results with content and metadata
- ArticleSuggestions: Community edit suggestions with voting
- Search: Search history tracking

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter
```

## License

MIT

---

Built by woustachemax | Powered by AI, driven by truth
