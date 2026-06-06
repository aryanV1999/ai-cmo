/**
 * Technical SEO Analyzer V2
 * 
 * Key improvements:
 * 1. Page-type aware analysis (don't penalize login pages for thin content)
 * 2. Confidence scoring on every finding
 * 3. Better internal link analysis with navigation detection
 * 4. Improved sitemap/robots detection
 * 5. Schema validation
 * 6. Core Web Vitals integration readiness
 */

import { CrawlResultV2, CrawledPageV2, PageType } from "../crawler-v2";

export interface TechnicalSeoFindingV2 {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  affectedUrls: string[];
  affectedCount: number;
  totalRelevantPages: number;  // Pages this check applies to
  percentAffected: number;
  score: number;
  confidence: number;
  data?: Record<string, unknown>;
}

export interface TechnicalSeoResultV2 {
  score: number;
  confidence: number;
  findings: TechnicalSeoFindingV2[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    passedChecks: number;
    totalChecks: number;
    crawlCoverage: string;
  };
  metrics: {
    totalPages: number;
    pagesWithIssues: number;
    avgInternalLinks: number;
    avgExternalLinks: number;
    pagesWithSchema: number;
    indexablePages: number;
  };
}

// Page types that should be analyzed for content
const CONTENT_PAGE_TYPES: PageType[] = [
  "homepage",
  "blog-post",
  "blog-listing",
  "landing-page",
  "product",
  "category",
  "about",
  "pricing",
  "documentation",
];

// Page types that are utility/transactional
const UTILITY_PAGE_TYPES: PageType[] = [
  "login",
  "signup",
  "contact",
  "legal",
  "utility",
  "support",
];

export function analyzeTechnicalSeoV2(crawlData: CrawlResultV2): TechnicalSeoResultV2 {
  const findings: TechnicalSeoFindingV2[] = [];
  
  // Get only successful pages
  const successfulPages = crawlData.pages.filter(p => p.statusCode === 200);
  const contentPages = successfulPages.filter(p => CONTENT_PAGE_TYPES.includes(p.pageType));
  
  // Run all checks
  findings.push(...checkBrokenLinksV2(crawlData));
  findings.push(...checkMissingTitlesV2(crawlData, successfulPages));
  findings.push(...checkDuplicateTitlesV2(crawlData, successfulPages));
  findings.push(...checkMissingMetaDescriptionsV2(crawlData, successfulPages));
  findings.push(...checkDuplicateMetaDescriptionsV2(crawlData, successfulPages));
  findings.push(...checkMissingH1V2(crawlData, contentPages));
  findings.push(...checkMultipleH1V2(crawlData, successfulPages));
  findings.push(...checkThinContentV2(crawlData, contentPages));
  findings.push(...checkInternalLinkingV2(crawlData, successfulPages));
  findings.push(...checkMissingSitemapV2(crawlData));
  findings.push(...checkMissingRobotsTxtV2(crawlData));
  findings.push(...checkCanonicalIssuesV2(crawlData, successfulPages));
  findings.push(...checkSchemaMarkupV2(crawlData, successfulPages));
  findings.push(...checkMobileReadinessV2(crawlData, successfulPages));
  findings.push(...checkImageOptimizationV2(crawlData, successfulPages));
  findings.push(...checkHttpsIssuesV2(crawlData));
  
  // Calculate summary
  const criticalCount = findings.filter(f => f.severity === "CRITICAL").length;
  const warningCount = findings.filter(f => f.severity === "WARNING").length;
  const infoCount = findings.filter(f => f.severity === "INFO").length;
  const totalChecks = 16;
  const passedChecks = totalChecks - criticalCount - warningCount;
  
  // Calculate overall score with confidence weighting
  const maxScore = 100;
  const criticalPenalty = criticalCount * 12;
  const warningPenalty = warningCount * 4;
  
  // Adjust for confidence
  const avgConfidence = findings.length > 0
    ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
    : 100;
  
  const rawScore = Math.max(0, maxScore - criticalPenalty - warningPenalty);
  const score = Math.round(rawScore * (avgConfidence / 100));
  
  // Calculate metrics
  const avgInternalLinks = successfulPages.length > 0
    ? Math.round(
        successfulPages.reduce((sum, p) => sum + p.internalLinks.filter(l => !l.isNavigation).length, 0) / 
        successfulPages.length
      )
    : 0;
  
  const avgExternalLinks = successfulPages.length > 0
    ? Math.round(
        successfulPages.reduce((sum, p) => sum + p.externalLinks.length, 0) / 
        successfulPages.length
      )
    : 0;
  
  const pagesWithSchema = successfulPages.filter(p => p.schemaMarkup.length > 0).length;
  
  return {
    score,
    confidence: crawlData.overallConfidence.score,
    findings: findings.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    summary: {
      criticalCount,
      warningCount,
      infoCount,
      passedChecks,
      totalChecks,
      crawlCoverage: `${crawlData.totalPagesCrawled}/${crawlData.totalPagesDiscovered} pages analyzed`,
    },
    metrics: {
      totalPages: crawlData.totalPagesCrawled,
      pagesWithIssues: findings.reduce((sum, f) => sum + f.affectedCount, 0),
      avgInternalLinks,
      avgExternalLinks,
      pagesWithSchema,
      indexablePages: successfulPages.length,
    },
  };
}

