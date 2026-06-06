/**
 * Technical SEO Analyzer
 * Analyzes crawl data to identify technical SEO issues
 */

import { CrawlResult, CrawledPage } from "../crawler";

export interface TechnicalSeoFinding {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  affectedUrls: string[];
  affectedCount: number;
  score: number;
  data?: Record<string, unknown>;
}

export interface TechnicalSeoResult {
  score: number;
  findings: TechnicalSeoFinding[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    passedChecks: number;
    totalChecks: number;
  };
}

export function analyzeTechnicalSeo(crawlData: CrawlResult): TechnicalSeoResult {
  const findings: TechnicalSeoFinding[] = [];

  // Run all technical SEO checks
  findings.push(...checkBrokenLinks(crawlData));
  findings.push(...checkMissingTitles(crawlData));
  findings.push(...checkDuplicateTitles(crawlData));
  findings.push(...checkMissingMetaDescriptions(crawlData));
  findings.push(...checkDuplicateMetaDescriptions(crawlData));
  findings.push(...checkMissingH1(crawlData));
  findings.push(...checkMultipleH1(crawlData));
  findings.push(...checkOrphanPages(crawlData));
  findings.push(...checkRedirectChains(crawlData));
  findings.push(...checkMissingSitemap(crawlData));
  findings.push(...checkMissingRobotsTxt(crawlData));
  findings.push(...checkHttpsIssues(crawlData));
  findings.push(...checkMobileViewport(crawlData));
  findings.push(...checkCanonicalIssues(crawlData));

  // Calculate summary
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const infoCount = findings.filter((f) => f.severity === "INFO").length;
  const totalChecks = 14; // Total number of checks we run
  const passedChecks = totalChecks - criticalCount - warningCount;

  // Calculate overall score (0-100)
  // Critical issues have 3x weight, warnings have 1.5x weight
  const maxScore = 100;
  const criticalPenalty = criticalCount * 15;
  const warningPenalty = warningCount * 5;
  const score = Math.max(0, maxScore - criticalPenalty - warningPenalty);

  return {
    score,
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
    },
  };
}

// Check 1: Broken Links (4xx/5xx status codes)
function checkBrokenLinks(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const brokenPages = crawlData.pages.filter(
    (p) => p.statusCode >= 400 || p.statusCode === 0
  );

  if (brokenPages.length === 0) return [];

  const is4xx = brokenPages.filter((p) => p.statusCode >= 400 && p.statusCode < 500);
  const is5xx = brokenPages.filter((p) => p.statusCode >= 500);

  const findings: TechnicalSeoFinding[] = [];

  if (is4xx.length > 0) {
    findings.push({
      type: "broken_links_4xx",
      severity: "CRITICAL",
      title: `${is4xx.length} pages return 4xx errors`,
      description: `Found ${is4xx.length} pages that return client error status codes (404, 403, etc.). These pages are not accessible to users or search engines.`,
      impact:
        "Broken links hurt user experience and waste crawl budget. Search engines may lower your site's quality signals.",
      howToFix:
        "Either fix these URLs to return proper content, or set up 301 redirects to relevant pages. Remove any internal links pointing to these broken URLs.",
      affectedUrls: is4xx.slice(0, 10).map((p) => p.url),
      affectedCount: is4xx.length,
      score: Math.max(0, 100 - is4xx.length * 10),
    });
  }

  if (is5xx.length > 0) {
    findings.push({
      type: "broken_links_5xx",
      severity: "CRITICAL",
      title: `${is5xx.length} pages return server errors`,
      description: `Found ${is5xx.length} pages that return server error status codes (500, 502, etc.). These indicate serious technical problems.`,
      impact:
        "Server errors indicate your site is unstable. Search engines may reduce crawling and ranking for unreliable sites.",
      howToFix:
        "Check your server logs to identify the root cause. Common issues include database errors, memory limits, or code bugs.",
      affectedUrls: is5xx.slice(0, 10).map((p) => p.url),
      affectedCount: is5xx.length,
      score: Math.max(0, 100 - is5xx.length * 15),
    });
  }

  return findings;
}

