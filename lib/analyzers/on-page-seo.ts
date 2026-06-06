/**
 * On-Page SEO Analyzer
 * Analyzes on-page elements for SEO optimization
 */

import { CrawlResult, CrawledPage } from "../crawler";

export interface OnPageSeoFinding {
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

export interface OnPageSeoResult {
  score: number;
  findings: OnPageSeoFinding[];
  metrics: {
    avgTitleLength: number;
    avgMetaDescLength: number;
    avgWordCount: number;
    avgInternalLinks: number;
    imageAltCoverage: number;
    schemaPresent: number;
    pagesWithSchema: number;
  };
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export function analyzeOnPageSeo(crawlData: CrawlResult): OnPageSeoResult {
  const findings: OnPageSeoFinding[] = [];
  const validPages = crawlData.pages.filter((p) => p.statusCode === 200);

  // Run all on-page SEO checks
  findings.push(...checkTitleLength(validPages));
  findings.push(...checkMetaDescriptionLength(validPages));
  findings.push(...checkWordCount(validPages));
  findings.push(...checkInternalLinking(validPages));
  findings.push(...checkImageAltTags(validPages));
  findings.push(...checkHeadingStructure(validPages));
  findings.push(...checkSchemaMarkup(validPages));
  findings.push(...checkContentDuplication(validPages));

  // Calculate metrics
  const metrics = calculateMetrics(validPages);

  // Calculate summary
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const infoCount = findings.filter((f) => f.severity === "INFO").length;

  // Calculate overall score
  const maxScore = 100;
  const criticalPenalty = criticalCount * 12;
  const warningPenalty = warningCount * 5;
  const score = Math.max(0, maxScore - criticalPenalty - warningPenalty);

  return {
    score,
    findings: findings.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    metrics,
    summary: {
      criticalCount,
      warningCount,
      infoCount,
    },
  };
}

function calculateMetrics(pages: CrawledPage[]) {
  if (pages.length === 0) {
    return {
      avgTitleLength: 0,
      avgMetaDescLength: 0,
      avgWordCount: 0,
      avgInternalLinks: 0,
      imageAltCoverage: 0,
      schemaPresent: 0,
      pagesWithSchema: 0,
    };
  }

  const totalTitleLength = pages.reduce(
    (sum, p) => sum + (p.title?.length || 0),
    0
  );
  const totalMetaDescLength = pages.reduce(
    (sum, p) => sum + (p.metaDescription?.length || 0),
    0
  );
  const totalWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0);
  const totalInternalLinks = pages.reduce(
    (sum, p) => sum + p.internalLinks.length,
    0
  );
  const totalImages = pages.reduce((sum, p) => sum + p.imageCount, 0);
  const totalImagesWithAlt = pages.reduce((sum, p) => sum + p.imagesWithAlt, 0);
  const pagesWithSchema = pages.filter((p) => p.schemaMarkup.length > 0).length;

