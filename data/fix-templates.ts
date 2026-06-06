/**
 * Fix Templates Knowledge Base
 * 
 * Step-by-step implementation guides for common SEO issues.
 * Each template provides actionable instructions that can be
 * directly used to fix problems identified in audits.
 */

import { DocumentInput } from "../lib/rag/knowledge-ingester";

export const FIX_TEMPLATES: DocumentInput[] = [
  // ─────────────────────────────────────────
  // TITLE TAG FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Missing Title Tag",
    content: `
## How to Fix Missing Title Tags

### Severity: HIGH
Title tags are critical for SEO. Every page MUST have a unique title tag.

### Step-by-Step Fix

#### 1. Identify Pages
Use Google Search Console or site crawl to find pages without titles.

#### 2. Create Title Tags
For each page, create a title following this template:
\`[Primary Keyword] - [Secondary Keyword/Benefit] | [Brand Name]\`

#### 3. Implementation

**For HTML pages:**
\`\`\`html
<head>
  <title>Your Page Title Here</title>
</head>
\`\`\`

**For WordPress:**
- Install Yoast SEO or RankMath
- Edit page → Scroll to SEO section
- Add title in "SEO Title" field

**For Next.js:**
\`\`\`tsx
export const metadata = {
  title: 'Your Page Title Here',
}
\`\`\`

**For React (Helmet):**
\`\`\`jsx
<Helmet>
  <title>Your Page Title Here</title>
</Helmet>
\`\`\`

#### 4. Verify
- Check view-source for <title> tag
- Use Google's URL Inspection Tool
- Wait for re-crawl (request indexing)

### Expected Outcome
- Pages will appear properly in search results
- Click-through rate improvement (10-20%)
- Better ranking signals to Google
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["MISSING_TITLE"],
    severity: "ERROR",
  },

  {
    title: "Fix: Title Tag Too Short",
    content: `
## How to Fix Short Title Tags

### Severity: WARNING
Title tags under 30 characters don't provide enough context.

### Step-by-Step Fix

#### 1. Current State
Your title tags are under 30 characters, missing valuable keyword opportunities.

#### 2. Enhance Titles
Add relevant keywords and descriptive text:

**Before:** "Services"
**After:** "Professional Marketing Services - Digital & Content | BrandName"

**Before:** "About"  
**After:** "About Us - Our Story & Mission | BrandName"

**Before:** "Blog"
**After:** "Marketing Blog - Tips, Strategies & Insights | BrandName"

#### 3. Formula for Expansion
\`[What] - [Type/Feature] [Benefit] | [Brand]\`

#### 4. Length Check
- Minimum: 30 characters
- Optimal: 50-60 characters
- Maximum: 60 characters (before truncation)

### Tools
- Moz Title Tag Preview Tool
- SERP Simulator
- Character counter

### Expected Outcome
- More descriptive search results
- Better CTR
- Additional keyword targeting
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["TITLE_TOO_SHORT"],
    severity: "WARNING",
  },

  {
    title: "Fix: Title Tag Too Long",
    content: `
## How to Fix Long Title Tags

### Severity: WARNING
Title tags over 60 characters get truncated in search results.

### Step-by-Step Fix

#### 1. Identify Issues
Find titles over 60 characters or 580 pixels wide.

#### 2. Prioritize Content
Put the most important keywords FIRST:

**Before:** "Welcome to Our Company - We Offer the Best Digital Marketing Services..."
**After:** "Digital Marketing Services - Strategy & Growth | CompanyName"

#### 3. Shortening Techniques
- Remove filler words ("Welcome to", "Best", "Leading")
- Use symbols instead of words (& instead of "and")
- Abbreviate where clear (SEO instead of Search Engine Optimization)
- Remove unnecessary brand repetition
- Use pipes | instead of dashes for fewer characters

#### 4. Verify
Test in SERP preview tool to ensure no truncation.

### Expected Outcome
- Full title visible in search results
- Clearer messaging
- Better CTR
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["TITLE_TOO_LONG"],
    severity: "WARNING",
  },

  // ─────────────────────────────────────────
  // META DESCRIPTION FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Missing Meta Description",
    content: `
## How to Fix Missing Meta Descriptions

### Severity: WARNING
Missing descriptions mean Google chooses your SERP snippet.

### Step-by-Step Fix

#### 1. Write Compelling Descriptions
Each page needs a unique description:

**Template:**
"[Primary benefit/answer]. [Supporting detail]. [CTA - Learn more, Shop now, etc.]"

**Example:**
"Get comprehensive SEO audits in 60 seconds. Find issues hurting your rankings and get actionable fixes. Start your free audit now."

#### 2. Implementation

**HTML:**
\`\`\`html
<head>
  <meta name="description" content="Your description here (150-160 characters)">
</head>
\`\`\`

**WordPress (Yoast):**
- Edit page → Yoast SEO section
- Add description in "Meta description" field

**Next.js:**
\`\`\`tsx
export const metadata = {
  description: 'Your description here',
}
\`\`\`

#### 3. Requirements
- Length: 150-160 characters
- Unique per page
- Include primary keyword
- Include call-to-action
- Match page content

### Expected Outcome
- Control over SERP appearance
- Higher CTR
- Better qualified clicks
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["MISSING_META_DESC"],
    severity: "WARNING",
  },

  // ─────────────────────────────────────────
  // HEADING FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Missing H1 Tag",
    content: `