// ============================================
// CHECK FUNCTIONS
// ============================================

function checkBrokenLinksV2(crawlData: CrawlResultV2): TechnicalSeoFindingV2[] {
  const findings: TechnicalSeoFindingV2[] = [];
  
  const brokenPages = crawlData.pages.filter(p => p.statusCode >= 400 || p.statusCode === 0);
  const is4xx = brokenPages.filter(p => p.statusCode >= 400 && p.statusCode < 500);
  const is5xx = brokenPages.filter(p => p.statusCode >= 500);
  
  if (is4xx.length > 0) {
    const percentage = Math.round((is4xx.length / crawlData.pages.length) * 100);
    
    findings.push({
      type: "broken_links_4xx",
      severity: is4xx.length > 5 ? "CRITICAL" : "WARNING",
      title: `${is4xx.length} pages return 4xx errors`,
      description: `Found ${is4xx.length} pages (${percentage}% of crawled) returning client error status codes (404, 403, etc.).`,
      impact: "Broken links waste crawl budget, hurt user experience, and signal poor site maintenance to search engines.",
      howToFix: "Either restore these URLs with proper content, set up 301 redirects to relevant pages, or update internal links pointing to them.",
      affectedUrls: is4xx.slice(0, 10).map(p => p.url),
      affectedCount: is4xx.length,
      totalRelevantPages: crawlData.pages.length,
      percentAffected: percentage,
      score: Math.max(0, 100 - is4xx.length * 8),
      confidence: 95, // Very confident about status codes
    });
  }
  
  if (is5xx.length > 0) {
    findings.push({
      type: "broken_links_5xx",
      severity: "CRITICAL",
      title: `${is5xx.length} pages return server errors`,
      description: `Found ${is5xx.length} pages returning server error status codes (500, 502, etc.). These indicate serious technical problems.`,
      impact: "Server errors signal site instability. Search engines may reduce crawling and ranking for unreliable sites.",
      howToFix: "Check server logs immediately. Common causes: database errors, memory limits, code bugs, or timeout issues.",
      affectedUrls: is5xx.slice(0, 10).map(p => p.url),
      affectedCount: is5xx.length,
      totalRelevantPages: crawlData.pages.length,
      percentAffected: Math.round((is5xx.length / crawlData.pages.length) * 100),
      score: Math.max(0, 100 - is5xx.length * 15),
      confidence: 95,
    });
  }
  
  return findings;
}

