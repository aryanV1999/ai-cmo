import { CrawlResultV2, CrawledPageV2 } from "./crawler-v2";

export interface BrandPositioning {
  tagline: string | null;
  valueProposition: string;
  positioningStatements: string[];
  targetAudience: string[];
  industryCategory: string;
  businessModel: "B2B" | "B2C" | "B2B2C" | "Marketplace" | "Unknown";
  messagingPillars: MessagingPillar[];
  brandVoice: BrandVoice;
  toneAnalysis: string;
  contentThemes: ContentTheme[];
  contentGaps: string[];
  primaryCallToAction: string | null;
  differentiators: string[];
  claimedAdvantages: string[];
  evidence: PositioningEvidence[];
  confidence: number;
}

export interface MessagingPillar {
  theme: string;
  frequency: number;
  examples: string[];
  pages: string[];
}

export interface BrandVoice {
  formality: "formal" | "professional" | "conversational" | "casual" | "mixed";
  tone: string[];
  personality: string[];
}

export interface ContentTheme {
  topic: string;
  strength: "strong" | "moderate" | "weak";
  pageCount: number;
  representativeUrls: string[];
}

export interface PositioningEvidence {
  type: "headline" | "subheading" | "cta" | "value-prop" | "social-proof" | "schema";
  source: string;
  content: string;
  pageUrl: string;
  confidence: number;
}

const VALUE_PROP_PATTERNS = [
  /(?:we\s+(?:help|enable|empower|allow|let|make|provide|deliver|offer|give))\b.{10,120}/gi,
  /(?:our\s+(?:mission|vision|purpose|goal)\s+(?:is|are))\b.{10,120}/gi,
  /(?:the\s+(?:best|leading|most|ultimate|premier|top))\b.{10,100}/gi,
  /(?:built\s+(?:for|to)|designed\s+(?:for|to))\b.{10,100}/gi,
  /(?:solving|solution\s+(?:for|to))\b.{10,100}/gi,
];

const AUDIENCE_PATTERNS = [
  /(?:for\s+(?:modern|growing|small|mid-size|enterprise|startup|digital|today's))\b.{5,60}/gi,
  /(?:built\s+for\s+(?:teams?|companies?|businesses?|developers?|designers?|marketers?|creators?|founders?))\b/gi,
  /(?:trusted\s+by)\b.{10,80}/gi,
  /(?:powering|serving|helping)\b.{10,80}/gi,
];

const DIFFERENTIATOR_PATTERNS = [
  /(?:unlike|instead\s+of|unlike\s+other|vs\.?|versus)\b.{10,120}/gi,
  /(?:no\s+(?:other|more)\s+(?:need|code|setup|learning|complexity))\b/gi,
  /(?:first|only)\s+(?:and\s+only|its\s+kind)\b.{10,80}/gi,
  /(?:patented|proprietary|exclusive|unique)\b.{10,80}/gi,
];

const INDUSTRY_SIGNALS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(saas|software|platform|api|cloud|app)\b/i, category: "SaaS / Software" },
  { pattern: /\b(ecommerce|retail|shop|store|product|d2c)\b/i, category: "E-commerce / Retail" },
  { pattern: /\b(healthcare|health|medical|wellness|fitness)\b/i, category: "Healthcare / Wellness" },
  { pattern: /\b(fintech|finance|banking|payments|insurance|investing)\b/i, category: "Fintech / Finance" },
  { pattern: /\b(education|edtech|learning|course|training|academy)\b/i, category: "Education / EdTech" },
  { pattern: /\b(marketing|advertising|media|pr|branding|seo|growth)\b/i, category: "Marketing / Advertising" },
  { pattern: /\b(hr|hiring|recruiting|talent|workforce|people)\b/i, category: "HR / Talent" },
  { pattern: /\b(real\s*estate|property|housing|rental)\b/i, category: "Real Estate" },
  { pattern: /\b(logistics|supply\s*chain|shipping|delivery|fulfillment)\b/i, category: "Logistics / Supply Chain" },
  { pattern: /\b(travel|hospitality|hotel|tourism|booking)\b/i, category: "Travel / Hospitality" },
  { pattern: /\b(food|restaurant|meal|kitchen|grocery)\b/i, category: "Food / Restaurant" },
  { pattern: /\b(fashion|beauty|cosmetic|apparel|clothing)\b/i, category: "Fashion / Beauty" },
  { pattern: /\b(legal|law|attorney|compliance|regulatory)\b/i, category: "Legal / Compliance" },
  { pattern: /\b(manufacturing|industrial|factory|production)\b/i, category: "Manufacturing" },
  { pattern: /\b(consulting|consultancy|advisory|strategy)\b/i, category: "Consulting / Professional Services" },
];

