/**
 * Executive CMO Persona — Inspired by Satya Nadella Leadership Framework
 */

import { OpenAI } from "openai";
import { EXECUTIVE_CMO_SYSTEM_PROMPT, buildExecutiveCMOPrompt } from "@/lib/prompts/executive";
import type {
  PersonaInputData, SEOExpertOutput, ContentExpertOutput, BrandExpertOutput,
  GrowthExpertOutput, ExecutiveCMOOutput, PersonaMetadata,
} from "./types";

const DEFAULT_OUTPUT: ExecutiveCMOOutput = {
  marketing_maturity: null,
  executive_summary: "Insufficient data to generate executive assessment.",
  top_priorities: [],
  roadmap: [],
  confidence: "low",
  dataStatus: "insufficient_data",
  dataNotes: ["Expert analyses were not available for synthesis."],
};

export async function runExecutiveCMO(
  data: PersonaInputData,
  expertOutputs: {
    seo: SEOExpertOutput;
    content: ContentExpertOutput;
    brand: BrandExpertOutput;
    growth: GrowthExpertOutput;
  },
  openai: OpenAI
): Promise<{ output: ExecutiveCMOOutput; metadata: PersonaMetadata }> {
  const startTime = Date.now();

  const hasExpertData =
    expertOutputs.seo.seo_score !== null ||
    expertOutputs.content.social_score !== null ||
    expertOutputs.content.content_score !== null ||
    expertOutputs.brand.brand_score !== null ||
    expertOutputs.growth.growth_score !== null;

  if (!hasExpertData && !data.findings?.length) {
    return { output: DEFAULT_OUTPUT, metadata: buildMetadata(startTime, 0, "no-data") };
  }

  try {
    const prompt = buildExecutiveCMOPrompt({
      domain: data.domain,
      seoAnalysis: JSON.stringify(expertOutputs.seo, null, 2),
      contentAnalysis: JSON.stringify(expertOutputs.content, null, 2),
      brandAnalysis: JSON.stringify(expertOutputs.brand, null, 2),
      growthAnalysis: JSON.stringify(expertOutputs.growth, null, 2),
      businessType: data.businessClassification?.businessType || "Unknown",
      industry: data.businessClassification?.industryCategory || data.industry || "Not specified",
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: EXECUTIVE_CMO_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.55,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJSON(text) as Partial<ExecutiveCMOOutput>;
    const tokensUsed = response.usage?.total_tokens || 0;

    const output: ExecutiveCMOOutput = {
      marketing_maturity: validateScore(parsed.marketing_maturity),
      executive_summary: typeof parsed.executive_summary === "string" ? parsed.executive_summary : "Executive summary pending.",
      top_priorities: Array.isArray(parsed.top_priorities) ? parsed.top_priorities : [],
      roadmap: Array.isArray(parsed.roadmap) ? parsed.roadmap : [],
      confidence: parsed.confidence || "medium",
      dataStatus: parsed.dataStatus || "partial",
      dataNotes: Array.isArray(parsed.dataNotes) ? parsed.dataNotes : [],
    };

    return { output, metadata: buildMetadata(startTime, tokensUsed, "gpt-4o") };
  } catch (error) {
    console.error("[Executive CMO] AI generation failed:", error);
    return { output: generateFallbackExecutive(data, expertOutputs), metadata: buildMetadata(startTime, 0, "fallback") };
  }
}

function generateFallbackExecutive(
  data: PersonaInputData,
  expertOutputs: { seo: SEOExpertOutput; content: ContentExpertOutput; brand: BrandExpertOutput; growth: GrowthExpertOutput }
): ExecutiveCMOOutput {
  const { seo, content, brand, growth } = expertOutputs;
  const scores = [seo.seo_score, content.social_score, content.content_score, brand.brand_score, growth.growth_score].filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const summaryParts: string[] = [];
  if (seo.seo_score !== null) summaryParts.push(`SEO: ${seo.seo_score}/100`);
  if (content.social_score !== null) summaryParts.push(`Social: ${content.social_score}/100`);
  if (content.content_score !== null) summaryParts.push(`Content: ${content.content_score}/100`);
  if (brand.brand_score !== null) summaryParts.push(`Brand: ${brand.brand_score}/100`);
  if (growth.growth_score !== null) summaryParts.push(`Growth: ${growth.growth_score}/100`);

  const executiveSummary = summaryParts.length > 0
    ? `${data.domain} marketing assessment: ${summaryParts.join(", ")}. ${seo.critical_issues.length > 0 ? `${seo.critical_issues.length} critical SEO issues require immediate attention.` : ""} ${brand.messaging_gaps.length > 0 ? `${brand.messaging_gaps.length} messaging gaps identified.` : ""}`
    : `${data.domain} assessment completed with limited data.`;

  const topPriorities: ExecutiveCMOOutput["top_priorities"] = [];
  for (const issue of seo.critical_issues.slice(0, 2)) {
    topPriorities.push({ title: `SEO: ${issue.title}`, description: issue.description, priority: "critical", owner: "SEO / Development", timeframe: "1-2 weeks" });
  }
  for (const gap of brand.messaging_gaps.slice(0, 2)) {
    topPriorities.push({ title: `Brand: ${gap}`, description: "Messaging gap identified in brand positioning analysis.", priority: "high", owner: "Marketing / Brand", timeframe: "2-4 weeks" });
  }
  for (const opp of growth.growth_opportunities.slice(0, 2)) {
    topPriorities.push({ title: `Growth: ${opp.title}`, description: opp.description, priority: "medium", owner: "Growth / Marketing", timeframe: opp.timeframe || "30-60 days" });
  }

  const roadmap: ExecutiveCMOOutput["roadmap"] = [
    { phase: "Phase 1", timeframe: "Days 1-30", focus: "Fix critical issues and establish foundation", actions: [...seo.critical_issues.slice(0, 3).map((i) => `Fix: ${i.title}`), ...seo.quick_wins.slice(0, 2).map((w) => `Quick win: ${w.title}`)], expectedOutcome: "Resolved critical issues and improved baseline metrics" },
    { phase: "Phase 2", timeframe: "Days 31-60", focus: "Build content and brand momentum", actions: [...content.recommendations.slice(0, 2).map((r) => r.title), ...brand.recommendations.slice(0, 2).map((r) => r.title)], expectedOutcome: "Stronger brand positioning and content foundation" },
    { phase: "Phase 3", timeframe: "Days 61-90", focus: "Scale growth channels", actions: [...growth.high_roi_actions.slice(0, 2).map((a) => a.title), ...growth.channel_recommendations.filter((c) => c.priority === "high").slice(0, 2).map((c) => `Launch: ${c.channel}`)], expectedOutcome: "Measurable growth from optimized channels" },
  ];

  return {
    marketing_maturity: avgScore,
    executive_summary: executiveSummary,
    top_priorities: topPriorities.slice(0, 7),
    roadmap,
    confidence: scores.length >= 3 ? "medium" : "low",
    dataStatus: scores.length >= 3 ? "partial" : "insufficient_data",
    dataNotes: ["Fallback executive synthesis — AI generation was unavailable."],
  };
}

function parseJSON(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch {
    const start = trimmed.indexOf("{"); const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return parseable JSON");
  }
}

function validateScore(score: unknown): number | null {
  return typeof score === "number" && score >= 0 && score <= 100 ? score : null;
}

function buildMetadata(startTime: number, tokensUsed: number, model: string): PersonaMetadata {
  return { framework: "Satya Nadella Framework", model, tokensUsed, generatedAt: new Date().toISOString(), executionTimeMs: Date.now() - startTime };
}
