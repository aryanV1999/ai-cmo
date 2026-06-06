/**
 * Priority Scoring Engine
 *
 * Implements the calibrated priority formula:
 *   PriorityScore = (ExpectedImpact × Urgency × Confidence) / EffortCost
 *
 * This replaces naive severity-only ranking with evidence-weighted
 * business-impact prioritisation.
 */

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface RawFinding {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  affectedUrls?: string[];
  affectedCount?: number;
  score?: number;
  confidence?: number;
  evidence?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ScoredFinding extends RawFinding {
  impactScore: number;      // 0-100  expected business value
  effortScore: number;      // 0-100  lower = less dev effort
  urgencyScore: number;     // 0-100  how time-sensitive
  confidenceScore: number;  // 0-100  signal reliability
  priorityScore: number;    // composite sort key (higher = do first)
  priorityBand: "critical" | "high" | "medium" | "low";
  evidenceIds: string[];    // IDs/keys of evidence backing this finding
}

export interface ActionSpec {
  title: string;
  category: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  whyNow: string;
  whyThisPage?: string;
  steps: string[];
  verificationChecks: string[];
  codeSnippet?: string;
  expectedResult: string;
  expectedResultWindow: string;
  effortMinutes: number;
  impactScore: number;
  confidenceScore: number;
  priorityScore: number;
}

// ─────────────────────────────────────────
// IMPACT REFERENCE TABLE
// Maps finding types to expected business impact (0-100)
// Calibrated against SEO industry data
// ─────────────────────────────────────────

const IMPACT_TABLE: Record<string, number> = {
  // Indexability — highest business risk
  noindex_main_pages:       95,
  blocked_by_robots:        95,
  canonical_conflict:       85,
  redirect_loop:            90,
  broken_internal_links:    75,
  
  // Core Web Vitals
  poor_lcp:                 80,
  poor_cls:                 75,
  poor_tbt:                 70,

  // Crawlability
  missing_sitemap:          70,
  missing_robots_txt:       55,
  orphan_pages:             65,
  deep_click_depth:         60,

  // On-page
  missing_title:            80,
  duplicate_title:          70,
  missing_meta_description: 60,
  missing_h1:               65,
  multiple_h1:              50,
  thin_content:             60,
  duplicate_content:        70,

  // Schema
  missing_schema:           55,
  invalid_schema:           65,

  // Images
  missing_alt_text:         45,
  unoptimised_images:       50,

  // GEO
  geo_not_mentioned:        75,
  geo_poor_citation:        65,
  geo_negative_sentiment:   80,
  missing_faq_schema:       60,
  low_answerability:        70,

  // Default
  default:                  45,
};

// ─────────────────────────────────────────
// EFFORT REFERENCE TABLE (0-100, lower = less effort)
// ─────────────────────────────────────────

const EFFORT_TABLE: Record<string, number> = {
  missing_meta_description: 10,  // CMS edit
  missing_title:            10,
  missing_h1:               10,
  missing_alt_text:         20,
  missing_faq_schema:       30,
  missing_schema:           40,
  invalid_schema:           35,
  broken_internal_links:    25,
  missing_sitemap:          20,
  missing_robots_txt:       15,
  orphan_pages:             30,
  thin_content:             60,
  duplicate_content:        55,
  duplicate_title:          15,
  multiple_h1:              10,
  poor_lcp:                 70,
  poor_cls:                 60,
  poor_tbt:                 65,
  redirect_loop:            40,
  canonical_conflict:       35,
  noindex_main_pages:       20,
  blocked_by_robots:        20,
  deep_click_depth:         50,
  geo_not_mentioned:        65,
  geo_poor_citation:        55,
  geo_negative_sentiment:   70,
  low_answerability:        60,
  default:                  50,
};

// ─────────────────────────────────────────
// URGENCY MODIFIERS
// ─────────────────────────────────────────

const URGENCY_BY_SEVERITY: Record<string, number> = {
  CRITICAL: 95,
  WARNING:  60,
  INFO:     25,
};

// ─────────────────────────────────────────
// CORE SCORING FUNCTION
// ─────────────────────────────────────────

export function scoreFindings(
  findings: RawFinding[],
  crawlConfidence: number = 80
): ScoredFinding[] {
  return findings
    .map(f => {
      const typeKey = normalizeType(f.type);
      const impactScore = IMPACT_TABLE[typeKey] ?? IMPACT_TABLE["default"];
      const effortScore = EFFORT_TABLE[typeKey] ?? EFFORT_TABLE["default"];
      const urgencyScore = URGENCY_BY_SEVERITY[f.severity] ?? 30;

      // Signal confidence: blend finding-level with crawl-level confidence
      const findingConfidence = f.confidence ?? 80;
      const confidenceScore = Math.round(
        findingConfidence * 0.7 + crawlConfidence * 0.3
      );

      // Core formula: (impact × urgency × confidence) / effort
      // Normalised to 0-100
      const raw =
        (impactScore * urgencyScore * confidenceScore) /
        (effortScore * 100);
      const priorityScore = Math.min(100, Math.round(raw));

      const priorityBand = getPriorityBand(priorityScore, f.severity);
      const evidenceIds = extractEvidenceIds(f);

      return {
        ...f,
        impactScore,
        effortScore,
        urgencyScore,
        confidenceScore,
        priorityScore,
        priorityBand,
        evidenceIds,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function normalizeType(type: string): string {
  return type?.toLowerCase().replace(/[-\s]/g, "_") || "default";
}

function getPriorityBand(
  score: number,
  severity: string
): "critical" | "high" | "medium" | "low" {
  if (severity === "CRITICAL" || score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function extractEvidenceIds(f: RawFinding): string[] {
  const ids: string[] = [];
  if (f.evidence) {
    ids.push(...Object.keys(f.evidence));
  }
  if (f.affectedUrls?.length) {
    ids.push(`affected_urls[${f.affectedUrls.length}]`);
  }
  if (f.affectedCount) {
    ids.push(`affected_count:${f.affectedCount}`);
  }
  if (ids.length === 0) {
    ids.push(`${f.type}:automated`);
  }
  return ids;
}

// ─────────────────────────────────────────
// ACTION SPEC BUILDER
// Turns a scored finding into an executable action card
// ─────────────────────────────────────────

export function buildActionSpec(finding: ScoredFinding): ActionSpec {
  return {
    title: finding.title,
    category: deriveCategory(finding.type),
    severity: finding.severity,
    whyNow: buildWhyNow(finding),
    whyThisPage: buildWhyThisPage(finding),
    steps: buildSteps(finding),
    verificationChecks: buildVerificationChecks(finding),
    codeSnippet: buildCodeSnippet(finding),
    expectedResult: buildExpectedResult(finding),
    expectedResultWindow: buildResultWindow(finding),
    effortMinutes: estimateEffortMinutes(finding.effortScore),
    impactScore: finding.impactScore,
    confidenceScore: finding.confidenceScore,
    priorityScore: finding.priorityScore,
  };
}

function deriveCategory(type: string): string {
  const t = normalizeType(type);
  if (t.includes("geo") || t.includes("answer")) return "geo";
  if (t.includes("speed") || t.includes("lcp") || t.includes("cls")) return "speed";
  if (t.includes("schema") || t.includes("faq")) return "schema";
  if (t.includes("title") || t.includes("meta") || t.includes("h1") || t.includes("alt")) return "onpage";
  if (t.includes("link") || t.includes("sitemap") || t.includes("robots") || t.includes("canonical")) return "technical";
  if (t.includes("content") || t.includes("thin") || t.includes("duplicate")) return "content";
  return "technical";
}

function buildWhyNow(f: ScoredFinding): string {
  if (f.severity === "CRITICAL") {
    return `This is blocking your site's ${f.impactScore >= 80 ? "indexability and traffic acquisition" : "SEO performance"} right now.`;
  }
  if (f.urgencyScore >= 60) {
    return `Every day without fixing this costs you potential organic visibility. Impact score: ${f.impactScore}/100.`;
  }
  return `Addressing this now prevents compounding issues. Expected improvement: ${f.impactScore}/100 impact score.`;
}

function buildWhyThisPage(f: ScoredFinding): string | undefined {
  if (!f.affectedUrls?.length) return undefined;
  const count = f.affectedUrls.length;
  if (count === 1) return `Affects: ${f.affectedUrls[0]}`;
  return `Affects ${f.affectedCount || count} page${count > 1 ? "s" : ""}, starting with: ${f.affectedUrls[0]}`;
}

function buildSteps(f: ScoredFinding): string[] {
  // Use the howToFix field and enrich with type-specific steps
  const base = f.howToFix.split(".").filter(s => s.trim().length > 5).map(s => s.trim() + ".");
  if (base.length === 0) base.push(f.howToFix);

  const type = normalizeType(f.type);

  if (type === "missing_meta_description") {
    return [
      "Open each affected page in your CMS.",
      "Navigate to the SEO settings or meta fields section.",
      "Write a unique 120–160 character meta description per page.",
      "Include the primary keyword naturally in the first sentence.",
      "Save and publish changes.",
    ];
  }
  if (type === "missing_title") {
    return [
      "Identify each page without a title tag (see affected URLs).",
      "Write a unique <title> tag: [Primary Keyword] – [Brand Name].",
      "Keep under 60 characters to avoid truncation in SERPs.",
      "Prioritise high-traffic and conversion pages first.",
    ];
  }
  if (type === "missing_schema" || type === "missing_faq_schema") {
    return [
      "Choose the appropriate Schema.org type for this page (FAQPage, Article, Product, etc.).",
      "Use Google's Structured Data Markup Helper to generate the JSON-LD.",
      "Paste the JSON-LD in a <script type='application/ld+json'> tag in <head>.",
      "Validate using Google's Rich Results Test.",
      "Monitor Search Console for rich result eligibility.",
    ];
  }
  if (type === "poor_lcp") {
    return [
      "Identify the LCP element using Chrome DevTools (Performance tab).",
      "If it's an image: add fetchpriority='high' and ensure it's not lazy-loaded.",
      "Enable server-side compression (gzip/brotli) in your web server config.",
      "Move critical CSS inline or use <link rel='preload'>.",
      "Consider a CDN for static assets to reduce TTFB.",
    ];
  }
  if (type === "broken_internal_links") {
    return [
      "Export the list of broken links from the audit findings.",
      "For each broken link: update it to point to the correct live URL.",
      "If the destination page no longer exists, redirect it (301) or remove the link.",
      "Re-crawl after fixes to confirm all 404s are resolved.",
    ];
  }
  if (type.includes("geo")) {
    return [
      "Add an FAQ section to key pages answering common questions about your brand/product.",
      "Implement FAQPage JSON-LD schema on those pages.",
      "Create a dedicated 'About' or 'How it works' page with clear entity statements.",
      "Use natural language that directly answers the queries AI systems are probing.",
      "Build citations: get mentioned in industry publications, directories, and partner sites.",
    ];
  }

  return base.length ? base : [f.howToFix];
}

function buildVerificationChecks(f: ScoredFinding): string[] {
  const type = normalizeType(f.type);
  if (type === "missing_meta_description" || type === "missing_title") {
    return [
      "Search Google for site:yourdomain.com and confirm titles/descriptions appear.",
      "Run a fresh crawl and verify zero pages flagged for this issue.",
    ];
  }
  if (type.includes("schema")) {
    return [
      "Paste the page URL into Google's Rich Results Test.",
      "Confirm no structured data errors in Search Console.",
    ];
  }
  if (type.includes("lcp") || type.includes("cls") || type.includes("speed")) {
    return [
      "Run PageSpeed Insights before and after — confirm score improvement.",
      "Check CrUX data in Search Console after 28 days for field data change.",
    ];
  }
  if (type.includes("geo")) {
    return [
      "Run GEO probe again after 2 weeks.",
      "Confirm brand mention presence in at least 2 of 4 providers.",
    ];
  }
  return [
    "Re-run audit and confirm this finding is no longer flagged.",
    "Manually verify the fix on the affected page(s).",
  ];
}

function buildCodeSnippet(f: ScoredFinding): string | undefined {
  const type = normalizeType(f.type);
  if (type === "missing_faq_schema") {
    return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is [Your Product]?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "A clear, direct answer to this question."
    }
  }]
}
</script>`;
  }
  if (type === "missing_schema") {
    return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "https://yourdomain.com",
  "description": "What your company does in 1-2 sentences."
}
</script>`;
  }
  if (type === "poor_lcp") {
    return `<!-- Preload LCP image in <head> -->
<link rel="preload" as="image" href="/your-hero-image.webp" fetchpriority="high">

<!-- Or mark the img element directly -->
<img src="/your-hero-image.webp" fetchpriority="high" alt="Hero" />`;
  }
  return undefined;
}

function buildExpectedResult(f: ScoredFinding): string {
  if (f.impactScore >= 80) {
    return `Resolving this is expected to meaningfully improve crawlability, indexation, or ranking signals for affected pages.`;
  }
  if (f.impactScore >= 60) {
    return `Improvement in ${deriveCategory(f.type)} health score. May contribute to better SERP visibility within 4-8 weeks.`;
  }
  return `Incremental improvement in site quality. Part of a compound SEO health improvement.`;
}

function buildResultWindow(f: ScoredFinding): string {
  if (f.severity === "CRITICAL") return "1-2 weeks (crawl/index lag)";
  if (f.impactScore >= 70) return "2-4 weeks";
  if (f.impactScore >= 50) return "4-8 weeks";
  return "6-12 weeks (compound effect)";
}

function estimateEffortMinutes(effortScore: number): number {
  if (effortScore <= 15) return 15;
  if (effortScore <= 30) return 30;
  if (effortScore <= 50) return 60;
  if (effortScore <= 70) return 120;
  return 240;
}
