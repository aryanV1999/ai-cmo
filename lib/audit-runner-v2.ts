/**
 * Audit Runner V2
 * 
 * Production-grade audit orchestration with:
 * 1. Confidence scoring throughout
 * 2. Page-type aware analysis
 * 3. Better error handling
 * 4. Progressive result saving
 * 5. Subdomain handling
 */

import prisma from "./prisma";
import { quickCrawlV2, CrawlResultV2 } from "./crawler-v2";
import { analyzeTechnicalSeoV2, TechnicalSeoResultV2 } from "./analyzers/technical-seo-v2";
import { analyzeOnPageSeo, OnPageSeoResult } from "./analyzers/on-page-seo";
import { analyzePageSpeed, PageSpeedResult } from "./analyzers/page-speed";
import { analyzeCompetitors, detectCompetitors, CompetitorResult } from "./analyzers/competitors";
import { analyzeMarketingChannelsV2WithWebResearch, ChannelResultV2 } from "./analyzers/channels-v2";
import { generateAuditSummaryV2, AuditSummaryV2 } from "@/lib/ai-summary-v2";
import { Severity } from "@prisma/client";

export interface AuditMetadata {
  crawlConfidence: number;
  totalPagesAnalyzed: number;
  pageTypesFound: string[];
  subdomainsFound: string[];
  analysisTimestamp: Date;
  version: string;
}