function checkMissingTitlesV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const pagesWithoutTitle = pages.filter(p => !p.title || p.title.trim().length === 0);
  
  if (pagesWithoutTitle.length === 0) return [];
  
  const percentage = Math.round((pagesWithoutTitle.length / pages.length) * 100);
  
  return [{
    type: "missing_title",
    severity: percentage > 20 ? "CRITICAL" : percentage > 5 ? "WARNING" : "INFO",
    title: `${pagesWithoutTitle.length} pages missing title tags`,
    description: `${percentage}% of analyzed pages have no title tag. Title tags are one of the most important on-page SEO elements.`,
    impact: "Pages without titles display poorly in search results and are harder for search engines to understand and rank.",
    howToFix: "Add unique, descriptive title tags to each page. Include primary keyword. Keep under 60 characters.",
    affectedUrls: pagesWithoutTitle.slice(0, 10).map(p => p.url),
    affectedCount: pagesWithoutTitle.length,
    totalRelevantPages: pages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - percentage * 2),
    confidence: 90,
  }];
}

function checkDuplicateTitlesV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const titleMap = new Map<string, CrawledPageV2[]>();
  
  for (const page of pages) {
    if (page.title && page.title.trim().length > 0) {
      const normalized = page.title.toLowerCase().trim();
      const existing = titleMap.get(normalized) || [];
      existing.push(page);
      titleMap.set(normalized, existing);
    }
  }
  
  const duplicates = Array.from(titleMap.entries()).filter(([, pages]) => pages.length > 1);
  
  if (duplicates.length === 0) return [];
  
  const totalDuplicatePages = duplicates.reduce((sum, [, p]) => sum + p.length, 0);
  const percentage = Math.round((totalDuplicatePages / pages.length) * 100);
  
  return [{
    type: "duplicate_title",
    severity: duplicates.length > 10 ? "WARNING" : "INFO",
    title: `${duplicates.length} duplicate title tags found`,
    description: `Found ${duplicates.length} titles used across ${totalDuplicatePages} pages (${percentage}% of site).`,
    impact: "Duplicate titles make it harder for search engines to differentiate pages, potentially hurting rankings for all affected pages.",
    howToFix: "Give each page a unique title that accurately describes its specific content and includes page-specific keywords.",
    affectedUrls: duplicates.flatMap(([, pages]) => pages.map(p => p.url)).slice(0, 10),
    affectedCount: totalDuplicatePages,
    totalRelevantPages: pages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - duplicates.length * 3),
    confidence: 90,
    data: {
      duplicateGroups: duplicates.slice(0, 5).map(([title, pages]) => ({
        title,
        count: pages.length,
        urls: pages.slice(0, 3).map(p => p.url),
      })),
    },
  }];
}

function checkMissingMetaDescriptionsV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const pagesWithoutMeta = pages.filter(
    p => !p.metaDescription || p.metaDescription.trim().length === 0
  );
  
  if (pagesWithoutMeta.length === 0) return [];
  
  const percentage = Math.round((pagesWithoutMeta.length / pages.length) * 100);
  
  return [{
    type: "missing_meta_description",
    severity: percentage > 50 ? "CRITICAL" : percentage > 20 ? "WARNING" : "INFO",
    title: `${pagesWithoutMeta.length} pages missing meta descriptions`,
    description: `${percentage}% of pages have no meta description. Google will auto-generate descriptions, often poorly.`,
    impact: "Missing meta descriptions typically result in 20-30% lower click-through rates compared to pages with compelling descriptions.",
    howToFix: "Write unique, compelling meta descriptions (150-160 characters) for each page. Include primary keywords and a call-to-action.",
    affectedUrls: pagesWithoutMeta.slice(0, 10).map(p => p.url),
    affectedCount: pagesWithoutMeta.length,
    totalRelevantPages: pages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - percentage),
    confidence: 90,
  }];
}

