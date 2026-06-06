/**
 * RAG Context Retriever
 * 
 * Retrieves relevant context from vector database
 * based on audit findings and user queries.
 * 
 * Features:
 * - Multi-collection semantic search
 * - Query expansion and enhancement
 * - Context ranking and deduplication
 * - Token budget management
 * - Citation tracking
 */

import {
  COLLECTIONS,
  CollectionName,
  SearchResult,
  hybridSearchDocuments,
} from "./vector-client";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface Finding {
  id?: string;
  type: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "OPPORTUNITY";
  message?: string;
  title?: string;
  description?: string;
  evidence?: string[];
  affectedPages?: string[];
  affectedUrls?: string[];
  category?: string;
  impact?: string;
  howToFix?: string;
  score?: number;
  confidence?: number;
}

export interface RetrievalQuery {
  primary: string;
  context?: string;
  filters?: {
    category?: string;
    industry?: string;
    severity?: string;
    issueTypes?: string[];
  };
}

export interface RetrievedContext {
  query: string;
  results: EnhancedSearchResult[];
  totalTokens: number;
  collections: CollectionName[];
}

export interface EnhancedSearchResult extends SearchResult {
  relevanceScore: number;
  source: string;
  citation: string;
  truncated: boolean;
}

export interface ContextBundle {
  // For prompt injection
  bestPractices: string;
  fixTemplates: string;
  similarCases: string;
  benchmarks: string;
  socialTips: string;
  geoInsights: string;
  
  // Metadata
  totalTokens: number;
  sourceCount: number;
  citations: Citation[];
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
}

// ─────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────

const MAX_TOKENS_PER_CATEGORY = 1500;
const MAX_TOTAL_TOKENS = 8000;
const MAX_RESULTS_PER_QUERY = 5;
const MIN_SIMILARITY_SCORE = 0.65;

const STRATEGIC_QUERY_EXPANSIONS = [
  "technical SEO crawlability indexation schema Core Web Vitals",
  "content quality topical authority keyword gaps search intent",
  "competitor positioning keyword overlap backlink gap content velocity",
  "conversion funnel landing page CTA trust signals lead capture",
  "social media engagement posting frequency content themes brand voice",
  "GEO AI visibility brand mentions citations answer engine optimization",
];

// Query templates for different finding types
const QUERY_TEMPLATES: Record<string, (finding: Finding) => string> = {
  MISSING_TITLE: () => "SEO title tag optimization best practices meta title guide",
  TITLE_TOO_SHORT: () => "optimal title tag length SEO character count best practices",
  TITLE_TOO_LONG: () => "title tag truncation SEO length optimization",
  MISSING_META_DESC: () => "meta description SEO optimization best practices",
  MISSING_H1: () => "H1 heading tag SEO optimization content structure",
  MULTIPLE_H1: () => "multiple H1 tags SEO fix single heading structure",
  BROKEN_LINK: () => "broken links 404 fix redirect strategy link audit",
  SLOW_LCP: () => "LCP Largest Contentful Paint optimization Core Web Vitals speed",
  POOR_CLS: () => "CLS Cumulative Layout Shift fix layout stability",
  SLOW_FID: () => "FID First Input Delay interaction optimization",
  MISSING_ALT: () => "image alt text accessibility SEO optimization",
  THIN_CONTENT: () => "thin content SEO word count quality improvement",
  DUPLICATE_CONTENT: () => "duplicate content canonical tags SEO consolidation",
  MISSING_ROBOTS: () => "robots.txt configuration SEO crawler directives",
  MISSING_SITEMAP: () => "XML sitemap creation SEO crawlability indexing",
  MOBILE_ISSUES: () => "mobile optimization responsive design SEO best practices",
  HTTPS_ISSUES: () => "HTTPS SSL security SEO migration mixed content",
  LOW_GEO_VISIBILITY: () => "GEO visibility AI search optimization ChatGPT Perplexity citations",
};

// ─────────────────────────────────────────
// QUERY BUILDING
// ─────────────────────────────────────────

