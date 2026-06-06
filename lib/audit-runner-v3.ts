/**
 * Audit Runner V3
 *
 * Full AI-native Growth OS pipeline:
 * 1. Two-tier crawl (HTTP fast + selective JS render)
 * 2. Technical SEO analysis
 * 3. On-page SEO analysis
 * 4. Page speed (PageSpeed Insights)
 * 5. Internal link graph
 * 6. GEO / AI visibility probing (parallel with crawl phases)
 * 7. Priority scoring (Impact × Urgency × Confidence / Effort)
 * 8. Recommendation compilation (daily actions)
 * 9. Anti-hallucination validated AI verdict
 * 10. Save everything
 */

import prisma from "./prisma";
import { quickCrawlV2, CrawlResultV2 } from "./crawler-v2";
import { analyzeTechnicalSeoV2, TechnicalSeoResultV2 } from "./analyzers/technical-seo-v2";
import { analyzeOnPageSeo, OnPageSeoResult } from "./analyzers/on-page-seo";
import { analyzePageSpeed, PageSpeedResult } from "./analyzers/page-speed";
import { analyzeCompetitors, detectCompetitors, CompetitorResult } from "./analyzers/competitors";
import { analyzeMarketingChannelsV2WithWebResearch, ChannelResultV2 } from "./analyzers/channels-v2";
import { analyzeGeoVisibility, GeoAnalysisResult } from "./analyzers/geo-visibility";
import { analyzeLinkGraph, LinkGraphResult } from "./analyzers/link-graph";
import { analyzeBrandPositioning, BrandPositioning } from "./brand-positioning";
import { classifyBusinessType, detectContentGapsByBusinessType, type BusinessClassification } from "./business-type-classifier";
import { scoreFindings, ScoredFinding, RawFinding } from "./scoring-engine";
import { compileRecommendations, WeeklyBacklog } from "./recommendation-engine";
import { validateFindings, validateAndSanitiseClaims } from "./validators/anti-hallucination";
import { generateCMOReportWithPersonas, CMOReport, buildFallbackSocialMediaIntelligence, type AuditData as CMOAuditData } from "@/lib/ai-summary-v3";
import { type Finding as RAGFinding } from "@/lib/rag";
import { Severity } from "@prisma/client";

// ─────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────