const BUSINESS_MODEL_PATTERNS: Array<{ pattern: RegExp; model: string }> = [
  { pattern: /\b(enterprise|business|team|organization|company)\b.{0,30}(?:software|platform|solution|tool|saas)\b/i, model: "B2B" },
  { pattern: /\b(for\s+(?:you|me|everyone|consumers|customers|shoppers))\b/i, model: "B2C" },
  { pattern: /\b(marketplace|buy\s+and\s+sell|platform\s+for\s+(?:buyers|sellers))\b/i, model: "Marketplace" },
];

const BRAND_VOICE_SIGNALS: Array<{ pattern: RegExp; trait: string; category: string }> = [
  { pattern: /\b(disrupt|revolutionize|game[-\s]?changer|bleeding[-\s]?edge)\b/i, trait: "disruptive", category: "tone" },
  { pattern: /\b(trusted|reliable|secure|enterprise[-\s]?grade|proven)\b/i, trait: "trustworthy", category: "tone" },
  { pattern: /\b(innovative|future[-\s]?ready|cutting[-\s]?edge|next[-\s]?gen)\b/i, trait: "innovative", category: "tone" },
  { pattern: /\b(simple|easy|effortless|seamless|hassle[-\s]?free)\b/i, trait: "simplicity", category: "tone" },
  { pattern: /\b(powerful|fast|scale|performance|enterprise)\b/i, trait: "power", category: "tone" },
  { pattern: /\b(community|together|we|us|our\s+team|people[-\s]?first)\b/i, trait: "community", category: "personality" },
  { pattern: /\b(expert|authority|leader|award[-\s]?winning|patented)\b/i, trait: "authoritative", category: "personality" },
  { pattern: /\b(affordable|price|save|cost[-\s]?effective|value|budget)\b/i, trait: "value-conscious", category: "personality" },
  { pattern: /\b(fun|playful|awesome|amazing|love|exciting|delight)\b/i, trait: "playful", category: "personality" },
];

const PILLAR_KEYWORDS: Record<string, RegExp[]> = {
  "Product/Feature": [/product|feature|capability|functionality|platform|solution/i],
  "Trust/Reliability": [/trusted|secure|reliable|enterprise|proven|certified|compliant/i],
  "Innovation": [/innovative|ai|future|next-gen|cuttin.g.edge|disrupt|modern/i],
  "Simplicity": [/simple|easy|effortless|seamless|intuitive|hassle-free|quick/i],
  "Performance": [/fast|speed|scale|powerful|high.perform|optimized|efficient/i],
  "Cost/Value": [/affordable|save|cost|price|value|roi|budget|free/i],
  "Community": [/community|together|network|team|collaboration|social/i],
  "Growth": [/growth|scale|expand|reach|maximize|unlock|accelerate/i],
  "Quality": [/premium|quality|best|excellence|crafted|superior|expert/i],
  "Support": [/support|help|service|dedicated|customer.success|care/i],
};