// Check 2: Missing Title Tags
function checkMissingTitles(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const pagesWithoutTitle = crawlData.pages.filter(
    (p) => p.statusCode === 200 && (!p.title || p.title.trim().length === 0)
  );

  if (pagesWithoutTitle.length === 0) return [];

  const percentage = Math.round(
    (pagesWithoutTitle.length / crawlData.pages.length) * 100
  );

  return [
    {
      type: "missing_title",
      severity: percentage > 20 ? "CRITICAL" : "WARNING",
      title: `${pagesWithoutTitle.length} pages missing title tags`,
      description: `${percentage}% of your pages have no title tag. Title tags are one of the most important on-page SEO elements.`,
      impact:
        "Pages without titles will display poorly in search results and are harder for search engines to understand and rank.",
      howToFix:
        "Add unique, descriptive title tags to each page. Include your primary keyword naturally. Keep titles under 60 characters.",
      affectedUrls: pagesWithoutTitle.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithoutTitle.length,
      score: Math.max(0, 100 - percentage),
    },
  ];
}

// Check 3: Duplicate Title Tags
function checkDuplicateTitles(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const titleMap = new Map<string, CrawledPage[]>();

  for (const page of crawlData.pages) {
    if (page.title && page.statusCode === 200) {
      const normalized = page.title.toLowerCase().trim();
      const existing = titleMap.get(normalized) || [];
      existing.push(page);
      titleMap.set(normalized, existing);
    }
  }

  const duplicates = Array.from(titleMap.entries()).filter(
    ([, pages]) => pages.length > 1
  );

  if (duplicates.length === 0) return [];

  const totalDuplicatePages = duplicates.reduce(
    (sum, [, pages]) => sum + pages.length,
    0
  );

  return [
    {
      type: "duplicate_title",
      severity: duplicates.length > 5 ? "WARNING" : "INFO",
      title: `${duplicates.length} duplicate title tags found`,
      description: `Found ${duplicates.length} titles used across multiple pages, affecting ${totalDuplicatePages} total pages.`,
      impact:
        "Duplicate titles make it harder for search engines to differentiate your pages, potentially hurting rankings for all affected pages.",
      howToFix:
        "Give each page a unique title that accurately describes its content. Include page-specific keywords.",
      affectedUrls: duplicates
        .flatMap(([, pages]) => pages.map((p) => p.url))
        .slice(0, 10),
      affectedCount: totalDuplicatePages,
      score: Math.max(0, 100 - duplicates.length * 5),
      data: {
        duplicateGroups: duplicates.slice(0, 5).map(([title, pages]) => ({
          title,
          count: pages.length,
          urls: pages.slice(0, 3).map((p) => p.url),
        })),
      },
    },
  ];
}

// Check 4: Missing Meta Descriptions
function checkMissingMetaDescriptions(
  crawlData: CrawlResult
): TechnicalSeoFinding[] {
  const pagesWithoutDesc = crawlData.pages.filter(
    (p) =>
      p.statusCode === 200 &&
      (!p.metaDescription || p.metaDescription.trim().length === 0)
  );

  if (pagesWithoutDesc.length === 0) return [];

  const percentage = Math.round(
    (pagesWithoutDesc.length / crawlData.pages.length) * 100
  );

  return [
    {
      type: "missing_meta_description",
      severity: percentage > 40 ? "CRITICAL" : percentage > 20 ? "WARNING" : "INFO",
      title: `${pagesWithoutDesc.length} pages missing meta descriptions`,
      description: `${percentage}% of your pages have no meta description. Google will auto-generate snippets for these pages.`,
      impact:
        "Without meta descriptions, you lose control over how your pages appear in search results. Auto-generated snippets often perform worse for click-through rates.",
      howToFix:
        "Add compelling meta descriptions (150-160 characters) to each page. Include a call-to-action and your primary keyword.",
      affectedUrls: pagesWithoutDesc.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithoutDesc.length,
      score: Math.max(0, 100 - percentage),
    },
  ];
}

// Check 5: Duplicate Meta Descriptions
function checkDuplicateMetaDescriptions(
  crawlData: CrawlResult
): TechnicalSeoFinding[] {
  const descMap = new Map<string, CrawledPage[]>();

  for (const page of crawlData.pages) {
    if (page.metaDescription && page.statusCode === 200) {
      const normalized = page.metaDescription.toLowerCase().trim();
      const existing = descMap.get(normalized) || [];
      existing.push(page);
      descMap.set(normalized, existing);
    }
  }

  const duplicates = Array.from(descMap.entries()).filter(
    ([, pages]) => pages.length > 1
  );

  if (duplicates.length === 0) return [];

  return [
    {
      type: "duplicate_meta_description",
      severity: "WARNING",
      title: `${duplicates.length} duplicate meta descriptions found`,
      description: `Found ${duplicates.length} meta descriptions used across multiple pages.`,
      impact:
        "Duplicate meta descriptions reduce the effectiveness of your search snippets and miss opportunities for page-specific messaging.",
      howToFix:
        "Write unique meta descriptions for each page that summarize the specific content and include relevant keywords.",
      affectedUrls: duplicates
        .flatMap(([, pages]) => pages.map((p) => p.url))
        .slice(0, 10),
      affectedCount: duplicates.reduce((sum, [, pages]) => sum + pages.length, 0),
      score: Math.max(0, 100 - duplicates.length * 3),
    },
  ];
}