  return {
    avgTitleLength: Math.round(totalTitleLength / pages.length),
    avgMetaDescLength: Math.round(totalMetaDescLength / pages.length),
    avgWordCount: Math.round(totalWordCount / pages.length),
    avgInternalLinks: Math.round(totalInternalLinks / pages.length),
    imageAltCoverage: totalImages > 0 
      ? Math.round((totalImagesWithAlt / totalImages) * 100) 
      : 100,
    schemaPresent: Math.round((pagesWithSchema / pages.length) * 100),
    pagesWithSchema,
  };
}

// Check 1: Title Tag Length
function checkTitleLength(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const tooShort = pages.filter((p) => p.title && p.title.length < 30);
  const tooLong = pages.filter((p) => p.title && p.title.length > 60);

  if (tooShort.length > 0) {
    findings.push({
      type: "title_too_short",
      severity: "WARNING",
      title: `${tooShort.length} pages have titles shorter than 30 characters`,
      description:
        "Short titles miss opportunities to include keywords and compelling copy.",
      impact:
        "You're missing out on search visibility and click-through rate optimization.",
      howToFix:
        "Expand titles to 50-60 characters. Include your primary keyword and a compelling reason to click.",
      affectedUrls: tooShort.slice(0, 10).map((p) => p.url),
      affectedCount: tooShort.length,
      score: Math.max(0, 100 - tooShort.length * 3),
    });
  }

  if (tooLong.length > 0) {
    findings.push({
      type: "title_too_long",
      severity: "WARNING",
      title: `${tooLong.length} pages have titles longer than 60 characters`,
      description:
        "Long titles get truncated in search results, cutting off important information.",
      impact:
        "Truncated titles look incomplete and may reduce click-through rates.",
      howToFix:
        "Shorten titles to under 60 characters. Front-load the most important keywords.",
      affectedUrls: tooLong.slice(0, 10).map((p) => p.url),
      affectedCount: tooLong.length,
      score: Math.max(0, 100 - tooLong.length * 2),
    });
  }

  return findings;
}

// Check 2: Meta Description Length
function checkMetaDescriptionLength(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const pagesWithDesc = pages.filter((p) => p.metaDescription);
  const tooShort = pagesWithDesc.filter((p) => p.metaDescription!.length < 120);
  const tooLong = pagesWithDesc.filter((p) => p.metaDescription!.length > 160);

  if (tooShort.length > pages.length * 0.2) {
    findings.push({
      type: "meta_desc_too_short",
      severity: "WARNING",
      title: `${tooShort.length} pages have short meta descriptions`,
      description:
        "Meta descriptions under 120 characters don't fully utilize available space in search results.",
      impact:
        "Short descriptions miss opportunities for compelling messaging and additional keywords.",
      howToFix:
        "Expand meta descriptions to 150-160 characters. Include a call-to-action and unique value proposition.",
      affectedUrls: tooShort.slice(0, 10).map((p) => p.url),
      affectedCount: tooShort.length,
      score: Math.max(0, 100 - tooShort.length * 2),
    });
  }

  if (tooLong.length > 0) {
    findings.push({
      type: "meta_desc_too_long",
      severity: "INFO",
      title: `${tooLong.length} pages have long meta descriptions`,
      description:
        "Meta descriptions over 160 characters may be truncated in search results.",
      impact:
        "Truncated descriptions might cut off your call-to-action or key messaging.",
      howToFix:
        "Trim meta descriptions to 150-160 characters. Ensure the most important message comes first.",
      affectedUrls: tooLong.slice(0, 10).map((p) => p.url),
      affectedCount: tooLong.length,
      score: 90,
    });
  }

  return findings;
}

// Check 3: Word Count (Thin Content)
function checkWordCount(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const thinContent = pages.filter((p) => p.wordCount < 300);
  const veryThin = pages.filter((p) => p.wordCount < 100);

  if (veryThin.length > 0) {
    findings.push({
      type: "very_thin_content",
      severity: "CRITICAL",
      title: `${veryThin.length} pages have extremely thin content (<100 words)`,
      description:
        "These pages have almost no content, making it hard for search engines to understand their value.",
      impact:
        "Thin content pages are unlikely to rank for any valuable keywords and may hurt overall site quality.",
      howToFix:
        "Either expand these pages with valuable content (aim for 500+ words) or consider consolidating them with other pages.",
      affectedUrls: veryThin.slice(0, 10).map((p) => p.url),
      affectedCount: veryThin.length,
      score: Math.max(0, 100 - veryThin.length * 10),
    });
  } else if (thinContent.length > pages.length * 0.3) {
    const percentage = Math.round((thinContent.length / pages.length) * 100);
    findings.push({
      type: "thin_content",
      severity: "WARNING",
      title: `${percentage}% of pages have thin content (<300 words)`,
      description: `${thinContent.length} pages have minimal content. For competitive keywords, this is often not enough.`,
      impact:
        "Thin content pages struggle to rank for valuable keywords and provide less value to users.",
      howToFix:
        "Add more in-depth content to these pages. Target 500-1000 words for most pages, more for competitive topics.",
      affectedUrls: thinContent.slice(0, 10).map((p) => p.url),
      affectedCount: thinContent.length,
      score: Math.max(0, 100 - percentage),
    });
  }

  return findings;
}

// Check 4: Internal Linking
function checkInternalLinking(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const avgLinks =
    pages.reduce((sum, p) => sum + p.internalLinks.length, 0) / pages.length;
  const lowLinkPages = pages.filter((p) => p.internalLinks.length < 3);

  if (avgLinks < 5) {
    findings.push({
      type: "low_internal_linking",
      severity: "WARNING",
      title: "Low internal linking across the site",
      description: `Average of ${Math.round(avgLinks)} internal links per page. Strong sites typically have 5-10+.`,
      impact:
        "Poor internal linking limits link equity distribution and makes it harder for users and search engines to discover content.",
      howToFix:
        "Add contextual internal links within your content. Link to relevant related pages. Consider adding 'related posts' sections.",
      affectedUrls: [],
      affectedCount: pages.length,
      score: Math.max(0, 50 + avgLinks * 10),
    });
  }

  if (lowLinkPages.length > pages.length * 0.4) {
    findings.push({
      type: "pages_low_links",
      severity: "WARNING",
      title: `${lowLinkPages.length} pages have fewer than 3 internal links`,
      description:
        "These pages are isolated and don't effectively distribute link equity.",
      impact:
        "Poor internal linking to these pages limits their ranking potential and discoverability.",
      howToFix:
        "Add internal links to these pages from related content. Ensure important pages receive links from multiple sources.",
      affectedUrls: lowLinkPages.slice(0, 10).map((p) => p.url),
      affectedCount: lowLinkPages.length,
      score: Math.max(0, 100 - lowLinkPages.length * 2),
    });
  }

  return findings;
}

// Check 5: Image Alt Tags
function checkImageAltTags(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const totalImages = pages.reduce((sum, p) => sum + p.imageCount, 0);
  const totalWithoutAlt = pages.reduce((sum, p) => sum + p.imagesWithoutAlt, 0);

  if (totalImages === 0) return findings;

  const percentMissing = Math.round((totalWithoutAlt / totalImages) * 100);

  if (percentMissing > 30) {
    findings.push({
      type: "missing_image_alt",
      severity: percentMissing > 60 ? "CRITICAL" : "WARNING",
      title: `${percentMissing}% of images are missing alt text`,
      description: `${totalWithoutAlt} out of ${totalImages} images don't have alt attributes.`,
      impact:
        "Missing alt text hurts image SEO, accessibility, and you miss keyword opportunities.",
      howToFix:
        "Add descriptive alt text to all images. Include relevant keywords naturally. Describe what's in the image.",
      affectedUrls: pages
        .filter((p) => p.imagesWithoutAlt > 0)
        .slice(0, 10)
        .map((p) => p.url),
      affectedCount: totalWithoutAlt,
      score: Math.max(0, 100 - percentMissing),
    });
  }

  return findings;
}

// Check 6: Heading Structure
function checkHeadingStructure(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  // Check for pages with H2/H3 but no H1
  const badStructure = pages.filter(
    (p) => p.h1Tags.length === 0 && (p.h2Tags.length > 0 || p.h3Tags.length > 0)
  );

  if (badStructure.length > 0) {
    findings.push({
      type: "bad_heading_structure",
      severity: "WARNING",
      title: `${badStructure.length} pages have H2/H3 but no H1`,
      description:
        "These pages have subheadings but skip the main H1 heading, creating an improper hierarchy.",
      impact:
        "Poor heading structure makes content harder to understand for both users and search engines.",
      howToFix:
        "Add an H1 tag that describes the main topic of each page. Use H2s for major sections and H3s for subsections.",
      affectedUrls: badStructure.slice(0, 10).map((p) => p.url),
      affectedCount: badStructure.length,
      score: Math.max(0, 100 - badStructure.length * 5),
    });
  }

  // Check for pages with no headings at all
  const noHeadings = pages.filter(
    (p) =>
      p.h1Tags.length === 0 && p.h2Tags.length === 0 && p.h3Tags.length === 0
  );

  if (noHeadings.length > pages.length * 0.2) {
    findings.push({
      type: "no_headings",
      severity: "WARNING",
      title: `${noHeadings.length} pages have no heading tags at all`,
      description:
        "These pages lack any heading structure, making them hard to scan and understand.",
      impact:
        "No headings = no clear structure. This hurts both user experience and SEO.",
      howToFix:
        "Add proper heading hierarchy to all pages. Start with H1 for the title, H2 for sections, H3 for sub-sections.",
      affectedUrls: noHeadings.slice(0, 10).map((p) => p.url),
      affectedCount: noHeadings.length,
      score: Math.max(0, 100 - noHeadings.length * 3),
    });
  }

  return findings;
}

// Check 7: Schema Markup
function checkSchemaMarkup(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  const pagesWithSchema = pages.filter((p) => p.schemaMarkup.length > 0);
  const percentWithSchema = Math.round(
    (pagesWithSchema.length / pages.length) * 100
  );

  if (percentWithSchema < 10) {
    findings.push({
      type: "no_schema_markup",
      severity: "WARNING",
      title: "Very little structured data (schema markup) found",
      description: `Only ${percentWithSchema}% of pages have schema markup. This is a missed opportunity for rich results.`,
      impact:
        "Schema markup enables rich snippets in search results (stars, FAQs, etc.), which significantly boost click-through rates.",
      howToFix:
        "Add relevant schema markup: Article schema for blog posts, Product schema for products, LocalBusiness for service pages, FAQ schema where applicable.",
      affectedUrls: pages
        .filter((p) => p.schemaMarkup.length === 0)
        .slice(0, 10)
        .map((p) => p.url),
      affectedCount: pages.length - pagesWithSchema.length,
      score: Math.max(20, percentWithSchema),
      data: {
        schemaTypes: Array.from(
          new Set(pagesWithSchema.flatMap((p) => p.schemaMarkup.map((s) => s.type)))
        ),
      },
    });
  } else if (percentWithSchema < 50) {
    findings.push({
      type: "low_schema_coverage",
      severity: "INFO",
      title: `Only ${percentWithSchema}% of pages have schema markup`,
      description: "You're using schema markup, but many pages are still missing it.",
      impact: "Pages without schema may miss out on rich snippet opportunities.",
      howToFix:
        "Expand schema markup to more pages. Consider automated schema generation based on page type.",
      affectedUrls: [],
      affectedCount: pages.length - pagesWithSchema.length,
      score: Math.max(50, percentWithSchema),
    });
  }

  return findings;
}

// Check 8: Content Duplication (same word count + title)
function checkContentDuplication(pages: CrawledPage[]): OnPageSeoFinding[] {
  const findings: OnPageSeoFinding[] = [];

  // Simple duplication check: same title AND similar word count
  const contentMap = new Map<string, CrawledPage[]>();

  for (const page of pages) {
    if (!page.title) continue;
    const key = `${page.title.toLowerCase()}_${Math.round(page.wordCount / 50) * 50}`;
    const existing = contentMap.get(key) || [];
    existing.push(page);
    contentMap.set(key, existing);
  }

  const duplicateGroups = Array.from(contentMap.entries()).filter(
    ([, p]) => p.length > 1
  );

  if (duplicateGroups.length > 0) {
    const totalDuplicates = duplicateGroups.reduce(
      (sum, [, p]) => sum + p.length,
      0
    );

    findings.push({
      type: "potential_duplicate_content",
      severity: duplicateGroups.length > 5 ? "WARNING" : "INFO",
      title: `${duplicateGroups.length} potential duplicate content groups found`,
      description: `Found ${duplicateGroups.length} groups of pages with similar titles and content length, indicating possible duplication.`,
      impact:
        "Duplicate content dilutes ranking signals and may cause search engines to only index one version.",
      howToFix:
        "Review these pages and either consolidate them, add unique content to each, or use canonical tags to specify the primary version.",
      affectedUrls: duplicateGroups
        .flatMap(([, p]) => p.map((page) => page.url))
        .slice(0, 10),
      affectedCount: totalDuplicates,
      score: Math.max(0, 100 - duplicateGroups.length * 5),
    });
  }

  return findings;
}
