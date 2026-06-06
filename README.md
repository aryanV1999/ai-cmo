# AI Marketing Intelligence Platform

An AI-powered website intelligence platform that delivers brutal, honest SEO and marketing audits.

## Features

- **Technical SEO Audit**: Checks for broken links, missing meta tags, duplicate content, Core Web Vitals, mobile readiness
- **On-Page SEO Analysis**: Title tags, H1/H2 structure, keyword density, internal linking, image optimization
- **Page Speed Analysis**: Core Web Vitals (LCP, CLS, TBT), Lighthouse integration
- **Competitor Benchmarking**: Compare against competitors on DA, backlinks, keywords
- **Marketing Channel Audit**: Blog, social profiles, email capture, Google Business, reviews
- **AI Brutal Verdict**: Plain-English summary with letter grade (F to A+) and prioritized fixes
- **Upsell Engine**: Contextual service recommendations based on findings

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Crawler**: Playwright for headless browser crawling
- **AI**: Claude API for generating verdicts
- **External APIs**: Google PageSpeed Insights, SEMrush/Ahrefs (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for job queue)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-marketing-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Set up the database:
```bash
npm run db:generate
npm run db:push
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_marketing_db"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"

# External APIs
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_PAGESPEED_API_KEY="your-google-api-key"
SEMRUSH_API_KEY="your-semrush-api-key"

# CRM Integration
HUBSPOT_API_KEY="your-hubspot-api-key"
CRM_WEBHOOK_URL="your-crm-webhook-url"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Feature Flags
ENABLE_REAL_COMPETITOR_API=false
ENABLE_CRM_SYNC=false
```

## Project Structure

```
├── app/
│   ├── page.tsx                 # Landing page with URL input
│   ├── audit/[id]/page.tsx      # Audit results page
│   ├── api/
│   │   └── audits/              # API routes for audit CRUD
│   └── layout.tsx               # Root layout
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── url-input.tsx
│   ├── progress-display.tsx
│   ├── grade-badge.tsx
│   └── email-capture-modal.tsx
├── lib/
│   ├── crawler.ts               # Playwright crawler
│   ├── analyzers/
│   │   ├── technical-seo.ts
│   │   ├── on-page-seo.ts
│   │   ├── page-speed.ts
│   │   ├── competitors.ts
│   │   └── channels.ts
│   ├── ai-summary.ts            # Claude API integration
│   ├── upsell-engine.ts         # Finding-to-service mapping
│   └── audit-runner.ts          # Orchestrates the audit
├── prisma/
│   └── schema.prisma            # Database schema
└── public/
```

## Key Flows

### 1. URL Input → Audit Creation
1. User enters website URL
2. API validates URL and creates audit record
3. Background job starts crawling

### 2. Crawl → Analysis
1. Playwright crawls up to 50 pages
2. Parallel analysis modules run:
   - Technical SEO checker
   - On-page analyzer
   - PageSpeed API
   - Competitor API
   - Channel detector

### 3. AI Summary → Report
1. All findings aggregated
2. Claude generates brutal verdict
3. Upsell engine maps findings to services
4. Report stored in database

### 4. Email Gate → Full Access
1. Teaser shown (grade + top 3 issues)
2. Email required for full report
3. Lead synced to CRM
4. PDF available for download

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audits` | Create new audit |
| GET | `/api/audits/[id]` | Get audit status/results |
| POST | `/api/audits/[id]/unlock` | Unlock report with email |
| GET | `/api/audits/[id]/pdf` | Download PDF report |

## Development

### Running Tests
```bash
npm test
```

### Database Management
```bash
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run migrations
```

### Building for Production
```bash
npm run build
npm start
```

## Deployment

### Vercel (Frontend)
1. Connect your repository to Vercel
2. Set environment variables
3. Deploy

### Railway/Render (Workers)
For production, run the audit worker as a separate process:
```bash
npm run worker
```

## License

MIT
