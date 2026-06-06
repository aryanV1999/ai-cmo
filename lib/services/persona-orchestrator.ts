/**
 * Persona Orchestrator
 *
 * Coordinates the multi-expert analysis pipeline:
 * 1. Runs SEO, Content, Brand, and Growth experts in parallel
 * 2. Feeds all expert outputs to the Executive CMO for synthesis
 * 3. Returns unified results with persona metadata
 */

import { OpenAI } from "openai";
import { runSEOExpert } from "@/lib/personas/seo-expert";
import { runContentExpert } from "@/lib/personas/content-expert";
import { runBrandExpert } from "@/lib/personas/brand-expert";
import { runGrowthExpert } from "@/lib/personas/growth-expert";
import { runExecutiveCMO } from "@/lib/personas/executive-cmo";
import type {
  PersonaInputData,
  SEOExpertOutput,
  ContentExpertOutput,
  BrandExpertOutput,
  GrowthExpertOutput,
  ExecutiveCMOOutput,
  PersonaOrchestratorResult,
  PersonaMetadata,
  ReviewedBy,
} from "@/lib/personas/types";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function getOpenAIKey(): string {
  const geminiValue = process.env.GEMINI_API_KEY || "";
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPEN_API_KEY ||
    (geminiValue.startsWith("sk-") ? geminiValue : "")
  );
}

// ─────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────

export async function runPersonaOrchestration(
  data: PersonaInputData
): Promise<PersonaOrchestratorResult> {
  console.log(`[Persona Orchestrator] Starting for ${data.domain}`);
  const startTime = Date.now();

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    console.warn("[Persona Orchestrator] No OpenAI API key — using fallback analysis for all personas");
  }

  const openai = new OpenAI({ apiKey: apiKey || "placeholder" });

  // ── PHASE 1: Run 4 expert personas in parallel ──
  console.log("[Persona Orchestrator] Running 4 expert personas in parallel...");

  const [seoResult, contentResult, brandResult, growthResult] = await Promise.allSettled([
    runSEOExpert(data, openai),
    runContentExpert(data, openai),
    runBrandExpert(data, openai),
    runGrowthExpert(data, openai),
  ]);

  // Extract results with safe defaults
  const seoDefault: SEOExpertOutput = { seo_score: null, critical_issues: [], quick_wins: [], opportunities: [], confidence: "low", dataStatus: "insufficient_data" };
  const contentDefault: ContentExpertOutput = { social_score: null, content_score: null, content_pillars: [], strengths: [], weaknesses: [], recommendations: [], confidence: "low", dataStatus: "insufficient_data" };
  const brandDefault: BrandExpertOutput = { brand_score: null, positioning: "", differentiators: [], messaging_gaps: [], recommendations: [], confidence: "low", dataStatus: "insufficient_data" };
  const growthDefault: GrowthExpertOutput = { growth_score: null, growth_opportunities: [], channel_recommendations: [], high_roi_actions: [], confidence: "low", dataStatus: "insufficient_data" };

  const seo = extractResult<SEOExpertOutput>(seoResult, "SEO Expert", seoDefault);
  const content = extractResult<ContentExpertOutput>(contentResult, "Content Expert", contentDefault);
  const brand = extractResult<BrandExpertOutput>(brandResult, "Brand Expert", brandDefault);
  const growth = extractResult<GrowthExpertOutput>(growthResult, "Growth Expert", growthDefault);

  console.log(`[Persona Orchestrator] Expert results: SEO=${seo.output.seo_score ?? "null"}, Content=${content.output.social_score ?? content.output.content_score ?? "null"}, Brand=${brand.output.brand_score ?? "null"}, Growth=${growth.output.growth_score ?? "null"}`);

  // ── PHASE 2: Executive CMO synthesizes all expert outputs ──
  console.log("[Persona Orchestrator] Running Executive CMO synthesis...");

  const executiveResult = await runExecutiveCMO(
    data,
    {
      seo: seo.output,
      content: content.output,
      brand: brand.output,
      growth: growth.output,
    },
    openai
  );

  console.log(`[Persona Orchestrator] Executive CMO: maturity=${executiveResult.output.marketing_maturity ?? "null"}`);

  // ── PHASE 3: Assemble final result ──
  const totalTokens =
    seo.metadata.tokensUsed +
    content.metadata.tokensUsed +
    brand.metadata.tokensUsed +
    growth.metadata.tokensUsed +
    executiveResult.metadata.tokensUsed;

  const reviewedBy: ReviewedBy = {
    seo: seo.metadata.framework,
    content: content.metadata.framework,
    brand: brand.metadata.framework,
    growth: growth.metadata.framework,
    executive: executiveResult.metadata.framework,
  };

  const personaMetadata: Record<string, PersonaMetadata> = {
    seo: seo.metadata,
    content: content.metadata,
    brand: brand.metadata,
    growth: growth.metadata,
    executive: executiveResult.metadata,
  };

  const duration = Date.now() - startTime;
  console.log(`[Persona Orchestrator] Complete: ${duration}ms, ${totalTokens} tokens used`);

  return {
    seo: seo.output,
    content: content.output,
    brand: brand.output,
    growth: growth.output,
    executive: executiveResult.output,
    reviewed_by: reviewedBy,
    personaMetadata,
    totalTokensUsed: totalTokens,
  };
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function extractResult<Output>(
  result: PromiseSettledResult<{ output: Output; metadata: PersonaMetadata }>,
  personaName: string,
  defaultOutput: Output
): { output: Output; metadata: PersonaMetadata } {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.error(`[Persona Orchestrator] ${personaName} failed:`, result.reason);

  // Return safe defaults instead of empty object
  return {
    output: defaultOutput,
    metadata: {
      framework: `${personaName} (failed)`,
      model: "error",
      tokensUsed: 0,
      generatedAt: new Date().toISOString(),
      executionTimeMs: 0,
    },
  };
}

// Re-export types for convenience
export type {
  PersonaOrchestratorResult,
  SEOExpertOutput,
  ContentExpertOutput,
  BrandExpertOutput,
  GrowthExpertOutput,
  ExecutiveCMOOutput,
  ReviewedBy,
} from "@/lib/personas/types";
