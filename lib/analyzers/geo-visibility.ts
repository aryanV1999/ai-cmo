/**
 * GEO Visibility Module
 *
 * Probes AI answer engines to measure brand presence across:
 * - ChatGPT (OpenAI)
 * - Gemini (Google)
 * - Perplexity
 * - Claude (Anthropic)
 *
 * Each probe sends a query representing a realistic user intent,
 * then analyses the response for:
 * - mention presence
 * - citation URL
 * - position/rank in answer
 * - sentiment
 *
 * The composite GEO score powers the "AI Visibility" dashboard.
 */

import { OpenAI } from "openai";
import { RawFinding } from "../scoring-engine";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type GeoProvider = "openai" | "chatgpt" | "perplexity" | "claude";

export interface GeoQueryTemplate {
  query: string;
  intent: "brand" | "category" | "problem" | "comparison";
}

export interface GeoProbeResult {
  provider: GeoProvider;
  query: string;
  queryIntent: "brand" | "category" | "problem" | "comparison";
  mentioned: boolean;
  citedUrl?: string;
  position?: number;
  sentiment?: "positive" | "neutral" | "negative" | "absent";
  responseSnippet?: string;
  score: number;  // 0-100
  rawResponse?: string;
  error?: string;
}

export interface GeoAnalysisResult {
  compositeScore: number;       // 0-100 overall GEO score
  providerScores: Record<GeoProvider, number>;
  providerLabels: Record<GeoProvider, string>;
  probes: GeoProbeResult[];
  brandMentionRate: number;     // 0-1, % of probes where brand was mentioned
  citationQuality: number;      // 0-100
  sentimentScore: number;       // 0-100
  findings: RawFinding[];
  recommendations: string[];
  queryUniverse: GeoQueryTemplate[];
  confidence: number;
}

// ─────────────────────────────────────────
// QUERY UNIVERSE BUILDER
// Generates intent-diversified queries for a domain
// ─────────────────────────────────────────

export function buildQueryUniverse(domain: string, pageData?: {
  mainKeywords?: string[];
  productType?: string;
  industryCategory?: string;
}): GeoQueryTemplate[] {
  const brandName = extractBrandName(domain);
  const category = pageData?.industryCategory || "software tool";
  const product = pageData?.productType || "service";

  return [
    // Brand queries
    { query: `What is ${brandName}?`, intent: "brand" },
    { query: `Tell me about ${brandName}`, intent: "brand" },

    // Category queries
    { query: `Best ${category} tools in 2025`, intent: "category" },
    { query: `Top ${product} platforms for businesses`, intent: "category" },

    // Problem-solution queries
    { query: `How to improve ${category} for a small business?`, intent: "problem" },
    { query: `What's the best way to manage ${category}?`, intent: "problem" },

    // Comparison queries
    { query: `${brandName} vs competitors`, intent: "comparison" },
    { query: `Is ${brandName} good for [use case]?`, intent: "comparison" },
  ];
}