## How to Fix Missing H1 Tags

### Severity: ERROR
Every page needs exactly one H1 tag for proper SEO.

### Step-by-Step Fix

#### 1. Identify the Main Topic
The H1 should clearly state what the page is about.

#### 2. Create H1 Tag

**Template:**
"[Primary Keyword] - [Value Proposition/Type]"

**Examples:**
- Homepage: "Digital Marketing Agency That Drives Results"
- Product: "Premium Running Shoes - Nike Air Max"  
- Blog: "How to Improve SEO Rankings in 2024"
- Service: "Website Design Services for Small Business"

#### 3. Implementation

**HTML:**
\`\`\`html
<body>
  <h1>Your Main Page Heading</h1>
  <!-- rest of content -->
</body>
\`\`\`

#### 4. Common Mistakes to Avoid
- H1 in logo image (use CSS instead)
- Multiple H1s on page
- H1 hidden from users
- H1 as image without alt text

#### 5. Verify
- View source → search for <h1>
- Use browser dev tools
- Check heading structure with accessibility tools

### Expected Outcome
- Clear page structure for Google
- Improved rankings for target keyword
- Better accessibility
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["MISSING_H1"],
    severity: "ERROR",
  },

  {
    title: "Fix: Multiple H1 Tags",
    content: `
## How to Fix Multiple H1 Tags

### Severity: ERROR
Pages should have exactly ONE H1 tag. Multiple H1s confuse search engines.

### Step-by-Step Fix

#### 1. Find All H1s
In browser: Ctrl+F in view-source, search "<h1"

#### 2. Identify the Primary H1
Determine which one is the main page topic.

#### 3. Convert Others to H2
All secondary H1s should become H2 or lower:

**Before:**
\`\`\`html
<h1>Company Name</h1>
<h1>Our Services</h1>
<h1>Contact Us</h1>
\`\`\`

**After:**
\`\`\`html
<h1>Company Name - Digital Marketing Solutions</h1>
<h2>Our Services</h2>
<h2>Contact Us</h2>
\`\`\`

#### 4. Common Culprits
- Logo wrapped in H1 (remove H1, use CSS for styling)
- Widget titles in H1 (change to H2 or H3)
- Template issues (check header.php, layout files)
- CMS components auto-adding H1s

#### 5. Verify
- Only one H1 appears in source
- H1 contains primary keyword
- Heading hierarchy is logical (H1 → H2 → H3)

### Expected Outcome
- Clear content hierarchy
- Better keyword targeting
- Improved search rankings
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["MULTIPLE_H1"],
    severity: "ERROR",
  },

  // ─────────────────────────────────────────
  // PERFORMANCE FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Slow LCP (Largest Contentful Paint)",
    content: `
## How to Fix Slow LCP

### Severity: ERROR
LCP > 2.5 seconds hurts rankings and user experience.

### Step-by-Step Fix

#### 1. Identify LCP Element
Use Chrome DevTools → Performance tab → Web Vitals to find LCP element.

#### 2. Quick Wins