/**
 * Build search queries from findings
 */
export function buildQueriesFromFindings(
  findings: Finding[],
  websiteContext?: string
): RetrievalQuery[] {
  const queries: RetrievalQuery[] = [];
  const seenTypes = new Set<string>();
  
  // Group findings by type for deduplication
  for (const finding of findings) {
    if (seenTypes.has(finding.type)) continue;
    seenTypes.add(finding.type);
    
    // Generate primary query
    const template = QUERY_TEMPLATES[finding.type];
    const findingText = [
      finding.title,
      finding.message,
      finding.description,
      finding.impact,
      finding.howToFix,
    ].filter(Boolean).join(" ");

    const primary = template
      ? template(finding)
      : `${finding.type.toLowerCase().replace(/_/g, ' ')} ${findingText} SEO fix optimization`;
    
    queries.push({
      primary,
      context: websiteContext,
      filters: {
        category: normalizeCategory(finding.category),
        issueTypes: [finding.type],
      },
    });
  }
  
  return queries;
}

function expandQuery(query: RetrievalQuery): RetrievalQuery[] {
  const expanded = [query];
  const category = query.filters?.category;

  const categoryExpansions: Record<string, string[]> = {
    technical_seo: [
      "crawlability indexability canonical sitemap robots internal links structured data",
      "technical SEO implementation checklist validation Search Console",
    ],
    on_page_seo: [
      "title tags meta descriptions H1 search intent SERP CTR",
      "page-level SEO content optimization keyword targeting",
    ],
    page_speed: [
      "Core Web Vitals LCP CLS TBT performance optimization",
      "JavaScript image CDN critical rendering path speed fixes",
    ],
    social_media: [
      "social media content strategy engagement rate posting cadence",
      "LinkedIn Twitter Instagram YouTube content themes brand voice",
    ],
    competitor_analysis: [
      "competitor keyword gap backlink gap content strategy positioning",
      "market gaps differentiation opportunities competitor strengths weaknesses",
    ],
    geo_visibility: [
      "AI search visibility GEO answer engine brand citation strategy",
      "ChatGPT Perplexity Gemini Claude brand mentions structured answers",
    ],
    conversion_optimization: [
      "landing page conversion trust signals CTA lead capture funnel",
      "conversion optimization offer messaging form friction CRO audit",
    ],
  };

  for (const addition of categoryExpansions[category || ""] || []) {
    expanded.push({
      ...query,
      primary: `${query.primary} ${addition}`,
    });
  }

  return expanded;
}

function normalizeCategory(category?: string): string | undefined {
  if (!category) return undefined;
  const c = category.toLowerCase().replace(/[-\s]/g, "_");
  if (c === "technical") return "technical_seo";
  if (c === "onpage" || c === "on_page") return "on_page_seo";
  if (c === "speed" || c === "performance") return "page_speed";
  if (c === "marketing") return "content_marketing";
  if (c === "geo") return "geo_visibility";
  if (c === "competitor") return "competitor_analysis";
  return c;
}

/**
 * Build general SEO query
 */
export function buildGeneralQuery(
  topic: string,
  context?: string
): RetrievalQuery {
  return {
    primary: `${topic} SEO best practices optimization guide`,
    context,
  };
}

/**
 * Build competitor analysis query
 */
export function buildCompetitorQuery(
  industry: string,
  domain: string
): RetrievalQuery {
  return {
    primary: `${industry} competitor analysis SEO strategy patterns`,
    context: `Analyzing ${domain} in ${industry} industry`,
    filters: {
      industry,
    },
  };
}

/**
 * Build social media query
 */
export function buildSocialQuery(
  platform: string,
  goal: string
): RetrievalQuery {
  return {
    primary: `${platform} marketing strategy ${goal} best practices`,
    filters: {
      category: "social_media",
    },
  };
}

/**
 * Build GEO visibility query
 */
export function buildGEOQuery(brandName: string): RetrievalQuery {
  return {
    primary: "GEO visibility AI search optimization ChatGPT Perplexity brand mentions citations",
    context: `Improving AI visibility for ${brandName}`,
    filters: {
      category: "geo_visibility",
    },
  };
}