function checkDuplicateMetaDescriptionsV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const metaMap = new Map<string, CrawledPageV2[]>();
  
  for (const page of pages) {
    if (page.metaDescription && page.metaDescription.trim().length > 10) {
      const normalized = page.metaDescription.toLowerCase().trim();
      const existing = metaMap.get(normalized) || [];
      existing.push(page);
      metaMap.set(normalized, existing);
    }
  }
  
  const duplicates = Array.from(metaMap.entries()).filter(([, pages]) => pages.length > 1);
  
  if (duplicates.length === 0) return [];
  
  const totalDuplicatePages = duplicates.reduce((sum, [, p]) => sum + p.length, 0);
  
  return [{
    type: "duplicate_meta_description",
    severity: duplicates.length > 10 ? "WARNING" : "INFO",
    title: `${duplicates.length} duplicate meta descriptions found`,
    description: `Found ${duplicates.length} meta descriptions used across ${totalDuplicatePages} pages.`,
    impact: "Duplicate descriptions reduce click-through rates and make pages harder to differentiate in search results.",
    howToFix: "Write unique meta descriptions for each page that specifically describe that page's content.",
    affectedUrls: duplicates.flatMap(([, pages]) => pages.map(p => p.url)).slice(0, 10),
    affectedCount: totalDuplicatePages,
    totalRelevantPages: pages.length,
    percentAffected: Math.round((totalDuplicatePages / pages.length) * 100),
    score: Math.max(0, 100 - duplicates.length * 3),
    confidence: 90,
  }];
}

function checkMissingH1V2(
  crawlData: CrawlResultV2,
  contentPages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  // Only check content pages - login/utility pages may legitimately lack H1
  const pagesWithoutH1 = contentPages.filter(p => p.h1Tags.length === 0);
  
  if (pagesWithoutH1.length === 0) return [];
  
  const percentage = Math.round((pagesWithoutH1.length / contentPages.length) * 100);
  
  return [{
    type: "missing_h1",
    severity: percentage > 30 ? "WARNING" : "INFO",
    title: `${pagesWithoutH1.length} content pages missing H1 tags`,
    description: `${percentage}% of content pages lack an H1 heading. Note: This only counts content pages (not login, signup, or utility pages).`,
    impact: "H1 tags help search engines understand page topic and hierarchy. Missing H1s can hurt rankings and accessibility.",
    howToFix: "Add a single, descriptive H1 tag to each page that clearly describes the page content and includes target keywords.",
    affectedUrls: pagesWithoutH1.slice(0, 10).map(p => p.url),
    affectedCount: pagesWithoutH1.length,
    totalRelevantPages: contentPages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - percentage),
    confidence: 85, // Slightly lower - H1 detection can be tricky with styled elements
    data: {
      pageTypesAffected: Array.from(new Set(pagesWithoutH1.map(p => p.pageType))),
    },
  }];
}

function checkMultipleH1V2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const pagesWithMultipleH1 = pages.filter(p => p.h1Tags.length > 1);
  
  if (pagesWithMultipleH1.length === 0) return [];
  
  const percentage = Math.round((pagesWithMultipleH1.length / pages.length) * 100);
  
  return [{
    type: "multiple_h1",
    severity: "INFO",
    title: `${pagesWithMultipleH1.length} pages have multiple H1 tags`,
    description: `${percentage}% of pages have more than one H1. While not critical in HTML5, a single H1 is best practice.`,
    impact: "Multiple H1s can dilute keyword focus and confuse search engines about the primary topic of the page.",
    howToFix: "Consolidate to a single H1 per page. Use H2-H6 for subheadings to create a clear content hierarchy.",
    affectedUrls: pagesWithMultipleH1.slice(0, 10).map(p => p.url),
    affectedCount: pagesWithMultipleH1.length,
    totalRelevantPages: pages.length,
    percentAffected: percentage,
    score: Math.max(70, 100 - percentage),
    confidence: 85,
    data: {
      exampleH1s: pagesWithMultipleH1.slice(0, 3).map(p => ({
        url: p.url,
        h1s: p.h1Tags,
      })),
    },
  }];
}

