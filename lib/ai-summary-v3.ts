/**
 * AI Summary V3 - RAG-Enhanced Report Generation
 * 
 * Generates premium CMO-quality reports using:
 * - Retrieval-Augmented Generation (RAG)
 * - Knowledge base of SEO best practices
 * - Fix templates with step-by-step instructions
 * - Industry benchmarks and competitor insights
 * - GEO/AI visibility recommendations
 */

import { OpenAI } from "openai";
import {
  getAuditRAGContext,
  type Finding,
  type ContextBundle,
  type Citation,
} from "./rag";
import { type CompetitorResult } from "./analyzers/competitors";
import { type ChannelResultV2 } from "./analyzers/channels-v2";
import type { BrandPositioning } from "./brand-positioning";
import type { BusinessClassification } from "./business-type-classifier";
import { runPersonaOrchestration } from "@/lib/services/persona-orchestrator";
import type { PersonaInputData, PersonaOrchestratorResult, ReviewedBy } from "@/lib/personas/types";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface AuditData {
  domain: string;
  industry?: string;
  findings: Finding[];
  pageSpeedMetrics?: PageSpeedMetrics;
  geoVisibility?: GEOVisibility;
  crawledPages?: CrawledPage[];
  linkGraph?: LinkGraphData;
  competitors?: CompetitorResult;
  channels?: ChannelResultV2;
  brandPositioning?: BrandPositioning;
  businessClassification?: BusinessClassification;
}

export interface PageSpeedMetrics {
  performance: number;
  lcp: number;
  cls: number;
  fid: number;
  fcp: number;
  ttfb: number;
}

export interface GEOVisibility {
  overallScore: number;
  providers: {
    name: string;
    mentioned: boolean;
    sentiment: string;
    citations: number;
    context?: string;
  }[];
}

export interface CrawledPage {
  url: string;
  title?: string;
  statusCode: number;
  issues: string[];
}

export interface LinkGraphData {
  totalInternalLinks: number;
  orphanPages: number;
  avgClickDepth: number;
  topLinkedPages: { url: string; inbound: number }[];
}

// ─────────────────────────────────────────
// OUTPUT TYPES
// ─────────────────────────────────────────

export interface CMOReport {
  // Executive Summary
  executiveSummary: ExecutiveSummary;
  
  // Marketing Maturity
  marketingMaturityScore: number;
  marketingMaturityLabel: string;
  
  // Scores (weighted: Marketing 35%, Social 20%, Content 20%, Brand 10%, SEO 10%, Tech 5%)
  overallScore: number;
  categoryScores: CategoryScores;
  
  // Brand Positioning
  brandPositioningAnalysis: BrandPositioningReport;
  
  // SWOT Analysis
  swotAnalysis: SWOTAnalysis;
  
  // Prioritized Actions
  immediateActions: ActionItem[];
  weeklyBacklog: ActionItem[];
  strategicInitiatives: ActionItem[];
  
  // Deep Dives
  marketingStrategy: CategoryAnalysis;
  socialMediaIntelligence: SocialMediaIntelligence;
  contentIntelligence: ContentIntelligence;
  competitorIntelligence: CompetitorIntelligence;
  seoAssessment: CategoryAnalysis;
  technicalAssessment: CategoryAnalysis;
  geoStrategy: GEOStrategy;
  
  // Growth Plan
  thirtyDayPlan: GrowthPlanPhase;
  sixtyDayPlan: GrowthPlanPhase;
  ninetyDayPlan: GrowthPlanPhase;
  
  // Quick Wins
  quickWins: string[];
  growthOpportunities: string[];
  
  // Citations
  citations: Citation[];
  
  // Persona Metadata
  reviewed_by?: ReviewedBy;
  personaMetadata?: Record<string, unknown>;
  
  // Meta
  generatedAt: string;
  ragContextUsed: boolean;
  tokensUsed: number;
}

export interface BrandPositioningReport {
  tagline: string | null;
  valueProposition: string;
  targetAudience: string[];
  industryCategory: string;
  businessModel: string;
  messagingPillars: string[];
  brandVoice: string;
  positioningClarity: string;
  recommendations: string[];
}

export interface SWOTAnalysis {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

export interface SwotItem {
  category: string;
  finding: string;
  evidence: string;
  impact: string;
}

export interface SocialMediaIntelligence {
  overallScore: number;
  confidence: "high" | "medium" | "low" | "insufficient-data";
  contentMix: string;
  brandVoice: string;
  postingConsistency: string;
  audienceQuality: string;
  communityStrength: string;
  contentPillars: string[];
  bestPerformingThemes: string[];
  weakestThemes: string[];
  recommendations: string[];
  dataNotes?: string[];
}

export interface ContentIntelligence {
  currentContentMix: string;
  bestPerformingContent: string[];
  contentGaps: string[];
  missingTopics: string[];
  contentVelocity: string;
  recommendations: string[];
}

export interface CompetitorIntelligence {
  directCompetitors: string[];
  competitorStrengths: string[];
  contentGaps: string[];
  differentiationOpportunities: string[];
  positioningComparison: string;
}

export interface GrowthPlanPhase {
  focus: string;
  actions: string[];
  expectedOutcomes: string[];
  kpis: string[];
}

export interface ExecutiveSummary {
  headline: string;
  currentState: string;
  topOpportunity: string;
  expectedImpact: string;
  timeToValue: string;
}

export interface CategoryScores {
  marketingStrength: number;
  socialPresence: number;
  contentStrategy: number;
  brandAuthority: number;
  seoHealth: number;
  technicalHealth: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  effort: "QUICK_WIN" | "MODERATE" | "SIGNIFICANT" | "MAJOR_PROJECT";
  impact: string;
  category: string;
  affectedPages: string[];
  implementationSteps: string[];
  toolsNeeded: string[];
  expectedOutcome: string;
  deadline?: string;
}

export interface CategoryAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface ContentStrategy {
  currentAssessment: string;
  contentGaps: string[];
  topicOpportunities: string[];
  repurposingIdeas: RepurposingIdea[];
}

export interface RepurposingIdea {
  existingContent: string;
  newFormats: string[];
  targetPlatforms: string[];
  estimatedReach: string;
}

export interface GEOStrategy {
  currentVisibility: string;
  aiReadinessScore: number;
  recommendations: string[];
  contentEnhancements?: string[];
  structuredDataNeeds?: string[];
}

export interface CompetitorInsights {
  identifiedCompetitors: string[];
  competitorStrengths: string[];
  gapsToExploit: string[];
  differentiationOpportunities: string[];
}

export interface SocialStrategy {
  overallAssessment: string;
  executiveSummary?: string[];
  strengths?: string[];
  weaknesses?: string[];
  contentStrategyAnalysis?: string[];
  audienceEngagementAnalysis?: string[];
  brandConsistencyAnalysis?: string[];
  growthOpportunities?: string[];
  ninetyDayActionPlan?: string[];
  overallSocialMaturityScore?: number;
  scoreBreakdown?: Record<string, number>;
  platformRecommendations: PlatformRecommendation[];
  contentCalendarIdeas: string[];
  integrationOpportunities: string[];
}

export interface PlatformRecommendation {
  platform: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  currentState: string;
  recommendations: string[];
  contentTypes: string[];
}

export interface ContentGrowthPlan {
  thirtyDays: GrowthMilestone;
  sixtyDays: GrowthMilestone;
  ninetyDays: GrowthMilestone;
}

export interface GrowthMilestone {
  focus: string;
  deliverables: string[];
  expectedOutcomes: string[];
  kpis: string[];
}

// ─────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────

function getOpenAIKey(): string {
  const geminiValue = process.env.GEMINI_API_KEY || "";
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPEN_API_KEY ||
    (geminiValue.startsWith("sk-") ? geminiValue : "")
  );
}

