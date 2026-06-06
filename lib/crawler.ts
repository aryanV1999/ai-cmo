/**
 * Crawler Engine
 * Headless browser crawling using Playwright for JS-rendered sites
 */

import { chromium, Browser, Page } from "playwright";

export interface CrawledPage {
  url: string;
  statusCode: number;
  redirectChain: string[];
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  hasViewportMeta: boolean;
  schemaMarkup: SchemaMarkup[];
  loadTime: number;
  errors: string[];
}

export interface SchemaMarkup {
  type: string;
  data: Record<string, unknown>;
}

export interface CrawlResult {
  domain: string;
  baseUrl: string;
  pages: CrawledPage[];
  sitemapFound: boolean;
  sitemapUrl: string | null;
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  totalPagesDiscovered: number;
  totalPagesCrawled: number;
  crawlDuration: number;
  errors: string[];
}

export interface CrawlOptions {
  maxPages?: number;
  maxConcurrency?: number;
  timeout?: number;
  respectRobotsTxt?: boolean;
  userAgent?: string;
  onProgress?: (progress: CrawlProgress) => void;
}

export interface CrawlProgress {
  pagesDiscovered: number;
  pagesCrawled: number;
  currentUrl: string;
  percentage: number;
}

const DEFAULT_OPTIONS: Required<Omit<CrawlOptions, "onProgress">> = {
  maxPages: 100,
  maxConcurrency: 5,
  timeout: 30000,
  respectRobotsTxt: true,
  userAgent:
    "Mozilla/5.0 (compatible; MotionLabsBot/1.0; +https://motionlabs.ai/bot)",
};