// ─────────────────────────────────────────
// CONTEXT RETRIEVAL
// ─────────────────────────────────────────

/**
 * Retrieve relevant context for a single query
 */
export async function retrieveContext(
  query: RetrievalQuery,
  collections: CollectionName[] = [COLLECTIONS.SEO_KNOWLEDGE],
  maxResults: number = MAX_RESULTS_PER_QUERY
): Promise<RetrievedContext> {
  const results: EnhancedSearchResult[] = [];
  let totalTokens = 0;
  
  // Search each collection
  for (const collection of collections) {
    const searchResults = await hybridSearchDocuments(
      collection,
      query.primary,
      {
        topK: maxResults,
        minScore: MIN_SIMILARITY_SCORE - 0.25,
        filter: query.filters as Record<string, string | string[]> | undefined,
      }
    );
    
    // Enhance results
    for (const result of searchResults) {
      const enhanced = enhanceResult(result, collection);
      results.push(enhanced);
      totalTokens += estimateTokens(result.content);
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return {
    query: query.primary,
    results,
    totalTokens,
    collections,
  };
}

/**
 * Retrieve comprehensive context for audit
 */
export async function retrieveAuditContext(
  findings: Finding[],
  domain: string,
  industry?: string
): Promise<ContextBundle> {
  const citations: Citation[] = [];
  let totalTokens = 0;
  let sourceCount = 0;
  
  // Build queries from findings
  const findingQueries = buildQueriesFromFindings(findings, domain);
  const topFindingQueries = findingQueries
    .slice(0, 8)
    .flatMap(expandQuery);
  const strategicQueries = STRATEGIC_QUERY_EXPANSIONS.map(primary => ({
    primary: `${domain} ${industry || "general"} ${primary}`,
    context: `Strategic CMO analysis for ${domain}`,
  }));
  
  // 1. Best Practices (from SEO knowledge)
  const bestPracticesContext = await retrieveForCategory(
    topFindingQueries.slice(0, 12),
    [COLLECTIONS.SEO_KNOWLEDGE],
    MAX_TOKENS_PER_CATEGORY,
    citations
  );
  totalTokens += bestPracticesContext.tokens;
  sourceCount += bestPracticesContext.sourceCount;
  
  // 2. Fix Templates
  const fixTemplatesContext = await retrieveForCategory(
    topFindingQueries,
    [COLLECTIONS.FIX_TEMPLATES],
    MAX_TOKENS_PER_CATEGORY,
    citations
  );
  totalTokens += fixTemplatesContext.tokens;
  sourceCount += fixTemplatesContext.sourceCount;
  
  // 3. Similar Cases / Audit Examples
  const similarCasesContext = await retrieveForCategory(
    strategicQueries.slice(0, 3),
    [COLLECTIONS.AUDIT_EXAMPLES, COLLECTIONS.RECOMMENDATION_MEMORY],
    MAX_TOKENS_PER_CATEGORY,
    citations
  );
  totalTokens += similarCasesContext.tokens;
  sourceCount += similarCasesContext.sourceCount;
  
  // 4. Industry Benchmarks
  const benchmarksContext = await retrieveForCategory(
    [{ primary: `${industry || 'general'} industry benchmarks SEO metrics conversion social performance` }],
    [COLLECTIONS.INDUSTRY_BENCHMARKS],
    MAX_TOKENS_PER_CATEGORY / 2,
    citations
  );
  totalTokens += benchmarksContext.tokens;
  sourceCount += benchmarksContext.sourceCount;
  
  // 5. Social Media Tips (if social findings exist)
  const hasSocialFindings = findings.some(f => 
    f.type.includes("SOCIAL") || f.type.includes("OPEN_GRAPH")
  );
  const socialContext = await retrieveForCategory(
    [
      { primary: `${domain} LinkedIn Twitter Instagram YouTube social media engagement strategy content calendar` },
      { primary: "posting frequency engagement rate sentiment hashtags creator partnerships social listening" },
    ],
    [COLLECTIONS.SOCIAL_INTEL],
    hasSocialFindings ? MAX_TOKENS_PER_CATEGORY : MAX_TOKENS_PER_CATEGORY / 3,
    citations
  );
  totalTokens += socialContext.tokens;
  sourceCount += socialContext.sourceCount;
  
  // 6. GEO Insights (if GEO findings exist)
  const hasGEOFindings = findings.some(f => 
    f.type.includes("GEO") || f.type.includes("AI_VISIBILITY")
  );
  const geoContext = await retrieveForCategory(
    [buildGEOQuery(domain), { primary: `${domain} AI answer engine competitor citations structured data entity authority` }],
    [COLLECTIONS.GEO_KNOWLEDGE],
    hasGEOFindings ? MAX_TOKENS_PER_CATEGORY : MAX_TOKENS_PER_CATEGORY / 3,
    citations
  );
  totalTokens += geoContext.tokens;
  sourceCount += geoContext.sourceCount;
  
  return {
    bestPractices: bestPracticesContext.content || "No specific best practices found.",
    fixTemplates: fixTemplatesContext.content || "No fix templates found.",
    similarCases: similarCasesContext.content || "No similar cases found.",
    benchmarks: benchmarksContext.content || "No benchmarks found.",
    socialTips: socialContext.content || "No social media tips found.",
    geoInsights: geoContext.content || "No GEO insights found.",
    totalTokens,
    sourceCount,
    citations,
  };
}

/**
 * Retrieve context for a specific category
 */
async function retrieveForCategory(
  queries: RetrievalQuery[],
  collections: CollectionName[],
  maxTokens: number,
  citations: Citation[]
): Promise<{ content: string; tokens: number; sourceCount: number }> {
  const allResults: EnhancedSearchResult[] = [];
  
  for (const query of queries) {
    const context = await retrieveContext(query, collections, 3);
    allResults.push(...context.results);
  }
  
  // Deduplicate and rank
  const uniqueResults = deduplicateResults(allResults);
  
  // Build content within token budget
  let content = "";
  let tokens = 0;
  let sourceCount = 0;
  
  for (const result of uniqueResults) {
    const compressed = compressResultForPrompt(result);
    const resultTokens = estimateTokens(compressed);
    
    if (tokens + resultTokens > maxTokens) {
      // Try to add truncated version
      const available = maxTokens - tokens;
      if (available > 200) {
        const truncated = truncateToTokens(compressed, available);
        content += `\n\n### ${result.source}\n${truncated}`;
        result.truncated = true;
      }
      break;
    }
    
    content += `\n\n### ${result.source}\n${compressed}`;
    tokens += resultTokens;
    sourceCount++;
    
    // Track citation
    citations.push({
      id: result.id,
      title: result.metadata?.title || result.source,
      source: result.source,
      url: result.metadata?.url,
    });
  }
  
  return { content: content.trim(), tokens, sourceCount };
}

function compressResultForPrompt(result: EnhancedSearchResult): string {
  const metadata = [
    `category=${result.metadata.category}`,
    `sourceType=${result.metadata.sourceType}`,
    `score=${result.relevanceScore.toFixed(2)}`,
    result.metadata.issueTypes?.length ? `issueTypes=${result.metadata.issueTypes.join(",")}` : "",
  ].filter(Boolean).join("; ");

  const content = result.content
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 18)
    .join("\n");

  return `[${metadata}]\n${content}`;
}

// ─────────────────────────────────────────
// RESULT PROCESSING
// ─────────────────────────────────────────

/**
 * Enhance search result with additional metadata
 */
function enhanceResult(
  result: SearchResult,
  collection: CollectionName
): EnhancedSearchResult {
  const source = result.metadata?.title || 
    collection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    ...result,
    relevanceScore: calculateRelevance(result),
    source,
    citation: `[${source}]`,
    truncated: false,
  };
}