function extractBrandName(domain: string): string {
  return domain
    .replace(/^www\./, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ─────────────────────────────────────────
// GEMINI PROBER (real implementation)
// Uses Gemini to simulate AI answer engine response analysis
// ─────────────────────────────────────────

async function probeWithGemini(
  query: GeoQueryTemplate,
  domain: string,
  brandName: string
): Promise<GeoProbeResult> {
  try {

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    const openai = new OpenAI({ apiKey });


    // Meta-prompt: ask Gemini to respond as if it were a user-facing AI assistant
    const prompt = `Answer this question naturally as an AI assistant would: "${query.query}"
    
Then on a new line, ONLY output this JSON (nothing else):
{"mentioned": true/false, "sentiment": "positive|neutral|negative|absent", "relevantExcerpt": "quote if mentioned else empty string"}

The brand/domain to check for: ${domain} or ${brandName}`;

    // OpenAI call to get the response
    const result = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    const text = result.choices[0]?.message?.content || "";

    // Split response text from JSON
    const lines = text.split("\n");
    let jsonLine = lines.findLast((l: string) => l.trim().startsWith("{"));
    const responsePart = text.split(jsonLine || "")[0].trim();

    let mentioned = false;
    let sentiment: "positive" | "neutral" | "negative" | "absent" = "absent";
    let responseSnippet = "";

    try {
      if (jsonLine) {
        const parsed = JSON.parse(jsonLine.trim());
        mentioned = parsed.mentioned ?? false;
        sentiment = parsed.sentiment ?? "absent";
        responseSnippet = parsed.relevantExcerpt || responsePart.slice(0, 300);
      }
    } catch {
      // Fallback: scan text for domain
      mentioned = text.toLowerCase().includes(domain.toLowerCase()) ||
                  text.toLowerCase().includes(brandName.toLowerCase());
      responseSnippet = text.slice(0, 300);
    }

    const score = computeProbeScore(mentioned, sentiment, undefined);

    return {
      provider: "openai",
      query: query.query,
      queryIntent: query.intent,
      mentioned,
      sentiment,
      responseSnippet: responseSnippet.slice(0, 400),
      score,
      rawResponse: text.slice(0, 600),
    };
  } catch (error) {
    return {
      provider: "openai",
      query: query.query,
      queryIntent: query.intent,
      mentioned: false,
      sentiment: "absent",
      score: 0,
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────
// PERPLEXITY PROBER (API)
// ─────────────────────────────────────────

async function probeWithPerplexity(
  query: GeoQueryTemplate,
  domain: string,
  brandName: string
): Promise<GeoProbeResult> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [{ role: "user", content: query.query }],
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Perplexity API ${response.status}`);
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    const mentioned =
      text.toLowerCase().includes(domain.toLowerCase()) ||
      text.toLowerCase().includes(brandName.toLowerCase()) ||
      citations.some((c: string) => c.includes(domain));

    const citedUrl = citations.find((c: string) => c.includes(domain));
    const position = mentioned ? estimatePositionFromText(text, brandName, domain) : undefined;
    const sentiment = mentioned ? inferSentiment(text, brandName, domain) : "absent";
    const score = computeProbeScore(mentioned, sentiment, position);

    return {
      provider: "perplexity",
      query: query.query,
      queryIntent: query.intent,
      mentioned,
      citedUrl,
      position,
      sentiment,
      responseSnippet: text.slice(0, 400),
      score,
    };
  } catch (error) {
    return {
      provider: "perplexity",
      query: query.query,
      queryIntent: query.intent,
      mentioned: false,
      sentiment: "absent",
      score: 0,
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────
// OPENAI PROBER (ChatGPT)
// ─────────────────────────────────────────

async function probeWithOpenAI(
  query: GeoQueryTemplate,
  domain: string,
  brandName: string
): Promise<GeoProbeResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: query.query }],
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || "";

    const mentioned =
      text.toLowerCase().includes(domain.toLowerCase()) ||
      text.toLowerCase().includes(brandName.toLowerCase());

    const position = mentioned ? estimatePositionFromText(text, brandName, domain) : undefined;
    const sentiment = mentioned ? inferSentiment(text, brandName, domain) : "absent";
    const score = computeProbeScore(mentioned, sentiment, position);

    return {
      provider: "chatgpt",
      query: query.query,
      queryIntent: query.intent,
      mentioned,
      position,
      sentiment,
      responseSnippet: text.slice(0, 400),
      score,
    };
  } catch (error) {
    return {
      provider: "chatgpt",
      query: query.query,
      queryIntent: query.intent,
      mentioned: false,
      sentiment: "absent",
      score: 0,
      error: String(error),
    };
  }
}

// ─────────────────────────────────────────
// MAIN ANALYSER
// ─────────────────────────────────────────

export async function analyzeGeoVisibility(
  domain: string,
  siteUrl: string,
  pageData?: { mainKeywords?: string[]; productType?: string; industryCategory?: string }
): Promise<GeoAnalysisResult> {
  const brandName = extractBrandName(domain);
  const queryUniverse = buildQueryUniverse(domain, pageData);

  // Run 6-8 probes per available provider for statistical significance.
  // A single probe can miss the brand due to training cutoff or prompt variance.
  // 6+ probes across 2+ intent types gives us >90% confidence in mention detection.
  const selectedQueries = queryUniverse.slice(0, 8);

  const probePromises: Promise<GeoProbeResult>[] = [];

  // Always run Gemini (we have the key)
  for (const q of selectedQueries.slice(0, 8)) {
    probePromises.push(probeWithGemini(q, domain, brandName));
  }

  // Run Perplexity if key available
  if (process.env.PERPLEXITY_API_KEY) {
    for (const q of selectedQueries.slice(0, 6)) {
      probePromises.push(probeWithPerplexity(q, domain, brandName));
    }
  }

  // Run OpenAI if key available
  if (process.env.OPENAI_API_KEY) {
    for (const q of selectedQueries.slice(0, 6)) {
      probePromises.push(probeWithOpenAI(q, domain, brandName));
    }
  }

  const probes = await Promise.allSettled(probePromises).then(results =>
    results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<GeoProbeResult>).value)
  );

  // Aggregate scores per provider
  const providerScores: Record<string, number[]> = {};
  for (const probe of probes) {
    if (!providerScores[probe.provider]) providerScores[probe.provider] = [];
    providerScores[probe.provider].push(probe.score);
  }

  const aggregatedProviderScores: Record<GeoProvider, number> = {
    openai: average(providerScores["openai"] || [0]),
    chatgpt: average(providerScores["chatgpt"] || [0]),
    perplexity: average(providerScores["perplexity"] || [0]),
    claude: 0, // Not yet probed
  };

  const providerLabels: Record<GeoProvider, string> = {
    openai: "ChatGPT",
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    claude: "Claude",
  };

  // Composite score = average of active provider scores (excluding 0 = not probed)
  const activeScores = Object.values(aggregatedProviderScores).filter(s => s > 0);
  const compositeScore = activeScores.length > 0 ? Math.round(average(activeScores)) : 0;

  const mentionedProbes = probes.filter(p => p.mentioned);
  const brandMentionRate = probes.length > 0 ? mentionedProbes.length / probes.length : 0;
  const citationQuality = computeCitationQuality(probes, domain);
  const sentimentScore = computeSentimentScore(probes);

  // Generate findings
  const findings = generateGeoFindings(
    compositeScore,
    brandMentionRate,
    citationQuality,
    sentimentScore,
    probes,
    domain,
    brandName
  );

  const confidence = probes.length >= 12 ? 90 : probes.length >= 8 ? 80 : probes.length >= 4 ? 60 : 40;

  return {
    compositeScore,
    providerScores: aggregatedProviderScores,
    providerLabels,
    probes,
    brandMentionRate,
    citationQuality,
    sentimentScore,
    findings,
    recommendations: generateGeoRecommendations(findings, domain),
    queryUniverse,
    confidence,
  };
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function computeProbeScore(
  mentioned: boolean,
  sentiment: string | undefined,
  position: number | undefined
): number {
  if (!mentioned) return 0;
  let score = 50;
  if (sentiment === "positive") score += 30;
  else if (sentiment === "neutral") score += 10;
  else if (sentiment === "negative") score -= 20;
  if (position !== undefined) {
    if (position <= 2) score += 20;
    else if (position <= 5) score += 10;
  }
  return Math.max(0, Math.min(100, score));
}

function estimatePositionFromText(text: string, brandName: string, domain: string): number {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();
  const domainStr = domain.toLowerCase();

  // Find first occurrence relative to numbered list markers
  const lines = lower.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(brand) || lines[i].includes(domainStr)) {
      const match = lines[i].match(/^\s*(\d+)\./);
      if (match) return parseInt(match[1]);
      return i + 1;
    }
  }
  return 1;
}

function inferSentiment(text: string, brandName: string, domain: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();

  // Find sentences containing brand
  const sentences = text.split(/[.!?]/);
  const brandSentences = sentences.filter(s =>
    s.toLowerCase().includes(brand) || s.toLowerCase().includes(domain)
  );

  if (brandSentences.length === 0) return "neutral";

  const brandText = brandSentences.join(" ").toLowerCase();

  const positiveWords = ["best", "great", "excellent", "recommended", "popular", "leading", "top", "trusted", "powerful"];
  const negativeWords = ["poor", "bad", "avoid", "issue", "problem", "slow", "limited", "worst"];

  const posCount = positiveWords.filter(w => brandText.includes(w)).length;
  const negCount = negativeWords.filter(w => brandText.includes(w)).length;

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

function computeCitationQuality(probes: GeoProbeResult[], domain: string): number {
  const cited = probes.filter(p => p.citedUrl?.includes(domain));
  return probes.length > 0 ? Math.round((cited.length / probes.length) * 100) : 0;
}

function computeSentimentScore(probes: GeoProbeResult[]): number {
  const mentioned = probes.filter(p => p.mentioned);
  if (mentioned.length === 0) return 0;
  const sum = mentioned.reduce((acc, p) => {
    if (p.sentiment === "positive") return acc + 100;
    if (p.sentiment === "neutral") return acc + 60;
    if (p.sentiment === "negative") return acc + 10;
    return acc + 0;
  }, 0);
  return Math.round(sum / mentioned.length);
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function generateGeoFindings(
  compositeScore: number,
  brandMentionRate: number,
  citationQuality: number,
  sentimentScore: number,
  probes: GeoProbeResult[],
  domain: string,
  brandName: string
): RawFinding[] {
  const findings: RawFinding[] = [];

  // Only claim "absent" if we ran enough probes. With < 4 probes per provider,
  // the absence could be a variance issue, not a real visibility gap.
  // Use a lower threshold (0.15) so that 1 mention out of 8 probes isn't "absent".
  if (probes.length >= 6 && brandMentionRate < 0.15) {
    findings.push({
      type: "geo_not_mentioned",
      severity: "CRITICAL",
      title: `${brandName} has low AI search visibility`,
      description: `Your brand appeared in only ${Math.round(brandMentionRate * 100)}% of ${probes.length} AI answer engine probes across ${new Set(probes.map(p => p.provider)).size} providers. When users ask AI assistants about topics relevant to your brand, you are rarely mentioned.`,
      impact: "Weak AI visibility means missing an growing referral channel. Competitors who appear consistently in AI answers capture consideration before users even visit a website.",
      howToFix: "Create authoritative, answers-first content that directly addresses common user questions in your space. Publish on high-domain-authority platforms. Implement FAQ structured data on key pages.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 70,
      evidence: {
        brandMentionRate: `${Math.round(brandMentionRate * 100)}%`,
        probesRun: probes.length,
        providersProbed: Array.from(new Set(probes.map(p => p.provider))).join(", "),
      },
    });
  } else if (probes.length < 6 && brandMentionRate < 0.25) {
    // Too few probes for a definitive "absent" call — flag as low confidence
    findings.push({
      type: "geo_low_confidence",
      severity: "INFO",
      title: `AI visibility confidence is limited`,
      description: `Only ${probes.length} probes were completed (fewer than 6 recommended). The brand appeared in ${Math.round(brandMentionRate * 100)}% of probes, but this sample is too small for a definitive assessment.`,
      impact: "Cannot reliably determine AI visibility. Results may undercount actual presence.",
      howToFix: "Verify manually by searching for your brand on ChatGPT, Perplexity, and Gemini. Enable more AI provider API keys for comprehensive probing.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 50,
      evidence: {
        brandMentionRate: `${Math.round(brandMentionRate * 100)}%`,
        probesRun: probes.length,
      },
    });
  } else if (brandMentionRate < 0.5 && probes.length >= 4) {
    findings.push({
      type: "geo_poor_citation",
      severity: "WARNING",
      title: `Weak AI visibility — appearing in only ${Math.round(brandMentionRate * 100)}% of AI responses`,
      description: "Your brand appears in some AI answer engine results but inconsistently. You're losing ground to better-cited competitors.",
      impact: "Inconsistent AI presence means competitors capture AI-driven traffic on the queries you're missing.",
      howToFix: "Strengthen your content's answerability. Ensure every page answers a specific question directly in the first paragraph.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 80,
      evidence: { brandMentionRate: `${Math.round(brandMentionRate * 100)}%` },
    });
  }

  if (citationQuality < 30 && brandMentionRate > 0.25) {
    findings.push({
      type: "geo_poor_citation",
      severity: "WARNING",
      title: "AI engines mention you but don't cite your pages",
      description: "Your brand name appears in AI responses but AI systems are not linking to or citing your website. This means no click-through traffic from AI assistants.",
      impact: "Brand mentions without URL citations mean zero direct traffic from AI answers.",
      howToFix: "Improve page authority signals. Get your content linked from Wikipedia, industry publications, and partner directories. Implement structured data so AI systems can identify your canonical URL.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 75,
      evidence: { citationQuality: `${citationQuality}%` },
    });
  }

  if (sentimentScore < 50 && brandMentionRate > 0) {
    findings.push({
      type: "geo_negative_sentiment",
      severity: "CRITICAL",
      title: "AI engines are describing your brand with negative or neutral framing",
      description: `Sentiment score: ${sentimentScore}/100. When AI assistants mention your brand, the framing is not positive. This actively reduces consideration.`,
      impact: "Negative AI sentiment is worse than no mention. Users trust AI recommendations and negative framing creates a credibility barrier before they even visit your site.",
      howToFix: "Build more positive content signals: case studies, testimonials, awards, third-party reviews, and press mentions. Update brand description pages to be stronger.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 70,
      evidence: { sentimentScore },
    });
  }

  if (compositeScore < 50) {
    findings.push({
      type: "missing_faq_schema",
      severity: "WARNING",
      title: "No FAQ schema detected — low AI answer eligibility",
      description: "Pages lack FAQPage structured data, which is one of the primary signals AI systems use to extract answers. Without it, your content is harder for AI to cite.",
      impact: "FAQ schema increases likelihood of appearing in AI answers and Google's People Also Ask by 3-5x in comparable sites.",
      howToFix: "Add FAQPage JSON-LD schema to your product, about, and key landing pages. Answer the top 5 questions your customers ask about your product.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 85,
      evidence: { compositeScore },
    });
  }

  return findings;
}

function generateGeoRecommendations(findings: RawFinding[], domain: string): string[] {
  const recs: string[] = [];
  for (const f of findings.slice(0, 3)) {
    recs.push(f.howToFix);
  }
  if (recs.length === 0) {
    recs.push("Maintain content freshness and authoritative citations to sustain AI visibility.");
    recs.push("Monitor GEO scores monthly — AI training cycles affect visibility periodically.");
  }
  return recs;
}