const openai = new OpenAI({
  apiKey: getOpenAIKey(),
});

export async function generateCMOReport(
  auditData: AuditData
): Promise<CMOReport> {
  console.log(`[AI Summary V3] Generating report for ${auditData.domain}`);
  
  // 1. Get RAG context
  let ragContext: ContextBundle | null = null;
  let ragPrompt = "";
  
  try {
    const { prompt, context } = await getAuditRAGContext(
      auditData.findings,
      auditData.domain,
      auditData.industry
    );
    ragContext = context;
    ragPrompt = prompt;
    console.log(`[AI Summary V3] RAG context retrieved: ${context.totalTokens} tokens, ${context.sourceCount} sources`);
  } catch (error) {
    console.warn("[AI Summary V3] RAG retrieval failed, proceeding without context:", error);
  }
  
  // 2. Build prompt
  const prompt = buildCMOPrompt(auditData, ragPrompt);
  
  // 3. Generate with OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.55,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content || "";
    
    // Parse JSON response
    const report = parseJsonReport(text) as Omit<CMOReport, 'citations' | 'generatedAt' | 'ragContextUsed' | 'tokensUsed'>;
    
    // Add metadata
    const baseReport = report as Record<string, unknown>;
    return {
      ...report,
      // Ensure required array fields exist
      weeklyBacklog: (baseReport.weeklyBacklog as ActionItem[]) || [],
      strategicInitiatives: (baseReport.strategicInitiatives as ActionItem[]) || [],
      citations: (baseReport.citations as Citation[]) || ragContext?.citations || [],
      generatedAt: new Date().toISOString(),
      ragContextUsed: !!ragContext,
      tokensUsed: ragContext?.totalTokens || 0,
    };
  } catch (error) {
    console.error("[AI Summary V3] Generation failed:", error);
    return generateFallbackReport(auditData);
  }
}

function parseJsonReport(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1));
    }
    throw new Error("Model did not return parseable JSON");
  }
}

// ─────────────────────────────────────────
// PROMPT BUILDING
// ─────────────────────────────────────────

