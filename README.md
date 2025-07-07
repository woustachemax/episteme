# Welcome to Episteme

> An AI-powered, comprehensive platform for unbiased, relevant information on everything and everyone that matters.

## Live Demo 

Click [Here](https://www.loom.com/share/507adb5d3a7041929ac556cf2487f196?sid=2a77cff9-f323-4fe1-9bf3-20ca7c5d0554) for the Live Demo.
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
- **Anonymous**: 2 searches per day
- **Google OAuth**: 5 searches per day
- **Manual Signup**: 5 searches per day

### Content Types Supported
- **People**: Biography, achievements, recent updates
- **Technology**: History, features, ecosystem, recent developments
- **Events**: Timeline, causes, impact, significance
- **Organizations**: Background, milestones, current status
- **Concepts**: Definition, applications, related topics


## 🙏 Acknowledgments

- OpenAI for GPT-4 capabilities
- Vercel for AI SDK and deployment platform
- The open-source community for foundational libraries

---

**Built with 🤎 by [woustachemax](https://woustachemax.github.io/portfolio/) | Powered by AI, driven by truth**
