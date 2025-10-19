# Welcome to Episteme 📖

> An AI-powered, comprehensive platform for unbiased, relevant information on everything and everyone that matters.

## 🎯 Vision

Episteme challenges information bias by combining AI content generation with real-time fact-checking to create neutral, comprehensive articles on any topic. Think Wikipedia meets modern AI - but faster, more current, and truly unbiased.

## ✨ Features

- **AI-Generated Articles**: Creates comprehensive, Wikipedia-style content using GPT-4 with real-time web parsing
- **Unbiased Content**: System prompts designed to eliminate editorial bias and present factual information
- **Real-Time Updates**: Pulls current information from multiple sources to ensure accuracy
- **Dual Authentication**: Support for both Google OAuth and manual credentials
- **Rate Limiting**: Smart usage controls (2 searches for anonymous, 5 for authenticated users)
- **Python Analytics**: Advanced content analysis and fact-checking pipeline
- **Modern UI**: Clean, responsive interface built for the attention economy

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - Full-stack React framework
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **NextAuth.js** - Authentication and session management

### Backend
- **Next.js API Routes** - Serverless backend
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database (Neon)
- **Vercel AI SDK** - AI integration and streaming

### AI & Analysis
- **OpenAI GPT-4** - Content generation
- **Python Services** - Content analysis and fact-checking
- **Real-time Web Parsing** - Dynamic data fetching

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API    │    │   Python        │
│   (React/Next)  │◄──►│   Routes         │◄──►│   Services      │
│                 │    │                  │    │                 │
│   • Search UI   │    │   • /api/search  │    │   • Analyzer    │
│   • Auth Forms  │    │   • /api/auth    │    │   • Fact Check  │
│   • Article View│    │   • Rate Limiting│    │    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌──────────────────┐               │
         │              │   Database       │               │
         └──────────────►│   (PostgreSQL)   │◄──────────────┘
                        │                  │
                        │   • Users        │
                        │   • Articles     │
                        │   • Search Limits│
                        │   • Edit History │
                        └──────────────────┘
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL database
- OpenAI API key
- Google OAuth credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/woustachemax/episteme.git
   cd episteme
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r backend/python/requirements.txt
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://..."
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   
   # OAuth Providers
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # OpenAI
   OPENAI_API_KEY="your-openai-api-key"
   ```

4. **Database Setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📝 Usage

### Basic Search Flow
1. Visit the homepage
2. Enter any topic (person, concept, technology, etc.)
3. AI generates a comprehensive, unbiased article
4. View structured content with proper citations

### Authentication
- **Anonymous**: 10 searches per day
- **Google OAuth**: 15 searches per day
- **Manual Signup**: 15 searches per day

### Content Types Supported
- **People**: Biography, achievements, recent updates
- **Technology**: History, features, ecosystem, recent developments
- **Events**: Timeline, causes, impact, significance
- **Organizations**: Background, milestones, current status
- **Concepts**: Definition, applications, related topics

## 🆕 V2 Updates

### 🔍 Real-Time Web Search Integration
- **Tavily API** integration for live web data fetching
- Multi-source aggregation (Crunchbase, LinkedIn, company websites, TechCrunch)
- Automatic exclusion of unreliable sources (Reddit, Quora, Wikipedia for startups)
- 3+ targeted search queries per topic for comprehensive coverage

### 🧠 Intelligent Entity Resolution
- **Automatic domain detection** - checks if `.com/.ai/.io/.co` domains exist
- **Smart disambiguation** - distinguishes "Virio" (AI startup) from "Vireo" (bird species)
- **Context-aware searching** - runs targeted queries based on entity type:
  - Companies: `site:crunchbase.com`, `site:linkedin.com/company`, `"[query]" startup funding`
  - People: Career, achievements, recent news
  - Concepts: Technical definitions, applications, recent developments
- **Zero manual whitelisting** - works for ANY new company, startup, or topic dynamically

### 📊 Enhanced Content Generation
- **Entity-specific prompts** - tailored article structures for companies vs people vs concepts
- **SEO-optimized titles** - format: `[Company]: [What they do] for [Target Market]`
- **Proper markdown rendering** - clickable links, bold text, formatted headers
- **Source prioritization** - newer sources (2023-2025) weighted higher
- **No hallucination** - strict requirement to use only verified search results

### 🎯 Startup-Focused Features
- **Funding detection** - automatically finds Series A/B/C information
- **Team/leadership extraction** - identifies founders and key executives
- **Product/service mapping** - describes actual offerings from company sources
- **Market positioning** - competitive landscape and target audience

### 🛡️ Anti-Hallucination Safeguards
- Pre-search entity classification (company/person/concept/ambiguous)
- Multiple verification sources required per claim
- Explicit instructions: "Do not invent dates, founders, or details"
- Confidence scoring system for entity type detection

## 📦 New Dependencies

```bash
npm install react-markdown

TAVILY_API_KEY=tvly-...
```

## 🔧 V2 Architecture Changes

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Search Query  │───►│  Entity Resolver     │───►│  Tavily API     │
│   "virio"       │    │  • Domain check      │    │  Multi-query    │
│                 │    │  • Type detection    │    │  search         │
└─────────────────┘    │  • Context builder   │    └─────────────────┘
                       └──────────────────────┘              │
                                  │                          │
                                  ▼                          ▼
                       ┌──────────────────────┐    ┌─────────────────┐
                       │   GPT-4 with         │◄───│  Search Results │
                       │   Enhanced Prompt    │    │  (verified)     │
                       │   • Entity context   │    └─────────────────┘
                       │   • SEO keywords     │
                       │   • Structure guide  │
                       └──────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │   Article Output     │
                       │   • Markdown format  │
                       │   • Clickable links  │
                       │   • Source citations │
                       └──────────────────────┘
```

## 🚀 V2 Usage Examples


### Ambiguous Term
```
Input: "meta"
✓ Detects: meta.com exists (company) + general concept
✓ Prioritizes: Company information over philosophical concept
✓ Generates: Separate sections if both are relevant
```

### Traditional Topic
```
Input: "photosynthesis"
✓ Detects: No company domain, concept entity
✓ Searches: Scientific sources, educational content
✓ Generates: Technical explanation with recent research
```

## 🙏 Acknowledgments

- OpenAI for GPT-4 capabilities
- Vercel for AI SDK and deployment platform
- The open-source community for foundational libraries

---

**Built with 🤎 by [woustachemax](https://woustachemax.github.io/portfolio/) | Powered by AI, driven by truth**