function buildCMOPrompt(auditData: AuditData, ragContext: string): string {
  const {
    domain,
    industry,
    findings,
    pageSpeedMetrics,
    geoVisibility,
    crawledPages,
    linkGraph,
    competitors,
    channels,
    brandPositioning,
  } = auditData;
  
  // Categorize findings
  const errors = findings.filter(f => f.severity === "ERROR" || f.severity === "CRITICAL");
  const warnings = findings.filter(f => f.severity === "WARNING");
  
  // Build findings summary
  const findingsSummary = findings.slice(0, 30).map(f => ({
    type: f.type,
    severity: f.severity,
    title: f.title,
    message: (f.message || f.description || f.title || "").slice(0, 260),
    impact: f.impact,
    howToFix: f.howToFix,
    affectedPages: (f.affectedPages || f.affectedUrls || []).slice(0, 5),
  }));

  const brandEvidence = brandPositioning ? {
    tagline: brandPositioning.tagline,
    valueProposition: brandPositioning.valueProposition,
    industryCategory: brandPositioning.industryCategory,
    businessModel: brandPositioning.businessModel,
    targetAudience: brandPositioning.targetAudience,
    messagingPillars: brandPositioning.messagingPillars.map(p => `${p.theme} (${p.frequency})`),
    brandVoice: brandPositioning.brandVoice,
    toneAnalysis: brandPositioning.toneAnalysis,
    contentThemes: brandPositioning.contentThemes.map(t => `${t.topic}: ${t.strength}`),
    contentGaps: brandPositioning.contentGaps,
    differentiators: brandPositioning.differentiators,
    claimedAdvantages: brandPositioning.claimedAdvantages,
    primaryCTA: brandPositioning.primaryCallToAction,
    positioningConfidence: brandPositioning.confidence,
  } : null;

  const competitorEvidence = competitors ? {
    score: competitors.score,
    dataQuality: competitors.dataQuality,
    notes: competitors.notes,
    position: competitors.summary.competitivePosition,
    competitors: competitors.competitors.map(c => ({
      domain: c.domain,
      source: c.source,
      confidence: c.confidence,
      positioning: c.positioning,
      contentStrategy: c.contentStrategy,
      socialPresence: c.socialPresence,
    })),
    comparisons: competitors.comparisons,
    primaryGaps: competitors.summary.primaryGaps,
    quickWins: competitors.summary.quickWins,
  } : null;

  const channelEvidence = channels ? {
    score: channels.score,
    confidence: channels.confidence,
    summary: channels.summary,
    channels: channels.channels.map(c => ({
      channel: c.channel,
      status: c.status,
      quality: c.quality,
      details: c.details,
      metrics: c.metrics,
      recommendations: c.recommendations.slice(0, 3),
    })),
  } : null;

  const socialChannel = channels?.channels
    .find(c => c.channel.toLowerCase().includes("social"));
  const computedSocialAnalysis = socialChannel?.metrics?.socialAnalysis || null;
  const socialProfileEvidence: Array<Record<string, unknown>> = (socialChannel?.metrics?.platform_health as Array<Record<string, unknown>> | undefined)
    || (socialChannel?.metrics?.profileBreakdown as Array<Record<string, unknown>> | undefined)
    || [];
  
  // Extract data confidence and availability for the AI prompt
  const socialConfidence = (computedSocialAnalysis as Record<string, unknown> | null)?.confidence as string | undefined;
  const dataAvailability = (computedSocialAnalysis as Record<string, unknown> | null)?.data_availability as Record<string, unknown> | undefined;
  const dataCoverage = (computedSocialAnalysis as Record<string, unknown> | null)?.data_coverage as Record<string, unknown> | undefined;

  const pageEvidence = (crawledPages || []).slice(0, 20).map(p => ({
    url: p.url,
    title: p.title,
    statusCode: p.statusCode,
    issues: p.issues.slice(0, 5),
  }));

  const siteSpecificSignals = {
    domain,
    industry: industry || "not specified",
    highestSeverityFindings: findingsSummary.slice(0, 10),
    pagesReviewed: pageEvidence,
    detectedChannels: channelEvidence?.channels
      .filter(c => c.status !== "missing")
      .map(c => `${c.channel}: ${c.status}/${c.quality}`) || [],
    missingOrWeakChannels: channelEvidence?.channels
      .filter(c => c.status === "missing" || c.quality === "poor" || c.quality === "needs-work")
      .map(c => `${c.channel}: ${c.details}`) || [],
    competitorGaps: competitorEvidence?.primaryGaps || [],
    competitorQuickWins: competitorEvidence?.quickWins || [],
    brandPositioningExtracted: brandEvidence ? `${brandEvidence.industryCategory} / ${brandEvidence.businessModel} / ${brandEvidence.valueProposition?.slice(0, 150)}` : "Not extracted",
  };
  
  return `
You are an elite Chief Marketing Officer and growth strategist creating a board-quality marketing intelligence report.
Your output must read like a McKinsey strategy memo combined with a Fortune 500 CMO's quarterly review.
This is NOT an SEO audit. This is a complete marketing assessment.

${ragContext}

───────────────────────────────────────────
BRAND INTELLIGENCE DATA FOR: ${domain}
Industry: ${industry || brandEvidence?.industryCategory || "Not specified"}
Business Model: ${brandEvidence?.businessModel || "Not determined"}
Brand Positioning Confidence: ${brandEvidence?.positioningConfidence || "N/A"}%
───────────────────────────────────────────

## BRAND POSITIONING EVIDENCE:
${JSON.stringify(brandEvidence, null, 2)}

## FINDINGS SUMMARY:
- Critical/High Severity Findings: ${errors.length}
- Warnings: ${warnings.length}

## DETAILED FINDINGS (top 30):
${JSON.stringify(findingsSummary.slice(0, 30), null, 2)}

## PAGE SPEED:
${pageSpeedMetrics ? JSON.stringify(pageSpeedMetrics, null, 2) : "Not available"}

## GEO/AI VISIBILITY:
${geoVisibility ? JSON.stringify(geoVisibility, null, 2) : "Not available"}

## COMPETITOR INTELLIGENCE:
${competitorEvidence ? JSON.stringify(competitorEvidence, null, 2) : "Not available"}

## SOCIAL / CHANNEL INTELLIGENCE:
${channelEvidence ? JSON.stringify(channelEvidence, null, 2) : "Not available"}

## SOCIAL DATA QUALITY:
- Confidence: ${socialConfidence || "unknown"}
- Data Availability: ${dataAvailability ? JSON.stringify(dataAvailability) : "Not available"}
- Data Coverage: ${dataCoverage ? JSON.stringify(dataCoverage) : "Not available"}

## SOCIAL PROFILE API EVIDENCE:
${JSON.stringify(socialProfileEvidence.slice(0, 8), null, 2)}

## COMPUTED SOCIAL ANALYTICS:
${computedSocialAnalysis ? JSON.stringify(computedSocialAnalysis, null, 2) : "Not available"}

## CRAWLED PAGES (sample):
${crawledPages ? JSON.stringify(crawledPages.slice(0, 10), null, 2) : "Not available"}

## SITE-SPECIFIC MARKETING BRIEF:
${JSON.stringify(siteSpecificSignals, null, 2)}

───────────────────────────────────────────
CMO REPORT INSTRUCTIONS
───────────────────────────────────────────

You are analyzing this brand's complete marketing operation. Answer these strategic questions:
1. How strong is this brand's marketing?
2. What are competitors doing better?
3. What content works for this brand?
4. What content is missing?
5. Where are growth opportunities?
6. What should the marketing team do next?
7. What should they do in the next 30/60/90 days?

CRITICAL RULES:
- Every recommendation must reference actual evidence found during analysis. If a recommendation could be given to any company, it is too generic.
- Do NOT invent metrics. If a metric is missing, say "not available" and recommend how to get it.
- Do NOT use "improve search visibility", "optimize content", "leverage social media" without a specific page, channel, or measurable outcome.
- The final report should feel like it was created by a senior CMO — not an SEO tool.
- For competitor analysis: compare positioning, messaging, content strategy, social strategy — not fabricated SEO data.
- For social analysis: identify content pillars, brand voice, posting consistency, audience engagement quality, content mix. Don't just report follower counts.

SOCIAL DATA HANDLING — CRITICAL:
- Social data (Apify, web-scrape) may be unavailable, rate-limited, or return partial results. This is EXPECTED.
- When social metrics are unavailable for a platform, do NOT assign a score of 0 to that platform. Instead, mark it as "metrics unavailable" and base your analysis on available data only.
- The SOCIAL DATA QUALITY section above shows which dimensions have real data vs. which are missing. Use this to calibrate your confidence.
- If confidence is "low" or data_availability shows few dimensions with data: say "Limited social data available — analysis is based on profile discovery and website signals" rather than fabricating scores.
- NEVER say "follower count is 0" or "engagement is 0" for a platform where we simply didn't get API data. Say "follower data not available" instead.
- A globally recognized brand should NOT score poorly because our data source failed. Adjust the social score upward if the brand clearly has strong market presence but our API simply didn't return data.

SCORING RULE:
- If Apify failed (check data notes), do NOT penalize the social score. Base it on what IS available: profile discovery, web-scraped data, website signals, and OpenAI reasoning.
- Adjust scores up or down based on evidence strength.

GENERIC RECOMMENDATION BLOCKLIST — if your recommendation matches ANY of these patterns, REWRITE IT to be specific:
1. "Post more educational content" → instead say: "Current content mix is 90% product, 5% educational. Add 2 weekly athlete/training stories to shift to 70/30."
2. "Improve social media presence" → instead say: "Only Twitter has API data (4.1M followers, 33/100 score). Set up Instagram/LinkedIn API keys to score those channels."
3. "Create more content" → instead say: "Blog section detected but only 6 pages crawled. Competitive benchmark: Nike has 200+ blog posts creating 50K+ organic visits/month."
4. "Engage with your audience" → instead say: "Recent posts show 0.5% engagement rate on Twitter vs 2.8% industry benchmark for brand accounts. Reply to the top 20% of comments within 24h."
5. "Develop a content strategy" → instead say: "Current content themes are: Products (60%), About (20%), Blog (20%). Missing: case studies, customer stories, and educational content entirely."
6. "Address technical issues" → instead say: "X pages returned 403 errors from the crawler. Content was still extracted, but scores may be underreported."

SCORING SYSTEM (apply these weights):
- Marketing Strength (brand positioning, messaging, value prop clarity): 35%
- Social Presence (content pillars, engagement quality, community strength): 20%
- Content Strategy (content mix, gaps, velocity, topical authority): 20%
- Brand Authority (industry position, trust signals, differentiation): 10%
- SEO Health (on-page, technical foundation): 10%
- Technical Health (performance, speed, security): 5%

Adjust scores up or down based on evidence strength. A globally recognized brand with strong marketing should NOT score poorly because of minor technical issues.

Return ONLY valid JSON matching this exact structure:

{
  "executiveSummary": {
    "headline": "One powerful sentence summarizing this brand's marketing state",
    "currentState": "2-3 sentences on current marketing performance with specific evidence",
    "topOpportunity": "The single biggest growth opportunity with expected impact",
    "expectedImpact": "Quantified expected improvement",
    "timeToValue": "Realistic timeline"
  },
  
  "marketingMaturityScore": 0-100,
  "marketingMaturityLabel": "Early|Developing|Established|Advanced|Market-Leading",
  
  "overallScore": 0-100,
  
  "categoryScores": {
    "marketingStrength": 0-100,
    "socialPresence": 0-100,
    "contentStrategy": 0-100,
    "brandAuthority": 0-100,
    "seoHealth": 0-100,
    "technicalHealth": 0-100
  },
  
  "brandPositioningAnalysis": {
    "tagline": "Extracted tagline or null",
    "valueProposition": "Brand's core value proposition",
    "targetAudience": ["Audience segments identified"],
    "industryCategory": "Detected industry",
    "businessModel": "B2B/B2C/etc",
    "messagingPillars": ["Key messaging themes"],
    "brandVoice": "Formal|Professional|Conversational|Casual",
    "positioningClarity": "Clear|Moderate|Unclear",
    "recommendations": ["How to improve positioning"]
  },
  
  "swotAnalysis": {
    "strengths": [{"category": "Marketing", "finding": "Specific strength", "evidence": "Evidence from analysis", "impact": "Business impact"}],
    "weaknesses": [...],
    "opportunities": [...],
    "threats": [...]
  },
  
  "immediateActions": [
    {
      "id": "action_1",
      "title": "Specific action title",
      "description": "What to do and why",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "effort": "QUICK_WIN|MODERATE|SIGNIFICANT|MAJOR_PROJECT",
      "impact": "Expected impact",
      "category": "marketing|social|content|brand|seo|technical",
      "affectedPages": ["URLs"],
      "implementationSteps": ["Step 1", "Step 2"],
      "expectedOutcome": "What will improve"
    }
  ],
  
  "marketingStrategy": {
    "score": 0-100,
    "summary": "Assessment",
    "strengths": ["Strengths"],
    "weaknesses": ["Weaknesses"],
    "recommendations": ["Specific marketing moves"]
  },
  
  "socialMediaIntelligence": {
    "overallScore": 0-100,
    "confidence": "high|medium|low|insufficient-data",
    "contentMix": "Description of content distribution across types",
    "brandVoice": "Analysis of brand voice consistency",
    "postingConsistency": "Analysis of posting patterns",
    "audienceQuality": "Engagement quality assessment",
    "communityStrength": "Community engagement assessment",
    "contentPillars": ["Content pillar 1", "Content pillar 2"],
    "bestPerformingThemes": ["What works best with evidence"],
    "weakestThemes": ["What underperforms with evidence"],
    "recommendations": ["Specific social media actions"],
    "dataNotes": ["Optional notes about data availability"]
  },
  
  "contentIntelligence": {
    "currentContentMix": "Description of what content exists",
    "bestPerformingContent": ["Content types/topics that work"],
    "contentGaps": ["Missing content types"],
    "missingTopics": ["Topics not covered"],
    "contentVelocity": "Assessment of publishing pace",
    "recommendations": ["Content strategy actions"]
  },
  
  "competitorIntelligence": {
    "directCompetitors": ["Competitor domains"],
    "competitorStrengths": ["What competitors do well"],
    "contentGaps": ["Where competitors have content you don't"],
    "differentiationOpportunities": ["How to stand out"],
    "positioningComparison": "How your positioning compares"
  },
  
  "seoAssessment": {
    "score": 0-100,
    "summary": "SEO health summary",
    "strengths": ["What's working"],
    "weaknesses": ["What needs work"],
    "recommendations": ["SEO actions"]
  },
  
  "technicalAssessment": {
    "score": 0-100,
    "summary": "Technical health summary",
    "strengths": ["What's working"],
    "weaknesses": ["What needs work"],
    "recommendations": ["Technical actions"]
  },
  
  "geoStrategy": {
    "currentVisibility": "How visible in AI search",
    "aiReadinessScore": 0-100,
    "recommendations": ["AI visibility actions"]
  },
  
  "quickWins": ["Quick, high-impact actions"],
  "growthOpportunities": ["Major growth opportunities"],
  "weeklyBacklog": [],
  "strategicInitiatives": [],
  
  "thirtyDayPlan": {
    "focus": "Focus area",
    "actions": ["Specific actions for 30 days"],
    "expectedOutcomes": ["What to achieve"],
    "kpis": ["Metrics to track"]
  },
  "sixtyDayPlan": { ... },
  "ninetyDayPlan": { ... }
}

Return ONLY the JSON object, no markdown, no explanation.
`;
}

