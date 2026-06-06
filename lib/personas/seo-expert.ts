/**
 * SEO Expert Persona - Inspired by Rand Fishkin Framework
 */

import { OpenAI } from "openai";
import { SEO_EXPERT_SYSTEM_PROMPT, buildSEOExpertPrompt } from "@/lib/prompts/seo";
import type { PersonaInputData, SEOExpertOutput, PersonaMetadata } from "./types";

const DEFAULT_OUTPUT: SEOExpertOutput = {
  seo_score: null,
  critical_issues: [],
  quick_wins: [],
  opportunities: [],
  confidence: "low",
  dataStatus: "insufficient_data",
  dataNotes: ["No crawl data available for SEO analysis."],
};

export async function runSEOExpert(
  data: PersonaInputData,
  openai: OpenAI
): Promise<{ output: SEOExpertOutput; metadata: PersonaMetadata }> {
  const startTime = Date.now();

  if (!data.findings?.length && !data.crawledPages?.length) {
    return { output: DEFAULT_OUTPUT, metadata: buildMetadata(startTime, 0, "no-data") };
  }

  try {
    const prompt = buildSEOExpertPrompt({
      domain: data.domain,
      findings: formatFindings(data),
      crawledPages: formatCrawledPages(data),
      pageSpeed: formatPageSpeed(data),
      linkGraph: formatLinkGraph(data),
      competitors: formatCompetitors(data),
      brandPositioning: formatBrandPositioning(data),
      businessType: data.businessClassification?.businessType || "Unknown",
      industry: data.businessClassification?.industryCategory || data.industry || "Not specified",
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: SEO_EXPERT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.45,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJSON(text) as Partial<SEOExpertOutput>;
    const tokensUsed = response.usage?.total_tokens || 0;

    const output: SEOExpertOutput = {
      seo_score: validateScore(parsed.seo_score),
      critical_issues: Array.isArray(parsed.critical_issues) ? parsed.critical_issues : [],
      quick_wins: Array.isArray(parsed.quick_wins) ? parsed.quick_wins : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      confidence: parsed.confidence || "medium",
      dataStatus: parsed.dataStatus || "partial",
      dataNotes: Array.isArray(parsed.dataNotes) ? parsed.dataNotes : [],
    };

    return { output, metadata: buildMetadata(startTime, tokensUsed, "gpt-4o") };
  } catch (error) {
    console.error("[SEO Expert] AI generation failed:", error);
    return { output: generateFallbackSEO(data), metadata: buildMetadata(startTime, 0, "fallback") };
  }
}

function generateFallbackSEO(data: PersonaInputData): SEOExpertOutput {
  const criticalFindings = data.findings?.filter(function(f) { return f.severity === "CRITICAL" || f.severity === "ERROR"; }) || [];
  const warningFindings = data.findings?.filter(function(f) { return f.severity === "WARNING"; }) || [];
  const hasData = (data.findings?.length ?? 0) > 0 || (data.crawledPages?.length ?? 0) > 0;
  const businessType = data.businessClassification?.businessType || "unknown";
  const industry = data.businessClassification?.industryCategory || data.industry || "this industry";
  const pageCount = data.crawledPages?.length || 0;
  const linkCount = data.linkGraph?.totalInternalLinks || 0;
  const orphanCount = data.linkGraph?.orphanPages || 0;

  // Rand Fishkin-specific: focus on search intent, topic clusters, internal linking, authority building
  const criticalIssues: SEOExpertOutput["critical_issues"] = [];
  const quickWins: SEOExpertOutput["quick_wins"] = [];
  const opportunities: SEOExpertOutput["opportunities"] = [];

  // Map critical findings from data
  for (const f of criticalFindings.slice(0, 5)) {
    criticalIssues.push({
      title: f.title || f.type,
      description: f.description || f.message || f.title || "",
      affectedPages: f.affectedPages || f.affectedUrls || [],
      severity: "critical" as const,
      evidence: f.howToFix || "Found during automated analysis",
      howToFix: f.howToFix || "Review and address this issue",
    });
  }
  for (const f of warningFindings.slice(0, 3)) {
    quickWins.push({
      title: f.title || f.type,
      description: f.description || f.message || f.title || "",
      effort: "Low - CMS edit or config change",
      expectedImpact: f.impact || "Improves SEO health",
      evidence: f.howToFix || "Identified during analysis",
    });
  }

  // Rand Fishkin-specific: search intent coverage analysis
  if (pageCount < 15) {
    criticalIssues.push({
      title: "Insufficient content depth for search intent coverage",
      description: `Only ${pageCount} pages discovered. Rand Fishkin's core principle: 'You can't rank for what you don't have content for.' A ${businessType} in ${industry} needs at minimum 20-30 pages to cover the range of search intents (informational, commercial, transactional) that drive organic traffic. The current site lacks the topical breadth needed to compete.`,
      affectedPages: [data.domain],
      severity: "critical",
      evidence: `Only ${pageCount} pages for a ${businessType} business. Industry benchmark: 30+ pages minimum.`,
      howToFix: `Build a content hub with 15-20 new pages targeting the full search intent spectrum for ${industry}. Create pillar pages for broad topics, then cluster pages for specific subtopics.`,
    });
  }

  // Rand Fishkin-specific: internal linking
  if (linkCount < pageCount * 2 && pageCount > 3) {
    opportunities.push({
      title: "Rebuild internal linking for authority flow",
      description: `Only ${linkCount} internal links across ${pageCount} pages. Rand Fishkin's framework emphasizes that internal links are how Google understands site architecture and passes authority. Each page should have 3-5 contextual internal links pointing to it. Current ratio of ${(linkCount / Math.max(1, pageCount)).toFixed(1)} links per page is well below best practices.`,
      priority: "high",
      evidence: `Current: ${linkCount} links / ${pageCount} pages = ${(linkCount / Math.max(1, pageCount)).toFixed(1)} links/page. Target: 3-5 links/page.`,
    });
  }

  if (orphanCount > 0) {
    opportunities.push({
      title: "Fix orphan pages to unlock trapped authority",
      description: `${orphanCount} orphan pages detected (pages with no internal links pointing to them). From Rand Fishkin's perspective, these pages are invisible to both users and search crawlers. This is wasted content investment and trapped link equity. Every page on the site should be reachable within 3 clicks from the homepage.`,
      priority: "high",
      evidence: `${orphanCount} orphan pages found. Each should have contextual links from at least 2 relevant pages.`,
    });
  }

  // Topic clusters recommendation
  if (pageCount >= 5) {
    opportunities.push({
      title: "Build topic clusters for topical authority",
      description: `Rand Fishkin's key insight: Google ranks websites, not pages. Build topical authority by organizing content into clusters around pillar pages. Each pillar page (broad topic) should link to 5-15 cluster pages (specific subtopics). This signals expertise to Google and improves rankings across the entire cluster.`,
      priority: "medium",
      evidence: `Based on ${pageCount} pages. Topic cluster model proven to increase rankings by 3-5x for clustered content.`,
    });
  }

  return {
    seo_score: hasData ? Math.max(20, 100 - criticalFindings.length * 12 - warningFindings.length * 3) : null,
    critical_issues: criticalIssues.slice(0, 5),
    quick_wins: quickWins.length > 0 ? quickWins : [
      { title: "Add more content that matches search intent", description: `For a ${businessType} in ${industry}, map each page to a specific search intent (informational, commercial, transactional) and optimize title tags, meta descriptions, and content to match that intent precisely. Rand Fishkin: 'Rankings follow relevance, and relevance follows intent alignment.'`, effort: "Ongoing - content optimization", expectedImpact: "Improved click-through rates and rankings for target keywords", evidence: `No quick wins from automated analysis. Intent mapping is the highest-leverage SEO activity for a ${businessType} site.` },
    ],
    opportunities: opportunities.slice(0, 4),
    confidence: hasData ? "medium" : "low",
    dataStatus: hasData ? "partial" : "insufficient_data",
    dataNotes: ["Rand Fishkin framework — search intent & topical authority analysis (fallback)."],
  };
}

function formatFindings(data: PersonaInputData): string {
  if (!data.findings?.length) return "No findings available.";
  var items = data.findings.slice(0, 20).map(function(f) {
    var pages = (f.affectedPages || f.affectedUrls || []).slice(0, 3).join(", ");
    return "- [" + f.severity + "] " + f.title + ": " + (f.description || f.message || "") + " (Fix: " + (f.howToFix || "N/A") + ") | Pages: " + pages;
  });
  return items.join("\n");
}

function formatCrawledPages(data: PersonaInputData): string {
  if (!data.crawledPages?.length) return "No crawled pages available.";
  var items = data.crawledPages.slice(0, 15).map(function(p) {
    var issues = (p.issues?.slice(0, 3).join("; ") || "None");
    return "- " + p.url + " (Status: " + p.statusCode + ", Title: " + (p.title || "MISSING") + ") Issues: " + issues;
  });
  return items.join("\n");
}

function formatPageSpeed(data: PersonaInputData): string {
  if (!data.pageSpeedMetrics) return "Page speed data not available.";
  var m = data.pageSpeedMetrics;
  return "Performance: " + m.performance + "/100 | LCP: " + m.lcp + "ms | CLS: " + m.cls + " | FID: " + m.fid + "ms | FCP: " + m.fcp + "ms | TTFB: " + m.ttfb + "ms";
}

function formatLinkGraph(data: PersonaInputData): string {
  if (!data.linkGraph) return "Link graph data not available.";
  var lg = data.linkGraph;
  var topPages = lg.topLinkedPages?.slice(0, 5).map(function(p) { return p.url + " (" + p.inbound + " links)"; }).join(", ") || "N/A";
  return "Total internal links: " + lg.totalInternalLinks + " | Orphan pages: " + lg.orphanPages + " | Avg click depth: " + lg.avgClickDepth + " | Top pages: " + topPages;
}

function formatCompetitors(data: PersonaInputData): string {
  if (!data.competitors) return "Competitor data not available.";
  var c = data.competitors;
  var comps = c.competitors?.map(function(comp) { return comp.domain + " (confidence: " + comp.confidence + "%)"; }).join(", ") || "None";
  var gaps = c.summary?.primaryGaps?.join("; ") || "N/A";
  return "Competitive position: " + (c.summary?.competitivePosition || "Unknown") + " | Competitors: " + comps + " | Primary gaps: " + gaps;
}

function formatBrandPositioning(data: PersonaInputData): string {
  if (!data.brandPositioning) return "Brand positioning not available.";
  var bp = data.brandPositioning;
  return "Industry: " + bp.industryCategory + " | Model: " + bp.businessModel + " | Value prop: " + (bp.valueProposition?.slice(0, 200) || "N/A") + " | Voice: " + (bp.brandVoice?.formality || "Unknown") + " | Confidence: " + bp.confidence + "%";
}

function parseJSON(text: string): unknown {
  var trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch {
    var start = trimmed.indexOf("{"); var end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return parseable JSON");
  }
}

function validateScore(score: unknown): number | null {
  return typeof score === "number" && score >= 0 && score <= 100 ? score : null;
}

function buildMetadata(startTime: number, tokensUsed: number, model: string): PersonaMetadata {
  return { framework: "Rand Fishkin Framework", model: model, tokensUsed: tokensUsed, generatedAt: new Date().toISOString(), executionTimeMs: Date.now() - startTime };
}
