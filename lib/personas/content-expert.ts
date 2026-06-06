/**
 * Content & Social Expert Persona — Inspired by Gary Vaynerchuk Framework
 */

import { OpenAI } from "openai";
import { CONTENT_EXPERT_SYSTEM_PROMPT, buildContentExpertPrompt } from "@/lib/prompts/content";
import type { PersonaInputData, ContentExpertOutput, PersonaMetadata } from "./types";

const DEFAULT_OUTPUT: ContentExpertOutput = {
  social_score: null,
  content_score: null,
  content_pillars: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
  confidence: "low",
  dataStatus: "insufficient_data",
  dataNotes: ["No social or content data available for analysis."],
};

export async function runContentExpert(
  data: PersonaInputData,
  openai: OpenAI
): Promise<{ output: ContentExpertOutput; metadata: PersonaMetadata }> {
  const startTime = Date.now();

  if (!data.channels && !data.brandPositioning && !data.crawledPages?.length) {
    return { output: DEFAULT_OUTPUT, metadata: buildMetadata(startTime, 0, "no-data") };
  }

  try {
    const prompt = buildContentExpertPrompt({
      domain: data.domain,
      channels: formatChannels(data),
      socialAnalysis: formatSocialAnalysis(data),
      brandPositioning: formatBrandPositioning(data),
      businessType: data.businessClassification?.businessType || "Unknown",
      industry: data.businessClassification?.industryCategory || data.industry || "Not specified",
      crawledPages: formatCrawledPages(data),
      competitors: formatCompetitors(data),
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: CONTENT_EXPERT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseJSON(text) as Partial<ContentExpertOutput>;
    const tokensUsed = response.usage?.total_tokens || 0;

    const output: ContentExpertOutput = {
      social_score: validateScore(parsed.social_score),
      content_score: validateScore(parsed.content_score),
      content_pillars: Array.isArray(parsed.content_pillars) ? parsed.content_pillars : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      confidence: parsed.confidence || "medium",
      dataStatus: parsed.dataStatus || "partial",
      dataNotes: Array.isArray(parsed.dataNotes) ? parsed.dataNotes : [],
    };

    return { output, metadata: buildMetadata(startTime, tokensUsed, "gpt-4o") };
  } catch (error) {
    console.error("[Content Expert] AI generation failed:", error);
    return { output: generateFallbackContent(data), metadata: buildMetadata(startTime, 0, "fallback") };
  }
}

function generateFallbackContent(data: PersonaInputData): ContentExpertOutput {
  const hasChannelData = !!data.channels;
  const hasContentThemes = !!data.brandPositioning?.contentThemes?.length;
  const hasPages = (data.crawledPages?.length || 0) > 0;
  const businessType = data.businessClassification?.businessType || "unknown";
  const industry = data.businessClassification?.industryCategory || data.industry || "this industry";
  const contentPillars = data.brandPositioning?.contentThemes
    ?.filter((t) => t.strength === "strong" || t.strength === "moderate")
    .map((t) => `${t.topic} (${t.pageCount} pages)`)
    .slice(0, 5) || [];
  const contentGaps = data.brandPositioning?.contentGaps || [];
  const pageCount = data.crawledPages?.length || 0;

  // Gary Vee-specific: focus on content volume, attention, creator-led, UGC, community
  const recs: ContentExpertOutput["recommendations"] = [];
  const weaknesses: string[] = [];
  const strengths: string[] = [];

  // Content volume assessment
  if (pageCount < 20) {
    recs.push({ title: "Create creator-led content daily", description: "Gary Vee's core principle: document, don't create. Start producing 1-2 short-form videos daily showing behind-the-scenes of your business. Real, unpolished content outperforms overproduced marketing. Start with 60-second iPhone videos on one platform and expand.", evidence: `Only ${pageCount} pages found. For a ${businessType} business in ${industry}, content volume is the biggest gap. Gary Vee: 'Document the journey, not the destination.'`, platform: "TikTok / Instagram Reels / YouTube Shorts" });
    recs.push({ title: "Repurpose every piece of content 5 ways", description: "One topic → one long-form video → 5 short clips → audio podcast → blog post → 3 social posts. Maximize every idea across formats. Most brands create once and move on. The winners extract every drop of value from each idea.", evidence: `Gary Vee: 'Content is the currency of the internet.' Only ${pageCount} content pieces detected. Massively underinvesting in content creation.`, platform: "All platforms" });
  }

  // UGC and community focus
  if (businessType === "ecommerce" || businessType === "d2c-brand") {
    recs.push({ title: "Build a UGC (User Generated Content) engine", description: "Stop creating all content in-house. Build a system where customers create content for you. Send free products to 50 micro-creators (1K-10K followers) — their authentic content will outperform anything your marketing team produces. Gary Vee calls this 'the jet engine of ecommerce growth.'", evidence: `Business type: ${businessType}. Gary Vee: 'UGC is the only content that scales.' No customer content program detected.`, platform: "Instagram / TikTok" });
    weaknesses.push("No customer-generated content program detected — this is a massive missed opportunity for authentic social proof");
  } else if (businessType === "b2b-saas" || businessType === "b2b-services") {
    recs.push({ title: "Build community conversations, not broadcasts", description: "LinkedIn is your primary content battleground. Post daily insights, reply to comments within an hour, start conversations in the comments of industry leaders. B2B buyers don't want to be sold to — they want to learn from and engage with experts. Gary Vee: 'Jab, jab, jab, right hook.' Give value 3x before asking for anything.", evidence: `Business type: ${businessType}. LinkedIn content strategy should focus on engagement, not publishing.`, platform: "LinkedIn" });
    recs.push({ title: "Turn employees into content creators", description: "Your most trusted content creators are your own employees. Launch an employee advocacy program: each team member posts 2x/week about their work, insights, and industry knowledge. A team of 10 creating daily = 70 authentic posts/week. This can't be faked by competitors.", evidence: `Gary Vee: 'Your employees are your best marketers. Trust them.' For ${businessType}, employee content builds trust faster than brand content.`, platform: "LinkedIn / Twitter" });
  } else if (businessType === "local-business") {
    recs.push({ title: "Document customer stories in real-time", description: "Every customer interaction is content. Record short video testimonials (30 seconds, iPhone quality), capture before/after results, share behind-the-counter moments. Local brands win on authenticity, not production value. Gary Vee: 'Real content beats perfect content every time.'", evidence: `Business type: ${businessType}. Local businesses thrive on authentic community content.`, platform: "Instagram / Facebook / Google Business" });
  }

  // Audience attention assessment
  weaknesses.push("Content volume appears low relative to what's needed to capture audience attention in a crowded digital landscape");

  if (strengths.length === 0) {
    if (hasContentThemes) {
      strengths.push(...data.brandPositioning!.contentThemes.filter(t => t.strength === "strong").map(t => `${t.topic}: strong presence with ${t.pageCount} pages`));
    } else {
      strengths.push("Brand has a web presence that can be leveraged for content creation — starting from a position of documentation rather than creation");
    }
  }

  return {
    social_score: hasChannelData ? 45 : null,
    content_score: hasContentThemes ? 50 : hasPages ? 40 : null,
    content_pillars: contentPillars.length > 0 ? contentPillars : ["Unable to determine content pillars from available data"],
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recs.slice(0, 4),
    confidence: hasChannelData || hasContentThemes ? "medium" : "low",
    dataStatus: hasChannelData || hasContentThemes ? "partial" : "insufficient_data",
    dataNotes: ["Gary Vaynerchuk framework — content volume & attention analysis (fallback)."],
  };
}

function formatChannels(data: PersonaInputData): string {
  if (!data.channels) return "Channel data not available.";
  const ch = data.channels;
  return `Score: ${ch.score}/100 | Confidence: ${ch.confidence}%\nChannels:\n${ch.channels.map((c) => `- ${c.channel}: status=${c.status}, quality=${c.quality}`).join("\n")}`;
}

function formatSocialAnalysis(data: PersonaInputData): string {
  if (!data.channels) return "Social analysis not available.";
  const socialChannel = data.channels.channels?.find((c) => c.channel.toLowerCase().includes("social"));
  if (!socialChannel?.metrics?.socialAnalysis) return "Social analytics not computed.";
  return JSON.stringify(socialChannel.metrics.socialAnalysis, null, 2).slice(0, 2000);
}

function formatBrandPositioning(data: PersonaInputData): string {
  if (!data.brandPositioning) return "Brand positioning not available.";
  const bp = data.brandPositioning;
  return JSON.stringify({ industry: bp.industryCategory, model: bp.businessModel, valueProp: bp.valueProposition?.slice(0, 200), voice: bp.brandVoice?.formality, themes: bp.contentThemes?.map((t) => `${t.topic}: ${t.strength} (${t.pageCount} pages)`), gaps: bp.contentGaps, confidence: bp.confidence }, null, 2);
}

function formatCrawledPages(data: PersonaInputData): string {
  if (!data.crawledPages?.length) return "No crawled pages available.";
  return data.crawledPages.slice(0, 12).map((p) => `- ${p.url} (Title: ${p.title || "MISSING"})`).join("\n");
}

function formatCompetitors(data: PersonaInputData): string {
  if (!data.competitors) return "Competitor data not available.";
  return data.competitors.competitors?.slice(0, 5).map((c) => `- ${c.domain}: positioning=${c.positioning?.slice(0, 100) || "N/A"}`).join("\n") || "No competitors identified.";
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
  return { framework: "Gary Vaynerchuk Framework", model, tokensUsed, generatedAt: new Date().toISOString(), executionTimeMs: Date.now() - startTime };
}