// ─────────────────────────────────────────
// FALLBACK SOCIAL INTELLIGENCE BUILDER
// ─────────────────────────────────────────

/**
 * Builds a meaningful SocialMediaIntelligence from the actual computed social
 * analysis data (channels.metrics.socialAnalysis). This runs when the main
 * AI report generation fails, ensuring the fallback still reflects real data.
 */
function buildFallbackSocialMediaIntelligence(
  channels?: ChannelResultV2
): SocialMediaIntelligence {
  const socialChannel = channels?.channels
    .find(c => c.channel.toLowerCase().includes("social"));
  const sa = socialChannel?.metrics?.socialAnalysis as Record<string, unknown> | undefined;
  const platformHealth = (sa?.platform_health || socialChannel?.metrics?.platform_health || []) as Array<Record<string, unknown>>;
  const themeDist = sa?.theme_distribution as Record<string, number> | undefined;
  const aggMetrics = sa?.aggregate_metrics as Record<string, unknown> | undefined;
  const dataCoverage = sa?.data_coverage as Record<string, unknown> | undefined;
  const fallbackScore = sa?.social_strength as number | undefined;
  const fallbackConfidence = sa?.confidence as string | undefined;
  const recommendations = sa?.recommendations as string[] | undefined;
  const weaknesses = sa?.weaknesses as string[] | undefined;
  const dataGaps = sa?.insufficient_data_reasons as string[] | undefined;

  // Build content pillars from theme distribution
  const contentPillars: string[] = themeDist
    ? Object.entries(themeDist)
        .filter(([, pct]) => pct >= 10)
        .sort((a, b) => b[1] - a[1])
        .map(([theme, pct]) => `${theme}: ${pct}%`)
    : [];

  // Build platform descriptions
  const platformsWithData = platformHealth.filter((p: Record<string, unknown>) => (p.sampled_posts as number || 0) > 0);
  const platformsSummary = platformHealth.length > 0
    ? `${platformHealth.length} platforms detected (${platformsWithData.length} with post samples)`
    : "No social platforms detected";

  const platformDetails = platformHealth
    .slice(0, 5)
    .map((p: Record<string, unknown>) => {
      const name = String(p.platform || "");
      const followers = p.followers !== "not available" ? String(p.followers) : "N/A";
      const posts = p.sampled_posts as number || 0;
      const source = String(p.data_source || "") as string;
      return `${name}: ${followers} followers, ${posts} sampled posts (${source === "profile-discovery-only" ? "no API data" : source})`;
    })
    .join("; ");

  // Build content mix description from theme distribution
  const contentMix = themeDist && Object.keys(themeDist).length > 0
    ? Object.entries(themeDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme, pct]) => `${theme}: ${pct}%`)
        .join(", ")
    : platformsWithData.length === 0
      ? "Content mix analysis requires post samples — no recent posts were available from any platform."
      : "Content themes could not be classified from available post samples.";

  // Build aggregate score
  const overallScore = typeof fallbackScore === "number" && fallbackScore >= 0
    ? fallbackScore
    : 50; // neutral placeholder when no data

  const confidence = (fallbackConfidence as "high" | "medium" | "low" | undefined) || "insufficient-data";

  // Build data notes from coverage and gaps
  const dataNotes: string[] = [];
  if (dataCoverage) {
    const note = String((dataCoverage as Record<string, unknown>).note || "");
    if (note) dataNotes.push(note);
  }
  if (dataGaps && dataGaps.length > 0) {
    dataNotes.push(...dataGaps.slice(0, 3));
  }
  if (dataNotes.length === 0) {
    dataNotes.push("Social analysis reflects available crawl and profile discovery data.");
  }

  // Build recommendations from computed analysis
  // Use a Set to prevent duplicates between recommendations and weaknesses
  const recommendationSet = new Set<string>();
  if (recommendations && recommendations.length > 0) {
    for (const r of recommendations.slice(0, 5)) recommendationSet.add(r);
  }
  // Push weaknesses directly (they're already complete sentences), but skip if identical to a recommendation
  if (weaknesses && weaknesses.length > 0) {
    for (const w of weaknesses.slice(0, 3)) recommendationSet.add(w);
  }
  const finalRecommendations = Array.from(recommendationSet);
  if (finalRecommendations.length === 0) {
    finalRecommendations.push("Set up APIFY_API_TOKEN in .env to enable detailed social metrics.");
    finalRecommendations.push("Connect Instagram, LinkedIn, and TikTok profiles to broaden social intelligence coverage.");
  }

  // Build best/weakest themes from distribution
  const sortedThemes = themeDist
    ? Object.entries(themeDist).sort((a, b) => b[1] - a[1])
    : [];
  const bestThemes = sortedThemes.slice(0, 3).map(([theme, pct]) => `${theme} (${pct}%)`);
  const weakThemes = sortedThemes.slice(-3).filter(([, pct]) => pct < 15).map(([theme, pct]) => `${theme} (${pct}%)`);

  return {
    overallScore,
    confidence,
    contentMix: String(contentMix),
    brandVoice: `Analysis based on ${platformsSummary}. ${platformDetails}`,
    postingConsistency: aggMetrics?.avg_posting_frequency_per_week !== "not available"
      ? `${String(aggMetrics?.avg_posting_frequency_per_week)} posts/week average across ${platformsWithData.length} platforms`
      : "Posting frequency data not available — enable API keys to capture timeline data.",
    audienceQuality: aggMetrics?.avg_engagement_rate !== "not available"
      ? `Avg engagement rate: ${String(aggMetrics?.avg_engagement_rate)}% across ${platformsWithData.length} platforms`
      : "Engagement data not available — enable API keys to capture interaction metrics.",
    communityStrength: String(sa?.social_positioning && (sa.social_positioning as Record<string, unknown>).summary
      ? (sa.social_positioning as Record<string, unknown>).summary
      : "Community strength assessment requires post samples and engagement metrics."),
    contentPillars,
    bestPerformingThemes: bestThemes,
    weakestThemes: weakThemes,
    recommendations: finalRecommendations.slice(0, 5),
    dataNotes,
  };
}

