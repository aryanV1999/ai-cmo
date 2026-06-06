/**
 * Competitor Analysis Module
 *
 * Compares user site against competitors on marketing positioning,
 * content strategy, and brand differentiation.
 * No fake DA, backlinks, keywords. Real positioning intelligence only.
 */

import { discoverCompetitorDomains, normalizeDomain } from "../brand-research";

export interface CompetitorData {
  domain: string;
  source: "seo-api" | "web-discovered" | "gemini-assisted" | "estimated";
  confidence: number;
  positioning: string;
  contentStrategy: string;
  socialPresence: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  /** Target audience segments inferred from about/features pages */
  targetAudience?: string[];
  /** Pricing model inferred from pricing page */
  pricingModel?: string;
  /** Per-page summaries of competitor site */
  targetPages?: Array<{ page: string; summary: string }>;
}

export interface CompetitorComparison {
  dimension: string;
  userPosition: string;
  competitorPosition: string;
  insight: string;
  opportunity: string;
}

export interface CompetitorFinding {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  score: number;
}

export interface CompetitorResult {
  score: number;
  dataQuality: "seo-api" | "web-discovered" | "estimated" | "unavailable";
  notes: string[];
  competitors: CompetitorData[];
  comparisons: CompetitorComparison[];
  findings: CompetitorFinding[];
  summary: {
    competitivePosition: "leading" | "competitive" | "lagging" | "far-behind";
    primaryGaps: string[];
    quickWins: string[];
  };
}

/**
 * Multi-page competitor analysis — fetches homepage, about, pricing, and
 * features pages per competitor, then uses AI to extract positioning,
 * content strategy, target audience, pricing model, and differentiation.
 */
async function enrichCompetitorWithAI(
  domain: string,
  brandName: string,
  userDomain: string
): Promise<{
  positioning: string;
  contentStrategy: string;
  socialPresence: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  targetAudience?: string[];
  pricingModel?: string;
  targetPages?: Array<{ page: string; summary: string }>;
}> {
  // Fetch multiple pages in parallel
  const pagePaths = [
    { path: "", label: "homepage" },
    { path: "/about", label: "about" },
    { path: "/about-us", label: "about" },
    { path: "/pricing", label: "pricing" },
    { path: "/features", label: "features" },
    { path: "/product", label: "product" },
  ];

  const fetchPage = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) return "";
      const text = await response.text();
      return text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);
    } catch { return ""; }
  };

  const results = await Promise.all(
    pagePaths.map(p => fetchPage(`https://${domain}${p.path}`))
  );

  const pages: Array<{ label: string; content: string }> = [];
  for (let i = 0; i < pagePaths.length; i++) {
    if (results[i].length > 100) {
      pages.push({ label: pagePaths[i].label, content: results[i] });
    }
  }

  const homepageContent = pages.find(p => p.label === "homepage")?.content || "";
  const allContent = pages.map(p => `=== ${p.label.toUpperCase()} ===\n${p.content}`).join("\n\n");

  // Use OpenAI when available
  const apiKey = (process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "") as string;
  if (apiKey && apiKey.startsWith("sk-") && allContent.length > 300) {
    try {
      const { OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });

      const result = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Extract competitive intelligence for ${domain}.
Compare against: ${brandName} (${userDomain})

Pages fetched: ${pages.map(p => p.label).join(", ")}

${allContent}

Return JSON:
{
  "positioning": "Core value proposition and positioning (2-3 sentences)",
  "contentStrategy": "Content themes, topics, publishing approach (2-3 sentences)",
  "socialPresence": "Social platforms visible and engagement patterns",
  "pricingModel": "Pricing strategy inferred from pricing page (e.g., freemium, tiered, usage-based, custom)",
  "targetAudience": ["Audience segments identified from their messaging"],
  "targetPages": [{"page": "homepage|about|pricing|features|product", "summary": "2-sentence summary of this page's content"}],
  "keyStrengths": ["3-4 specific strengths evident from their website"],
  "keyWeaknesses": ["1-2 weaknesses or gaps vs ${brandName}"]
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      const text = result.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());

      const targetPages: Array<{ page: string; summary: string }> = [];
      if (Array.isArray(parsed.targetPages)) {
        for (const tp of parsed.targetPages) {
          if (tp.page && tp.summary) targetPages.push({ page: tp.page, summary: tp.summary });
        }
      }

      return {
        positioning: parsed.positioning || "Analysis pending",
        contentStrategy: parsed.contentStrategy || "Analysis pending",
        socialPresence: parsed.socialPresence || `Detected presence on domain only (homepage fetched, ${pages.length - 1} sub-pages)`,
        keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : ["Analysis pending"],
        keyWeaknesses: Array.isArray(parsed.keyWeaknesses) ? parsed.keyWeaknesses : ["Analysis pending"],
        targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : undefined,
        pricingModel: parsed.pricingModel || undefined,
        targetPages: targetPages.length > 0 ? targetPages : undefined,
      };
    } catch {
      // AI extraction failed
    }
  }

  // Fallback: return basic analysis
  const pageLabels = pages.map(p => p.label).join(", ");
  return {
    positioning: pages.length > 0
      ? `Fetched ${pages.length} pages: ${pageLabels}. ${homepageContent.slice(0, 150)}`
      : "Competitor pages could not be fetched. Consider a deeper crawl.",
    contentStrategy: `Content strategy analysis requires more data. Successfully fetched: ${pageLabels || "none"}.`,
    socialPresence: "Social presence data requires API access.",
    keyStrengths: pageLabels
      ? [`Multi-page analysis available: ${pages.length} pages fetched`]
      : ["Detailed comparison requires competitor site crawl"],
    keyWeaknesses: pageLabels
      ? [`Pricing, features, and audience analysis limited to ${pages.length} pages`]
      : ["Detailed comparison requires competitor site crawl"],
    targetPages: pages.map(p => ({ page: p.label, summary: p.content.slice(0, 150) })),
  };
}