function checkThinContentV2(
  crawlData: CrawlResultV2,
  contentPages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  // Only check content pages - login/utility pages are expected to have little content
  const thinContentThreshold = 300; // Main content word count, not total
  
  const thinPages = contentPages.filter(p => p.mainContentWordCount < thinContentThreshold);
  
  if (thinPages.length === 0) return [];
  
  const percentage = Math.round((thinPages.length / contentPages.length) * 100);
  
  // Lower severity if crawl confidence is low
  const baseSeverity = percentage > 40 ? "WARNING" : "INFO";
  const severity = crawlData.overallConfidence.level === "low" ? "INFO" : baseSeverity;
  
  return [{
    type: "thin_content",
    severity,
    title: `${thinPages.length} content pages have thin content`,
    description: `${percentage}% of content pages have less than ${thinContentThreshold} words of main content. This excludes navigation, footers, and utility pages.`,
    impact: "Thin content pages struggle to rank and may be seen as low-quality by Google's Helpful Content system.",
    howToFix: "Expand thin pages with valuable content, or consolidate them with related pages. Aim for 1,000+ words for blog posts.",
    affectedUrls: thinPages.slice(0, 10).map(p => p.url),
    affectedCount: thinPages.length,
    totalRelevantPages: contentPages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - percentage),
    confidence: crawlData.overallConfidence.score * 0.8, // Reduce confidence - content extraction can be imprecise
    data: {
      avgWordCount: Math.round(
        contentPages.reduce((sum, p) => sum + p.mainContentWordCount, 0) / contentPages.length
      ),
      pageTypesAffected: Array.from(new Set(thinPages.map(p => p.pageType))),
      note: "Word count based on main content area, excluding navigation and footers.",
    },
  }];
}

function checkInternalLinkingV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const findings: TechnicalSeoFindingV2[] = [];
  
  // Calculate internal links excluding navigation
  const contentLinks = pages.map(p => ({
    url: p.url,
    contentLinks: p.internalLinks.filter(l => !l.isNavigation && !l.isFooter).length,
    totalLinks: p.internalLinks.length,
  }));
  
  const avgContentLinks = contentLinks.reduce((sum, p) => sum + p.contentLinks, 0) / pages.length;
  const avgTotalLinks = contentLinks.reduce((sum, p) => sum + p.totalLinks, 0) / pages.length;
  
  // Check for pages with poor internal linking
  const poorlyLinkedPages = contentLinks.filter(p => p.contentLinks < 3 && p.totalLinks > 5);
  
  if (poorlyLinkedPages.length > pages.length * 0.3) {
    findings.push({
      type: "poor_internal_linking",
      severity: "WARNING",
      title: `${poorlyLinkedPages.length} pages have weak internal linking`,
      description: `${Math.round((poorlyLinkedPages.length / pages.length) * 100)}% of pages have fewer than 3 contextual internal links (excluding navigation). Average: ${avgContentLinks.toFixed(1)} content links per page, ${avgTotalLinks.toFixed(1)} total links.`,
      impact: "Poor internal linking prevents link equity distribution and makes it harder for search engines to discover and rank your content.",
      howToFix: "Add relevant internal links within page content. Link from high-authority pages to important pages you want to rank.",
      affectedUrls: poorlyLinkedPages.slice(0, 10).map(p => p.url),
      affectedCount: poorlyLinkedPages.length,
      totalRelevantPages: pages.length,
      percentAffected: Math.round((poorlyLinkedPages.length / pages.length) * 100),
      score: Math.max(50, 100 - poorlyLinkedPages.length * 2),
      confidence: 75, // Lower confidence - link classification can be imprecise
      data: {
        avgContentLinks: avgContentLinks.toFixed(1),
        avgTotalLinks: avgTotalLinks.toFixed(1),
        note: "Content links exclude navigation menus and footers for more accurate analysis.",
      },
    });
  }
  
  return findings;
}