// ─────────────────────────────────────────
// FALLBACK REPORT
// ─────────────────────────────────────────

function generateFallbackReport(auditData: AuditData): CMOReport {
  const { domain, findings, channels } = auditData;
  const errors = findings.filter(f => f.severity === "ERROR" || f.severity === "CRITICAL");
  const warnings = findings.filter(f => f.severity === "WARNING");

  const score = Math.max(20, 100 - (errors.length * 10) - (warnings.length * 3));

  // Use actual computed social analysis instead of placeholder text
  const socialMediaIntelligence = buildFallbackSocialMediaIntelligence(channels);

  return {
    executiveSummary: {
      headline: `${domain} needs attention across ${errors.length} critical areas`,
      currentState: `Found ${errors.length} critical issues and ${warnings.length} warnings that need review.`,
      topOpportunity: errors[0]?.title || warnings[0]?.title || "Focus on strengthening marketing foundation",
      expectedImpact: "Improvements across marketing, social, and content channels",
      timeToValue: "2-4 weeks for initial improvements",
    },
    marketingMaturityScore: score,
    marketingMaturityLabel: score >= 80 ? "Advanced" : score >= 60 ? "Established" : score >= 40 ? "Developing" : "Early",
    overallScore: score,
    categoryScores: {
      marketingStrength: score,
      socialPresence: socialMediaIntelligence.overallScore,
      contentStrategy: 50,
      brandAuthority: 50,
      seoHealth: score,
      technicalHealth: Math.max(20, score - 10),
    },
    brandPositioningAnalysis: {
      tagline: auditData.brandPositioning?.tagline || null,
      valueProposition: auditData.brandPositioning?.valueProposition || "Positioning data extracted from crawl",
      targetAudience: auditData.brandPositioning?.targetAudience || ["Data pending"],
      industryCategory: auditData.brandPositioning?.industryCategory || "Not specified",
      businessModel: auditData.brandPositioning?.businessModel || "Unknown",
      messagingPillars: auditData.brandPositioning?.messagingPillars.map(p => p.theme) || ["Data pending"],
      brandVoice: auditData.brandPositioning?.brandVoice.formality || "Professional",
      positioningClarity: auditData.brandPositioning?.confidence && auditData.brandPositioning.confidence > 70 ? "Clear" : "Moderate",
      recommendations: ["Consider running a deeper brand positioning workshop"],
    },
    swotAnalysis: {
      strengths: [{
        category: "Brand",
        finding: "Brand was successfully crawled and analyzed",
        evidence: `${domain} crawl completed with ${auditData.crawledPages?.length || 0} pages analyzed`,
        impact: "Baseline marketing intelligence established",
      }],
      weaknesses: errors.slice(0, 3).map(e => ({
        category: "Technical",
        finding: String(e.title),
        evidence: String(e.description || e.message || ""),
        impact: "Blocks marketing performance",
      })),
      opportunities: [{
        category: "Growth",
        finding: "Full report generation provides strategic direction",
        evidence: "AI analysis completed",
        impact: "Clear roadmap for improvement",
      }],
      threats: [],
    },
    immediateActions: errors.slice(0, 3).map((f, i) => ({
      id: `action_${i + 1}`,
      title: f.title || `Address ${f.type}`,
      description: String(f.description || f.message || ""),
      priority: "HIGH" as const,
      effort: "MODERATE" as const,
      impact: f.impact || "Improves marketing performance",
      category: "technical",
      affectedPages: [...(f.affectedPages || f.affectedUrls || [])],
      implementationSteps: [String(f.howToFix || "Review and implement fix")],
      toolsNeeded: [],
      expectedOutcome: "Issue resolved",
    })),
    marketingStrategy: {
      score: score,
      summary: "Marketing strategy assessment based on crawl and channel analysis",
      strengths: [],
      weaknesses: errors.map(e => String(e.title)),
      recommendations: ["Complete the AI report generation for detailed marketing strategy"],
    },
    socialMediaIntelligence,
    contentIntelligence: {
      currentContentMix: auditData.brandPositioning?.contentThemes?.map(t => `${t.topic} (${t.pageCount} pages)`).join(", ") || "Content analysis pending",
      bestPerformingContent: [],
      contentGaps: auditData.brandPositioning?.contentGaps || [],
      missingTopics: ["Content gap analysis requires deeper crawl"],
      contentVelocity: "Content velocity analysis pending",
      recommendations: ["Build a content calendar based on identified content themes"],
    },
    competitorIntelligence: {
      directCompetitors: auditData.competitors?.competitors.map(c => c.domain) || [],
      competitorStrengths: [],
      contentGaps: [],
      differentiationOpportunities: ["Run competitive crawl analysis for deeper comparison"],
      positioningComparison: auditData.competitors?.notes?.join(" ") || "Competitor positioning comparison pending",
    },
    seoAssessment: {
      score: score,
      summary: "SEO assessment from crawl data",
      strengths: [],
      weaknesses: errors.map(e => String(e.title)),
      recommendations: ["Address critical SEO findings first"],
    },
    technicalAssessment: {
      score: Math.max(20, score - 10),
      summary: "Technical assessment from crawl data",
      strengths: [],
      weaknesses: [],
      recommendations: ["Review technical findings for optimization opportunities"],
    },
    geoStrategy: {
      currentVisibility: auditData.geoVisibility ? `Score: ${auditData.geoVisibility.overallScore}` : "Unknown",
      aiReadinessScore: auditData.geoVisibility?.overallScore || 0,
      recommendations: ["Set up GEO tracking for AI search visibility"],
    },
    quickWins: errors.length === 0 ? ["Start with content strategy improvements"] : [`Fix top ${Math.min(3, errors.length)} critical issues`],
    growthOpportunities: ["Full AI report will generate growth opportunities"],
    weeklyBacklog: [],
    strategicInitiatives: [],
    thirtyDayPlan: {
      focus: "Address critical issues and establish baseline",
      actions: errors.slice(0, 3).map(e => `Resolve: ${String(e.title)}`),
      expectedOutcomes: ["Stabilize marketing foundation"],
      kpis: ["Issue resolution rate", "Audit score improvement"],
    },
    sixtyDayPlan: {
      focus: "Build marketing momentum",
      actions: ["Develop content strategy", "Strengthen social presence"],
      expectedOutcomes: ["Marketing maturity improvement"],
      kpis: ["Content production velocity", "Social engagement growth"],
    },
    ninetyDayPlan: {
      focus: "Scale marketing operations",
      actions: ["Launch growth campaigns", "Monitor competitive position"],
      expectedOutcomes: ["Marketing maturity score +15 points"],
      kpis: ["Marketing strength score", "Competitive position"],
    },
    citations: [],
    generatedAt: new Date().toISOString(),
    ragContextUsed: false,
    tokensUsed: 0,
  };
}
// ─────────────────────────────────────────
// PERSONA-ORCHESTRATED REPORT GENERATION
// ─────────────────────────────────────────

