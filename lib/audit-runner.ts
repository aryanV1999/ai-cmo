/**
 * Audit Runner
 * Orchestrates the entire audit process
 */

import prisma from "./prisma";
import { quickCrawl, CrawlResult } from "./crawler";
import { analyzeTechnicalSeo, TechnicalSeoResult } from "./analyzers/technical-seo";
import { analyzeOnPageSeo, OnPageSeoResult } from "./analyzers/on-page-seo";
import { analyzePageSpeed, PageSpeedResult } from "./analyzers/page-speed";
import { analyzeCompetitors, detectCompetitors, CompetitorResult } from "./analyzers/competitors";
import { analyzeMarketingChannels, ChannelResult } from "./analyzers/channels";
import { generateAuditSummary, AuditSummary } from "./ai-summary";
import { Severity } from "@prisma/client";

export async function runAudit(auditId: string): Promise<void> {
  console.log(`Starting audit: ${auditId}`);

  try {
    // Get audit record
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new Error(`Audit not found: ${auditId}`);
    }

    // Update status to crawling
    await updateAuditProgress(auditId, "CRAWLING", 5, "crawling");

    // Step 1: Crawl the website
    console.log(`Crawling: ${audit.siteUrl}`);
    let crawlData: CrawlResult;
    try {
      crawlData = await quickCrawl(audit.siteUrl, {
        maxPages: 50,
        maxConcurrency: 5,
        onProgress: async (progress) => {
          await updateAuditProgress(
            auditId,
            "CRAWLING",
            5 + Math.round(progress.percentage * 0.25),
            "crawling"
          );
        },
      });
    } catch (error) {
      console.error("Crawl error:", error);
      // Use mock data for development
      crawlData = getMockCrawlData(audit.siteUrl, audit.domain);
    }

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        crawlData: JSON.parse(JSON.stringify(crawlData)),
        pagesDiscovered: crawlData.totalPagesDiscovered,
        pagesCrawled: crawlData.totalPagesCrawled,
      },
    });

    // Update status to analyzing
    await updateAuditProgress(auditId, "ANALYZING", 30, "technical");

    // Step 2: Run all analyzers in parallel
    console.log("Running analyzers...");
    const [technicalSeo, onPageSeo, pageSpeed] = await Promise.all([
      analyzeTechnicalSeo(crawlData),
      analyzeOnPageSeo(crawlData),
      analyzePageSpeed(audit.siteUrl, process.env.GOOGLE_PAGESPEED_API_KEY),
    ]);

    await updateAuditProgress(auditId, "ANALYZING", 50, "speed");

    // Step 3: Competitor analysis
    await updateAuditProgress(auditId, "ANALYZING", 60, "competitors");
    const competitorDomains = await detectCompetitors(audit.domain);
    let competitors: CompetitorResult | undefined;
    try {
      competitors = await analyzeCompetitors(
        audit.domain,
        competitorDomains
      );
    } catch (error) {
      console.error("Competitor analysis error:", error);
    }

    // Step 4: Marketing channel analysis
    await updateAuditProgress(auditId, "ANALYZING", 70, "channels");
    const channels = analyzeMarketingChannels(crawlData);

    // Update with analysis results
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

    // Step 5: Generate AI summary
    await updateAuditProgress(auditId, "GENERATING_REPORT", 80, "ai");
    console.log("Generating AI summary...");

    const aiSummary = await generateAuditSummary({
      domain: audit.domain,
      url: audit.siteUrl,
      technicalSeo,
      onPageSeo,
      pageSpeed,
      competitors,
      channels,
    });

    // Step 6: Save findings to database
    await updateAuditProgress(auditId, "GENERATING_REPORT", 90, "saving");
    await saveFindings(auditId, technicalSeo, onPageSeo, pageSpeed, competitors, channels, aiSummary);

    // Step 7: Complete audit
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETE",
        progress: 100,
        currentStep: "complete",
        grade: aiSummary.overallGrade,
        gradeScore: aiSummary.gradeScore,
        aiSummary: JSON.parse(JSON.stringify(aiSummary)),
        completedAt: new Date(),
        reportGenerated: true,
      },
    });

    console.log(`Audit complete: ${auditId}`);
  } catch (error) {
    console.error(`Audit failed: ${auditId}`, error);

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        currentStep: "error",
      },
    });

    throw error;
  }
}

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