function checkMissingSitemapV2(crawlData: CrawlResultV2): TechnicalSeoFindingV2[] {
  if (crawlData.sitemapFound && crawlData.sitemapUrls.length > 0) {
    return [{
      type: "sitemap_found",
      severity: "INFO",
      title: `XML sitemap found (${crawlData.sitemapUrls.length} sitemap${crawlData.sitemapUrls.length > 1 ? "s" : ""})`,
      description: `Sitemap detected at: ${crawlData.sitemapUrls[0]}. Contains references to ${crawlData.sitemapPagesCount} pages.`,
      impact: "Having a sitemap helps search engines discover and index your pages efficiently.",
      howToFix: "Keep your sitemap updated as you add/remove pages.",
      affectedUrls: [],
      affectedCount: 0,
      totalRelevantPages: 1,
      percentAffected: 0,
      score: 100,
      confidence: 95,
    }];
  }
  
  return [{
    type: "missing_sitemap",
    severity: "WARNING",
    title: "No XML sitemap found",
    description: "Could not find an XML sitemap at common locations (/sitemap.xml, /sitemap_index.xml) or in robots.txt.",
    impact: "Without a sitemap, search engines may miss pages, especially those with poor internal linking.",
    howToFix: "Create an XML sitemap and submit it to Google Search Console. Most CMS platforms can generate one automatically.",
    affectedUrls: [`${crawlData.baseUrl}/sitemap.xml`],
    affectedCount: 1,
    totalRelevantPages: 1,
    percentAffected: 100,
    score: 50,
    confidence: 80, // Could be rate-limited or dynamic
  }];
}

function checkMissingRobotsTxtV2(crawlData: CrawlResultV2): TechnicalSeoFindingV2[] {
  if (crawlData.robotsTxtFound) {
    return [];
  }
  
  return [{
    type: "missing_robots_txt",
    severity: "INFO",
    title: "No robots.txt file found",
    description: "Could not find a robots.txt file. While not required, it's best practice for controlling crawling.",
    impact: "Without robots.txt, you can't guide crawler behavior or point to your sitemap.",
    howToFix: "Create a robots.txt file at the root of your domain. Include your sitemap URL and any crawl directives.",
    affectedUrls: [`${crawlData.baseUrl}/robots.txt`],
    affectedCount: 1,
    totalRelevantPages: 1,
    percentAffected: 100,
    score: 80,
    confidence: 85,
  }];
}

function checkCanonicalIssuesV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const findings: TechnicalSeoFindingV2[] = [];
  
  // Missing canonicals
  const pagesWithoutCanonical = pages.filter(p => !p.canonicalUrl);
  
  if (pagesWithoutCanonical.length > pages.length * 0.5) {
    findings.push({
      type: "missing_canonical",
      severity: "WARNING",
      title: `${pagesWithoutCanonical.length} pages missing canonical tags`,
      description: `${Math.round((pagesWithoutCanonical.length / pages.length) * 100)}% of pages lack canonical tags.`,
      impact: "Missing canonicals can lead to duplicate content issues if your site is accessible via multiple URLs.",
      howToFix: "Add self-referencing canonical tags to all pages. Use absolute URLs.",
      affectedUrls: pagesWithoutCanonical.slice(0, 10).map(p => p.url),
      affectedCount: pagesWithoutCanonical.length,
      totalRelevantPages: pages.length,
      percentAffected: Math.round((pagesWithoutCanonical.length / pages.length) * 100),
      score: Math.max(60, 100 - pagesWithoutCanonical.length * 2),
      confidence: 90,
    });
  }
  
  // Non-self-referencing canonicals (potential issues)
  const suspiciousCanonicals = pages.filter(p => {
    if (!p.canonicalUrl) return false;
    try {
      const canonical = new URL(p.canonicalUrl, p.url).href;
      const pageUrl = p.finalUrl || p.url;
      // Normalize for comparison
      const normalizedCanonical = canonical.replace(/\/$/, "").toLowerCase();
      const normalizedPage = pageUrl.replace(/\/$/, "").toLowerCase();
      return normalizedCanonical !== normalizedPage;
    } catch {
      return false;
    }
  });
  
  if (suspiciousCanonicals.length > 5) {
    findings.push({
      type: "suspicious_canonical",
      severity: "INFO",
      title: `${suspiciousCanonicals.length} pages have non-self-referencing canonicals`,
      description: "These pages point to a different canonical URL. This may be intentional (pagination, variants) or a configuration issue.",
      impact: "Incorrect canonicals can cause the wrong page to rank, or no page at all if there's a loop.",
      howToFix: "Review canonical tags to ensure they point to the correct preferred URL.",
      affectedUrls: suspiciousCanonicals.slice(0, 10).map(p => p.url),
      affectedCount: suspiciousCanonicals.length,
      totalRelevantPages: pages.length,
      percentAffected: Math.round((suspiciousCanonicals.length / pages.length) * 100),
      score: 80,
      confidence: 70, // May be intentional
    });
  }
  
  return findings;
}