/**
 * Converts AuditData to PersonaInputData for the orchestrator.
 */
function auditDataToPersonaInput(auditData: AuditData): PersonaInputData {
  return {
    domain: auditData.domain,
    industry: auditData.industry,
    findings: auditData.findings,
    pageSpeedMetrics: auditData.pageSpeedMetrics,
    geoVisibility: auditData.geoVisibility,
    crawledPages: auditData.crawledPages,
    linkGraph: auditData.linkGraph,
    competitors: auditData.competitors,
    channels: auditData.channels,
    brandPositioning: auditData.brandPositioning,
    businessClassification: auditData.businessClassification,
  };
}

/**
 * Merges persona orchestrator results into the CMOReport structure.
 * The persona outputs enrich specific sections while preserving the
 * existing CMOReport format for backward compatibility.
 */
function mergePersonaResultsIntoReport(
  baseReport: CMOReport,
  personaResult: PersonaOrchestratorResult
): CMOReport {
  const { seo, content, brand, growth, executive } = personaResult;

  // Extract persona framework names from metadata (move to top to avoid hoisting issues)
  const brandPersona = personaResult.reviewed_by.brand || "Brand Expert";
  const seoPersona = personaResult.reviewed_by.seo || "SEO Expert";
  const contentPersona = personaResult.reviewed_by.content || "Content Expert";
  const growthPersona = personaResult.reviewed_by.growth || "Growth Expert";

  // Override overall score from executive CMO if available
  if (executive.marketing_maturity !== null) {
    baseReport.overallScore = executive.marketing_maturity;
    baseReport.marketingMaturityScore = executive.marketing_maturity;
    baseReport.marketingMaturityLabel =
      executive.marketing_maturity >= 80 ? "Advanced"
      : executive.marketing_maturity >= 60 ? "Established"
      : executive.marketing_maturity >= 40 ? "Developing"
      : "Early";
  }

  // Enrich category scores from expert outputs
  if (seo.seo_score !== null) baseReport.categoryScores.seoHealth = seo.seo_score;
  if (content.social_score !== null) baseReport.categoryScores.socialPresence = content.social_score;
  if (content.content_score !== null) baseReport.categoryScores.contentStrategy = content.content_score;
  if (brand.brand_score !== null) baseReport.categoryScores.brandAuthority = brand.brand_score;

  // Enrich SEO assessment from SEO expert (Rand Fishkin)
  if (seo.critical_issues.length > 0 || seo.quick_wins.length > 0) {
    baseReport.seoAssessment = {
      score: seo.seo_score ?? baseReport.seoAssessment.score,
      summary: `🔍 ${seoPersona} — ${seo.critical_issues.length} critical issues, ${seo.quick_wins.length} quick wins identified.`,
      strengths: seo.opportunities.filter(o => o.priority === "high").map(o => o.title),
      weaknesses: seo.critical_issues.map(i => `${i.title}: ${i.description}`),
      recommendations: [
        ...seo.quick_wins.map(w => `${w.title} — ${w.expectedImpact}`),
        ...seo.opportunities.map(o => o.title),
      ],
    };
  }

  // Enrich social media intelligence from content expert (Gary Vaynerchuk)
  if (content.content_pillars.length > 0 || content.recommendations.length > 0) {
    baseReport.socialMediaIntelligence = {
      ...baseReport.socialMediaIntelligence,
      overallScore: content.social_score ?? baseReport.socialMediaIntelligence.overallScore,
      confidence: content.confidence as SocialMediaIntelligence["confidence"],
      contentPillars: content.content_pillars,
      recommendations: content.recommendations.map(r => `${r.title}: ${r.description}`),
      dataNotes: [
        `📱 Reviewed by ${contentPersona}`,
        ...(content.dataNotes || []),
      ],
    };
  }

  // Enrich content intelligence from content expert
  if (content.content_pillars.length > 0) {
    baseReport.contentIntelligence = {
      ...baseReport.contentIntelligence,
      contentGaps: content.weaknesses,
      bestPerformingContent: content.strengths,
      recommendations: content.recommendations.map(r => r.title),
    };
  }

  // Enrich brand positioning from brand expert (Seth Godin)
  if (brand.positioning && brand.positioning !== "Insufficient data to assess brand positioning.") {
    baseReport.brandPositioningAnalysis = {
      ...baseReport.brandPositioningAnalysis,
      positioningClarity: brand.differentiators.length > 0 ? "Clear" : "Moderate",
      recommendations: [
        `🎯 ${brandPersona}: ${brand.positioning}`,
        ...brand.recommendations.map(r => r.title),
      ],
    };
  }

  // Enrich SWOT from expert outputs using persona names
  if (brand.differentiators.length > 0) {
    baseReport.swotAnalysis.strengths.push(...brand.differentiators.slice(0, 3).map(d => ({
      category: "Brand",
      finding: d,
      evidence: `🎯 ${brandPersona} — Brand differentiation analysis`,
      impact: "Differentiates brand from competitors",
    })));
  }
  if (brand.messaging_gaps.length > 0) {
    baseReport.swotAnalysis.weaknesses.push(...brand.messaging_gaps.slice(0, 3).map(g => ({
      category: "Brand",
      finding: g,
      evidence: `🎯 ${brandPersona} — Messaging gap analysis`,
      impact: "Weakens brand positioning",
    })));
  }

  // Enrich growth opportunities from growth expert (Andrew Chen)
  if (growth.growth_opportunities.length > 0) {
    baseReport.growthOpportunities = [
      `🚀 ${growthPersona} analysis:`,
      ...growth.growth_opportunities.map(o => `${o.title}: ${o.description}`),
    ];
  }

  // Enrich quick wins from SEO and growth experts with persona names
  const expertQuickWins: string[] = [];
  for (const qw of seo.quick_wins.slice(0, 3)) expertQuickWins.push(`🔍 ${seoPersona}: ${qw.title}`);
  for (const act of growth.high_roi_actions.slice(0, 2)) expertQuickWins.push(`🚀 ${growthPersona}: ${act.title}`);
  if (expertQuickWins.length > 0) {
    baseReport.quickWins = [...expertQuickWins, ...baseReport.quickWins].slice(0, 8);
  }

  // Enrich immediate actions from SEO critical issues
  for (const issue of seo.critical_issues.slice(0, 3)) {
    baseReport.immediateActions.push({
      id: `persona_seo_${issue.title.replace(/\s+/g, "_").toLowerCase()}`,
      title: issue.title,
      description: issue.description,
      priority: "CRITICAL",
      effort: "MODERATE",
      impact: issue.howToFix,
      category: "seo",
      affectedPages: issue.affectedPages,
      implementationSteps: [issue.howToFix],
      toolsNeeded: [],
      expectedOutcome: "Issue resolved",
    });
  }

  // Enrich executive summary from CMO expert
  if (executive.executive_summary && executive.executive_summary !== "Insufficient data to generate executive assessment.") {
    baseReport.executiveSummary = {
      headline: executive.top_priorities.length > 0
        ? `Top priority: ${executive.top_priorities[0].title}`
        : baseReport.executiveSummary.headline,
      currentState: executive.executive_summary,
      topOpportunity: growth.growth_opportunities.length > 0
        ? growth.growth_opportunities[0].title
        : baseReport.executiveSummary.topOpportunity,
      expectedImpact: executive.top_priorities.length > 0
        ? executive.top_priorities[0].description
        : baseReport.executiveSummary.expectedImpact,
      timeToValue: executive.roadmap.length > 0
        ? executive.roadmap[0].timeframe
        : baseReport.executiveSummary.timeToValue,
    };
  }

  // Add persona metadata
  baseReport.reviewed_by = personaResult.reviewed_by;
  baseReport.personaMetadata = personaResult.personaMetadata;
  baseReport.tokensUsed += personaResult.totalTokensUsed;

  return baseReport;
}