**If LCP is an image:**
\`\`\`html
<!-- Preload hero image -->
<link rel="preload" as="image" href="/hero.webp">

<!-- Use modern formats -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image">
</picture>
\`\`\`

**If LCP is text:**
- Preload fonts
- Use font-display: swap
- Inline critical CSS

#### 3. Server Optimization
- Enable compression (gzip/brotli)
- Use CDN for static assets
- Implement caching headers
- Consider server upgrade

#### 4. Resource Loading
\`\`\`html
<!-- Preconnect to third-party origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Defer non-critical JS -->
<script defer src="analytics.js"></script>
\`\`\`

#### 5. Reduce Render-Blocking
- Inline critical CSS
- Defer non-critical CSS
- Remove unused CSS

### Target
LCP under 2.5 seconds (ideally under 1.5 seconds)

### Expected Outcome
- Better Core Web Vitals score
- Improved rankings
- Lower bounce rate
    `,
    sourceType: "fix_template",
    category: "page_speed",
    issueTypes: ["SLOW_LCP", "POOR_PERFORMANCE"],
    severity: "ERROR",
  },

  {
    title: "Fix: High CLS (Cumulative Layout Shift)",
    content: `
## How to Fix High CLS

### Severity: ERROR
CLS > 0.1 creates poor user experience and hurts rankings.

### Step-by-Step Fix

#### 1. Common CLS Causes
- Images without dimensions
- Ads/embeds without reserved space
- Dynamically injected content
- Web fonts causing FOIT/FOUT

#### 2. Fix Images
Always specify dimensions:
\`\`\`html
<img src="photo.jpg" width="800" height="600" alt="Photo">

<!-- Or use aspect-ratio -->
<img src="photo.jpg" style="aspect-ratio: 4/3; width: 100%;" alt="Photo">
\`\`\`

#### 3. Fix Embeds/Iframes
Reserve space:
\`\`\`css
.video-container {
  aspect-ratio: 16/9;
  width: 100%;
}
\`\`\`

#### 4. Fix Fonts
\`\`\`css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Prevents invisible text */
}

/* Or use fallback with similar metrics */
body {
  font-family: 'CustomFont', Arial, sans-serif;
}
\`\`\`

#### 5. Fix Dynamic Content
- Don't insert content above existing content
- Reserve space for ads with min-height
- Use skeleton screens

### Target
CLS under 0.1 (ideally under 0.05)

### Expected Outcome
- Stable visual experience
- Better Core Web Vitals
- Improved rankings
    `,
    sourceType: "fix_template",
    category: "page_speed",
    issueTypes: ["POOR_CLS", "LAYOUT_SHIFT"],
    severity: "ERROR",
  },

  // ─────────────────────────────────────────
  // IMAGE FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Missing Image Alt Text",
    content: `
## How to Fix Missing Alt Text

### Severity: WARNING
Alt text is required for accessibility and image SEO.

### Step-by-Step Fix

#### 1. Identify Images Without Alt
Use browser dev tools or crawler to find missing alts.

#### 2. Write Effective Alt Text

**Template:**
"[Descriptive phrase about what's in the image]"

**Good Examples:**
- "Red Nike running shoes on wooden floor"
- "Team meeting in modern conference room"
- "Chart showing 50% increase in sales"

**Bad Examples:**
- "image1.jpg"
- "photo"
- "alt text here"

#### 3. Implementation
\`\`\`html
<!-- Informative images -->
<img src="product.jpg" alt="Blue cotton t-shirt with v-neck">

<!-- Decorative images (use empty alt) -->
<img src="decoration.png" alt="">

<!-- Images with text -->
<img src="sale-banner.jpg" alt="Summer Sale - 50% off all items">
\`\`\`

#### 4. Alt Text Guidelines
- Be specific and descriptive
- Keep under 125 characters
- Include keywords only if relevant
- Don't start with "Image of" or "Picture of"
- Empty alt="" for decorative images

### Expected Outcome
- Improved accessibility
- Better image search rankings
- Enhanced user experience for screen reader users
    `,
    sourceType: "fix_template",
    category: "on_page_seo",
    issueTypes: ["MISSING_ALT", "IMAGE_WITHOUT_ALT"],
    severity: "WARNING",
  },

  // ─────────────────────────────────────────
  // LINK FIXES
  // ─────────────────────────────────────────
  {
    title: "Fix: Broken Links (404 Errors)",
    content: `
## How to Fix Broken Links

### Severity: ERROR
Broken links hurt user experience and waste crawl budget.

### Step-by-Step Fix

#### 1. Identify Broken Links
- Use Google Search Console → Indexing → Pages
- Run site crawl (Screaming Frog, Sitebulb)
- Check server logs for 404s

#### 2. For Each Broken Link, Choose Fix

**Option A: Update Link**
If page moved, update link to new URL.

**Option B: 301 Redirect**
If old page permanently moved:
\`\`\`
# .htaccess (Apache)
Redirect 301 /old-page /new-page

# Next.js (next.config.js)
redirects: async () => [{
  source: '/old-page',
  destination: '/new-page',
  permanent: true,
}]
\`\`\`

**Option C: Remove Link**
If content no longer exists, remove the link entirely.

**Option D: Create Page**
If the page should exist, create it.

#### 3. Fix Internal Links
Search codebase for old URLs:
\`\`\`bash
grep -r "old-url" ./src
\`\`\`

#### 4. Implement Custom 404 Page
\`\`\`html
<!-- 404.html -->
<h1>Page Not Found</h1>
<p>Sorry, this page doesn't exist.</p>
<a href="/">Return to Homepage</a>
<!-- Add search, popular pages, etc. -->
\`\`\`

### Expected Outcome
- Better user experience
- Preserved link equity
- Efficient crawl budget
    `,
    sourceType: "fix_template",
    category: "technical_seo",
    issueTypes: ["BROKEN_LINK", "404_ERROR"],
    severity: "ERROR",
  },

  // ─────────────────────────────────────────
  // ROBOTS & SITEMAP
  // ─────────────────────────────────────────
  {
    title: "Fix: Missing Robots.txt",
    content: `
## How to Create Robots.txt

### Severity: WARNING
Robots.txt guides search engine crawlers.

### Step-by-Step Fix

#### 1. Create File
Create robots.txt at root: https://yoursite.com/robots.txt

#### 2. Basic Template
\`\`\`
# Allow all crawlers
User-agent: *
Allow: /

# Disallow admin/private areas
Disallow: /admin/
Disallow: /private/
Disallow: /api/

# Allow CSS/JS for rendering
Allow: /*.css$
Allow: /*.js$

# Sitemap location
Sitemap: https://yoursite.com/sitemap.xml
\`\`\`

#### 3. Common Rules

**Block specific bots:**
\`\`\`
User-agent: BadBot
Disallow: /
\`\`\`

**Crawl delay (use sparingly):**
\`\`\`
User-agent: *
Crawl-delay: 10
\`\`\`

#### 4. Don't Block
- CSS files (needed for rendering)
- JavaScript files (needed for rendering)
- Images (unless confidential)

#### 5. Verify
- Test at: https://www.google.com/webmasters/tools/robots-testing-tool
- Check: https://yoursite.com/robots.txt

### Expected Outcome
- Controlled crawling
- Protected private sections
- Sitemap discovery
    `,
    sourceType: "fix_template",
    category: "technical_seo",
    issueTypes: ["MISSING_ROBOTS"],
    severity: "WARNING",
  },

  {
    title: "Fix: Missing XML Sitemap",
    content: `
## How to Create XML Sitemap

### Severity: WARNING
Sitemaps help search engines discover and index pages.

### Step-by-Step Fix

#### 1. Generate Sitemap

**Manual (small sites):**
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yoursite.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yoursite.com/about</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
\`\`\`

**WordPress:**
- Use Yoast SEO or RankMath (auto-generates)
- Located at: /sitemap_index.xml

**Next.js:**
Install next-sitemap package:
\`\`\`javascript
// next-sitemap.config.js
module.exports = {
  siteUrl: 'https://yoursite.com',
  generateRobotsTxt: true,
}
\`\`\`

#### 2. Best Practices
- Keep under 50,000 URLs per sitemap
- Use sitemap index for larger sites
- Include only canonical URLs
- Update lastmod accurately
- Exclude noindex pages

#### 3. Submit to Search Engines
- Google Search Console → Sitemaps → Add
- Bing Webmaster Tools → Sitemaps
- Add to robots.txt: Sitemap: https://yoursite.com/sitemap.xml

### Expected Outcome
- Faster indexing
- Better crawl coverage
- Easier page discovery
    `,
    sourceType: "fix_template",
    category: "technical_seo",
    issueTypes: ["MISSING_SITEMAP"],
    severity: "WARNING",
  },

  // ─────────────────────────────────────────
  // MOBILE OPTIMIZATION
  // ─────────────────────────────────────────
  {
    title: "Fix: Mobile Usability Issues",
    content: `
## How to Fix Mobile Issues

### Severity: ERROR
Mobile-first indexing means mobile issues directly hurt rankings.

### Common Issues & Fixes

#### 1. Viewport Not Set
\`\`\`html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
\`\`\`

#### 2. Text Too Small
\`\`\`css
body {
  font-size: 16px; /* Minimum readable size */
  line-height: 1.5;
}

@media (max-width: 768px) {
  body {
    font-size: 16px; /* Don't reduce on mobile */
  }
}
\`\`\`

#### 3. Touch Targets Too Small
\`\`\`css
button, a, input {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
}
\`\`\`

#### 4. Content Wider Than Screen
\`\`\`css
img, video, iframe {
  max-width: 100%;
  height: auto;
}

table {
  overflow-x: auto;
  display: block;
}
\`\`\`

#### 5. Elements Too Close
\`\`\`css
.link-list a {
  display: block;
  padding: 12px 0;
  margin: 8px 0;
}
\`\`\`

### Testing
- Google Mobile-Friendly Test
- Chrome DevTools device emulation
- Real device testing

### Expected Outcome
- Pass mobile-friendly test
- Better mobile rankings
- Lower mobile bounce rate
    `,
    sourceType: "fix_template",
    category: "technical_seo",
    issueTypes: ["MOBILE_ISSUES", "NOT_MOBILE_FRIENDLY"],
    severity: "ERROR",
  },

  // ─────────────────────────────────────────
  // HTTPS/SECURITY
  // ─────────────────────────────────────────
  {
    title: "Fix: HTTPS and Mixed Content Issues",
    content: `
## How to Fix HTTPS Issues

### Severity: CRITICAL
HTTPS is a ranking factor. Mixed content blocks secure connection.

### Step-by-Step Fix

#### 1. Get SSL Certificate
- Free: Let's Encrypt (via hosting)
- Paid: DigiCert, Comodo, etc.
- Most hosts offer free SSL

#### 2. Force HTTPS
\`\`\`
# .htaccess (Apache)
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
\`\`\`

**Nginx:**
\`\`\`
server {
  listen 80;
  return 301 https://$host$request_uri;
}
\`\`\`

#### 3. Fix Mixed Content
Find HTTP resources on HTTPS pages:

**In browser console:**
Look for "Mixed Content" warnings

**Fix by:**
\`\`\`html
<!-- Change this -->
<img src="http://example.com/image.jpg">

<!-- To this -->
<img src="https://example.com/image.jpg">

<!-- Or protocol-relative (not recommended) -->
<img src="//example.com/image.jpg">
\`\`\`

#### 4. Update Internal Links
Search and replace all http:// to https://

#### 5. Update External Services
- Google Analytics
- Google Search Console
- Social media profiles
- Directory listings

#### 6. Set HSTS Header
\`\`\`
Strict-Transport-Security: max-age=31536000; includeSubDomains
\`\`\`

### Expected Outcome
- Secure site
- Better rankings
- User trust (padlock icon)
    `,
    sourceType: "fix_template",
    category: "technical_seo",
    issueTypes: ["HTTPS_ISSUES", "MIXED_CONTENT", "NO_SSL"],
    severity: "ERROR",
  },
];

/**
 * Get all fix templates
 */
export function getFixTemplates(): DocumentInput[] {
  return FIX_TEMPLATES;
}

/**
 * Get fix template by issue type
 */
export function getTemplateForIssue(issueType: string): DocumentInput | undefined {
  return FIX_TEMPLATES.find(template => 
    template.issueTypes?.includes(issueType)
  );
}

/**
 * Get templates by severity
 */
export function getTemplatesBySeverity(severity: string): DocumentInput[] {
  return FIX_TEMPLATES.filter(template => 
    template.severity === severity
  );
}