export async function analyzeCompetitors(
  userDomain: string,
  competitorDomains: string[],
): Promise<CompetitorResult> {
  const normalizedUserDomain = normalizeDomain(userDomain);
  const brandName = normalizedUserDomain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const cleanCompetitorDomains = Array.from(new Set(
    competitorDomains
      .map(normalizeDomain)
      .filter((d) => d && d !== normalizedUserDomain && !d.endsWith("." + normalizedUserDomain))
  ));

  const source = process.env.GEMINI_API_KEY ? "gemini-assisted" : "web-discovered";

  // Enrich competitors with real analysis by fetching their homepages + AI
  const enrichedCompetitors = await Promise.all(
    cleanCompetitorDomains.slice(0, 5).map(async (d) => {
      const analysis = await enrichCompetitorWithAI(d, brandName, normalizedUserDomain);
      return {
        domain: d,
        source: source as "web-discovered" | "gemini-assisted",
        confidence: analysis.positioning.includes("Analysis pending") ? 50 : 75,
        positioning: analysis.positioning,
        contentStrategy: analysis.contentStrategy,
        socialPresence: analysis.socialPresence,
        keyStrengths: analysis.keyStrengths,
        keyWeaknesses: analysis.keyWeaknesses,
        targetAudience: analysis.targetAudience,
        pricingModel: analysis.pricingModel,
        targetPages: analysis.targetPages,
      };
    })
  );

  // Build AI-powered comparisons when OpenAI is available
  const comparisons: CompetitorComparison[] = [];
  if (enrichedCompetitors.length > 0) {
    comparisons.push({
      dimension: "Competitor Discovery",
      userPosition: `${brandName} (${normalizedUserDomain})`,
      competitorPosition: enrichedCompetitors.map(c => `${c.domain} — ${c.positioning.slice(0, 120)}`).join("\n"),
      insight: `Found ${enrichedCompetitors.length} likely competitors. ${enrichedCompetitors.filter(c => c.positioning.length > 50).length} have real positioning data.`,
      opportunity: "Run full competitor site crawls for comprehensive positioning analysis.",
    });

    if (enrichedCompetitors.some(c => c.positioning.length > 50)) {
      comparisons.push({
        dimension: "Value Proposition Comparison",
        userPosition: "Extract from your website crawl",
        competitorPosition: enrichedCompetitors
          .filter(c => c.positioning.length > 50)
          .map(c => `${c.domain}: ${c.positioning.slice(0, 150)}`)
          .join("\n---\n"),
        insight: "Competitor positioning extracted from live homepages.",
        opportunity: "Identify positioning whitespace your brand can claim.",
      });
    }
  }

  const notes =
    enrichedCompetitors.length === 0
      ? ["No competitor domains were found from public research."]
      : [
          "Competitors identified through web search and AI analysis.",
          "Positioning data extracted from competitor homepages in real-time.",
          "This analysis compares positioning and strategy, not fabricated SEO metrics.",
        ];

  const findings: CompetitorFinding[] =
    enrichedCompetitors.length === 0
      ? [{
          type: "competitor_research_unavailable",
          severity: "INFO",
          title: "No direct competitors discovered",
          description: "Web research did not identify reliable competitor domains. Try adding known competitor URLs manually.",
          impact: "Unable to benchmark positioning and identify market gaps.",
          howToFix: "Manually add known competitor domains or refine the industry context.",
          score: 50,
        }]
      : [{
          type: "competitors_discovered",
          severity: "INFO",
          title: `${enrichedCompetitors.length} competitors identified and analyzed`,
          description: `Found: ${enrichedCompetitors.map(c => c.domain).join(", ")}. Data from real homepage fetches.`,
          impact: "Provides baseline competitive positioning intelligence.",
          howToFix: "Crawl competitor sites for deeper content strategy comparison.",
          score: 75,
        }];

  const score = enrichedCompetitors.length === 0 ? 50 : 70;
  const primaryGaps =
    enrichedCompetitors.length === 0
      ? ["No competitor data available"]
      : [
          "Full competitor content strategy comparison requires deeper crawl",
          "Social presence comparison requires API integration",
        ];
  const quickWins =
    enrichedCompetitors.length === 0
      ? ["Add known competitor domains to enable comparison"]
      : [
          "Analyze top competitor positioning to refine your own messaging",
          "Identify content topics your competitors cover that you don't",
        ];

  return {
    score,
    dataQuality: enrichedCompetitors.some(c => c.positioning.length > 50) ? "web-discovered" : "estimated",
    notes,
    competitors: enrichedCompetitors,
    comparisons,
    findings,
    summary: { competitivePosition: score >= 70 ? "competitive" : "lagging", primaryGaps, quickWins },
  };
}

export async function detectCompetitors(
  domain: string,
  contextTerms: string[] = []
): Promise<string[]> {
  return discoverCompetitorDomains(domain, contextTerms);
}