/**
 * Generate a CMO report using the Multi-Persona Expert Analysis System.
 * Runs 4 specialized expert personas in parallel, then synthesizes via Executive CMO.
 * Falls back to the single-prompt approach if persona orchestration fails.
 */
export async function generateCMOReportWithPersonas(
  auditData: AuditData
): Promise<CMOReport> {
  console.log(`[AI Summary V3] Generating persona-based report for ${auditData.domain}`);

  try {
    // 1. Get RAG context (shared across all personas)
    let ragContext: ContextBundle | null = null;
    let ragPrompt = "";

    try {
      const { prompt, context } = await getAuditRAGContext(
        auditData.findings,
        auditData.domain,
        auditData.industry
      );
      ragContext = context;
      ragPrompt = prompt;
      console.log(`[AI Summary V3] RAG context retrieved: ${context.totalTokens} tokens`);
    } catch (error) {
      console.warn("[AI Summary V3] RAG retrieval failed, proceeding without context:", error);
    }

    // 2. Run persona orchestration
    const personaInput = auditDataToPersonaInput(auditData);
    const personaResult = await runPersonaOrchestration(personaInput);

    // 3. Generate base CMO report using the original single-prompt approach
    const prompt = buildCMOPrompt(auditData, ragPrompt);
    let baseReport: CMOReport;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CMO_MODEL || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.55,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });
      const text = response.choices[0]?.message?.content || "";
      const report = parseJsonReport(text) as Omit<CMOReport, 'citations' | 'generatedAt' | 'ragContextUsed' | 'tokensUsed'>;
      const baseReportRaw = report as Record<string, unknown>;
      baseReport = {
        ...report,
        weeklyBacklog: (baseReportRaw.weeklyBacklog as ActionItem[]) || [],
        strategicInitiatives: (baseReportRaw.strategicInitiatives as ActionItem[]) || [],
        citations: (baseReportRaw.citations as Citation[]) || ragContext?.citations || [],
        generatedAt: new Date().toISOString(),
        ragContextUsed: !!ragContext,
        tokensUsed: ragContext?.totalTokens || 0,
      };
    } catch (error) {
      console.error("[AI Summary V3] Base report generation failed, using fallback:", error);
      baseReport = generateFallbackReport(auditData);
    }

    // 4. Merge persona expert outputs into the base report
    const enrichedReport = mergePersonaResultsIntoReport(baseReport, personaResult);

    console.log(`[AI Summary V3] Persona-enriched report: Score ${enrichedReport.overallScore}, RAG: ${enrichedReport.ragContextUsed}, Personas: ${Object.keys(personaResult.personaMetadata).length}`);

    return enrichedReport;
  } catch (error) {
    console.error("[AI Summary V3] Persona orchestration failed, falling back to single-prompt:", error);
    return generateCMOReport(auditData);
  }
}

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────

export {
  buildCMOPrompt,
  generateFallbackReport,
  buildFallbackSocialMediaIntelligence,
};
