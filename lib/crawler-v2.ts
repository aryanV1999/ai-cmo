/**
 * Production-Grade Crawler Engine v2
 * 
 * Key improvements over v1:
 * 1. Full JS rendering with networkidle
 * 2. Smart page-type classification
 * 3. Subdomain handling
 * 4. Confidence scoring
 * 5. Retry logic with exponential backoff
 * 6. Sitemap parsing from robots.txt
 * 7. Parallel crawling with rate limiting
 * 8. Content extraction validation
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";

// ============================================
// TYPES
// ============================================

export interface CrawledPageV2 {
  url: string;
  normalizedUrl: string;
  statusCode: number;
  redirectChain: string[];
  finalUrl: string;
  
  // Page classification
  pageType: PageType;
  pageTypeConfidence: number;
  
  // Content
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  
  // Content quality
  mainContentWordCount: number;  // Excludes nav/footer
  totalWordCount: number;
  readabilityScore: number;
  
  // Images
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  
  // Links
  internalLinks: LinkData[];
  externalLinks: LinkData[];
  brokenLinks: string[];
  
  // Technical
  hasViewportMeta: boolean;
  schemaMarkup: SchemaMarkup[];
  ogTags: Record<string, string>;
  
  // Performance
  loadTime: number;
  resourceCount: number;
  totalResourceSize: number;
  
  // Extraction metadata
  extractionConfidence: number;
  jsRendered: boolean;
  errors: string[];
  warnings: string[];
}

export type PageType = 
  | "homepage"
  | "blog-post"
  | "blog-listing"
  | "landing-page"
  | "product"
  | "category"
  | "about"
  | "contact"
  | "legal"
  | "login"
  | "signup"
  | "pricing"
  | "documentation"
  | "support"
  | "utility"
  | "unknown";

export interface LinkData {
  url: string;
  anchorText: string;
  isNavigation: boolean;
  isFooter: boolean;
  noFollow: boolean;
}

export interface SchemaMarkup {
  type: string;
  data: Record<string, unknown>;
  valid: boolean;
}

export interface CrawlResultV2 {
  domain: string;
  baseUrl: string;
  subdomainsFound: string[];
  
  // Pages
  pages: CrawledPageV2[];
  pagesByType: Record<PageType, CrawledPageV2[]>;
  
  // Sitemap
  sitemapFound: boolean;
  sitemapUrls: string[];
  sitemapPagesCount: number;
  
  // Robots
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  robotsDisallowed: string[];
  
  // Crawl metadata
  totalPagesDiscovered: number;
  totalPagesCrawled: number;
  crawlDuration: number;
  crawlCompleteness: number;  // 0-100 percentage
  
  // Confidence
  overallConfidence: CrawlConfidence;
  
  // Errors
  errors: CrawlError[];
  warnings: string[];
}

export interface CrawlConfidence {
  score: number;  // 0-100
  level: "high" | "medium" | "low" | "very-low";
  reasons: string[];
  recommendations: string[];
}

export interface CrawlError {
  type: "network" | "timeout" | "parse" | "blocked" | "rate-limited";
  url: string;
  message: string;
  timestamp: Date;
  retryCount: number;
}

export interface CrawlOptionsV2 {
  maxPages?: number;
  maxConcurrency?: number;
  timeout?: number;
  respectRobotsTxt?: boolean;
  includeSubdomains?: boolean;
  priorityPaths?: string[];  // Crawl these first (e.g., /blog, /products)
  excludePatterns?: RegExp[];
  userAgent?: string;
  waitForNetworkIdle?: boolean;
  extractMainContent?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: CrawlProgressV2) => void;
}

export interface CrawlProgressV2 {
  phase: "initializing" | "sitemap-discovery" | "crawling" | "finalizing";
  pagesDiscovered: number;
  pagesCrawled: number;
  currentUrl: string;
  percentage: number;
  estimatedTimeRemaining: number;
  errors: number;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: Required<Omit<CrawlOptionsV2, "onProgress">> = {
  maxPages: 100,
  maxConcurrency: 5,
  timeout: 30000,
  respectRobotsTxt: true,
  includeSubdomains: true,
  priorityPaths: ["/blog", "/products", "/services", "/about", "/pricing"],
  excludePatterns: [
    /\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|woff|woff2|ttf|eot)$/i,
    /\?(utm_|ref=|source=|fbclid=)/i,
    /\/wp-admin\//i,
    /\/cart\//i,
    /\/checkout\//i,
    /\/my-account\//i,
    /\/#/,
  ],
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MotionLabsBot/2.0",
  waitForNetworkIdle: true,
  extractMainContent: true,
  retryAttempts: 2,
  retryDelay: 1000,
};

// ============================================
// MAIN CRAWLER
// ============================================

export async function crawlWebsiteV2(
  startUrl: string,
  options: CrawlOptionsV2 = {}
): Promise<CrawlResultV2> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  let browser: Browser | null = null;
  const crawledPages: CrawledPageV2[] = [];
  const discoveredUrls = new Map<string, { priority: number; source: string }>();
  const crawledUrls = new Set<string>();
  const errors: CrawlError[] = [];
  const warnings: string[] = [];
  const subdomainsFound = new Set<string>();

  // Hoisted so they're accessible in the return statement outside try/finally
  let initialRobotsTxt: string | null = null;
  let initialSitemaps: string[] = [];
  
  // Normalize the start URL
  const { baseUrl, domain, protocol } = parseAndNormalizeUrl(startUrl);
  
  console.log(`[Crawler V2] Starting crawl for ${domain}`);
  
  try {
    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    // Create a single shared browser context for all pages (much faster than per-page contexts)
    const sharedContext = await browser.newContext({
      userAgent: opts.userAgent,
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true,
    });
    
    // Phase 1: Discover sitemaps and robots.txt
    opts.onProgress?.({
      phase: "sitemap-discovery",
      pagesDiscovered: 0,
      pagesCrawled: 0,
      currentUrl: baseUrl,
      percentage: 2,
      estimatedTimeRemaining: 0,
      errors: 0,
    });
    
    const discovered = await discoverSitemapsAndRobots(
      baseUrl,
      domain,
      opts.respectRobotsTxt
    );
    initialRobotsTxt = discovered.robotsTxt;
    initialSitemaps = discovered.sitemaps;
    const disallowed = discovered.disallowed;
    
    // Parse sitemaps to discover URLs
    const sitemapUrls = await parseSitemaps(initialSitemaps, opts.maxPages * 2);
    console.log(`[Crawler V2] Found ${sitemapUrls.length} URLs in sitemaps`);
    
    // Add sitemap URLs to discovery queue with high priority
    for (const url of sitemapUrls) {
      const normalized = normalizeUrl(url);
      if (!discoveredUrls.has(normalized)) {
        discoveredUrls.set(normalized, { priority: 10, source: "sitemap" });
      }
    }
    
    // Add start URL with highest priority
    discoveredUrls.set(normalizeUrl(baseUrl), { priority: 100, source: "start" });
    
    // Add priority paths
    for (const path of opts.priorityPaths) {
      const priorityUrl = new URL(path, baseUrl).href;
      const normalized = normalizeUrl(priorityUrl);
      if (!discoveredUrls.has(normalized)) {
        discoveredUrls.set(normalized, { priority: 50, source: "priority-path" });
      }
    }
    
    // Phase 2: Crawl pages
    opts.onProgress?.({
      phase: "crawling",
      pagesDiscovered: discoveredUrls.size,
      pagesCrawled: 0,
      currentUrl: baseUrl,
      percentage: 5,
      estimatedTimeRemaining: 0,
      errors: 0,
    });
    
    // Create crawl queue sorted by priority
    const getNextUrls = (count: number): string[] => {
      const entries = Array.from(discoveredUrls.entries())
        .filter(([url]) => !crawledUrls.has(url))
        .sort((a, b) => b[1].priority - a[1].priority)
        .slice(0, count);
      return entries.map(([url]) => url);
    };
    
    // Crawl with concurrency control
    while (crawledUrls.size < opts.maxPages) {
      const batch = getNextUrls(opts.maxConcurrency);
      if (batch.length === 0) break;
      
      const results = await Promise.all(
        batch.map(url => crawlPageWithRetry(
          browser!,
          url,
          domain,
          opts,
          errors,
          sharedContext
        ))
      );
      
      for (const result of results) {
        if (!result) continue;
        
        crawledUrls.add(result.normalizedUrl);
        crawledPages.push(result);
        
        // Track subdomains
        try {
          const pageHost = new URL(result.url).hostname;
          if (pageHost !== domain && pageHost.endsWith(domain)) {
            subdomainsFound.add(pageHost);
          }
        } catch {}
        
        // Discover new internal links (prioritize based on link context)
        for (const link of result.internalLinks) {
          const normalized = normalizeUrl(link.url);
          
          // Check if should exclude
          if (opts.excludePatterns.some(p => p.test(link.url))) continue;
          
          // Check robots.txt disallow
          if (disallowed.some(d => link.url.includes(d))) continue;
          
          if (!discoveredUrls.has(normalized) && discoveredUrls.size < opts.maxPages * 3) {
            // Prioritize based on link context
            let priority = 5;
            if (link.isNavigation) priority = 20;
            if (link.url.includes("/blog")) priority = 30;
            if (link.url.includes("/product")) priority = 25;
            
            discoveredUrls.set(normalized, { priority, source: result.url });
          }
        }
        
        // Handle subdomains if enabled
        if (opts.includeSubdomains) {
          for (const link of result.externalLinks) {
            try {
              const linkHost = new URL(link.url).hostname;
              if (linkHost.endsWith(domain) && linkHost !== domain) {
                const subdomainBase = `${protocol}//${linkHost}`;
                const normalized = normalizeUrl(subdomainBase);
                if (!discoveredUrls.has(normalized)) {
                  discoveredUrls.set(normalized, { priority: 15, source: "subdomain" });
                  subdomainsFound.add(linkHost);
                }
              }
            } catch {}
          }
        }
      }
      
      // Progress update
      opts.onProgress?.({
        phase: "crawling",
        pagesDiscovered: discoveredUrls.size,
        pagesCrawled: crawledUrls.size,
        currentUrl: batch[batch.length - 1] || "",
        percentage: Math.min(95, 5 + Math.round((crawledUrls.size / opts.maxPages) * 90)),
        estimatedTimeRemaining: estimateTimeRemaining(startTime, crawledUrls.size, opts.maxPages),
        errors: errors.length,
      });
    }
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Phase 3: Calculate confidence and finalize
  const confidence = calculateCrawlConfidence(
    crawledPages,
    discoveredUrls.size,
    errors,
    opts.maxPages
  );
  
  // Group pages by type
  const pagesByType = groupPagesByType(crawledPages);
  
  // Calculate completeness
  const crawlCompleteness = Math.round(
    (crawledUrls.size / Math.max(discoveredUrls.size, 1)) * 100
  );
  
  return {
    domain,
    baseUrl,
    subdomainsFound: Array.from(subdomainsFound),
    pages: crawledPages,
    pagesByType,
    sitemapFound: initialSitemaps.length > 0,
    sitemapUrls: initialSitemaps,
    sitemapPagesCount: discoveredUrls.size,
    robotsTxtFound: initialRobotsTxt !== null,
    robotsTxtContent: initialRobotsTxt,
    robotsDisallowed: [], // Populated during discovery
    totalPagesDiscovered: discoveredUrls.size,
    totalPagesCrawled: crawledUrls.size,
    crawlDuration: Date.now() - startTime,
    crawlCompleteness,
    overallConfidence: confidence,
    errors,
    warnings,
  };
}

// ============================================
// PAGE CRAWLING
// ============================================

async function crawlPageWithRetry(
  browser: Browser,
  url: string,
  domain: string,
  opts: Required<Omit<CrawlOptionsV2, "onProgress">>,
  errors: CrawlError[],
  sharedContext?: BrowserContext
): Promise<CrawledPageV2 | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.retryAttempts; attempt++) {
    try {
      return await crawlSinglePage(browser, url, domain, opts, sharedContext);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < opts.retryAttempts) {
        await delay(opts.retryDelay * Math.pow(2, attempt));
      }
    }
  }
  
  errors.push({
    type: "network",
    url,
    message: lastError?.message || "Unknown error",
    timestamp: new Date(),
    retryCount: opts.retryAttempts,
  });
  
  return null;
}

async function crawlSinglePage(
  browser: Browser,
  url: string,
  domain: string,
  opts: Required<Omit<CrawlOptionsV2, "onProgress">>,
  sharedContext?: BrowserContext
): Promise<CrawledPageV2> {
  const startTime = Date.now();
  const pageErrors: string[] = [];
  const pageWarnings: string[] = [];
  const redirectChain: string[] = [];
  
  // Reuse shared context if provided, otherwise create a lightweight one
  const context = sharedContext ?? await browser.newContext({
    userAgent: opts.userAgent,
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: true,
  });
  
  const page = await context.newPage();
  
  // Track resources
  let resourceCount = 0;
  let totalResourceSize = 0;
  
  page.on("response", (response) => {
    resourceCount++;
    const size = parseInt(response.headers()["content-length"] || "0", 10);
    totalResourceSize += size;
    
    // Track redirects
    const status = response.status();
    if (status >= 300 && status < 400) {
      redirectChain.push(response.url());
    }
  });
  
  try {
    // Navigate with appropriate wait strategy
    const waitUntil = opts.waitForNetworkIdle ? "networkidle" : "domcontentloaded";
    
    const response = await page.goto(url, {
      waitUntil,
      timeout: opts.timeout,
    });
    
    const statusCode = response?.status() || 0;
    const finalUrl = page.url();
    const loadTime = Date.now() - startTime;
    
    // Extract all page data
    const extractedData = await extractPageDataV2(page, domain, opts.extractMainContent);
    
    // Classify page type
    const { pageType, confidence: pageTypeConfidence } = classifyPageType(
      url,
      extractedData.title,
      extractedData.h1Tags,
      extractedData.mainContentWordCount,
      extractedData.schemaMarkup
    );
    
    // Calculate extraction confidence
    const extractionConfidence = calculateExtractionConfidence(
      extractedData,
      statusCode,
      loadTime
    );
    
    return {
      url,
      normalizedUrl: normalizeUrl(url),
      statusCode,
      redirectChain,
      finalUrl,
      pageType,
      pageTypeConfidence,
      ...extractedData,
      loadTime,
      resourceCount,
      totalResourceSize,
      extractionConfidence,
      jsRendered: opts.waitForNetworkIdle,
      errors: pageErrors,
      warnings: pageWarnings,
    };
    
  } finally {
    await page.close();
    // Only close context if we created it (not shared)
    if (!sharedContext) {
      await context.close();
    }
  }
}

async function extractPageDataV2(
  page: Page,
  domain: string,
  extractMainContent: boolean
): Promise<Omit<CrawledPageV2, "url" | "normalizedUrl" | "statusCode" | "redirectChain" | "finalUrl" | "pageType" | "pageTypeConfidence" | "loadTime" | "resourceCount" | "totalResourceSize" | "extractionConfidence" | "jsRendered" | "errors" | "warnings">> {
  
  return await page.evaluate(({ domain, extractMainContent }) => {
    // Helper to check if element is in navigation/footer
    const isInNavOrFooter = (element: Element): boolean => {
      let current: Element | null = element;
      while (current) {
        const tagName = current.tagName.toLowerCase();
        const role = current.getAttribute("role");
        const className = current.className?.toLowerCase() || "";
        const id = current.id?.toLowerCase() || "";
        
        if (
          tagName === "nav" ||
          tagName === "header" ||
          tagName === "footer" ||
          role === "navigation" ||
          role === "banner" ||
          role === "contentinfo" ||
          className.includes("nav") ||
          className.includes("header") ||
          className.includes("footer") ||
          className.includes("menu") ||
          id.includes("nav") ||
          id.includes("header") ||
          id.includes("footer") ||
          id.includes("menu")
        ) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    
    // Title
    const title = document.querySelector("title")?.textContent?.trim() || null;
    
    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const metaDescription = metaDesc?.getAttribute("content")?.trim() || null;
    
    // Canonical URL
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalEl?.getAttribute("href") || null;
    
    // Headings
    const h1Tags = Array.from(document.querySelectorAll("h1"))
      .map(el => el.textContent?.trim() || "")
      .filter(t => t.length > 0);
    const h2Tags = Array.from(document.querySelectorAll("h2"))
      .map(el => el.textContent?.trim() || "")
      .filter(t => t.length > 0);
    const h3Tags = Array.from(document.querySelectorAll("h3"))
      .map(el => el.textContent?.trim() || "")
      .filter(t => t.length > 0);
    
    // Content extraction
    let mainContentWordCount = 0;
    let totalWordCount = 0;
    
    if (extractMainContent) {
      // Try to find main content area
      const mainSelectors = [
        "main",
        "article",
        '[role="main"]',
        "#content",
        "#main",
        ".content",
        ".main",
        ".post-content",
        ".article-content",
        ".entry-content",
      ];
      
      let mainContent: Element | null = null;
      for (const selector of mainSelectors) {
        mainContent = document.querySelector(selector);
        if (mainContent) break;
      }
      
      if (mainContent) {
        const mainText = mainContent.textContent || "";
        mainContentWordCount = mainText.trim().split(/\s+/).filter(w => w.length > 0).length;
      }
    }
    
    // Total word count (excluding scripts/styles)
    const bodyText = document.body?.innerText || "";
    totalWordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    // If no main content found, estimate based on total minus nav/footer
    if (mainContentWordCount === 0) {
      // Rough estimation: main content is ~60-70% of total for typical pages
      mainContentWordCount = Math.round(totalWordCount * 0.65);
    }
    
    // Readability score (simplified Flesch-Kincaid approximation)
    const sentences = (bodyText.match(/[.!?]+/g) || []).length || 1;
    const words = totalWordCount || 1;
    const avgWordsPerSentence = words / sentences;
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - (1.015 * avgWordsPerSentence)));
    
    // Images
    const images = document.querySelectorAll("img");
    const imageCount = images.length;
    const imagesWithAlt = Array.from(images).filter(
      img => img.alt && img.alt.trim().length > 0
    ).length;
    const imagesWithoutAlt = imageCount - imagesWithAlt;
    
    // Links with context
    const allLinks = Array.from(document.querySelectorAll("a[href]"));
    const internalLinks: {
      url: string;
      anchorText: string;
      isNavigation: boolean;
      isFooter: boolean;
      noFollow: boolean;
    }[] = [];
    const externalLinks: typeof internalLinks = [];
    const brokenLinks: string[] = [];
    
    for (const link of allLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      
      try {
        const linkUrl = new URL(href, window.location.origin);
        const anchorText = link.textContent?.trim() || "";
        const isNav = isInNavOrFooter(link);
        const isFooter = link.closest("footer") !== null;
        const noFollow = link.getAttribute("rel")?.includes("nofollow") || false;
        
        const linkData = {
          url: linkUrl.href,
          anchorText,
          isNavigation: isNav,
          isFooter,
          noFollow,
        };
        
        const isInternal = 
          linkUrl.hostname === domain || 
          linkUrl.hostname === `www.${domain}` ||
          linkUrl.hostname.endsWith(`.${domain}`);
        
        if (isInternal) {
          internalLinks.push(linkData);
        } else if (linkUrl.protocol.startsWith("http")) {
          externalLinks.push(linkData);
        }
      } catch {
        brokenLinks.push(href);
      }
    }
    
    // Viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const hasViewportMeta = !!viewportMeta;
    
    // Schema markup
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemaMarkup: { type: string; data: Record<string, unknown>; valid: boolean }[] = [];
    
    schemaScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        schemaMarkup.push({
          type: data["@type"] || "Unknown",
          data,
          valid: true,
        });
      } catch {
        schemaMarkup.push({
          type: "Invalid",
          data: {},
          valid: false,
        });
      }
    });
    
    // OG Tags
    const ogTags: Record<string, string> = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const property = meta.getAttribute("property")?.replace("og:", "");
      const content = meta.getAttribute("content");
      if (property && content) {
        ogTags[property] = content;
      }
    });
    
    return {
      title,
      metaDescription,
      canonicalUrl,
      h1Tags,
      h2Tags,
      h3Tags,
      mainContentWordCount,
      totalWordCount,
      readabilityScore,
      imageCount,
      imagesWithAlt,
      imagesWithoutAlt,
      internalLinks,
      externalLinks,
      brokenLinks,
      hasViewportMeta,
      schemaMarkup,
      ogTags,
    };
  }, { domain, extractMainContent });
}

// ============================================
// PAGE TYPE CLASSIFICATION
// ============================================

function classifyPageType(
  url: string,
  title: string | null,
  h1Tags: string[],
  wordCount: number,
  schemaMarkup: SchemaMarkup[]
): { pageType: PageType; confidence: number } {
  const urlLower = url.toLowerCase();
  const titleLower = (title || "").toLowerCase();
  const h1Lower = h1Tags.join(" ").toLowerCase();
  
  // Check schema markup first (most reliable)
  for (const schema of schemaMarkup) {
    if (!schema.valid) continue;
    
    const type = schema.type.toLowerCase();
    if (type.includes("article") || type.includes("blogposting") || type.includes("newsarticle")) {
      return { pageType: "blog-post", confidence: 95 };
    }
    if (type.includes("product")) {
      return { pageType: "product", confidence: 95 };
    }
    if (type.includes("faqpage")) {
      return { pageType: "support", confidence: 90 };
    }
  }
  
  // URL pattern matching
  const urlPatterns: [RegExp, PageType, number][] = [
    [/^\/?$/, "homepage", 99],
    [/\/(blog|articles?|news|posts?|insights?)\/[^\/]+/, "blog-post", 90],
    [/\/(blog|articles?|news|posts?|insights?)\/?$/, "blog-listing", 85],
    [/\/(products?|shop|store)\/[^\/]+/, "product", 85],
    [/\/(products?|shop|store|collections?|categories?)\/?$/, "category", 80],
    [/\/(pricing|plans|packages)\/?$/, "pricing", 90],
    [/\/(about|about-us|team|company)\/?$/, "about", 90],
    [/\/(contact|contact-us|get-in-touch)\/?$/, "contact", 90],
    [/\/(login|signin|sign-in)\/?$/, "login", 95],
    [/\/(signup|register|sign-up|join)\/?$/, "signup", 95],
    [/\/(docs?|documentation|help|support|faq|knowledge-base)\/?/, "documentation", 85],
    [/\/(privacy|terms|legal|tos|gdpr|cookie)\/?$/, "legal", 90],
    [/\/(landing|lp|campaign)\//, "landing-page", 80],
  ];
  
  for (const [pattern, pageType, confidence] of urlPatterns) {
    if (pattern.test(new URL(url).pathname)) {
      return { pageType, confidence };
    }
  }
  
  // Title-based classification
  const titlePatterns: [RegExp, PageType, number][] = [
    [/^home\s*[-|]/i, "homepage", 80],
    [/blog|article|post/i, "blog-post", 70],
    [/pricing|plans/i, "pricing", 75],
    [/contact|get in touch/i, "contact", 75],
    [/about|our team|company/i, "about", 75],
    [/login|sign in/i, "login", 85],
    [/sign up|register|join/i, "signup", 85],
  ];
  
  for (const [pattern, pageType, confidence] of titlePatterns) {
    if (pattern.test(titleLower)) {
      return { pageType, confidence };
    }
  }
  
  // Content-based heuristics
  if (wordCount > 1000) {
    // Long content suggests blog post or documentation
    return { pageType: "blog-post", confidence: 60 };
  }
  
  if (wordCount < 200) {
    return { pageType: "utility", confidence: 50 };
  }
  
  return { pageType: "unknown", confidence: 30 };
}

// ============================================
// SITEMAP & ROBOTS DISCOVERY
// ============================================

async function discoverSitemapsAndRobots(
  baseUrl: string,
  domain: string,
  respectRobots: boolean
): Promise<{
  robotsTxt: string | null;
  sitemaps: string[];
  disallowed: string[];
}> {
  let robotsTxt: string | null = null;
  const sitemaps: string[] = [];
  const disallowed: string[] = [];
  
  // Fetch robots.txt
  try {
    const robotsResponse = await fetchWithTimeout(`${baseUrl}/robots.txt`, 10000);
    if (robotsResponse.ok) {
      robotsTxt = await robotsResponse.text();
      
      // Parse robots.txt for sitemaps
      const lines = robotsTxt.split("\n");
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith("sitemap:")) {
          const sitemapUrl = line.split(":").slice(1).join(":").trim();
          if (sitemapUrl) sitemaps.push(sitemapUrl);
        }
        
        if (respectRobots && trimmed.startsWith("disallow:")) {
          const path = line.split(":").slice(1).join(":").trim();
          if (path && path !== "/") disallowed.push(path);
        }
      }
    }
  } catch (error) {
    console.warn(`[Crawler V2] Failed to fetch robots.txt: ${error}`);
  }
  
  // Try common sitemap locations if none found in robots.txt
  if (sitemaps.length === 0) {
    const commonSitemapPaths = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap/sitemap.xml",
      "/sitemap/sitemap_index.xml",
      "/sitemaps/sitemap.xml",
      "/wp-sitemap.xml",  // WordPress
      "/sitemap.xml.gz",
    ];
    
    for (const path of commonSitemapPaths) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, 5000);
        if (response.ok) {
          sitemaps.push(`${baseUrl}${path}`);
          break; // Found one, stop looking
        }
      } catch {}
    }
  }
  
  return { robotsTxt, sitemaps, disallowed };
}

async function parseSitemaps(sitemapUrls: string[], maxUrls: number): Promise<string[]> {
  const urls: string[] = [];
  
  for (const sitemapUrl of sitemapUrls) {
    if (urls.length >= maxUrls) break;
    
    try {
      const response = await fetchWithTimeout(sitemapUrl, 15000);
      if (!response.ok) continue;
      
      const text = await response.text();
      
      // Check if it's a sitemap index
      if (text.includes("<sitemapindex")) {
        const sitemapMatches = text.match(/<loc>([^<]+)<\/loc>/g) || [];
        const childSitemaps = sitemapMatches
          .map(m => m.replace(/<\/?loc>/g, ""))
          .slice(0, 5); // Limit child sitemaps
        
        const childUrls = await parseSitemaps(childSitemaps, maxUrls - urls.length);
        urls.push(...childUrls);
      } else {
        // Regular sitemap
        const urlMatches = text.match(/<loc>([^<]+)<\/loc>/g) || [];
        const pageUrls = urlMatches
          .map(m => m.replace(/<\/?loc>/g, ""))
          .filter(u => !u.endsWith(".xml")); // Exclude nested sitemaps
        
        urls.push(...pageUrls.slice(0, maxUrls - urls.length));
      }
    } catch (error) {
      console.warn(`[Crawler V2] Failed to parse sitemap ${sitemapUrl}: ${error}`);
    }
  }
  
  return urls;
}

// ============================================
// CONFIDENCE SCORING
// ============================================

function calculateCrawlConfidence(
  pages: CrawledPageV2[],
  totalDiscovered: number,
  errors: CrawlError[],
  maxPages: number
): CrawlConfidence {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  // Factor 1: Pages crawled vs discovered
  const crawlRatio = pages.length / Math.max(totalDiscovered, 1);
  if (crawlRatio < 0.3) {
    score -= 30;
    reasons.push(`Only crawled ${Math.round(crawlRatio * 100)}% of discovered pages`);
    recommendations.push("Increase maxPages limit for more comprehensive analysis");
  } else if (crawlRatio < 0.6) {
    score -= 15;
    reasons.push(`Crawled ${Math.round(crawlRatio * 100)}% of discovered pages`);
  }
  
  // Factor 2: Error rate
  const errorRate = errors.length / Math.max(pages.length, 1);
  if (errorRate > 0.2) {
    score -= 25;
    reasons.push(`High error rate: ${Math.round(errorRate * 100)}% of requests failed`);
    recommendations.push("Check for rate limiting or access restrictions");
  } else if (errorRate > 0.1) {
    score -= 10;
    reasons.push(`${Math.round(errorRate * 100)}% of requests encountered errors`);
  }
  
  // Factor 3: Page type diversity
  const pageTypes = new Set(pages.map(p => p.pageType));
  if (pageTypes.size < 3) {
    score -= 20;
    reasons.push(`Limited page type diversity: only ${pageTypes.size} types found`);
    recommendations.push("Ensure blog, product, and landing pages are being crawled");
  }
  
  // Factor 4: Content extraction quality
  const lowConfidencePages = pages.filter(p => p.extractionConfidence < 50);
  if (lowConfidencePages.length > pages.length * 0.3) {
    score -= 15;
    reasons.push(`${Math.round(lowConfidencePages.length / pages.length * 100)}% of pages had low extraction confidence`);
    recommendations.push("Some pages may have JavaScript rendering issues");
  }
  
  // Factor 5: Absolute page count
  if (pages.length < 10) {
    score -= 20;
    reasons.push(`Only ${pages.length} pages analyzed - may not represent full site`);
    recommendations.push("Site-wide conclusions should be taken with caution");
  } else if (pages.length < 25) {
    score -= 10;
    reasons.push(`${pages.length} pages analyzed - moderate sample size`);
  }
  
  // Determine level
  let level: CrawlConfidence["level"];
  if (score >= 80) level = "high";
  else if (score >= 60) level = "medium";
  else if (score >= 40) level = "low";
  else level = "very-low";
  
  if (reasons.length === 0) {
    reasons.push("Good crawl coverage and data quality");
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    reasons,
    recommendations,
  };
}

function calculateExtractionConfidence(
  data: Partial<CrawledPageV2>,
  statusCode: number,
  loadTime: number
): number {
  let confidence = 100;
  
  // Status code — 403/401 with content is NOT a broken page.
  // Many sites (Adidas, Nike, etc.) return 403 to bots but still
  // serve complete page content through JS rendering.
  // If we have title + content, treat as crawlable-but-protected.
  const hasContent = Boolean(data.title) && (data.mainContentWordCount || 0) > 50;
  const isAuthBlock = statusCode === 403 || statusCode === 401;
  
  if (statusCode !== 200 && !(isAuthBlock && hasContent)) {
    confidence -= 30;
  } else if (isAuthBlock && hasContent) {
    // Content was extracted despite 403 — reduce penalty significantly
    confidence -= 5;
  }
  
  // Load time (very slow pages may not have fully rendered)
  if (loadTime > 15000) confidence -= 15;
  else if (loadTime > 10000) confidence -= 5;
  
  // Missing critical elements
  if (!data.title) confidence -= 10;
  if (!data.h1Tags?.length) confidence -= 5;
  if ((data.mainContentWordCount || 0) < 50 && !isAuthBlock) confidence -= 15;
  if ((data.internalLinks?.length || 0) < 3) confidence -= 10;
  
  return Math.max(0, confidence);
}

// ============================================
// UTILITIES
// ============================================

function parseAndNormalizeUrl(url: string): {
  baseUrl: string;
  domain: string;
  protocol: string;
} {
  let normalized = url.trim();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  
  const parsed = new URL(normalized);
  const protocol = parsed.protocol;
  
  // Remove www. for domain comparison
  let domain = parsed.hostname;
  if (domain.startsWith("www.")) {
    domain = domain.slice(4);
  }
  
  return {
    baseUrl: `${protocol}//${parsed.host}`,
    domain,
    protocol,
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase, remove common tracking params
    let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    normalized = normalized.replace(/\/$/, "").toLowerCase();
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

function groupPagesByType(pages: CrawledPageV2[]): Record<PageType, CrawledPageV2[]> {
  const grouped: Record<PageType, CrawledPageV2[]> = {
    "homepage": [],
    "blog-post": [],
    "blog-listing": [],
    "landing-page": [],
    "product": [],
    "category": [],
    "about": [],
    "contact": [],
    "legal": [],
    "login": [],
    "signup": [],
    "pricing": [],
    "documentation": [],
    "support": [],
    "utility": [],
    "unknown": [],
  };
  
  for (const page of pages) {
    grouped[page.pageType].push(page);
  }
  
  return grouped;
}

function estimateTimeRemaining(
  startTime: number,
  crawled: number,
  target: number
): number {
  if (crawled === 0) return 0;
  
  const elapsed = Date.now() - startTime;
  const rate = crawled / elapsed;
  const remaining = target - crawled;
  
  return Math.round(remaining / rate);
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MotionLabsBot/2.0; +https://motionlabs.ai/bot)",
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// QUICK CRAWL FOR AUDITS
// ============================================

export async function quickCrawlV2(
  url: string,
  options: CrawlOptionsV2 = {}
): Promise<CrawlResultV2> {
  return crawlWebsiteV2(url, {
    maxPages: 25,
    maxConcurrency: 5,
    timeout: 12000,
    waitForNetworkIdle: false,  // domcontentloaded is 5x faster and sufficient for SEO data
    extractMainContent: true,
    includeSubdomains: false,   // Skip subdomains for speed
    ...options,
  });
}