// Check 6: Missing H1 Tags
function checkMissingH1(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const pagesWithoutH1 = crawlData.pages.filter(
    (p) => p.statusCode === 200 && p.h1Tags.length === 0
  );

  if (pagesWithoutH1.length === 0) return [];

  const percentage = Math.round(
    (pagesWithoutH1.length / crawlData.pages.length) * 100
  );

  return [
    {
      type: "missing_h1",
      severity: percentage > 30 ? "CRITICAL" : "WARNING",
      title: `${pagesWithoutH1.length} pages missing H1 tags`,
      description: `${percentage}% of your pages have no H1 heading. The H1 tag tells search engines what a page is about.`,
      impact:
        "Missing H1 tags make it harder for search engines to understand your page content, potentially hurting rankings.",
      howToFix:
        "Add a single, descriptive H1 tag to each page. It should clearly describe the main topic and include your target keyword.",
      affectedUrls: pagesWithoutH1.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithoutH1.length,
      score: Math.max(0, 100 - percentage),
    },
  ];
}

// Check 7: Multiple H1 Tags
function checkMultipleH1(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const pagesWithMultipleH1 = crawlData.pages.filter(
    (p) => p.statusCode === 200 && p.h1Tags.length > 1
  );

  if (pagesWithMultipleH1.length === 0) return [];

  return [
    {
      type: "multiple_h1",
      severity: "INFO",
      title: `${pagesWithMultipleH1.length} pages have multiple H1 tags`,
      description: `Found pages with more than one H1 tag. While not strictly an error in HTML5, it can dilute topical focus.`,
      impact:
        "Multiple H1s can confuse search engines about the main topic of your page. Best practice is to have one clear H1.",
      howToFix:
        "Consolidate to a single H1 that represents the main topic. Use H2s and H3s for subheadings.",
      affectedUrls: pagesWithMultipleH1.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithMultipleH1.length,
      score: 90,
    },
  ];
}

// Check 8: Orphan Pages (no internal links)
function checkOrphanPages(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const linkedUrls = new Set<string>();

  for (const page of crawlData.pages) {
    for (const link of page.internalLinks) {
      linkedUrls.add(link);
    }
  }

  const orphanPages = crawlData.pages.filter(
    (p) => p.statusCode === 200 && !linkedUrls.has(p.url) && p.url !== crawlData.baseUrl
  );

  if (orphanPages.length === 0) return [];

  return [
    {
      type: "orphan_pages",
      severity: orphanPages.length > 10 ? "WARNING" : "INFO",
      title: `${orphanPages.length} orphan pages found`,
      description: `Found pages with no internal links pointing to them. These are harder for search engines to discover.`,
      impact:
        "Orphan pages receive less link equity and may be crawled less frequently, hurting their ranking potential.",
      howToFix:
        "Add internal links from relevant pages to these orphan pages. Consider adding them to your navigation or sitemap.",
      affectedUrls: orphanPages.slice(0, 10).map((p) => p.url),
      affectedCount: orphanPages.length,
      score: Math.max(0, 100 - orphanPages.length * 2),
    },
  ];
}

// Check 9: Long Redirect Chains
function checkRedirectChains(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const pagesWithLongChains = crawlData.pages.filter(
    (p) => p.redirectChain.length > 2
  );

  if (pagesWithLongChains.length === 0) return [];

  return [
    {
      type: "redirect_chains",
      severity: "WARNING",
      title: `${pagesWithLongChains.length} redirect chains detected`,
      description: `Found redirect chains longer than 2 hops. Each redirect adds latency and loses some link equity.`,
      impact:
        "Long redirect chains slow down page loads and can cause search engines to give up crawling before reaching the final URL.",
      howToFix:
        "Update redirects to go directly to the final destination URL. Eliminate intermediate redirects.",
      affectedUrls: pagesWithLongChains.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithLongChains.length,
      score: Math.max(0, 100 - pagesWithLongChains.length * 5),
      data: {
        chains: pagesWithLongChains.slice(0, 5).map((p) => ({
          start: p.url,
          chain: p.redirectChain,
          length: p.redirectChain.length,
        })),
      },
    },
  ];
}