export function analyzeBrandPositioning(crawlData: CrawlResultV2): BrandPositioning {
  const evidence: PositioningEvidence[] = [];
  const homepage = crawlData.pages.find(p => p.pageType === "homepage") || crawlData.pages[0];
  const aboutPage = crawlData.pages.find(p => p.pageType === "about");
  const pricingPage = crawlData.pages.find(p => p.pageType === "pricing");
  const productPages = crawlData.pages.filter(p => p.pageType === "product" || p.pageType === "landing-page");
  if (homepage) extractHomepageEvidence(homepage, evidence);
  if (aboutPage) extractPageEvidence(aboutPage, evidence, "about");
  for (const page of productPages.slice(0, 3)) extractPageEvidence(page, evidence, "product");
  if (pricingPage) extractTextEvidence(pricingPage, evidence, "pricing");
  const corpus = crawlData.pages.slice(0, 15).map(p => `${p.title || ""} ${p.h1Tags.join(" ")} ${p.h2Tags.join(" ")}`).join(" ");

  const industryCategory = detectIndustry(corpus);
  const businessModel = detectBusinessModel(corpus);
  const valueProposition = extractValueProposition(corpus, evidence);
  const positioningStatements = evidence.filter(e => e.type === "headline" || e.type === "value-prop").slice(0, 5).map(e => e.content);
  const targetAudience = extractTargetAudience(corpus, evidence);
  const messagingPillars = analyzeMessagingPillars(crawlData.pages);
  const brandVoice = analyzeBrandVoice(corpus);
  const contentThemes = analyzeContentThemes(crawlData.pages);
  const differentiators = extractDifferentiators(corpus, evidence);
  const claimedAdvantages = extractClaimedAdvantages(evidence);
  const primaryCallToAction = extractPrimaryCTA(homepage);
  const contentGaps = identifyContentGaps(contentThemes, crawlData);
  const confidence = calculatePositioningConfidence(evidence, crawlData);

  return {
    tagline: extractTagline(homepage),
    valueProposition,
    positioningStatements,
    targetAudience,
    industryCategory,
    businessModel: businessModel as BrandPositioning["businessModel"],
    messagingPillars,
    brandVoice,
    toneAnalysis: brandVoice.tone.join(", "),
    contentThemes,
    contentGaps,
    primaryCallToAction,
    differentiators,
    claimedAdvantages,
    evidence,
    confidence,
  };
}

function extractHomepageEvidence(page: CrawledPageV2, evidence: PositioningEvidence[]): void {
  if (page.title) evidence.push({ type: "headline", source: "Page title", content: page.title, pageUrl: page.url, confidence: 85 });
  if (page.metaDescription) evidence.push({ type: "value-prop", source: "Meta description", content: page.metaDescription, pageUrl: page.url, confidence: 75 });
  for (const h1 of page.h1Tags) evidence.push({ type: "headline", source: "H1 heading", content: h1, pageUrl: page.url, confidence: 80 });
  for (const h2 of page.h2Tags.slice(0, 6)) evidence.push({ type: "subheading", source: "H2 heading", content: h2, pageUrl: page.url, confidence: 60 });
  for (const schema of page.schemaMarkup) {
    if (schema.data?.description) evidence.push({ type: "schema", source: `${schema.type} schema`, content: String(schema.data.description), pageUrl: page.url, confidence: 90 });
  }
}

function extractPageEvidence(page: CrawledPageV2, evidence: PositioningEvidence[], pageType: string): void {
  if (page.title) evidence.push({ type: "value-prop", source: `${pageType} page title`, content: page.title, pageUrl: page.url, confidence: 75 });
  for (const h1 of page.h1Tags) evidence.push({ type: "headline", source: `${pageType} page H1`, content: h1, pageUrl: page.url, confidence: 75 });
  for (const h2 of page.h2Tags.slice(0, 5)) evidence.push({ type: "value-prop", source: `${pageType} page H2`, content: h2, pageUrl: page.url, confidence: 60 });
}

function extractTextEvidence(page: CrawledPageV2, evidence: PositioningEvidence[], pageType: string): void {
  if (page.title) evidence.push({ type: "value-prop", source: `${pageType} page title`, content: page.title, pageUrl: page.url, confidence: 70 });
}

function extractTagline(page?: CrawledPageV2): string | null {
  if (!page) return null;
  const h1 = page.h1Tags[0];
  if (h1 && h1.length < 100) return h1;
  return page.title?.split("|")[0]?.trim() || page.title?.split("\u2013")[0]?.trim() || null;
}