export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  let browser: Browser | null = null;
  const crawledPages: CrawledPage[] = [];
  const discoveredUrls = new Set<string>();
  const crawledUrls = new Set<string>();
  const errors: string[] = [];
  let robotsTxtContent: string | null = null;
  let robotsTxtFound = false;
  let sitemapUrl: string | null = null;
  let sitemapFound = false;

  // Normalize the start URL
  const baseUrl = normalizeBaseUrl(startUrl);
  const domain = new URL(baseUrl).hostname;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    // Check robots.txt
    if (opts.respectRobotsTxt) {
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
        if (robotsResponse.ok) {
          robotsTxtContent = await robotsResponse.text();
          robotsTxtFound = true;
        }
      } catch {
        // robots.txt not found or inaccessible
      }
    }

    // Check sitemap
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap/sitemap.xml`,
    ];

    for (const url of sitemapUrls) {
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (response.ok) {
          sitemapFound = true;
          sitemapUrl = url;
          break;
        }
      } catch {
        // Sitemap not found at this URL
      }
    }

    // Initialize crawl queue
    discoveredUrls.add(baseUrl);
    const urlQueue: string[] = [baseUrl];

    // Crawl pages with concurrency control
    const crawlPage = async (url: string): Promise<CrawledPage | null> => {
      if (crawledUrls.has(url)) return null;
      crawledUrls.add(url);

      const context = await browser!.newContext({
        userAgent: opts.userAgent,
      });
      const page = await context.newPage();

      try {
        const pageData = await extractPageData(page, url, domain, opts.timeout);

        // Discover new internal links
        for (const link of pageData.internalLinks) {
          if (!discoveredUrls.has(link) && discoveredUrls.size < opts.maxPages) {
            discoveredUrls.add(link);
            urlQueue.push(link);
          }
        }

        // Report progress
        if (opts.onProgress) {
          opts.onProgress({
            pagesDiscovered: discoveredUrls.size,
            pagesCrawled: crawledUrls.size,
            currentUrl: url,
            percentage: Math.round((crawledUrls.size / opts.maxPages) * 100),
          });
        }

        return pageData;
      } catch (error) {
        errors.push(`Failed to crawl ${url}: ${error}`);
        return null;
      } finally {
        await page.close();
        await context.close();
      }
    };

    // Process queue with concurrency
    while (
      urlQueue.length > 0 &&
      crawledUrls.size < opts.maxPages
    ) {
      const batch = urlQueue.splice(0, opts.maxConcurrency);
      const results = await Promise.all(batch.map(crawlPage));

      for (const result of results) {
        if (result) {
          crawledPages.push(result);
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return {
    domain,
    baseUrl,
    pages: crawledPages,
    sitemapFound,
    sitemapUrl,
    robotsTxtFound,
    robotsTxtContent,
    totalPagesDiscovered: discoveredUrls.size,
    totalPagesCrawled: crawledUrls.size,
    crawlDuration: Date.now() - startTime,
    errors,
  };
}

async function extractPageData(
  page: Page,
  url: string,
  domain: string,
  timeout: number
): Promise<CrawledPage> {
  const startTime = Date.now();
  const errors: string[] = [];
  const redirectChain: string[] = [];

  // Track redirects
  page.on("response", (response) => {
    if (response.status() >= 300 && response.status() < 400) {
      redirectChain.push(response.url());
    }
  });

  // Navigate to page
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout,
  });

  const statusCode = response?.status() || 0;
  const loadTime = Date.now() - startTime;

  // Extract page data
  const data = await page.evaluate((domain) => {
    // Title
    const title = document.querySelector("title")?.textContent?.trim() || null;

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const metaDescription = metaDesc?.getAttribute("content")?.trim() || null;

    // Canonical URL
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalEl?.getAttribute("href") || null;

    // Headings
    const h1Tags = Array.from(document.querySelectorAll("h1")).map(
      (el) => el.textContent?.trim() || ""
    );
    const h2Tags = Array.from(document.querySelectorAll("h2")).map(
      (el) => el.textContent?.trim() || ""
    );
    const h3Tags = Array.from(document.querySelectorAll("h3")).map(
      (el) => el.textContent?.trim() || ""
    );

    // Images
    const images = document.querySelectorAll("img");
    const imageCount = images.length;
    const imagesWithAlt = Array.from(images).filter(
      (img) => img.alt && img.alt.trim().length > 0
    ).length;
    const imagesWithoutAlt = imageCount - imagesWithAlt;

    // Links
    const allLinks = Array.from(document.querySelectorAll("a[href]"));
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];

    for (const link of allLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;

      try {
        const linkUrl = new URL(href, window.location.origin);
        if (linkUrl.hostname === domain || linkUrl.hostname === `www.${domain}`) {
          internalLinks.push(linkUrl.href);
        } else if (linkUrl.protocol.startsWith("http")) {
          externalLinks.push(linkUrl.href);
        }
      } catch {
        // Invalid URL
      }
    }

    // Word count
    const bodyText = document.body?.textContent || "";
    const wordCount = bodyText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Viewport meta
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const hasViewportMeta = !!viewportMeta;

    // Schema markup
    const schemaScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    const schemaMarkup: { type: string; data: Record<string, unknown> }[] = [];

    schemaScripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        schemaMarkup.push({
          type: data["@type"] || "Unknown",
          data,
        });
      } catch {
        // Invalid JSON
      }
    });

    return {
      title,
      metaDescription,
      canonicalUrl,
      h1Tags,
      h2Tags,
      h3Tags,
      imageCount,
      imagesWithAlt,
      imagesWithoutAlt,
      internalLinks: Array.from(new Set(internalLinks)),
      externalLinks: Array.from(new Set(externalLinks)),
      wordCount,
      hasViewportMeta,
      schemaMarkup,
    };
  }, domain);

  return {
    url,
    statusCode,
    redirectChain,
    loadTime,
    errors,
    ...data,
  };
}

function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  const parsed = new URL(normalized);
  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Quick crawl for audit - only crawl essential pages
 */
export async function quickCrawl(
  url: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  return crawlWebsite(url, {
    maxPages: 50,
    maxConcurrency: 5,
    timeout: 15000,
    ...options,
  });
}