function checkSchemaMarkupV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const pagesWithSchema = pages.filter(p => p.schemaMarkup.length > 0);
  const pagesWithValidSchema = pages.filter(p => 
    p.schemaMarkup.some(s => s.valid)
  );
  
  const schemaTypes = new Set(
    pages.flatMap(p => p.schemaMarkup.map(s => s.type))
  );
  
  if (pagesWithSchema.length === 0) {
    return [{
      type: "missing_schema",
      severity: "WARNING",
      title: "No structured data (schema markup) detected",
      description: "No pages have JSON-LD structured data. Schema markup enables rich snippets in search results.",
      impact: "Without schema markup, you're missing rich snippet opportunities that can increase CTR by 30%+.",
      howToFix: "Add relevant schema markup: Organization for homepage, Article for blog posts, Product for products, FAQ for Q&A content.",
      affectedUrls: pages.slice(0, 5).map(p => p.url),
      affectedCount: pages.length,
      totalRelevantPages: pages.length,
      percentAffected: 100,
      score: 50,
      confidence: 85,
    }];
  }
  
  const coverage = Math.round((pagesWithSchema.length / pages.length) * 100);
  
  if (coverage < 50) {
    return [{
      type: "low_schema_coverage",
      severity: "INFO",
      title: `Only ${coverage}% of pages have schema markup`,
      description: `Found schema on ${pagesWithSchema.length} of ${pages.length} pages. Types detected: ${Array.from(schemaTypes).join(", ")}.`,
      impact: "Expanding schema coverage could unlock more rich snippet opportunities.",
      howToFix: "Add appropriate schema markup to blog posts (Article), products (Product), and FAQ pages (FAQPage).",
      affectedUrls: pages.filter(p => p.schemaMarkup.length === 0).slice(0, 10).map(p => p.url),
      affectedCount: pages.length - pagesWithSchema.length,
      totalRelevantPages: pages.length,
      percentAffected: 100 - coverage,
      score: 70,
      confidence: 85,
    }];
  }
  
  return [{
    type: "good_schema_coverage",
    severity: "INFO",
    title: `Good schema coverage: ${coverage}% of pages`,
    description: `Schema markup found on ${pagesWithSchema.length} pages. Types: ${Array.from(schemaTypes).join(", ")}.`,
    impact: "Good structured data implementation supports rich snippets in search results.",
    howToFix: "Validate schema using Google's Rich Results Test and expand to remaining pages.",
    affectedUrls: [],
    affectedCount: 0,
    totalRelevantPages: pages.length,
    percentAffected: 0,
    score: 90,
    confidence: 85,
  }];
}

