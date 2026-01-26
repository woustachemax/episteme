# Episteme

A fact-checking and bias analysis platform that searches Wikipedia and provides local bias analysis without requiring external AI APIs. Users can optionally configure their own fact-checking APIs for enhanced verification.

## Features

- **Wikipedia Search Integration**: Searches and fetches articles from Wikipedia with intelligent query matching
- **Local Bias Analysis**: Analyzes content for bias words, suspicious patterns, and neutral language indicators without external APIs
- **Formatted Content**: Displays articles with well-organized sections, key facts, and metadata
- **Pluggable Fact-Checking**: Users can optionally configure their own external fact-checking APIs via browser settings
- **Article Caching**: Automatically caches articles to prevent duplicate Wikipedia API calls
- **Community Suggestions**: Users can suggest edits to articles with voting and approval system
- **Authentication**: Google OAuth and credentials-based signup/signin
- **Rate Limiting**: Usage controls for anonymous and authenticated users
- **Responsive Design**: Mobile-friendly interface with sidebar navigation
- **Text Selection Integration**: Select text from articles to suggest fact-checks and corrections

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js 4
- Framer Motion
- React 19

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- Native Fetch API (no external AI services required)

### External Services (Optional)
- Wikipedia API (public, no auth required)
- Custom Fact-Check APIs (user-configurable, optional)

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (optional, for OAuth signin)
- Custom Fact-Check API (optional, for enhanced verification)

### Setup

1. Clone the repository
```bash
git clone https://github.com/woustachemax/episteme.git
cd episteme
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment variables
```bash
cp .env.example .env.local
```

4. Set up your database
```bash
pnpm prisma migrate dev
```

5. Start the development server
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/episteme

NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

EXTERNAL_FACTCHECK_API_URL=https://your-api.com/verify
EXTERNAL_FACTCHECK_API_KEY=your-api-key
```

Only `DATABASE_URL` and `NEXTAUTH_SECRET` are required. Google OAuth and external fact-check APIs are optional.

## Usage

### Searching for Information

1. Enter a search query (topic, person, place, etc.)
2. The app fetches the Wikipedia article and performs local bias analysis
3. Results show:
   - Article content organized by sections
   - Key facts extracted from the article
   - Bias analysis with confidence score
   - Related topics and categories
   - Metadata and word count

### Local Bias Analysis

The application analyzes content for:
- **Positive bias words**: amazing, incredible, fantastic, excellent, etc.
- **Negative bias words**: terrible, awful, horrible, worst, etc.
- **Opinion language**: should, must, clearly, allegedly, supposedly, etc.
- **Neutral indicators**: reported, documented, found, according, etc.
- **Suspicious patterns**: absolutist language, unverified claims, etc.

### Configuring External Fact-Checking

1. Click the settings button (⚙️) in the bottom-right corner
2. Enable "External Fact-Check API"
3. Enter your API URL and API key
4. Settings are stored locally in your browser - never sent to our servers
5. When you perform a search, you can choose to use the external API for verification

### Suggesting Edits

1. Select any text from an article
2. A suggestions modal will appear
3. Submit your suggested correction or improvement
4. The article owner and community can vote on your suggestion

## API Endpoints

### Search Endpoint
```
POST /api/wiki
Content-Type: application/json

Request:
{
  "query": "search term",
  "useExternalFactCheck": false
}

Response:
{
  "content": "full article content",
  "formatted": {
    "title": "Article Title",
    "summary": "Brief summary",
    "sections": [{ "heading": "Section", "content": "..." }],
    "keyFacts": ["fact1", "fact2"],
    "metadata": { "wordCount": 1000, "categories": [...], "relatedTopics": [...] }
  },
  "title": "Article Title",
  "summary": "Summary",
  "analysis": { "names": [...], "dates": [...], "word_count": 1000 },
  "factCheck": {
    "provider": "local|external",
    "bias_words_found": [...],
    "bias_score": 0.25,
    "confidence_score": 0.75,
    "summary": "Analysis summary"
  },
  "metadata": {
    "factCheckAvailable": { "local": true, "external": false }
  }
}
```

### Authentication Endpoints
```
POST /api/auth/signup - Register new user
POST /api/auth/signin - Login with credentials
GET /api/auth/[...nextauth] - NextAuth handlers
```

### Suggestions Endpoint
```
POST /api/suggestions - Submit article suggestions
GET /api/suggestions?articleQuery=... - Get suggestions for an article
```

## Architecture

### Data Flow

1. **User Search** → SearchBox component captures query
2. **API Call** → POST to `/api/wiki` with query and settings
3. **Wikipedia Fetch** → wiki-scraper fetches and parses Wikipedia
4. **Content Format** → Article is split into sections with key facts
5. **Bias Analysis** → Local analyzer checks for bias patterns
6. **Optional External** → If enabled, sends to user's configured API
7. **Database Cache** → Result stored in PostgreSQL for future searches
8. **Response** → Formatted data returned to frontend
9. **Display** → SearchResults component renders with sections and analysis

### Component Structure

- **EpistemeApp**: Main app orchestrator, search state management
- **Header**: Navigation, search box, user menu
- **SearchResults**: Display formatted article content, bias analysis, sections
- **SearchBox**: Query input with async search trigger
- **FactCheckSettings**: User configuration for external APIs (localStorage-based)
- **AnimatedLoader**: Loading state with current query display
- **AuthModal**: Login/signup form
- **SuggestionsModal**: Text selection and edit suggestions

## Database Schema

### Article Table
```prisma
model Article {
  id String @id @default(uuid())
  query String @unique
  content String @db.Text
  analysis Json
  factCheck Json
  sourcesCount Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  suggestions ArticleSuggestion[]
}
```

### User Table
```prisma
model User {
  id String @id @default(uuid())
  name String
  email String @unique
  password String? (hashed with bcryptjs)
  provider Provider (GOOGLE | CREDENTIALS)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  search Search[]
  suggestions ArticleSuggestion[]
}
```

## Performance Optimizations

- **Article Caching**: Reduces Wikipedia API calls for repeated queries
- **Database Query Limits**: Sections capped at 8, key facts at 5 for performance
- **Local Analysis Only by Default**: No external API calls required
- **Lazy Loading**: Components load on demand
- **Rate Limiting**: Prevents API abuse with per-user/IP limits

## Security

- **No External AI APIs by Default**: Eliminates vendor lock-in and external dependencies
- **Optional User-Controlled APIs**: Any external APIs are configured by the user locally
- **Credentials Hashing**: Passwords hashed with bcryptjs
- **CORS Protection**: API endpoints protected
- **NextAuth Security**: Session-based authentication with JWT tokens
- **Local Storage**: External API keys stored only in browser, never sent to our servers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