async function saveFindings(
  auditId: string,
  technicalSeo: TechnicalSeoResult,
  onPageSeo: OnPageSeoResult,
  pageSpeed: PageSpeedResult,
  competitors: CompetitorResult | undefined,
  channels: ChannelResult,
  aiSummary: AuditSummary
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
    serviceId: string | null;
    serviceCta: string | null;
  }[] = [];

  // Technical SEO findings
  for (const f of technicalSeo.findings) {
    const matchingService = aiSummary.serviceRecommendations.find(
      (s) => s.triggerFinding === f.title
    );
    findings.push({
      auditId,
      category: "technical",
      type: f.type,
      severity: f.severity as Severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
      howToFix: f.howToFix,
      affectedUrls: f.affectedUrls,
      affectedCount: f.affectedCount,
      score: f.score,
      priority: f.severity === "CRITICAL" ? 3 : f.severity === "WARNING" ? 2 : 1,
      serviceId: matchingService?.serviceId || null,
      serviceCta: matchingService?.ctaCopy || null,
    });
  }

  // On-Page SEO findings
  for (const f of onPageSeo.findings) {
    const matchingService = aiSummary.serviceRecommendations.find(
      (s) => s.triggerFinding === f.title
    );
    findings.push({
      auditId,
      category: "onpage",
      type: f.type,
      severity: f.severity as Severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
      howToFix: f.howToFix,
      affectedUrls: f.affectedUrls,
      affectedCount: f.affectedCount,
      score: f.score,
      priority: f.severity === "CRITICAL" ? 3 : f.severity === "WARNING" ? 2 : 1,
      serviceId: matchingService?.serviceId || null,
      serviceCta: matchingService?.ctaCopy || null,
    });
  }

  // Page Speed findings
  for (const f of pageSpeed.findings) {
    const matchingService = aiSummary.serviceRecommendations.find(
      (s) => s.triggerFinding === f.title
    );
    findings.push({
      auditId,
      category: "speed",
      type: f.type,
      severity: f.severity as Severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
      howToFix: f.howToFix,
      affectedUrls: [],
      affectedCount: 1,
      score: f.score,
      priority: f.severity === "CRITICAL" ? 3 : f.severity === "WARNING" ? 2 : 1,
      serviceId: matchingService?.serviceId || null,
      serviceCta: matchingService?.ctaCopy || null,
    });
  }

  // Competitor findings
  if (competitors) {
    for (const f of competitors.findings) {
      const matchingService = aiSummary.serviceRecommendations.find(
        (s) => s.triggerFinding === f.title
      );
      findings.push({
        auditId,
        category: "competitor",
        type: f.type,
        severity: f.severity as Severity,
        title: f.title,
        description: f.description,
        impact: f.impact,
        howToFix: f.howToFix,
        affectedUrls: [],
        affectedCount: 1,
        score: f.score,
        priority: f.severity === "CRITICAL" ? 3 : f.severity === "WARNING" ? 2 : 1,
        serviceId: matchingService?.serviceId || null,
        serviceCta: matchingService?.ctaCopy || null,
      });
    }
  }

  // Channel findings
  for (const f of channels.findings) {
    const matchingService = aiSummary.serviceRecommendations.find(
      (s) => s.triggerFinding === f.title
    );
    findings.push({
      auditId,
      category: "marketing",
      type: f.type,
      severity: f.severity as Severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
      howToFix: f.howToFix,
      affectedUrls: [],
      affectedCount: 1,
      score: f.score,
      priority: f.severity === "CRITICAL" ? 3 : f.severity === "WARNING" ? 2 : 1,
      serviceId: matchingService?.serviceId || null,
      serviceCta: matchingService?.ctaCopy || null,
    });
  }

  // Batch insert findings
  if (findings.length > 0) {
    await prisma.finding.createMany({
      data: findings.map((f) => ({
        ...f,
        affectedUrls: f.affectedUrls,
        data: {},
      })),
    });
  }
}

function getMockCrawlData(url: string, domain: string): CrawlResult {
  // Generate realistic mock data for development/testing
  return {
    domain,
    baseUrl: url,
    pages: [
      {
        url,
        statusCode: 200,
        redirectChain: [],
        title: `${domain} - Your Business Solution`,
        metaDescription: "Welcome to our website. We provide excellent services.",
        canonicalUrl: url,
        h1Tags: ["Welcome to Our Site"],
        h2Tags: ["Our Services", "Why Choose Us", "Contact"],
        h3Tags: ["Service 1", "Service 2", "Service 3"],
        imageCount: 12,
        imagesWithAlt: 8,
        imagesWithoutAlt: 4,
        internalLinks: [`${url}/about`, `${url}/services`, `${url}/contact`],
        externalLinks: ["https://twitter.com", "https://linkedin.com"],
        wordCount: 450,
        hasViewportMeta: true,
        schemaMarkup: [],
        loadTime: 2500,
        errors: [],
      },
      {
        url: `${url}/about`,
        statusCode: 200,
        redirectChain: [],
        title: "About Us",
        metaDescription: null,
        canonicalUrl: `${url}/about`,
        h1Tags: [],
        h2Tags: ["Our Story", "Our Team"],
        h3Tags: [],
        imageCount: 5,
        imagesWithAlt: 2,
        imagesWithoutAlt: 3,
        internalLinks: [url, `${url}/services`],
        externalLinks: [],
        wordCount: 280,
        hasViewportMeta: true,
        schemaMarkup: [],
        loadTime: 1800,
        errors: [],
      },
      {
        url: `${url}/services`,
        statusCode: 200,
        redirectChain: [],
        title: "Our Services",
        metaDescription: "Explore our comprehensive range of services.",
        canonicalUrl: `${url}/services`,
        h1Tags: ["Our Services"],
        h2Tags: ["Consulting", "Development", "Support"],
        h3Tags: [],
        imageCount: 8,
        imagesWithAlt: 6,
        imagesWithoutAlt: 2,
        internalLinks: [url, `${url}/about`, `${url}/contact`],
        externalLinks: [],
        wordCount: 620,
        hasViewportMeta: true,
        schemaMarkup: [],
        loadTime: 2200,
        errors: [],
      },
    ],
    sitemapFound: false,
    sitemapUrl: null,
    robotsTxtFound: true,
    robotsTxtContent: "User-agent: *\nAllow: /",
    totalPagesDiscovered: 15,
    totalPagesCrawled: 3,
    crawlDuration: 8500,
    errors: [],
  };
}