function checkMobileReadinessV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const pagesWithoutViewport = pages.filter(p => !p.hasViewportMeta);
  
  if (pagesWithoutViewport.length === 0) {
    return [];
  }
  
  const percentage = Math.round((pagesWithoutViewport.length / pages.length) * 100);
  
  return [{
    type: "missing_viewport",
    severity: percentage > 20 ? "CRITICAL" : "WARNING",
    title: `${pagesWithoutViewport.length} pages missing viewport meta tag`,
    description: `${percentage}% of pages lack viewport meta tags, indicating they may not be mobile-optimized.`,
    impact: "Google uses mobile-first indexing. Pages without viewport meta may rank poorly on mobile searches.",
    howToFix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the head of every page.",
    affectedUrls: pagesWithoutViewport.slice(0, 10).map(p => p.url),
    affectedCount: pagesWithoutViewport.length,
    totalRelevantPages: pages.length,
    percentAffected: percentage,
    score: Math.max(0, 100 - percentage * 2),
    confidence: 90,
  }];
}

function checkImageOptimizationV2(
  crawlData: CrawlResultV2,
  pages: CrawledPageV2[]
): TechnicalSeoFindingV2[] {
  const totalImages = pages.reduce((sum, p) => sum + p.imageCount, 0);
  const imagesWithAlt = pages.reduce((sum, p) => sum + p.imagesWithAlt, 0);
  const imagesWithoutAlt = pages.reduce((sum, p) => sum + p.imagesWithoutAlt, 0);
  
  if (totalImages === 0) {
    return [];
  }
  
  const altCoverage = Math.round((imagesWithAlt / totalImages) * 100);
  
  if (altCoverage < 80) {
    return [{
      type: "images_missing_alt",
      severity: altCoverage < 50 ? "WARNING" : "INFO",
      title: `${imagesWithoutAlt} images missing alt text (${100 - altCoverage}%)`,
      description: `Only ${altCoverage}% of images have alt text. Found ${totalImages} total images across analyzed pages.`,
      impact: "Missing alt text hurts accessibility and image SEO. Images won't appear in Google Image searches.",
      howToFix: "Add descriptive alt text to all images. Describe what's in the image and include relevant keywords where natural.",
      affectedUrls: pages.filter(p => p.imagesWithoutAlt > 0).slice(0, 10).map(p => p.url),
      affectedCount: imagesWithoutAlt,
      totalRelevantPages: totalImages,
      percentAffected: 100 - altCoverage,
      score: Math.max(50, altCoverage),
      confidence: 85,
    }];
  }
  
  return [];
}

function checkHttpsIssuesV2(crawlData: CrawlResultV2): TechnicalSeoFindingV2[] {
  const isHttps = crawlData.baseUrl.startsWith("https://");
  
  if (!isHttps) {
    return [{
      type: "not_https",
      severity: "CRITICAL",
      title: "Site is not using HTTPS",
      description: "Your site is served over HTTP instead of HTTPS.",
      impact: "Google marks HTTP sites as 'Not Secure'. HTTPS is a ranking factor and builds user trust.",
      howToFix: "Install an SSL certificate (free from Let's Encrypt) and redirect all HTTP traffic to HTTPS.",
      affectedUrls: [crawlData.baseUrl],
      affectedCount: crawlData.totalPagesCrawled,
      totalRelevantPages: crawlData.totalPagesCrawled,
      percentAffected: 100,
      score: 0,
      confidence: 99,
    }];
  }
  
  // Check for mixed content (internal links to HTTP)
  const mixedContentPages = crawlData.pages.filter(p =>
    p.internalLinks.some(l => l.url.startsWith("http://"))
  );
  
  if (mixedContentPages.length > 0) {
    return [{
      type: "mixed_content",
      severity: "WARNING",
      title: `${mixedContentPages.length} pages have mixed content (HTTP links)`,
      description: "Some pages link internally to HTTP URLs despite the site being HTTPS.",
      impact: "Mixed content can cause security warnings and hurt user trust.",
      howToFix: "Update all internal links to use HTTPS or protocol-relative URLs.",
      affectedUrls: mixedContentPages.slice(0, 10).map(p => p.url),
      affectedCount: mixedContentPages.length,
      totalRelevantPages: crawlData.pages.length,
      percentAffected: Math.round((mixedContentPages.length / crawlData.pages.length) * 100),
      score: 70,
      confidence: 90,
    }];
  }
  
  return [];
}