// Check 10: Missing Sitemap
function checkMissingSitemap(crawlData: CrawlResult): TechnicalSeoFinding[] {
  if (crawlData.sitemapFound) return [];

  return [
    {
      type: "missing_sitemap",
      severity: "WARNING",
      title: "No XML sitemap found",
      description:
        "Could not find an XML sitemap at common locations (sitemap.xml, sitemap_index.xml).",
      impact:
        "Without a sitemap, search engines must discover all your pages through crawling, which may miss some content.",
      howToFix:
        "Create an XML sitemap listing all important pages. Submit it to Google Search Console and add a reference in robots.txt.",
      affectedUrls: [`${crawlData.baseUrl}/sitemap.xml`],
      affectedCount: 1,
      score: 70,
    },
  ];
}

// Check 11: Missing robots.txt
function checkMissingRobotsTxt(crawlData: CrawlResult): TechnicalSeoFinding[] {
  if (crawlData.robotsTxtFound) return [];

  return [
    {
      type: "missing_robots_txt",
      severity: "INFO",
      title: "No robots.txt file found",
      description: "Could not find a robots.txt file at the domain root.",
      impact:
        "While not required, robots.txt helps control search engine crawling and can point to your sitemap.",
      howToFix:
        "Create a robots.txt file in your domain root. Include a reference to your sitemap and any crawl directives needed.",
      affectedUrls: [`${crawlData.baseUrl}/robots.txt`],
      affectedCount: 1,
      score: 90,
    },
  ];
}

// Check 12: HTTPS Issues
function checkHttpsIssues(crawlData: CrawlResult): TechnicalSeoFinding[] {
  if (!crawlData.baseUrl.startsWith("https://")) {
    return [
      {
        type: "no_https",
        severity: "CRITICAL",
        title: "Site not using HTTPS",
        description:
          "Your site is not using HTTPS. This is a ranking factor and affects user trust.",
        impact:
          "Google prioritizes HTTPS sites in search results. Users see security warnings on HTTP sites, reducing trust and conversions.",
        howToFix:
          "Install an SSL certificate and redirect all HTTP traffic to HTTPS. Most hosts offer free SSL via Let's Encrypt.",
        affectedUrls: [crawlData.baseUrl],
        affectedCount: 1,
        score: 0,
      },
    ];
  }
  return [];
}

// Check 13: Mobile Viewport
function checkMobileViewport(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const pagesWithoutViewport = crawlData.pages.filter(
    (p) => p.statusCode === 200 && !p.hasViewportMeta
  );

  if (pagesWithoutViewport.length === 0) return [];

  const percentage = Math.round(
    (pagesWithoutViewport.length / crawlData.pages.length) * 100
  );

  return [
    {
      type: "missing_viewport",
      severity: percentage > 50 ? "CRITICAL" : "WARNING",
      title: `${pagesWithoutViewport.length} pages missing viewport meta tag`,
      description: `${percentage}% of pages lack a viewport meta tag, indicating they may not be mobile-optimized.`,
      impact:
        "Google uses mobile-first indexing. Pages without proper viewport configuration may rank poorly in mobile search.",
      howToFix:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to all pages.',
      affectedUrls: pagesWithoutViewport.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithoutViewport.length,
      score: Math.max(0, 100 - percentage),
    },
  ];
}

// Check 14: Canonical Issues
function checkCanonicalIssues(crawlData: CrawlResult): TechnicalSeoFinding[] {
  const findings: TechnicalSeoFinding[] = [];

  // Missing canonicals
  const pagesWithoutCanonical = crawlData.pages.filter(
    (p) => p.statusCode === 200 && !p.canonicalUrl
  );

  if (pagesWithoutCanonical.length > crawlData.pages.length * 0.5) {
    findings.push({
      type: "missing_canonical",
      severity: "WARNING",
      title: `${pagesWithoutCanonical.length} pages missing canonical tags`,
      description:
        "Many pages lack canonical tags, which help prevent duplicate content issues.",
      impact:
        "Without canonicals, search engines may index multiple versions of the same page, diluting ranking signals.",
      howToFix:
        "Add self-referencing canonical tags to all pages, or point to the preferred version for duplicate content.",
      affectedUrls: pagesWithoutCanonical.slice(0, 10).map((p) => p.url),
      affectedCount: pagesWithoutCanonical.length,
      score: Math.max(0, 100 - pagesWithoutCanonical.length * 2),
    });
  }

  return findings;
}