/**
 * Calculate relevance score
 */
function calculateRelevance(result: SearchResult): number {
  let score = result.score;
  
  // Boost for high confidence
  if (result.metadata?.confidence && result.metadata.confidence > 80) {
    score *= 1.1;
  }
  
  // Boost for recent documents
  if (result.metadata?.createdAt) {
    const age = Date.now() - new Date(result.metadata.createdAt).getTime();
    const ageInDays = age / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) score *= 1.1;
    if (ageInDays < 7) score *= 1.05;
  }
  
  // Boost for verified/proven recommendations
  if (result.metadata?.sourceType === "recommendation") {
    score *= 1.15;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Deduplicate results by content similarity
 */
function deduplicateResults(results: EnhancedSearchResult[]): EnhancedSearchResult[] {
  const seen = new Set<string>();
  const unique: EnhancedSearchResult[] = [];
  
  for (const result of results) {
    // Create fingerprint from first 200 chars
    const fingerprint = result.content.slice(0, 200).toLowerCase().replace(/\s+/g, ' ');
    
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      unique.push(result);
    }
  }
  
  // Sort by relevance
  return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ─────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────

/**
 * Estimate tokens (rough approximation: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to approximate token count
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  
  // Try to break at sentence boundary
  const truncated = text.slice(0, maxChars);
  const lastSentence = truncated.lastIndexOf('. ');
  
  if (lastSentence > maxChars * 0.7) {
    return truncated.slice(0, lastSentence + 1) + '...';
  }
  
  return truncated.trim() + '...';
}

// ─────────────────────────────────────────
// PROMPT BUILDING
// ─────────────────────────────────────────

/**
 * Build RAG-enhanced prompt section
 */
export function buildRAGPromptSection(context: ContextBundle): string {
  const sections: string[] = [];
  
  if (context.bestPractices && context.bestPractices !== "No specific best practices found.") {
    sections.push(`
## SEO Best Practices (from knowledge base):
${context.bestPractices}
`);
  }
  
  if (context.fixTemplates && context.fixTemplates !== "No fix templates found.") {
    sections.push(`
## Fix Templates & Implementation Guides:
${context.fixTemplates}
`);
  }
  
  if (context.similarCases && context.similarCases !== "No similar cases found.") {
    sections.push(`
## Similar Cases & Proven Recommendations:
${context.similarCases}
`);
  }
  
  if (context.benchmarks && context.benchmarks !== "No benchmarks found.") {
    sections.push(`
## Industry Benchmarks:
${context.benchmarks}
`);
  }
  
  if (context.socialTips && context.socialTips !== "No social media tips found.") {
    sections.push(`
## Social Media Optimization Tips:
${context.socialTips}
`);
  }
  
  if (context.geoInsights && context.geoInsights !== "No GEO insights found.") {
    sections.push(`
## GEO/AI Visibility Insights:
${context.geoInsights}
`);
  }
  
  if (sections.length === 0) {
    return "";
  }
  
  return `
───────────────────────────────────────────
KNOWLEDGE BASE CONTEXT (use this to inform your recommendations):
Rules for using this context:
- Prefer exact fix templates and benchmarks over generic marketing advice.
- Cite source titles in reasoning fields when a recommendation depends on this context.
- If the audit data does not contain a metric, say the metric is unavailable instead of inventing it.
- Convert retrieved best practices into concrete actions tied to affected pages.
───────────────────────────────────────────
${sections.join('\n')}
───────────────────────────────────────────
`;
}

/**
 * Build citations section for report
 */
export function buildCitationsSection(citations: Citation[]): string {
  if (citations.length === 0) return "";
  
  const uniqueCitations = Array.from(
    new Map(citations.map(c => [c.title, c])).values()
  );
  
  return `
## Sources & References
${uniqueCitations.map((c, i) => 
  `${i + 1}. ${c.title}${c.url ? ` - [Link](${c.url})` : ''}`
).join('\n')}
`;
}

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────

export {
  estimateTokens,
  truncateToTokens,
  deduplicateResults,
  enhanceResult,
  calculateRelevance,
  retrieveForCategory,
};