export async function runAuditV2(auditId: string): Promise<void> {
  console.log(`[Audit V2] Starting audit: ${auditId}`);
  const startTime = Date.now();

  try {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new Error(`Audit not found: ${auditId}`);
    }

    // ========================================
    // PHASE 1: CRAWLING
    // ========================================
    await updateAuditProgress(auditId, "CRAWLING", 5, "Initializing crawler...");

    console.log(`[Audit V2] Crawling: ${audit.siteUrl}`);
    
    let crawlData: CrawlResultV2;
    try {
      crawlData = await quickCrawlV2(audit.siteUrl, {
        maxPages: 25,
        maxConcurrency: 5,
        waitForNetworkIdle: false,
        includeSubdomains: false,
        retryAttempts: 1,
        onProgress: async (progress) => {
          const overallProgress = 5 + Math.round(progress.percentage * 0.35);
          await updateAuditProgress(
            auditId,
            "CRAWLING",
            overallProgress,
            `Crawling pages... (${progress.pagesCrawled}/${progress.pagesDiscovered})`
          );
        },
      });
    } catch (error) {
      console.error("[Audit V2] Crawl error:", error);
      throw new Error(`Crawl failed: ${error}`);
    }

    console.log(`[Audit V2] Crawl complete: ${crawlData.totalPagesCrawled} pages`);
    console.log(`[Audit V2] Crawl confidence: ${crawlData.overallConfidence.level} (${crawlData.overallConfidence.score}%)`);
    console.log(`[Audit V2] Subdomains found: ${crawlData.subdomainsFound.join(", ") || "none"}`);

    // Save crawl data
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        crawlData: JSON.parse(JSON.stringify(crawlData)),
        pagesDiscovered: crawlData.totalPagesDiscovered,
        pagesCrawled: crawlData.totalPagesCrawled,
      },
    });

    // ========================================
    // PHASE 2: TECHNICAL SEO ANALYSIS
    // ========================================
    await updateAuditProgress(auditId, "ANALYZING", 40, "Analyzing technical SEO...");

    console.log("[Audit V2] Running technical SEO analysis...");
    const technicalSeo = analyzeTechnicalSeoV2(crawlData);
    console.log(`[Audit V2] Technical SEO score: ${technicalSeo.score} (confidence: ${technicalSeo.confidence}%)`);

    // ========================================
    // PHASE 3: ON-PAGE SEO ANALYSIS
    // ========================================
    await updateAuditProgress(auditId, "ANALYZING", 50, "Analyzing on-page SEO...");

    // Convert V2 crawl data to V1 format for compatibility
    const crawlDataV1 = convertToV1CrawlData(crawlData);
    const onPageSeo = analyzeOnPageSeo(crawlDataV1);
    console.log(`[Audit V2] On-page SEO score: ${onPageSeo.score}`);

    // ========================================
    // PHASE 4: PAGE SPEED ANALYSIS
    // ========================================
    await updateAuditProgress(auditId, "ANALYZING", 55, "Analyzing page speed...");

    let pageSpeed: PageSpeedResult;
    try {
      pageSpeed = await analyzePageSpeed(audit.siteUrl, process.env.GOOGLE_PAGESPEED_API_KEY);
      console.log(`[Audit V2] Page speed score: ${pageSpeed.score}`);
    } catch (error) {
      console.error("[Audit V2] Page speed error:", error);
      pageSpeed = getDefaultPageSpeedResult();
    }

    // ========================================
    // PHASE 5: COMPETITOR ANALYSIS
    // ========================================
    await updateAuditProgress(auditId, "ANALYZING", 65, "Analyzing competitors...");

    let competitors: CompetitorResult | undefined;
    try {
      const competitorDomains = await detectCompetitors(
        audit.domain,
        buildCompetitorContextTerms(crawlData)
      );
      competitors = await analyzeCompetitors(
        audit.domain,
        competitorDomains
      );
      console.log(`[Audit V2] Competitor analysis complete`);
    } catch (error) {
      console.error("[Audit V2] Competitor analysis error:", error);
    }

    // ========================================
    // PHASE 6: MARKETING CHANNEL ANALYSIS
    // ========================================
    await updateAuditProgress(auditId, "ANALYZING", 75, "Analyzing marketing channels...");

    const channels = await analyzeMarketingChannelsV2WithWebResearch(crawlData);
    console.log(`[Audit V2] Marketing channels score: ${channels.score} (confidence: ${channels.confidence}%)`);

    // Save all analysis results
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        technicalSeo: JSON.parse(JSON.stringify(technicalSeo)),
        onPageSeo: JSON.parse(JSON.stringify(onPageSeo)),
        pageSpeed: JSON.parse(JSON.stringify(pageSpeed)),
        competitors: competitors ? JSON.parse(JSON.stringify(competitors)) : null,
        channels: JSON.parse(JSON.stringify(channels)),
      },
    });

    // ========================================
    // PHASE 7: AI VERDICT GENERATION
    // ========================================
    await updateAuditProgress(auditId, "GENERATING_REPORT", 85, "Generating AI verdict...");

    console.log("[Audit V2] Generating AI summary...");
    const aiSummary = await generateAuditSummaryV2({
      domain: audit.domain,
      url: audit.siteUrl,
      crawlData,
      technicalSeo,
      onPageSeo,
      pageSpeed,
      competitors,
      channels,
    });
    console.log(`[Audit V2] AI summary generated: Grade ${aiSummary.overallGrade}`);

    // ========================================
    // PHASE 8: SAVE FINDINGS & COMPLETE
    // ========================================
    await updateAuditProgress(auditId, "GENERATING_REPORT", 95, "Saving findings...");

    // Save findings
    await saveFindingsV2(auditId, technicalSeo, onPageSeo, pageSpeed, competitors, channels, aiSummary);

    // Build metadata
    const metadata: AuditMetadata = {
      crawlConfidence: crawlData.overallConfidence.score,
      totalPagesAnalyzed: crawlData.totalPagesCrawled,
      pageTypesFound: Object.keys(crawlData.pagesByType).filter(
        k => crawlData.pagesByType[k as keyof typeof crawlData.pagesByType].length > 0
      ),
      subdomainsFound: crawlData.subdomainsFound,
      analysisTimestamp: new Date(),
      version: "2.0.0",
    };

    // Complete audit
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETE",
        progress: 100,
        currentStep: "complete",
        grade: aiSummary.overallGrade,
        gradeScore: aiSummary.gradeScore,
        aiSummary: JSON.parse(JSON.stringify({
          ...aiSummary,
          metadata,
        })),
        completedAt: new Date(),
        reportGenerated: true,
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Audit V2] Audit complete: ${auditId} (${duration}s)`);
    console.log(`[Audit V2] Final grade: ${aiSummary.overallGrade} (${aiSummary.gradeScore}/100)`);
    console.log(`[Audit V2] Overall confidence: ${aiSummary.overallConfidence}%`);

  } catch (error) {
    console.error(`[Audit V2] Audit failed: ${auditId}`, error);

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        currentStep: "error",
        aiSummary: JSON.parse(JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        })),
      },
    });

    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function updateAuditProgress(
  auditId: string,
  status: "PENDING" | "CRAWLING" | "ANALYZING" | "GENERATING_REPORT" | "COMPLETE" | "FAILED",
  progress: number,
  currentStep: string
): Promise<void> {
  await prisma.audit.update({
    where: { id: auditId },
    data: { status, progress, currentStep },
  });
}

function convertToV1CrawlData(v2Data: CrawlResultV2): any {
  // Convert V2 format to V1 format for backward compatibility
  return {
    domain: v2Data.domain,
    baseUrl: v2Data.baseUrl,
    pages: v2Data.pages.map(p => ({
      url: p.url,
      statusCode: p.statusCode,
      title: p.title,
      metaDescription: p.metaDescription,
      canonicalUrl: p.canonicalUrl,
      h1Tags: p.h1Tags,
      h2Tags: p.h2Tags,
      h3Tags: p.h3Tags,
      imageCount: p.imageCount,
      imagesWithAlt: p.imagesWithAlt,
      imagesWithoutAlt: p.imagesWithoutAlt,
      internalLinks: p.internalLinks.map(l => l.url),
      externalLinks: p.externalLinks.map(l => l.url),
      wordCount: p.mainContentWordCount,
      hasViewportMeta: p.hasViewportMeta,
      schemaMarkup: p.schemaMarkup,
      loadTime: p.loadTime,
      errors: p.errors,
      redirectChain: p.redirectChain,
    })),
    sitemapFound: v2Data.sitemapFound,
    sitemapUrl: v2Data.sitemapUrls[0] || null,
    robotsTxtFound: v2Data.robotsTxtFound,
    robotsTxtContent: v2Data.robotsTxtContent,
    totalPagesDiscovered: v2Data.totalPagesDiscovered,
    totalPagesCrawled: v2Data.totalPagesCrawled,
    crawlDuration: v2Data.crawlDuration,
    errors: v2Data.errors.map(e => e.message),
  };
}

function getDefaultPageSpeedResult(): PageSpeedResult {
  return {
    score: 50,
    mobileScore: 50,
    desktopScore: 60,
    coreWebVitals: {
      lcp: { value: 3000, rating: "needs-improvement" as const },
      fid: { value: 200, rating: "needs-improvement" as const },
      cls: { value: 0.15, rating: "needs-improvement" as const },
    },
    metrics: { mobile: null, desktop: null },
    summary: { criticalCount: 0, warningCount: 0, infoCount: 0 },
    findings: [{
      type: "page_speed_unavailable",
      severity: "INFO" as const,
      title: "Page speed data unavailable",
      description: "Could not retrieve Page Speed Insights data. This may be due to API limits or site access issues.",
      impact: "Unable to assess Core Web Vitals performance.",
      howToFix: "Try again later or check if the site is accessible.",
      score: 50,
    }],
  };
}

async function saveFindingsV2(
  auditId: string,
  technicalSeo: TechnicalSeoResultV2,
  onPageSeo: OnPageSeoResult,
  pageSpeed: PageSpeedResult,
  competitors: CompetitorResult | undefined,
  channels: ChannelResultV2,
  aiSummary: AuditSummaryV2
): Promise<void> {
  const findings: {
    auditId: string;
    category: string;
    type: string;
    severity: Severity;
    title: string;
    description: string;
    impact: string;
    howToFix: string;
    affectedUrls: string[];
    affectedCount: number;
    score: number;
    priority: number;
    confidence: number;
    serviceId: string | null;
    serviceCta: string | null;
  }[] = [];

  // Helper to add findings
  const addFindings = (
    category: string,
    sourceFindingsArray: any[],
  ) => {
    for (const f of sourceFindingsArray) {
      const matchingService = aiSummary.serviceRecommendations?.find(
        (s) => s.triggerFinding === f.title
      );

      findings.push({
        auditId,
        category,
        type: f.type,
        severity: f.severity as Severity,
        title: f.title,
        description: f.description,
        impact: f.impact,
        howToFix: f.howToFix,
        affectedUrls: f.affectedUrls?.slice(0, 20) || [],
        affectedCount: f.affectedCount || 0,
        score: f.score,
        priority: getPriorityFromSeverity(f.severity),
        confidence: f.confidence || 80,
        serviceId: matchingService?.serviceId || null,
        serviceCta: matchingService?.ctaCopy || null,
      });
    }
  };

  // Add all findings by category
  addFindings("technical", technicalSeo.findings);
  addFindings("on-page", onPageSeo.findings);
  addFindings("speed", pageSpeed.findings);
  if (competitors?.findings) {
    addFindings("competitors", competitors.findings);
  }
  addFindings("channels", channels.findings);

  // Batch insert findings
  if (findings.length > 0) {
    // Delete existing findings for this audit
    await prisma.finding.deleteMany({
      where: { auditId },
    });

    // Insert new findings
    await prisma.finding.createMany({
      data: findings,
    });
  }

  console.log(`[Audit V2] Saved ${findings.length} findings`);
}

function getPriorityFromSeverity(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 1;
    case "WARNING": return 2;
    case "INFO": return 3;
    default: return 4;
  }
}

function buildCompetitorContextTerms(crawlData: CrawlResultV2): string[] {
  const terms = new Set<string>();
  for (const page of crawlData.pages.slice(0, 12)) {
    for (const value of [
      page.title,
      page.metaDescription,
      ...page.h1Tags.slice(0, 3),
      ...page.h2Tags.slice(0, 5),
    ]) {
      if (!value) continue;
      value
        .split(/[^a-zA-Z0-9]+/)
        .map((token) => token.toLowerCase())
        .filter((token) => token.length > 3 && token.length < 28)
        .filter((token) => !COMMON_CONTEXT_WORDS.has(token))
        .slice(0, 18)
        .forEach((token) => terms.add(token));
    }
  }
  return Array.from(terms).slice(0, 30);
}

const COMMON_CONTEXT_WORDS = new Set([
  "about",
  "also",
  "best",
  "blog",
  "business",
  "contact",
  "from",
  "home",
  "learn",
  "more",
  "page",
  "service",
  "services",
  "solutions",
  "that",
  "this",
  "with",
  "your",
]);

// Export for backward compatibility
export { runAuditV2 as runAudit };