function detectIndustry(corpus: string): string {
  // If the corpus is a bot-block page, don't try to detect industry from it
  if (isBotBlockedPage(corpus)) return "Unable to determine — site blocked the crawler";
  const counts: Record<string, number> = {};
  for (const { pattern, category } of INDUSTRY_SIGNALS) {
    if (pattern.test(corpus)) counts[category] = (counts[category] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "General / Other";
}

function detectBusinessModel(corpus: string): string {
  if (isBotBlockedPage(corpus)) return "Unable to determine — site blocked the crawler";
  for (const { pattern, model } of BUSINESS_MODEL_PATTERNS) {
    if (pattern.test(corpus)) return model;
  }
  return "Unknown";
}

// Patterns that indicate a bot-block / anti-crawl page (not real brand content)
const BOT_BLOCK_PATTERNS = [
  /access denied/i,
  /forbidden/i,
  /unable to give you access/i,
  /blocked/i,
  /captcha/i,
  /please verify you are a human/i,
  /automated access/i,
  /rate limit/i,
  /too many requests/i,
  /webserver has detected an unusual/i,
  /enable javascript to continue/i,
  /your request has been blocked/i,
  /attention required/i,
];

function isBotBlockedPage(text: string): boolean {
  return BOT_BLOCK_PATTERNS.some(pattern => pattern.test(text));
}

function extractValueProposition(corpus: string, evidence: PositioningEvidence[]): string {
  // Check if core evidence is actually a bot-block page
  const allText = evidence.map(e => e.content).join(" ");
  if (isBotBlockedPage(allText)) {
    return "[Bot-blocked] Your site blocked the crawler with an anti-bot page. The content shown does not reflect your actual brand positioning. Deeper JS rendering may bypass this restriction.";
  }

  const texts = evidence.filter(e => e.type === "headline" || e.type === "value-prop").map(e => e.content);
  for (const text of texts) {
    for (const pattern of VALUE_PROP_PATTERNS) {
      const match = pattern.exec(text);
      if (match) { const p = match[0].trim(); if (p.length > 15 && p.length < 200) return p; }
    }
  }
  const h1 = evidence.find(e => e.type === "headline" && e.source === "H1 heading");
  const meta = evidence.find(e => e.type === "value-prop" && e.source === "Meta description");
  if (h1 && meta) return `${h1.content} \u2014 ${meta.content}`;
  return evidence[0]?.content || "Value proposition could not be confidently extracted from crawled pages.";
}

function extractTargetAudience(corpus: string, evidence: PositioningEvidence[]): string[] {
  const audiences = new Set<string>();
  const allText = [corpus, ...evidence.map(e => e.content)];    for (const text of allText) {
    for (const pattern of AUDIENCE_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) { const a = match[0].trim(); if (a.length < 150) audiences.add(a); }
    }
  }
  return Array.from(audiences).slice(0, 5);
}

function analyzeMessagingPillars(pages: CrawledPageV2[]): MessagingPillar[] {
  const pillarCounts: Record<string, { count: number; examples: string[]; pages: string[] }> = {};
  for (const page of pages.slice(0, 10)) {
    const text = `${page.title || ""} ${page.h1Tags.join(" ")} ${page.h2Tags.join(" ")}`;
    for (const [pillar, patterns] of Object.entries(PILLAR_KEYWORDS)) {
      if (!pillarCounts[pillar]) pillarCounts[pillar] = { count: 0, examples: [], pages: [] };
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          pillarCounts[pillar].count++;
          if (pillarCounts[pillar].examples.length < 3) { const m = text.match(pattern); if (m) pillarCounts[pillar].examples.push(m[0]); }
          if (!pillarCounts[pillar].pages.includes(page.url)) pillarCounts[pillar].pages.push(page.url);
          break;
        }
      }
    }
  }
  return Object.entries(pillarCounts).sort((a, b) => b[1].count - a[1].count).filter(([, d]) => d.count > 0).slice(0, 6)
    .map(([theme, data]) => ({ theme, frequency: data.count, examples: data.examples.slice(0, 3), pages: data.pages.slice(0, 3) }));
}

