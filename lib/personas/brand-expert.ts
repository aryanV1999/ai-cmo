/**
 * Brand Strategist Persona — Inspired by Seth Godin Framework
 */

import { OpenAI } from "openai";
import { BRAND_EXPERT_SYSTEM_PROMPT, buildBrandExpertPrompt } from "@/lib/prompts/brand";
import type { PersonaInputData, BrandExpertOutput, PersonaMetadata } from "./types";

const DEFAULT_OUTPUT: BrandExpertOutput = {
  brand_score: null,
  positioning: "Insufficient data to assess brand positioning.",
  differentiators: [],
  messaging_gaps: [],
  recommendations: [],
  confidence: "low",
  dataStatus: "insufficient_data",
  dataNotes: ["No brand positioning data available."],
};

export async function runBrandExpert(
  data: PersonaInputData,
  openai: OpenAI
): Promise<{ output: BrandExpertOutput; metadata: PersonaMetadata }> {
  const startTime = Date.now();
  if (!data.brandPositioning && !data.crawledPages?.length) {
    return { output: DEFAULT_OUTPUT, metadata: buildMetadata(startTime, 0, "no-data") };
  }

  try {
    const prompt = buildBrandExpertPrompt({
      domain: data.domain,
      brandPositioning: formatBrandPositioning(data),
      channels: formatChannels(data),
      crawledPages: formatCrawledPages(data),
      competitors: formatCompetitors(data),
      businessType: data.businessClassification?.businessType || "Unknown",
      industry: data.businessClassification?.industryCategory || data.industry || "Not specified",
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: BRAND_EXPERT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJSON(text) as Partial<BrandExpertOutput>;
    const tokensUsed = response.usage?.total_tokens || 0;

    const output: BrandExpertOutput = {
      brand_score: validateScore(parsed.brand_score),
      positioning: typeof parsed.positioning === "string" ? parsed.positioning : "Assessment pending",
      differentiators: Array.isArray(parsed.differentiators) ? parsed.differentiators : [],
      messaging_gaps: Array.isArray(parsed.messaging_gaps) ? parsed.messaging_gaps : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      confidence: parsed.confidence || "medium",
      dataStatus: parsed.dataStatus || "partial",
      dataNotes: Array.isArray(parsed.dataNotes) ? parsed.dataNotes : [],
    };

    return { output, metadata: buildMetadata(startTime, tokensUsed, "gpt-4o") };
  } catch (error) {
    console.error("[Brand Expert] AI generation failed:", error);
    return { output: generateFallbackBrand(data), metadata: buildMetadata(startTime, 0, "fallback") };
  }
}

function generateFallbackBrand(data: PersonaInputData): BrandExpertOutput {
  const bp = data.brandPositioning;
  const hasPositioning = !!bp;
  const differentiators = bp?.differentiators?.slice(0, 5) || [];
  const messagingGaps = bp?.contentGaps?.slice(0, 5) || [];
  const pillars = bp?.messagingPillars?.map((p) => p.theme).slice(0, 6) || [];
  const businessType = data.businessClassification?.businessType || "unknown";
  const industry = data.businessClassification?.industryCategory || data.industry || "this industry";

  // Seth Godin-specific: narrative about differentiation, "Purple Cow", and brand substance
  let positioningSummary: string;
  if (!bp) {
    positioningSummary = `This brand operates in ${industry} but the website does not clearly communicate what makes it uniquely different. From a Seth Godin perspective, the brand may be invisible — competing on price or features rather than on a story that a specific audience would miss if it disappeared. Without a clear "Purple Cow" differentiator, the brand risks being seen as a commodity.`;
  } else if (bp.confidence >= 70) {
    const valueProp = bp.valueProposition?.slice(0, 150) || "not clearly stated";
    const voice = bp.brandVoice?.formality || "professional";
    positioningSummary = `The brand has established recognition in ${bp.industryCategory || industry} but relies heavily on category presence rather than a truly differentiated story. The core value proposition "${valueProp}" is clear but could apply to many competitors. The brand voice is ${voice}, which is appropriate, but the messaging lacks the emotional hook that makes people choose one brand over another. The real opportunity is to move from "better than" to "the only" — finding a specific audience segment that would genuinely miss this brand if it disappeared.`;
  } else {
    positioningSummary = `Partial positioning signals detected (confidence: ${bp!.confidence}%). The brand has some differentiation elements but they feel fragmented rather than intentional. From a Godin lens, this is a brand that's playing it safe — it hasn't committed to a bold story that a small group of people would love. The value proposition "${bp.valueProposition?.slice(0, 150) || "not clearly stated"}" needs to be sharper and more specific to a tribe that cares deeply about this exact offering.`;
  }

  // Business-type-specific recommendations (Seth Godin perspective)
  const recs: BrandExpertOutput["recommendations"] = [];

  if (businessType === "b2b-saas" || businessType === "b2b-services") {
    if (differentiators.length === 0) {
      recs.push({ title: "Define a category of one", description: "SaaS brands win by owning a category. Rather than being 'another analytics tool', define what unique problem you solve that no one else does, and make that the center of every message.", evidence: "Seth Godin: 'The safest thing is to be remarkable.' No clear category ownership detected." });
    }
    recs.push({ title: "Turn features into a belief system", description: "Don't sell features — sell a philosophy. The most successful B2B brands (HubSpot, Salesforce, Notion) sell a way of working, not a tool. Articulate what you believe about how business should be done.", evidence: `Business type: ${businessType}. Brand voice: ${bp?.brandVoice?.formality || "professional"}.` });
  } else if (businessType === "ecommerce" || businessType === "d2c-brand") {
    recs.push({ title: "Create a story worth sharing", description: "Ecommerce brands win when customers become storytellers. Your product isn't the differentiator — the story around it is. Document where this product comes from, who makes it, and why it matters. Give customers a story to tell their friends.", evidence: `Business type: ${businessType}. Seth Godin: 'People don't buy what you make, they buy why you make it.'` });
  } else if (businessType === "local-business") {
    recs.push({ title: "Build a community, not just customers", description: "Local businesses win through community trust. Your brand should feel like a local institution, not a chain. Feature real local stories, customer faces, and community involvement to create a brand people feel personally connected to.", evidence: `Business type: ${businessType}. Local brands succeed through tribal loyalty.` });
  } else {
    if (differentiators.length === 0) {
      recs.push({ title: "Find your Purple Cow", description: "Seth Godin's core idea: something remarkable is worth talking about. What is the one thing about this brand that would make someone say 'wow, that's interesting'? If there's nothing, that's the most important finding. Create something worth noticing.", evidence: "No clear differentiators found. Brand may be invisible." });
    }
    recs.push({ title: "Commit to a tribe, not everyone", description: "Brands that try to appeal to everyone appeal to no one. Identify a specific audience segment — defined by values, not demographics — and design your messaging exclusively for them. Your brand will be stronger for the people you exclude.", evidence: `Industry: ${industry}. Seth Godin: 'Find your smallest viable audience.'` });
  }

  return {
    brand_score: hasPositioning ? Math.min(80, Math.max(25, bp!.confidence + 10)) : null,
    positioning: positioningSummary,
    differentiators: differentiators.length > 0 ? differentiators : ["No clear differentiators detected — the brand may be invisible in a crowded market"],
    messaging_gaps: messagingGaps.length > 0 ? messagingGaps : ["Brand messaging lacks a cohesive story that connects emotionally with a specific audience"],
    recommendations: recs.slice(0, 3),
    confidence: hasPositioning ? "medium" : "low",
    dataStatus: hasPositioning ? "partial" : "insufficient_data",
    dataNotes: ["Seth Godin framework — brand differentiation analysis (fallback)."],
  };
}

function formatBrandPositioning(data: PersonaInputData): string {
  if (!data.brandPositioning) return "Brand positioning not available.";
  const bp = data.brandPositioning;
  return JSON.stringify({ tagline: bp.tagline, valueProposition: bp.valueProposition, targetAudience: bp.targetAudience, industryCategory: bp.industryCategory, businessModel: bp.businessModel, messagingPillars: bp.messagingPillars.map((p) => ({ theme: p.theme, frequency: p.frequency })), brandVoice: bp.brandVoice, contentThemes: bp.contentThemes.map((t) => ({ topic: t.topic, strength: t.strength, pageCount: t.pageCount })), contentGaps: bp.contentGaps, differentiators: bp.differentiators, confidence: bp.confidence }, null, 2);
}

function formatChannels(data: PersonaInputData): string {
  if (!data.channels) return "Channel data not available.";
  return `Score: ${data.channels.score} | Channels: ${data.channels.channels.map((c) => `${c.channel} (${c.status}/${c.quality})`).join(", ")}`;
}

function formatCrawledPages(data: PersonaInputData): string {
  if (!data.crawledPages?.length) return "No crawled pages available.";
  return data.crawledPages.slice(0, 10).map((p) => `- ${p.url} (Title: ${p.title || "MISSING"})`).join("\n");
}

function formatCompetitors(data: PersonaInputData): string {
  if (!data.competitors) return "Competitor data not available.";
  return `Position: ${data.competitors.summary?.competitivePosition || "Unknown"}\nCompetitors:\n${data.competitors.competitors?.slice(0, 5).map((c) => `- ${c.domain}: positioning=${c.positioning?.slice(0, 120) || "N/A"}`).join("\n") || "None identified"}`;
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
  return { framework: "Seth Godin Framework", model, tokensUsed, generatedAt: new Date().toISOString(), executionTimeMs: Date.now() - startTime };
}