export async function runAuditV3(auditId: string): Promise<void> {
  console.log(`[Audit V3] Starting: ${auditId}`);
  const startTime = Date.now();

  try {
    const audit = await prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new Error(`Audit not found: ${auditId}`);

    // ── PHASE 1: CRAWL ──────────────────────────────────────────────
    await progress(auditId, "CRAWLING", 5, "Initialising crawler…");

    let crawlData: CrawlResultV2;
    try {
      crawlData = await quickCrawlV2(audit.siteUrl, {
        maxPages: 25,
        maxConcurrency: 5,
        waitForNetworkIdle: false,
        includeSubdomains: false,
        retryAttempts: 1,
        onProgress: async (p) => {
          const pct = 5 + Math.round(p.percentage * 0.30);
          await progress(auditId, "CRAWLING", pct, `Crawling… (${p.pagesCrawled}/${p.pagesDiscovered} pages)`);
        },
      });
    } catch (err) {
      throw new Error(`Crawl failed: ${err}`);
    }

    console.log(`[V3] Crawl done: ${crawlData.totalPagesCrawled} pages, confidence ${crawlData.overallConfidence.score}%`);

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        crawlData: JSON.parse(JSON.stringify(crawlData)),
        pagesDiscovered: crawlData.totalPagesDiscovered,
        pagesCrawled: crawlData.totalPagesCrawled,
      },
    });

    // ── PHASE 2: ANALYSIS (parallel where safe) ─────────────────────
    await progress(auditId, "ANALYZING", 35, "Running technical SEO analysis…");

    // Sequential for analysis modules that share crawlData
    const technicalSeo = analyzeTechnicalSeoV2(crawlData);
    const onPageSeo = analyzeOnPageSeo(convertToV1Format(crawlData));
    const linkGraph = analyzeLinkGraph(crawlData);
    const channels = await analyzeMarketingChannelsV2WithWebResearch(crawlData);

    await progress(auditId, "ANALYZING", 50, "Fetching page speed data…");
    let pageSpeed: PageSpeedResult;
    try {
      pageSpeed = await analyzePageSpeed(audit.siteUrl, process.env.GOOGLE_PAGESPEED_API_KEY);
    } catch {
      pageSpeed = defaultPageSpeedResult();
    }

    // ── PHASE 2b: BUSINESS TYPE CLASSIFICATION ──────────────────────
    await progress(auditId, "ANALYZING", 57, "Analyzing brand positioning…");
    let brandPositioning: BrandPositioning | undefined;
    let businessClassification: BusinessClassification | undefined;
    try {
      brandPositioning = analyzeBrandPositioning(crawlData);
      businessClassification = classifyBusinessType(crawlData);
      console.log(`[V3] Business type: ${businessClassification.businessType} (confidence ${businessClassification.confidence}%), industry: ${businessClassification.industryCategory}`);
      console.log(`[V3] Expected assets for ${businessClassification.businessType}: ${businessClassification.expectedContentAssets.length} assets`);
    } catch (err) {
      console.error("[V3] Brand positioning / business type analysis error:", err);
    }

    await progress(auditId, "ANALYZING", 60, "Benchmarking competitors...");
    let competitors: CompetitorResult | undefined;
    try {
      const competitorContextTerms = buildCompetitorContextTerms(crawlData, brandPositioning);
      const competitorDomains = await detectCompetitors(audit.domain, competitorContextTerms);
      console.log(`[V3] Competitor detection context: ${competitorContextTerms.slice(0, 8).join(", ")} — found ${competitorDomains.length} candidates`);
      competitors = await analyzeCompetitors(audit.domain, competitorDomains);
    } catch (err) {
      console.error("[V3] Competitor analysis error:", err);
    }

    // ── PHASE 3: GEO VISIBILITY ─────────────────────────────────────
    await progress(auditId, "ANALYZING", 62, "Probing AI visibility (GEO)…");
    let geoResult: GeoAnalysisResult;
    try {
      geoResult = await analyzeGeoVisibility(audit.domain, audit.siteUrl);
    } catch (err) {
      console.error("[V3] GEO probe error:", err);
      geoResult = fallbackGeoResult(audit.domain);
    }

    // ── PHASE 4: PRIORITY SCORING ────────────────────────────────────
    await progress(auditId, "ANALYZING", 72, "Scoring and prioritising findings…");

    const crawlConfidence = crawlData.overallConfidence.score;

    const rawFindings: RawFinding[] = [
      ...(technicalSeo.findings as unknown as RawFinding[]),
      ...(onPageSeo.findings as unknown as RawFinding[]),
      ...(pageSpeed.findings.map(f => ({ ...f, affectedUrls: [], affectedCount: 0 })) as unknown as RawFinding[]),
      ...((competitors?.findings || []).map(f => ({ ...f, affectedUrls: [], affectedCount: 0 })) as unknown as RawFinding[]),
      ...(channels.findings as unknown as RawFinding[]),
    ];
    const scored = scoreFindings(rawFindings, crawlConfidence);
    const { sanitisedFindings } = validateFindings(scored, crawlConfidence);

    // Compile recommendations (daily top-2 + weekly backlog)
    const backlog = compileRecommendations(sanitisedFindings, geoResult, linkGraph);

    // ── PHASE 5: AI VERDICT (RAG-Enhanced CMO Report) ────────────────
    await progress(auditId, "GENERATING_REPORT", 82, "Generating RAG-enhanced CMO report…");

    // Convert findings to RAG format
    const ragFindings: RAGFinding[] = sanitisedFindings.map(f => ({
      id: String(f.id || f.type),
      type: f.type,
      title: f.title,
      message: f.description || f.title,
      description: f.description,
      severity: f.severity as "CRITICAL" | "WARNING" | "INFO",
      category: typeof f.category === "string" ? f.category : deriveCategory(f.type),
      impact: f.impact,
      howToFix: f.howToFix,
      affectedPages: f.affectedUrls || [],
      affectedUrls: f.affectedUrls || [],
    }));

    // Build CMO audit data with all context
    const cmoAuditData: CMOAuditData = {
      domain: audit.domain,
      industry: undefined, // Could be passed from user input later
      findings: ragFindings,
      pageSpeedMetrics: pageSpeed.metrics ? {
        performance: pageSpeed.mobileScore || pageSpeed.score || 0,
        lcp: pageSpeed.metrics.mobile?.largestContentfulPaint || pageSpeed.coreWebVitals.lcp.value || 0,
        cls: pageSpeed.metrics.mobile?.cumulativeLayoutShift || pageSpeed.coreWebVitals.cls.value || 0,
        fid: pageSpeed.metrics.mobile?.totalBlockingTime || pageSpeed.coreWebVitals.fid.value || 0,
        fcp: pageSpeed.metrics.mobile?.firstContentfulPaint || 0,
        ttfb: pageSpeed.metrics.mobile?.loadTime || 0,
      } : undefined,
      geoVisibility: {
        overallScore: geoResult.compositeScore,
        providers: Object.entries(geoResult.providerScores).map(([provider, score]) => ({
          name: geoResult.providerLabels[provider as keyof typeof geoResult.providerLabels] || provider,
          mentioned: score > 0,
          sentiment: geoResult.sentimentScore >= 70 ? "positive" : geoResult.sentimentScore <= 30 ? "negative" : "neutral",
          citations: geoResult.probes.filter(p => p.provider === provider && p.citedUrl).length,
        })),
      },
      crawledPages: crawlData.pages?.slice(0, 50).map(p => ({
        url: p.url,
        title: p.title || undefined,
        statusCode: p.statusCode,
        issues: [...(p.errors || []), ...(p.warnings || [])],
      })) || [],
      linkGraph: {
        totalInternalLinks: linkGraph.metrics.totalEdges,
        orphanPages: linkGraph.metrics.orphanCount,
        avgClickDepth: linkGraph.metrics.avgClickDepth,
        topLinkedPages: linkGraph.metrics.topAuthority?.slice(0, 5).map(p => ({
          url: p.url,
          inbound: p.score,
        })) || [],
      },
      competitors,
      channels,
      brandPositioning,
      businessClassification,
    };

    // Generate full CMO report using Multi-Persona Expert Analysis
    let cmoReport: CMOReport;
    try {
      cmoReport = await generateCMOReportWithPersonas(cmoAuditData);
      console.log(`[V3] CMO report generated: Score ${cmoReport.overallScore}, RAG: ${cmoReport.ragContextUsed}, Personas: ${cmoReport.reviewed_by ? Object.keys(cmoReport.reviewed_by).length : 0}`);
    } catch (err) {
      console.error("[V3] CMO report generation failed, using fallback:", err);
      cmoReport = generateFallbackCMOReport(audit.domain, sanitisedFindings, geoResult, channels);
    }

    // ── PHASE 6: PERSIST ─────────────────────────────────────────────
    await progress(auditId, "GENERATING_REPORT", 93, "Saving report…");

    // Save analysis results
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        technicalSeo: JSON.parse(JSON.stringify(technicalSeo)),
        onPageSeo: JSON.parse(JSON.stringify(onPageSeo)),
        pageSpeed: JSON.parse(JSON.stringify(pageSpeed)),
        competitors: competitors ? JSON.parse(JSON.stringify(competitors)) : null,
        channels: JSON.parse(JSON.stringify(channels)),
        linkGraph: JSON.parse(JSON.stringify({ metrics: linkGraph.metrics })),
        geoData: JSON.parse(JSON.stringify(geoResult)),
        geoScore: geoResult.compositeScore,
      },
    });

    // Save GEO probes to dedicated table
    if (geoResult.probes.length > 0) {
      await prisma.geoProbe.createMany({
        data: geoResult.probes.map(p => ({
          auditId,
          provider: p.provider,
          query: p.query,
          queryIntent: p.queryIntent,
          mentioned: p.mentioned,
          citedUrl: p.citedUrl || null,
          position: p.position || null,
          sentiment: p.sentiment || null,
          responseSnippet: p.responseSnippet?.slice(0, 500) || null,
          score: p.score,
        })),
      });
    }

    // Save all findings with priority scores
    await saveFindingsV3(auditId, sanitisedFindings, geoResult, linkGraph, cmoReport);

    // Save action items
    await saveActionItems(auditId, backlog);

    // Calculate grade from CMO report
    const overallGrade = scoreToGrade(cmoReport.overallScore);

    // Complete audit with full CMO report
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETE",
        progress: 100,
        currentStep: "complete",
        grade: overallGrade,
        gradeScore: cmoReport.overallScore,
        aiSummary: JSON.parse(JSON.stringify({
          // Executive Summary
          executiveSummary: cmoReport.executiveSummary,
          
          // Scores by category
          overallScore: cmoReport.overallScore,
          categoryScores: cmoReport.categoryScores,
          
          // Actions
          immediateActions: cmoReport.immediateActions,
          weeklyBacklog: cmoReport.weeklyBacklog,
          strategicInitiatives: cmoReport.strategicInitiatives,
          
          // CMO Report sections
          brandPositioningAnalysis: cmoReport.brandPositioningAnalysis,
          swotAnalysis: cmoReport.swotAnalysis,
          marketingStrategy: cmoReport.marketingStrategy,
          socialMediaIntelligence: cmoReport.socialMediaIntelligence,
          contentIntelligence: cmoReport.contentIntelligence,
          competitorIntelligence: cmoReport.competitorIntelligence,
          seoAssessment: cmoReport.seoAssessment,
          technicalAssessment: cmoReport.technicalAssessment,
          geoStrategy: cmoReport.geoStrategy,
          
          // Growth plan phases
          thirtyDayPlan: cmoReport.thirtyDayPlan,
          sixtyDayPlan: cmoReport.sixtyDayPlan,
          ninetyDayPlan: cmoReport.ninetyDayPlan,
          
          // Quick wins and opportunities
          quickWins: cmoReport.quickWins,
          growthOpportunities: cmoReport.growthOpportunities,
          
          // Marketing maturity
          marketingMaturityScore: cmoReport.marketingMaturityScore,
          marketingMaturityLabel: cmoReport.marketingMaturityLabel,
          
          // Legacy fields for compatibility
          backlog: {
            dailyActions: backlog.dailyActions.map(a => ({
              rank: a.rank,
              title: a.action.title,
              category: a.action.category,
              severity: a.action.severity,
              whyNow: a.action.whyNow,
              expectedResult: a.action.expectedResult,
              expectedResultWindow: a.action.expectedResultWindow,
              effortMinutes: a.action.effortMinutes,
              impactScore: a.action.impactScore,
            })),
            totalPending: backlog.totalPendingActions,
          },
          geoSummary: {
            compositeScore: geoResult.compositeScore,
            providerScores: geoResult.providerScores,
            brandMentionRate: geoResult.brandMentionRate,
            confidence: geoResult.confidence,
          },
          linkGraphSummary: linkGraph.metrics,
          
          // Persona metadata
          reviewedBy: cmoReport.reviewed_by || null,
          personaMetadata: cmoReport.personaMetadata || null,
          
          // RAG metadata
          ragContextUsed: cmoReport.ragContextUsed,
          citations: cmoReport.citations,
          
          version: "4.0.0-multi-persona",
          analysisTimestamp: cmoReport.generatedAt,
        })),
        completedAt: new Date(),
        reportGenerated: true,
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[V3] Complete: ${auditId} — ${duration}s — Grade: ${overallGrade} (${cmoReport.overallScore})`);

  } catch (error) {
    console.error(`[V3] Failed: ${auditId}`, error);
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

// Score to letter grade conversion
function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "F";
}

// ─────────────────────────────────────────
// SAVE HELPERS
// ─────────────────────────────────────────

async function saveFindingsV3(
  auditId: string,
  scoredFindings: ScoredFinding[],
  geoResult: GeoAnalysisResult,
  linkGraph: LinkGraphResult,
  cmoReport: CMOReport
) {
  // Merge all scored findings
  const geoScored = scoreFindings(geoResult.findings, 80);
  const linkScored = scoreFindings(linkGraph.findings, 90);
  const allFindings = [...scoredFindings, ...geoScored, ...linkScored];

  if (allFindings.length === 0) return;

  await prisma.finding.deleteMany({ where: { auditId } });

  await prisma.finding.createMany({
    data: allFindings.map(f => {
      const category = deriveCategory(f.type);
      return {
        auditId,
        category,
        type: f.type,
        severity: f.severity as Severity,
        title: f.title,
        description: f.description,
        impact: f.impact,
        howToFix: f.howToFix,
        affectedUrls: (f.affectedUrls || []).slice(0, 20),
        affectedCount: f.affectedCount || 0,
        evidence: JSON.parse(JSON.stringify(f.evidence || {})),
        score: f.score ?? 50,
        confidence: f.confidenceScore ?? f.confidence ?? 80,
        effortScore: f.effortScore ?? 50,
        impactScore: f.impactScore ?? 50,
        priorityScore: f.priorityScore ?? 0,
        priority: f.priorityBand === "critical" ? 1 : f.priorityBand === "high" ? 2 : 3,
      };
    }),
  });

  console.log(`[V3] Saved ${allFindings.length} findings`);
}

async function saveActionItems(auditId: string, backlog: WeeklyBacklog) {
  const allActions = [...backlog.dailyActions, ...backlog.thisWeek];
  if (allActions.length === 0) return;

  await prisma.actionItem.deleteMany({ where: { auditId } });

  await prisma.actionItem.createMany({
    data: allActions.map(a => ({
      auditId,
      title: a.action.title,
      category: a.action.category,
      severity: a.action.severity as Severity,
      whyNow: a.action.whyNow,
      whyThisPage: a.action.whyThisPage || null,
      steps: JSON.parse(JSON.stringify(a.action.steps)),
      verificationChecks: JSON.parse(JSON.stringify(a.action.verificationChecks)),
      codeSnippet: a.action.codeSnippet || null,
      expectedResult: a.action.expectedResult,
      expectedResultWindow: a.action.expectedResultWindow,
      effortMinutes: a.action.effortMinutes,
      impactScore: a.action.impactScore,
      confidenceScore: a.action.confidenceScore,
      priorityScore: a.action.priorityScore,
    })),
  });

  console.log(`[V3] Saved ${allActions.length} action items`);
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────

async function progress(
  auditId: string,
  status: "CRAWLING" | "ANALYZING" | "GENERATING_REPORT" | "COMPLETE" | "FAILED" | "PENDING",
  pct: number,
  step: string
) {
  await prisma.audit.update({
    where: { id: auditId },
    data: { status, progress: pct, currentStep: step },
  });
}

function deriveCategory(type: string): string {
  const t = type?.toLowerCase().replace(/[-\s]/g, "_") || "";
  if (t.includes("geo") || t.includes("answer")) return "geo";
  if (t.includes("speed") || t.includes("lcp") || t.includes("cls")) return "speed";
  if (t.includes("schema") || t.includes("faq")) return "schema";
  if (t.includes("title") || t.includes("meta") || t.includes("h1") || t.includes("alt")) return "onpage";
  if (t.includes("orphan") || t.includes("depth") || t.includes("anchor") || t.includes("link") || t.includes("sitemap") || t.includes("robots") || t.includes("canonical")) return "technical";
  if (t.includes("content") || t.includes("thin") || t.includes("duplicate")) return "content";
  return "technical";
}

function convertToV1Format(v2: CrawlResultV2) {
  return {
    domain: v2.domain,
    baseUrl: v2.baseUrl,
    pages: v2.pages.map(p => ({
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
    sitemapFound: v2.sitemapFound,
    sitemapUrl: v2.sitemapUrls[0] || null,
    robotsTxtFound: v2.robotsTxtFound,
    robotsTxtContent: v2.robotsTxtContent,
    totalPagesDiscovered: v2.totalPagesDiscovered,
    totalPagesCrawled: v2.totalPagesCrawled,
    crawlDuration: v2.crawlDuration,
    errors: v2.errors.map(e => e.message),
  };
}

function buildCompetitorContextTerms(
  crawlData: CrawlResultV2,
  brandPositioning?: BrandPositioning
): string[] {
  const terms = new Set<string>();

  // If brand positioning was extracted, use its industry category as the
  // PRIMARY signal for competitor discovery. This replaces the vague
  // "marketing brand business strategy" keywords that were causing
  // fourweekmba-like sites to appear.
  if (brandPositioning?.industryCategory && brandPositioning.industryCategory !== "General / Other" && !brandPositioning.industryCategory.startsWith("Unable to determine")) {
    const categoryTokens = brandPositioning.industryCategory
      .toLowerCase()
      .split(/[\s/]+/)
      .filter(t => t.length > 2 && !COMMON_CONTEXT_WORDS.has(t));
    for (const token of categoryTokens) terms.add(token);

    // Add the business model as context too
    if (brandPositioning.businessModel && brandPositioning.businessModel !== "Unknown") {
      terms.add(brandPositioning.businessModel.toLowerCase());
    }
  }

  // Fall back to crawled page content for additional context terms
  for (const page of crawlData.pages.slice(0, 12)) {
    for (const value of [
      page.title,
      page.metaDescription,
      ...page.h1Tags.slice(0, 3),
      ...page.h2Tags.slice(0, 5),
    ]) {
      if (!value) continue;
      value
        .replace(/https?:\/\/\S+/gi, " ")
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
  "after",
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
  "privacy",
  "service",
  "services",
  "solutions",
  "terms",
  "that",
  "this",
  "with",
  "your",
]);

function defaultPageSpeedResult(): PageSpeedResult {
  return {
    score: 50, mobileScore: 50, desktopScore: 60,
    coreWebVitals: {
      lcp: { value: 3000, rating: "needs-improvement" },
      fid: { value: 200, rating: "needs-improvement" },
      cls: { value: 0.15, rating: "needs-improvement" },
    },
    metrics: { mobile: null, desktop: null },
    summary: { criticalCount: 0, warningCount: 0, infoCount: 0 },
    findings: [{
      type: "page_speed_unavailable",
      severity: "INFO",
      title: "Page speed data unavailable",
      description: "Could not retrieve PageSpeed data.",
      impact: "Unable to assess Core Web Vitals.",
      howToFix: "Check API key and try again.",
      score: 50,
    }],
  };
}

function fallbackGeoResult(domain: string): GeoAnalysisResult {
  return {
    compositeScore: 0,
    providerScores: { openai: 0, chatgpt: 0, perplexity: 0, claude: 0 },
    providerLabels: { openai: "ChatGPT", chatgpt: "ChatGPT", perplexity: "Perplexity", claude: "Claude" },
    probes: [],
    brandMentionRate: 0,
    citationQuality: 0,
    sentimentScore: 0,
    findings: [{
      type: "geo_not_mentioned",
      severity: "WARNING",
      title: "AI visibility could not be determined",
      description: "GEO probe failed to run. Your AI visibility across ChatGPT, Perplexity, Claude, and Gemini is unknown.",
      impact: "AI search visibility is an emerging channel. Not tracking it means missing early-mover opportunity.",
      howToFix: "Set GEMINI_API_KEY to enable GEO probing.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 40,
    }],
    recommendations: [],
    queryUniverse: [],
    confidence: 0,
  };
}

/**
 * Fallback CMO report when AI generation fails
 */
function generateFallbackCMOReport(
  domain: string,
  findings: ScoredFinding[],
  geoResult: GeoAnalysisResult,
  channels?: ChannelResultV2
): CMOReport {
  const errorCount = findings.filter(f => f.severity === "CRITICAL").length;
  const warningCount = findings.filter(f => f.severity === "WARNING").length;
  const avgScore = Math.max(20, 100 - (errorCount * 10) - (warningCount * 3));

  return {
    executiveSummary: {
      headline: `${domain} needs attention across ${errorCount} critical areas`,
      currentState: `Found ${errorCount} critical issues and ${warningCount} warnings requiring review.`,
      topOpportunity: findings[0]?.title || "Strengthen marketing foundation",
      expectedImpact: "Improvements across all marketing channels",
      timeToValue: "2-4 weeks for initial improvements",
    },
    marketingMaturityScore: avgScore,
    marketingMaturityLabel: avgScore >= 80 ? "Advanced" : avgScore >= 60 ? "Established" : avgScore >= 40 ? "Developing" : "Early",
    overallScore: avgScore,
    categoryScores: {
      marketingStrength: avgScore,
      socialPresence: 50,
      contentStrategy: 50,
      brandAuthority: 50,
      seoHealth: avgScore,
      technicalHealth: Math.max(20, avgScore - 10),
    },
    brandPositioningAnalysis: {
      tagline: null,
      valueProposition: "Positioning analysis pending",
      targetAudience: [],
      industryCategory: "Not specified",
      businessModel: "Unknown",
      messagingPillars: [],
      brandVoice: "Professional",
      positioningClarity: "Moderate",
      recommendations: ["Run AI report generation for full positioning analysis"],
    },
    swotAnalysis: {
      strengths: [],
      weaknesses: findings.slice(0, 3).map(f => ({
        category: "Marketing",
        finding: f.title,
        evidence: f.description,
        impact: f.impact,
      })),
      opportunities: [],
      threats: [],
    },
    immediateActions: findings.slice(0, 3).map((f, i) => ({
      id: `action-${i}`,
      title: f.title,
      description: f.description,
      priority: f.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      effort: "MODERATE",
      impact: f.impact || "Improves marketing performance",
      category: typeof f.category === "string" ? f.category : deriveCategory(f.type),
      affectedPages: f.affectedUrls?.slice(0, 5) || [],
      implementationSteps: [f.howToFix || "Review and address this issue"],
      toolsNeeded: [],
      expectedOutcome: "Issue resolved",
    })),
    marketingStrategy: {
      score: avgScore,
      summary: "Marketing strategy assessment pending full AI report",
      strengths: [],
      weaknesses: findings.slice(0, 3).map(f => f.title),
      recommendations: ["Complete AI report generation for detailed strategy"],
    },
    socialMediaIntelligence: buildFallbackSocialMediaIntelligence(channels),
    contentIntelligence: {
      currentContentMix: "Content analysis pending",
      bestPerformingContent: [],
      contentGaps: [],
      missingTopics: [],
      contentVelocity: "Analysis pending",
      recommendations: ["Schedule full AI report for content intelligence"],
    },
    competitorIntelligence: {
      directCompetitors: [],
      competitorStrengths: [],
      contentGaps: [],
      differentiationOpportunities: ["Complete AI report for competitor intelligence"],
      positioningComparison: "Competitor comparison pending",
    },
    seoAssessment: {
      score: avgScore,
      summary: "SEO assessment from crawl data",
      strengths: [],
      weaknesses: findings.slice(0, 3).map(f => f.title),
      recommendations: ["Address critical findings", "Review on-page optimization"],
    },
    technicalAssessment: {
      score: Math.max(20, avgScore - 10),
      summary: "Technical assessment from crawl data",
      strengths: [],
      weaknesses: [],
      recommendations: ["Review technical findings for optimization"],
    },
    geoStrategy: {
      currentVisibility: geoResult.compositeScore > 50 ? "Moderate" : "Low",
      aiReadinessScore: geoResult.compositeScore,
      recommendations: geoResult.recommendations || [],
    },
    quickWins: errorCount === 0 ? ["Focus on content strategy"] : [`Fix top ${Math.min(3, errorCount)} critical issues`],
    growthOpportunities: ["Full AI report generates detailed growth opportunities"],
    weeklyBacklog: [],
    strategicInitiatives: [],
    thirtyDayPlan: {
      focus: "Fix critical issues",
      actions: findings.slice(0, 3).map(f => `Resolve: ${f.title}`),
      expectedOutcomes: ["Stabilized marketing foundation"],
      kpis: ["Issue resolution rate"],
    },
    sixtyDayPlan: {
      focus: "Build marketing momentum",
      actions: ["Develop content strategy", "Strengthen social presence"],
      expectedOutcomes: ["Marketing improvement"],
      kpis: ["Content velocity", "Social engagement"],
    },
    ninetyDayPlan: {
      focus: "Scale operations",
      actions: ["Launch growth campaigns"],
      expectedOutcomes: ["Score improvement"],
      kpis: ["Overall marketing strength"],
    },
    citations: [],
    generatedAt: new Date().toISOString(),
    ragContextUsed: false,
    tokensUsed: 0,
  };
}

// Re-export V2 as well for backward compatibility
export { runAuditV3 as runAuditV2 };