function analyzeBrandVoice(corpus: string): BrandVoice {
  const traits: Record<string, string[]> = { tone: [], personality: [] };
  for (const { pattern, trait, category } of BRAND_VOICE_SIGNALS) {
    if (pattern.test(corpus)) traits[category].push(trait);
  }
  const hasFormal = /\b(we\s+hereby|pursuant|notwithstanding|herein|thereof)\b/i.test(corpus);
  const hasContractions = /\b(don't|can't|won't|it's|we're|they're|you'll)\b/i.test(corpus);
  const hasInformal = /\b(gonna|wanna|awesome|cool|hey|guys)\b/i.test(corpus);
  let formality: BrandVoice["formality"] = "professional";
  if (hasFormal) formality = "formal";
  else if (hasInformal) formality = "casual";
  else if (hasContractions) formality = "conversational";
  return { formality, tone: Array.from(new Set(traits.tone)), personality: Array.from(new Set(traits.personality)) };
}

function analyzeContentThemes(pages: CrawledPageV2[]): ContentTheme[] {
  const themeMap = new Map<string, { urls: string[] }>();
  for (const page of pages) {
    const url = page.url.toLowerCase();
    let theme = "General";
    if (/\/(blog|article|post|news)\//.test(url)) theme = "Blog/Content";
    else if (/\/(product|shop|store|item)\//.test(url)) theme = "Products";
    else if (/pricing|plans?/.test(url)) theme = "Pricing";
    else if (/about|team|company/.test(url)) theme = "About/Brand";
    else if (/contact|support|help|faq/.test(url)) theme = "Support";
    else if (/case.study|testimonial|review/.test(url)) theme = "Social Proof";
    else if (/resources?|guide|whitepaper|ebook/.test(url)) theme = "Resources";
    else if (/career|job|join/.test(url)) theme = "Careers";
    else if (/legal|privacy|terms/.test(url)) theme = "Legal";
    if (!themeMap.has(theme)) themeMap.set(theme, { urls: [] });
    themeMap.get(theme)!.urls.push(page.url);
  }
  const total = pages.length;
  return Array.from(themeMap.entries()).map(([topic, data]) => ({
    topic, strength: (data.urls.length / total >= 0.2 ? "strong" : data.urls.length / total >= 0.05 ? "moderate" : "weak") as "strong" | "moderate" | "weak",
    pageCount: data.urls.length, representativeUrls: data.urls.slice(0, 3),
  })).sort((a, b) => b.pageCount - a.pageCount);
}

function identifyContentGaps(themes: ContentTheme[], crawlData?: CrawlResultV2): string[] {
  const gaps: string[] = [];
  const existing = themes.map(t => t.topic.toLowerCase());

  // Check pagesByType for blog/content pages before claiming missing
  const hasBlogPages = crawlData && (
    (crawlData.pagesByType["blog-post"] || []).length > 0 ||
    (crawlData.pagesByType["blog-listing"] || []).length > 0
  );

  if (!existing.some(t => t.includes("case.study") || t.includes("testimonial") || t.includes("social proof")))
    gaps.push("No dedicated case studies or testimonials section detected \u2014 critical for trust and social proof");
  if (!existing.some(t => t.includes("resource") || t.includes("guide")))
    gaps.push("No resources or guides section \u2014 missed lead-gen opportunity through gated content");

  // Only report blog as missing if BOTH theme analysis AND page type classification agree
  if (hasBlogPages) {
    // Blog pages exist in classification — don't report as missing
  } else if (!existing.some(t => t.includes("blog") || t.includes("content"))) {
    gaps.push("No blog/content section detected \u2014 missing SEO-driven organic traffic channel");
  }

  return gaps;
}

function extractDifferentiators(corpus: string, evidence: PositioningEvidence[]): string[] {
  const items = new Set<string>();
  const allText = [corpus, ...evidence.map(e => e.content)];      for (const text of allText) {
    for (const pattern of DIFFERENTIATOR_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) { const m = match[0].trim(); if (m.length < 200) items.add(m); }
    }
  }
  return Array.from(items).slice(0, 5);
}

function extractClaimedAdvantages(evidence: PositioningEvidence[]): string[] {
  const items = new Set<string>();
  const patterns = [/(?:faster|cheaper|easier|better|simpler|more\s+\w+)\s+than\b.{10,100}/gi, /(?:unlike|vs\.?|versus)\b.{10,120}/gi, /(?:the\s+(?:only|first))\b.{10,100}/gi];
  for (const e of evidence) {
    for (const pattern of patterns) {
      const matches = Array.from(e.content.matchAll(pattern));
      for (const match of matches) { const m = match[0].trim(); if (m.length < 200) items.add(m); }
    }
  }
  return Array.from(items).slice(0, 5);
}

function extractPrimaryCTA(page?: CrawledPageV2): string | null {
  if (!page) return null;
  const patterns = [/(?:get\s+started|sign\s+up|try\s+free|book\s+a\s+demo|request|contact|buy\s+now|start\s+free)/i, /(?:schedule|talk\s+to\s+sales|learn\s+more|see\s+pricing)/i];
  for (const h2 of page.h2Tags) { for (const pattern of patterns) { if (pattern.test(h2)) return h2; } }
  return null;
}

function calculatePositioningConfidence(evidence: PositioningEvidence[], crawlData: CrawlResultV2): number {
  let score = evidence.length >= 8 ? 90 : evidence.length >= 5 ? 75 : evidence.length >= 3 ? 55 : 35;
  if (crawlData.overallConfidence.level === "low" || crawlData.overallConfidence.level === "very-low") score -= 15;
  if (crawlData.pages.some(p => p.pageType === "homepage") && crawlData.pages.some(p => p.pageType === "about")) score += 10;
  return Math.max(0, Math.min(100, score));
}

