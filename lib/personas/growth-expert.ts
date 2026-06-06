/**
 * Growth Strategist Persona - Inspired by Andrew Chen Framework
 */

import { OpenAI } from "openai";
import { GROWTH_EXPERT_SYSTEM_PROMPT, buildGrowthExpertPrompt } from "@/lib/prompts/growth";
import type { PersonaInputData, GrowthExpertOutput, PersonaMetadata } from "./types";

const DEFAULT_OUTPUT: GrowthExpertOutput = {
  growth_score: null,
  growth_opportunities: [],
  channel_recommendations: [],
  high_roi_actions: [],
  confidence: "low",
  dataStatus: "insufficient_data",
  dataNotes: ["Insufficient data to assess growth opportunities."],
};

export async function runGrowthExpert(
  data: PersonaInputData,
  openai: OpenAI
): Promise<{ output: GrowthExpertOutput; metadata: PersonaMetadata }> {
  const startTime = Date.now();
  if (!data.channels && !data.competitors && !data.crawledPages?.length) {
    return { output: DEFAULT_OUTPUT, metadata: buildMetadata(startTime, 0, "no-data") };
  }

  try {
    const prompt = buildGrowthExpertPrompt({
      domain: data.domain,
      channels: formatChannels(data),
      competitors: formatCompetitors(data),
      brandPositioning: formatBrandPositioning(data),
      crawledPages: formatCrawledPages(data),
      pageSpeed: formatPageSpeed(data),
      businessType: data.businessClassification?.businessType || "Unknown",
      industry: data.businessClassification?.industryCategory || data.industry || "Not specified",
      findings: formatFindings(data),
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: GROWTH_EXPERT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJSON(text) as Partial<GrowthExpertOutput>;
    const tokensUsed = response.usage?.total_tokens || 0;

    const output: GrowthExpertOutput = {
      growth_score: validateScore(parsed.growth_score),
      growth_opportunities: Array.isArray(parsed.growth_opportunities) ? parsed.growth_opportunities : [],
      channel_recommendations: Array.isArray(parsed.channel_recommendations) ? parsed.channel_recommendations : [],
      high_roi_actions: Array.isArray(parsed.high_roi_actions) ? parsed.high_roi_actions : [],
      confidence: parsed.confidence || "medium",
      dataStatus: parsed.dataStatus || "partial",
      dataNotes: Array.isArray(parsed.dataNotes) ? parsed.dataNotes : [],
    };

    return { output, metadata: buildMetadata(startTime, tokensUsed, "gpt-4o") };
  } catch (error) {
    console.error("[Growth Expert] AI generation failed:", error);
    return { output: generateFallbackGrowth(data), metadata: buildMetadata(startTime, 0, "fallback") };
  }
}

function generateFallbackGrowth(data: PersonaInputData): GrowthExpertOutput {
  const hasChannels = !!data.channels;
  const hasCompetitors = !!data.competitors;
  const businessType = data.businessClassification?.businessType || "unknown";
  const industry = data.businessClassification?.industryCategory || data.industry || "this industry";
  const pageCount = data.crawledPages?.length || 0;
  const criticalCount = data.findings?.filter(f => f.severity === "CRITICAL" || f.severity === "ERROR").length || 0;

  const channelRecommendations: GrowthExpertOutput["channel_recommendations"] = [];
  const growthOpps: GrowthExpertOutput["growth_opportunities"] = [];
  const highRoi: GrowthExpertOutput["high_roi_actions"] = [];

  // Andrew Chen-specific: focus on growth loops, acquisition channels, cold start problems

  // Cold start problem — minimal measurement infrastructure
  growthOpps.push({
    title: "Solve the cold start problem: build measurement infrastructure first",
    description: `Andrew Chen's core thesis: 'You can't grow what you can't measure.' Before any growth initiatives, this brand needs: (1) proper analytics setup with conversion tracking, (2) UTM parameter strategy for channel attribution, (3) a North Star metric definition. Without these, every growth dollar is spent blind. The cold start problem isn't about users — it's about data.`,
    estimatedImpact: "Enables data-driven decisions across ALL growth channels",
    timeframe: "1-2 weeks",
    evidence: `For a ${businessType} in ${industry}: no measurement infrastructure detected. Andrew Chen: 'Growth is a system, not a tactic.'`,
  });

  if (pageCount < 15) {
    growthOpps.push({
      title: "Build an SEO growth loop, not just a blog",
      description: `Only ${pageCount} pages discovered. Andrew Chen's framework: the best growth channels have built-in loops where each user brings more users. SEO can be a growth loop: content → search → visitor → link/share → more search visibility. But this requires 50+ content pieces minimum to create a meaningful loop. Current volume is too low for any loop to form.`,
      estimatedImpact: `Compound organic growth from ${pageCount} → 50+ pages targeting ${industry} keywords`,
      timeframe: "30-60 days",
      evidence: `Only ${pageCount} pages. Growth loops require critical mass. Andrew Chen: 'Growth loops compound. Linear tactics don't.'`,
    });
  }

  // Business-type-specific channel recommendations (Andrew Chen: find the one channel that works before scaling)
  if (businessType === "b2b-saas" || businessType === "b2b-services") {
    channelRecommendations.push(
      { channel: "LinkedIn Creator Network", priority: "high", rationale: "Andrew Chen framework: find your 'growth engine' channel. For B2B, LinkedIn is the highest-leverage platform for building professional audience and direct outreach. Focus 80% of effort here before expanding.", evidence: `Business type: ${businessType}. Andrew Chen: 'Don't spray and pray. Find one channel that works, double down, then expand.'` },
      { channel: "Content-led SEO (product-led growth)", priority: "high", rationale: "PLG companies grow through product and content working together. Each piece of content should either drive signups or improve product usage. No 'thought leadership' — every page must have a measurable business outcome.", evidence: `Business type: ${businessType}. Content should drive conversions, not vanity metrics.` },
      { channel: "Email Nurture → Activation → Referral Loop", priority: "medium", rationale: "Build an email sequence that doesn't just nurture but activates. Once a user activates (first key action), trigger a referral request. Andrew Chen: 'The best growth is when your users do the acquiring.'", evidence: "Referral loops are the highest-intent acquisition channel with the lowest CAC." }
    );
    highRoi.push({
      title: "Double down on LinkedIn before any other channel",
      description: `Andrew Chen's 'power law of channels': one channel will outperform all others combined. For a ${businessType}, that's likely LinkedIn creator content. Pick one person to post daily for 90 days. Measure: connections, inbound DMs, profile views. If it works, hire a team for this channel before touching any other.`,
      estimatedROI: "10-50x ROI vs. spreading budget across 5 channels",
      effort: "Medium — daily commitment of 30 min/person",
      evidence: `Andrew Chen: 'Growth is about finding the one channel that works and pouring fuel on it.'`,
    });
  } else if (businessType === "ecommerce" || businessType === "d2c-brand") {
    channelRecommendations.push(
      { channel: "UGC Creator Loop", priority: "high", rationale: "Andrew Chen framework: build a loop where creators get free product → create content → attract customers → those customers become creators. This is the most scalable growth engine for D2C because it compounds: each creator brings more visibility which attracts more creators.", evidence: `Business type: ${businessType}. UGC loops have driven companies like Glossier and FIGS to billion-dollar valuations.` },
      { channel: "Paid Social (Instagram/TikTok) with strict LTV:CAC", priority: "high", rationale: "Paid social is the gas pedal once the UGC engine is running. But Andrew Chen warns: 'Paid acquisition without a retention strategy is a leaky bucket.' Must have retention emails, SMS, and loyalty program before scaling paid.", evidence: `Target LTV:CAC ratio: 3:1 minimum. Without retention infrastructure, paid scale is wasted.` },
      { channel: "Email/SMS Retention Engine", priority: "medium", rationale: "Most ecommerce brands focus 80% on acquisition and 20% on retention. Andrew Chen's data shows the inverse produces better unit economics. Build retention-first: email flows, SMS for flash sales, loyalty program, repeat purchase incentives before scaling acquisition.", evidence: "Andrew Chen: 'Acquisition is expensive. Retention compounds.'" }
    );
    highRoi.push({
      title: "Launch a creator sampling program before paid ads",
      description: `Send product to 50 micro-creators (1K-10K followers) in exchange for authentic content. Cost: product cost + shipping ($500-2000). Expected output: 50+ pieces of UGC, potential viral reach. Andrew Chen calls this 'incentivized growth loops' — the cost per acquisition drops with each loop iteration.`,
      estimatedROI: "3-10x cheaper than paid acquisition for initial customer base",
      effort: "Low-Medium — identify creators, send product, track content output",
      evidence: `Andrew Chen: 'Growth loops > Growth funnels. Loops compound, funnels leak.'`,
    });
  } else if (businessType === "local-business") {
    channelRecommendations.push(
      { channel: "Google Business Profile Optimization", priority: "high", rationale: "Andrew Chen framework: for local businesses, GBP is the single highest-ROI channel. Optimize posts, photos, reviews, Q&A. This is your growth engine — everything else supports it.", evidence: `Business type: ${businessType}. GBP optimization drives 3x more local searches than any other channel.` },
      { channel: "Review Request Loop", priority: "high", rationale: "Build a system: every customer → automated review request → positive review → more visibility → more customers → more reviews. This is a classic growth loop that compounds over time.", evidence: `Andrew Chen: 'Build loops, not funnels.' Review loops are the simplest growth loop for local businesses.` },
      { channel: "Local Community Partnerships", priority: "medium", rationale: "Partner with 5 complementary local businesses for cross-promotion. Each partner promotes you to their audience — instant distribution with zero ad spend. Track via unique promo codes or landing pages.", evidence: "Partnerships are a 'warm channel' with higher conversion than cold advertising." }
    );
  } else {
    channelRecommendations.push(
      { channel: "Content Marketing with SEO loop", priority: "high", rationale: "Build a content machine where each piece of content: (1) ranks in search (2) brings visitors (3) some visitors link to it (4) links improve rankings. This is Andrew Chen's definition of a growth loop — it compounds.", evidence: `For ${industry} businesses: content marketing has the highest long-term ROI of any channel.` },
      { channel: "Social Media (primary platform based on audience)", priority: "medium", rationale: "Andrew Chen: 'Find the platform where your audience already spends time and be the best creator on that platform for 90 days.' Don't be on every platform — dominate one first.", evidence: "Pick one platform and go deep before expanding." },
      { channel: "Email Newsletter", priority: "medium", rationale: "Email is the most underrated growth channel. Build a weekly newsletter that delivers genuine value. Andrew Chen's data: email has 3x higher conversion rates than social media for most industries.", evidence: "Email consistently outperforms social in conversion rates across industries." }
    );
  }

  return {
    growth_score: hasChannels ? 45 : hasCompetitors ? 40 : null,
    growth_opportunities: growthOpps.slice(0, 3),
    channel_recommendations: channelRecommendations,
    high_roi_actions: highRoi.length > 0 ? highRoi : [
      { title: "Find the one channel that works and go all-in", description: `Andrew Chen's most important insight: 'Growth is about finding the channel where 80% of your results come from 20% of your effort.' Pick one channel (based on ${businessType} in ${industry}), invest 90% of your growth budget there for 90 days, measure relentlessly, and only expand once it's working.`,
        estimatedROI: "10x higher ROI vs. spreading across 5 channels", effort: "Medium — requires disciplined focus", evidence: "Andrew Chen: 'Power law of channels: one channel will outperform all others combined.'" },
    ],
    confidence: hasChannels || hasCompetitors ? "medium" : "low",
    dataStatus: hasChannels || hasCompetitors ? "partial" : "insufficient_data",
    dataNotes: ["Andrew Chen framework — growth loops & cold start analysis (fallback)."],
  };
}

function formatChannels(data: PersonaInputData): string {
  if (!data.channels) return "Channel data not available.";
  var ch = data.channels;
  var lines = ch.channels.map(function(c) { return "- " + c.channel + ": status=" + c.status + ", quality=" + c.quality; });
  return "Score: " + ch.score + "/100 | Confidence: " + ch.confidence + "%\nChannels:\n" + lines.join("\n");
}

function formatCompetitors(data: PersonaInputData): string {
  if (!data.competitors) return "Competitor data not available.";
  var c = data.competitors;
  return "Position: " + (c.summary?.competitivePosition || "Unknown") + "\nCompetitors: " + (c.competitors?.length || 0) + "\nGaps: " + (c.summary?.primaryGaps?.join("; ") || "N/A");
}

function formatBrandPositioning(data: PersonaInputData): string {
  if (!data.brandPositioning) return "Brand positioning not available.";
  var bp = data.brandPositioning;
  return "Industry: " + bp.industryCategory + " | Model: " + bp.businessModel + " | Value prop: " + (bp.valueProposition?.slice(0, 150) || "N/A");
}

function formatCrawledPages(data: PersonaInputData): string {
  if (!data.crawledPages?.length) return "No crawled pages available.";
  var lines = data.crawledPages.slice(0, 8).map(function(p) { return "- " + p.url + " (" + p.statusCode + ")"; });
  return data.crawledPages.length + " pages crawled.\n" + lines.join("\n");
}

function formatPageSpeed(data: PersonaInputData): string {
  if (!data.pageSpeedMetrics) return "Page speed not available.";
  var m = data.pageSpeedMetrics;
  return "Performance: " + m.performance + "/100 | LCP: " 
+ m.lcp + "ms | CLS: " + m.cls;
}

function formatFindings(data: PersonaInputData): string {
  if (!data.findings?.length) return "No findings available.";
  var critical = data.findings.filter(function(f) { return f.severity === "CRITICAL" || f.severity === "ERROR"; });
  var warnings = data.findings.filter(function(f) { return f.severity === "WARNING"; });
  var lines = data.findings.slice(0, 8).map(function(f) { return "- [" + f.severity + "] " + f.title; });
  return "Critical issues: " + critical.length + " | Warnings: " + warnings.length + "\nTop issues:\n" + lines.join("\n");
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
  return { framework: "Andrew Chen Framework", model: model, tokensUsed: tokensUsed, generatedAt: new Date().toISOString(), executionTimeMs: Date.now() - startTime };
}
