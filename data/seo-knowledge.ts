/**
 * SEO Knowledge Base
 * 
 * Comprehensive collection of SEO best practices, guides,
 * and expert knowledge for RAG retrieval.
 */

import { DocumentInput } from "../lib/rag/knowledge-ingester";

export const SEO_KNOWLEDGE_BASE: DocumentInput[] = [
  // ─────────────────────────────────────────
  // TITLE TAG OPTIMIZATION
  // ─────────────────────────────────────────
  {
    title: "Title Tag Optimization Best Practices",
    content: `
## Title Tag Optimization Guide

### Optimal Length
- **Ideal length**: 50-60 characters (including spaces)
- **Pixel width**: Keep under 580 pixels to avoid truncation in SERPs
- **Minimum**: At least 30 characters for meaningful context

### Structure Formula
The proven formula for high-CTR title tags:
\`Primary Keyword – Secondary Keyword | Brand Name\`

Or for product/service pages:
\`Product Name - Key Benefit | Brand\`

### Best Practices
1. **Front-load keywords**: Place primary keywords within the first 3 words
2. **Unique titles**: Every page MUST have a unique title
3. **Brand positioning**: Place brand at end (unless brand is the keyword)
4. **Avoid keyword stuffing**: 1-2 keywords max per title
5. **Use power words**: "Best", "Guide", "Complete", "2024"

### Common Mistakes
- Duplicate titles across pages (major issue)
- All-caps or excessive punctuation
- Missing titles entirely
- Titles that don't match page content
- Using only brand name as title

### Title Templates by Page Type
- **Homepage**: Primary Service/Product – Key Value Prop | Brand
- **Product**: Product Name – Feature/Benefit | Brand
- **Blog**: How to [Achieve Goal] in [Timeframe] | Brand
- **Category**: [Category Name] – Shop/Browse/Find [Products] | Brand
- **Service**: [Service Name] – [Location] [Type] Services | Brand

### Impact on Rankings
- Title tags are a direct ranking factor
- They significantly impact click-through rate (CTR)
- Google may rewrite titles if they're poor quality
- Well-optimized titles can improve rankings by 10-20%
    `,
    sourceType: "seo_guide",
    category: "on_page_seo",
    tags: ["title_tag", "meta_tags", "on_page"],
  },

  // ─────────────────────────────────────────
  // META DESCRIPTION
  // ─────────────────────────────────────────
  {
    title: "Meta Description Optimization Guide",
    content: `
## Meta Description Best Practices

### Optimal Length
- **Ideal length**: 150-160 characters
- **Minimum**: 70 characters
- **Maximum**: 320 characters (Google sometimes shows longer)

### Structure
A compelling meta description includes:
1. **Primary keyword** (naturally placed)
2. **Value proposition** (what user gets)
3. **Call-to-action** (what to do next)

### Template
"[Primary Keyword] + [Key Benefit]. [Supporting detail]. [CTA]"

Example: "Learn SEO best practices that drive real results. Our complete guide covers everything from title tags to link building. Start optimizing today!"

### Best Practices
1. **Unique descriptions**: Every page needs a unique meta description
2. **Active voice**: Use action verbs ("Discover", "Learn", "Get")
3. **Include CTA**: "Learn more", "Shop now", "Get started"
4. **Match search intent**: Align with what users are looking for
5. **Avoid quotes**: Can cause truncation in SERPs

### Impact
- Not a direct ranking factor BUT
- Significantly impacts CTR (click-through rate)
- Higher CTR signals relevance to Google
- Can indirectly improve rankings

### Common Mistakes
- Leaving description blank
- Duplicating across pages
- Stuffing with keywords
- Not including a call-to-action
- Not matching page content
    `,
    sourceType: "seo_guide",
    category: "on_page_seo",
    tags: ["meta_description", "meta_tags", "on_page", "ctr"],
  },

  // ─────────────────────────────────────────
  // HEADING STRUCTURE
  // ─────────────────────────────────────────
  {
    title: "Heading Tag Hierarchy Best Practices",
    content: `
## Heading Structure (H1-H6) Guide

### The H1 Tag
- **ONE H1 per page** (critical rule)
- Should contain primary keyword
- Must be unique across the site
- Should match/relate to title tag
- Positioned at top of content

### Heading Hierarchy
Follow this logical structure:
\`\`\`
H1: Main Page Topic
  H2: Major Section 1
    H3: Subsection 1.1
    H3: Subsection 1.2
  H2: Major Section 2
    H3: Subsection 2.1
      H4: Detail point
\`\`\`

### Best Practices
1. **Single H1**: Only one H1 tag per page
2. **Logical order**: Don't skip levels (H1 → H3 is bad)
3. **Keyword placement**: Include variations in H2s
4. **Descriptive**: Headings should summarize section content
5. **User-friendly**: Write for readers, not just SEO

### Common Issues
- Multiple H1 tags (confuses search engines)
- Missing H1 entirely
- H1 in logo (common mistake)
- Skipping heading levels
- Using headings for styling only

### SEO Impact
- H1 is a strong ranking signal
- Helps Google understand page structure
- Improves accessibility
- Enhances user experience and time-on-page
    `,
    sourceType: "seo_guide",
    category: "on_page_seo",
    tags: ["headings", "h1", "structure", "on_page"],
  },

  // ─────────────────────────────────────────
  // CORE WEB VITALS
  // ─────────────────────────────────────────
  {
    title: "Core Web Vitals Complete Guide",
    content: `
## Core Web Vitals Optimization

### The Three Metrics

#### 1. Largest Contentful Paint (LCP)
**What it measures**: Loading performance
**Target**: < 2.5 seconds
**Good**: < 2.5s | Needs Improvement: 2.5-4s | Poor: > 4s

**How to improve LCP**:
- Optimize and compress images
- Use next-gen formats (WebP, AVIF)
- Implement lazy loading for below-fold images
- Preload critical resources
- Use CDN for faster delivery
- Minimize render-blocking JavaScript/CSS
- Upgrade server/hosting

#### 2. Cumulative Layout Shift (CLS)
**What it measures**: Visual stability
**Target**: < 0.1
**Good**: < 0.1 | Needs Improvement: 0.1-0.25 | Poor: > 0.25

**How to improve CLS**:
- Set explicit width/height on images and videos
- Reserve space for ads and embeds
- Avoid inserting content above existing content
- Use CSS aspect-ratio for media
- Preload web fonts
- Use font-display: swap

#### 3. First Input Delay (FID) / Interaction to Next Paint (INP)
**What it measures**: Interactivity
**Target**: < 100ms (FID) / < 200ms (INP)

**How to improve**:
- Break up long JavaScript tasks
- Use web workers for heavy computation
- Minimize main thread work
- Reduce JavaScript execution time
- Implement code splitting

### Impact on Rankings
- Core Web Vitals are a ranking factor (since 2021)
- Part of Google's Page Experience signals
- More impactful on mobile rankings
- Can be tie-breaker between similar pages
    `,
    sourceType: "seo_guide",
    category: "page_speed",
    tags: ["core_web_vitals", "lcp", "cls", "fid", "inp", "performance"],
  },

  // ─────────────────────────────────────────
  // IMAGE OPTIMIZATION
  // ─────────────────────────────────────────
  {
    title: "Image SEO Optimization Guide",
    content: `
## Image Optimization for SEO

### Alt Text Best Practices
- **Descriptive**: Describe the image content accurately
- **Concise**: Keep under 125 characters
- **Keyword-natural**: Include keywords only if relevant
- **Unique**: Each image needs unique alt text
- **Skip decorative images**: Use empty alt="" for decorative images

### Alt Text Template
"[Adjective] [Object] [Action/Context]"
Example: "Red running shoes displayed on wooden floor"

### Technical Optimization
1. **File names**: Use descriptive, keyword-rich names
   - Bad: IMG_12345.jpg
   - Good: red-running-shoes-nike.jpg

2. **File format**:
   - JPEG: Photos, complex images
   - PNG: Graphics with transparency
   - WebP: Modern format, best compression
   - SVG: Logos, icons, simple graphics
   - AVIF: Next-gen, best quality/size ratio

3. **Compression**:
   - Compress all images (TinyPNG, ImageOptim)
   - Target 80% quality for JPEGs
   - Keep file sizes under 200KB when possible

4. **Dimensions**:
   - Serve correctly sized images
   - Use srcset for responsive images
   - Don't rely on CSS to resize

### Image Sitemap
- Create dedicated image sitemap
- Include all important images
- Helps Google discover images faster

### Lazy Loading
- Implement native lazy loading (loading="lazy")
- Don't lazy load above-the-fold images
- Use intersection observer for custom solutions
    `,
    sourceType: "seo_guide",
    category: "on_page_seo",
    tags: ["images", "alt_text", "optimization", "webp"],
  },

  // ─────────────────────────────────────────
  // INTERNAL LINKING
  // ─────────────────────────────────────────
  {
    title: "Internal Linking Strategy Guide",
    content: `
## Internal Linking Best Practices

### Why Internal Links Matter
- Distribute PageRank/authority throughout site
- Help search engines discover and index pages
- Establish site architecture and hierarchy
- Keep users engaged longer (lower bounce rate)
- Define topical relationships between pages

### Optimal Internal Linking
- **Minimum**: 2-3 internal links per page
- **Target**: 5-10 relevant internal links
- **Avoid**: More than 100 links per page

### Anchor Text Best Practices
1. **Descriptive**: Use meaningful anchor text
2. **Varied**: Don't use same anchor for all links to one page
3. **Natural**: Avoid over-optimization
4. **Keyword-relevant**: Include target keywords when natural

### Link Placement
- **Priority**: Links earlier in content pass more value
- **In-content**: Body links are most valuable
- **Navigation**: Sitewide links (header/footer) pass less per-link value
- **Sidebar**: Good for related content

### Common Issues
- Orphan pages (pages with no internal links pointing to them)
- Deep pages (more than 3 clicks from homepage)
- Broken internal links (404s)
- Too many nofollow internal links
- Circular linking without hierarchy

### Hub and Spoke Model
Create content hubs:
1. **Pillar page**: Comprehensive main topic page
2. **Cluster content**: Related subtopic pages
3. **Link structure**: All clusters link to/from pillar
    `,
    sourceType: "seo_guide",
    category: "link_building",
    tags: ["internal_links", "site_structure", "pagerank"],
  },

  // ─────────────────────────────────────────
  // TECHNICAL SEO
  // ─────────────────────────────────────────
  {
    title: "Technical SEO Fundamentals",
    content: `
## Technical SEO Checklist

### Crawlability
1. **Robots.txt**:
   - Located at domain.com/robots.txt
   - Don't block important resources (CSS, JS, images)
   - Include sitemap reference
   - Use specific directives, not blanket blocks

2. **XML Sitemap**:
   - Include all indexable pages
   - Keep under 50,000 URLs per sitemap
   - Submit to Google Search Console
   - Update automatically when content changes

3. **Site Architecture**:
   - Maximum 3 clicks from homepage to any page
   - Clear URL structure (domain.com/category/page)
   - Logical hierarchy

### Indexability
1. **Canonical Tags**:
   - Self-referencing canonicals on all pages
   - Point duplicates to original
   - Use absolute URLs

2. **Meta Robots**:
   - index,follow (default, don't need to specify)
   - noindex for pages that shouldn't appear in search
   - nofollow sparingly

3. **Duplicate Content**:
   - Use canonicals to consolidate
   - 301 redirect true duplicates
   - Parameter handling in GSC

### Site Security
1. **HTTPS**: Required for all pages
2. **Mixed content**: No HTTP resources on HTTPS pages
3. **Security headers**: HSTS, CSP, X-Frame-Options

### Mobile-First
1. **Responsive design**: Must work on all devices
2. **Mobile-friendly**: Pass Google's mobile-friendly test
3. **Same content**: Mobile and desktop should have same content
4. **Touch targets**: 48px minimum tap targets
    `,
    sourceType: "seo_guide",
    category: "technical_seo",
    tags: ["technical_seo", "crawlability", "indexability", "mobile"],
  },

  // ─────────────────────────────────────────
  // GEO/AI VISIBILITY
  // ─────────────────────────────────────────
  {
    title: "GEO Visibility - Getting Found in AI Search",
    content: `
## Generative Engine Optimization (GEO)

### What is GEO?
GEO is optimizing your content to appear in AI-powered search engines like:
- ChatGPT (with browsing)
- Perplexity AI
- Google SGE (Search Generative Experience)
- Bing Chat / Copilot
- Claude

### Why GEO Matters
- AI search is growing rapidly
- Users trust AI-generated answers
- Being cited in AI responses builds authority
- Early adopters gain competitive advantage

### GEO Optimization Strategies

#### 1. Content Structure
- Use clear, logical headings
- Include concise, quotable statements
- Structure content as Q&A when appropriate
- Use bullet points and lists for key info
- Provide definitive answers early in content

#### 2. Authority Signals
- Include author credentials and expertise
- Add citations and sources
- Link to authoritative external sources
- Display trust signals (awards, certifications)
- Keep content factually accurate and up-to-date

#### 3. Entity Optimization
- Mention your brand name consistently
- Use schema.org markup (Organization, Person, Product)
- Create Wikipedia presence if notable
- Build entity associations (industry, expertise areas)
- Maintain consistent NAP across web

#### 4. Technical Requirements
- Implement comprehensive structured data
- Ensure fast, accessible pages
- Use semantic HTML
- Provide clear, crawlable content
- Avoid paywalls/login walls for key content

### Content for AI Visibility
- Create comprehensive, authoritative guides
- Answer common industry questions definitively  
- Provide unique data, statistics, research
- Include expert quotes and insights
- Update content regularly for freshness

### Measuring GEO Success
- Monitor brand mentions in AI responses
- Track AI-referred traffic
- Test queries in AI platforms
- Analyze citation patterns
    `,
    sourceType: "geo_guide",
    category: "geo_visibility",
    tags: ["geo", "ai_visibility", "chatgpt", "perplexity", "sgb"],
  },

  // ─────────────────────────────────────────
  // STRUCTURED DATA
  // ─────────────────────────────────────────
  {
    title: "Structured Data (Schema.org) Guide",
    content: `
## Structured Data Implementation

### What is Structured Data?
Structured data is code (JSON-LD, Microdata, RDFa) that helps search engines understand page content and enables rich results.

### Priority Schema Types

#### 1. Organization
Required for brand presence:
\`\`\`json
{
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://linkedin.com/company/...",
    "https://twitter.com/..."
  ]
}
\`\`\`

#### 2. Website + SearchAction
Enable sitelinks search box:
\`\`\`json
{
  "@type": "WebSite",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term}",
    "query-input": "required name=search_term"
  }
}
\`\`\`

#### 3. Article / BlogPosting
For content pages:
- headline, author, datePublished, dateModified
- Enable article rich results

#### 4. Product
For e-commerce:
- name, description, image, price, availability
- Enable product rich results, merchant listings

#### 5. FAQ
For FAQ sections:
- Enable FAQ rich results (expandable in SERPs)
- Great for voice search optimization

#### 6. LocalBusiness
For local businesses:
- name, address, geo, telephone, openingHours
- Enable local pack appearance

### Implementation Best Practices
- Use JSON-LD format (Google recommended)
- Place in <head> or end of <body>
- Validate with Schema Markup Validator
- Test with Google Rich Results Test
- Don't mark up hidden content
- Keep data accurate and up-to-date
    `,
    sourceType: "seo_guide",
    category: "technical_seo",
    tags: ["structured_data", "schema", "json_ld", "rich_results"],
  },

  // ─────────────────────────────────────────
  // LINKEDIN MARKETING
  // ─────────────────────────────────────────
  {
    title: "LinkedIn Marketing Strategy for B2B",
    content: `
## LinkedIn Marketing Best Practices

### Profile Optimization
1. **Company Page**:
   - Complete all sections
   - Use keyword-rich description
   - Add custom button (CTA)
   - Post consistently (3-5x per week)

2. **Personal Profiles** (for executives):
   - Professional headshots
   - Keyword-optimized headlines
   - Detailed experience sections
   - Regular thought leadership posts

### Content Strategy

#### Best Performing Content Types
1. **Document carousels**: 1.5-2x more engagement
2. **Native video**: High reach, short form (30-90 sec)
3. **Text posts**: Personal stories, insights
4. **Polls**: Great for engagement
5. **Articles**: Long-form thought leadership

#### Content Pillars for B2B
- Industry insights and trends
- Company culture and values
- Customer success stories
- Educational content / how-to
- Behind-the-scenes
- Employee spotlights

### Posting Strategy
- **Frequency**: 3-5 times per week
- **Timing**: 7-8 AM or 5-6 PM (local time)
- **Best days**: Tuesday, Wednesday, Thursday
- **Engagement window**: Reply to comments within 1 hour

### LinkedIn Algorithm Tips
- First 90 minutes are crucial
- Get engagement from employees first
- Use 3-5 hashtags maximum
- Tag people sparingly (only if relevant)
- No external links in post body (put in comments)
- Native content > external links

### SEO + LinkedIn Integration
- Share blog posts (LinkedIn article or link)
- Repurpose SEO content for LinkedIn
- Drive traffic back to website
- Build backlinks through LinkedIn articles
- Use LinkedIn for keyword research (what's trending)
    `,
    sourceType: "social_best_practice",
    category: "social_media",
    tags: ["linkedin", "b2b", "social_media", "content_marketing"],
  },

  // ─────────────────────────────────────────
  // CONTENT QUALITY
  // ─────────────────────────────────────────
  {
    title: "Content Quality and E-E-A-T Guidelines",
    content: `
## E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness

### What is E-E-A-T?
E-E-A-T is Google's quality framework used by human raters to evaluate content quality. It's not a direct algorithm but influences how Google evaluates content.

### Experience
- First-hand experience with topic
- Personal anecdotes and real examples
- Practical, tested information
- Photos/videos of actual experience
- Unique insights from doing, not just researching

### Expertise
- Credentials and qualifications
- Deep knowledge demonstrated in content
- Technical accuracy
- Comprehensive coverage of topic
- Author bios with relevant expertise

### Authoritativeness
- Industry recognition
- Backlinks from authoritative sources
- Mentions in respected publications
- Social proof (followers, engagement)
- Brand reputation

### Trustworthiness
- Accurate, honest information
- Clear contact information
- Privacy policy, terms of service
- Secure website (HTTPS)
- Sources and citations
- Transparent about sponsorships/affiliations

### Implementing E-E-A-T

#### For Your Website
1. Add detailed author bios with credentials
2. Create About page with company history
3. Add Contact page with physical address
4. Include customer reviews/testimonials
5. Link to authoritative sources
6. Update content regularly
7. Fix factual errors quickly

#### For YMYL Topics
(Your Money or Your Life - health, finance, legal)
- Expert authors required
- Medical review for health content
- Citations to authoritative sources
- Clear, accurate information
- Regular updates
    `,
    sourceType: "seo_guide",
    category: "content_strategy",
    tags: ["eeat", "content_quality", "trust", "authority"],
  },

  // ─────────────────────────────────────────
  // LOCAL SEO
  // ─────────────────────────────────────────
  {
    title: "Local SEO Optimization Guide",
    content: `
## Local SEO Best Practices

### Google Business Profile (GBP)
1. **Claim and verify** your listing
2. **Complete all fields**:
   - Business name (exact match)
   - Category (primary + secondary)
   - Address (NAP consistency)
   - Hours (including special hours)
   - Description (use keywords naturally)
   - Photos (interior, exterior, products, team)

3. **Keep active**:
   - Post weekly updates
   - Respond to all reviews
   - Add new photos monthly
   - Update hours for holidays

### NAP Consistency
Name, Address, Phone must be IDENTICAL across:
- Website
- Google Business Profile
- All directory listings
- Social media profiles

### Local Citations
Priority directories:
1. Google Business Profile
2. Bing Places
3. Apple Maps
4. Yelp
5. Facebook
6. Industry-specific directories

### Reviews Strategy
- Ask satisfied customers for reviews
- Respond to ALL reviews (positive and negative)
- Don't buy fake reviews (penalty risk)
- Include review schema on website
- Feature reviews on website

### Local Content
- Create location-specific pages
- Blog about local events/news
- Include local keywords naturally
- Add local landmarks in content
- Create city/neighborhood guides

### Local Link Building
- Local business associations
- Chamber of Commerce
- Local news/blogs
- Sponsor local events
- Partner with local businesses
    `,
    sourceType: "seo_guide",
    category: "local_seo",
    tags: ["local_seo", "google_business_profile", "nap", "reviews"],
  },
];

/**
 * Get all SEO knowledge documents
 */
export function getSEOKnowledge(): DocumentInput[] {
  return SEO_KNOWLEDGE_BASE;
}

/**
 * Get knowledge by category
 */
export function getKnowledgeByCategory(
  category: string
): DocumentInput[] {
  return SEO_KNOWLEDGE_BASE.filter(doc => doc.category === category);
}

/**
 * Get knowledge by tag
 */
export function getKnowledgeByTag(tag: string): DocumentInput[] {
  return SEO_KNOWLEDGE_BASE.filter(doc => doc.tags?.includes(tag));
}
