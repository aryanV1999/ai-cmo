/**
 * Multi-Persona Expert Analysis System — Shared Types
 *
 * Defines the interfaces and types used across all expert personas,
 * their prompts, and the orchestrator.
 */

import type { Finding, Citation } from "@/lib/rag";
import type { CompetitorResult } from "@/lib/analyzers/competitors";
import type { ChannelResultV2 } from "@/lib/analyzers/channels-v2";
import type { BrandPositioning } from "@/lib/brand-positioning";
import type { BusinessClassification } from "@/lib/business-type-classifier";
import type { GeoAnalysisResult } from "@/lib/analyzers/geo-visibility";
import type { LinkGraphResult } from "@/lib/analyzers/link-graph";
import type { PageSpeedResult } from "@/lib/analyzers/page-speed";

// ─────────────────────────────────────────
// INPUT DATA (shared across all personas)
// ─────────────────────────────────────────

export interface PersonaInputData {
  domain: string;
  industry?: string;
  findings: Finding[];
  pageSpeedMetrics?: {
    performance: number;
    lcp: number;
    cls: number;
    fid: number;
    fcp: number;
    ttfb: number;
  };
  geoVisibility?: {
    overallScore: number;
    providers: {
      name: string;
      mentioned: boolean;
      sentiment: string;
      citations: number;
      context?: string;
    }[];
  };
  crawledPages?: {
    url: string;
    title?: string;
    statusCode: number;
    issues: string[];
  }[];
  linkGraph?: {
    totalInternalLinks: number;
    orphanPages: number;
    avgClickDepth: number;
    topLinkedPages: { url: string; inbound: number }[];
  };
  competitors?: CompetitorResult;
  channels?: ChannelResultV2;
  brandPositioning?: BrandPositioning;
  businessClassification?: BusinessClassification;

  // Raw analyzer outputs for persona-specific use
  technicalSeo?: Record<string, unknown>;
  onPageSeo?: Record<string, unknown>;
  pageSpeed?: PageSpeedResult;
  geoResult?: GeoAnalysisResult;
  linkGraphResult?: LinkGraphResult;
}

// ─────────────────────────────────────────
// CONFIDENCE & STATUS
// ─────────────────────────────────────────

export type ConfidenceLevel = "high" | "medium" | "low";
export type DataStatus = "complete" | "partial" | "insufficient_data";

export interface ConfidenceAware {
  confidence: ConfidenceLevel;
  dataStatus: DataStatus;
  dataNotes?: string[];
}

// ─────────────────────────────────────────
// PERSONA OUTPUT SCHEMAS
// ─────────────────────────────────────────

export interface SEOExpertOutput extends ConfidenceAware {
  seo_score: number | null;
  critical_issues: Array<{
    title: string;
    description: string;
    affectedPages: string[];
    severity: "critical" | "high" | "medium";
    evidence: string;
    howToFix: string;
  }>;
  quick_wins: Array<{
    title: string;
    description: string;
    effort: string;
    expectedImpact: string;
    evidence: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    evidence: string;
  }>;
}

export interface ContentExpertOutput extends ConfidenceAware {
  social_score: number | null;
  content_score: number | null;
  content_pillars: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    title: string;
    description: string;
    platform?: string;
    evidence: string;
  }>;
}

export interface BrandExpertOutput extends ConfidenceAware {
  brand_score: number | null;
  positioning: string;
  differentiators: string[];
  messaging_gaps: string[];
  recommendations: Array<{
    title: string;
    description: string;
    evidence: string;
  }>;
}

export interface GrowthExpertOutput extends ConfidenceAware {
  growth_score: number | null;
  growth_opportunities: Array<{
    title: string;
    description: string;
    estimatedImpact: string;
    timeframe: string;
    evidence: string;
  }>;
  channel_recommendations: Array<{
    channel: string;
    priority: "high" | "medium" | "low";
    rationale: string;
    evidence: string;
  }>;
  high_roi_actions: Array<{
    title: string;
    description: string;
    estimatedROI: string;
    effort: string;
    evidence: string;
  }>;
}

export interface ExecutiveCMOOutput extends ConfidenceAware {
  marketing_maturity: number | null;
  executive_summary: string;
  top_priorities: Array<{
    title: string;
    description: string;
    priority: "critical" | "high" | "medium";
    owner?: string;
    timeframe: string;
  }>;
  roadmap: Array<{
    phase: string;
    timeframe: string;
    focus: string;
    actions: string[];
    expectedOutcome: string;
  }>;
}

// ─────────────────────────────────────────
// PERSONA METADATA
// ─────────────────────────────────────────

export interface PersonaMetadata {
  framework: string;
  model: string;
  tokensUsed: number;
  generatedAt: string;
  executionTimeMs: number;
}

export interface ReviewedBy {
  seo: string;
  content: string;
  brand: string;
  growth: string;
  executive: string;
}

// ─────────────────────────────────────────
// ORCHESTRATOR OUTPUT
// ─────────────────────────────────────────

export interface PersonaOrchestratorResult {
  seo: SEOExpertOutput;
  content: ContentExpertOutput;
  brand: BrandExpertOutput;
  growth: GrowthExpertOutput;
  executive: ExecutiveCMOOutput;
  reviewed_by: ReviewedBy;
  personaMetadata: Record<string, PersonaMetadata>;
  totalTokensUsed: number;
}
