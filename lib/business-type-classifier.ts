/**
 * Business Type Classifier
 *
 * Framework-level classification of a website's business type from crawl data.
 * Determines business type, industry, and expected content assets per type.
 * Everything else (content gaps, recommendations, brand consistency) depends
 * on getting the business type right.
 */

import type { CrawlResultV2 } from "./crawler-v2";

export type BusinessType =
  | "b2b-saas"
  | "b2b-services"
  | "ecommerce"
  | "d2c-brand"
  | "marketplace"
  | "media-publishing"
  | "local-business"
  | "education-edtech"
  | "healthcare-wellness"
  | "nonprofit"
  | "enterprise-b2b"
  | "unknown";

export type IndustryCategory =
  | "saas-software"
  | "ecommerce-retail"
  | "fintech-finance"
  | "healthcare-wellness"
  | "education-edtech"
  | "marketing-advertising"
  | "hr-talent"
  | "real-estate"
  | "logistics-supply-chain"
  | "travel-hospitality"
  | "food-restaurant"
  | "fashion-beauty"
  | "legal-compliance"
  | "manufacturing"
  | "consulting-professional-services"
  | "media-entertainment"
  | "nonprofit"
  | "other";

export interface ExpectedContentAsset {
  asset: string;
  importance: "critical" | "high" | "medium" | "low";
  description: string;
}

export interface BusinessClassification {
  businessType: BusinessType;
  industryCategory: IndustryCategory;
  confidence: number;
  evidence: string[];
  expectedContentAssets: ExpectedContentAsset[];
  contentGapThreshold: number;
}

export interface ScopedContentGap {
  gap: string;
  asset: string;
  importance: string;
  isGap: boolean;
  evidence: string[];
}

const BUSINESS_TYPE_SIGNALS: Array<{ type: BusinessType; weight: number; patterns: RegExp[] }> = [
  {
    type: "b2b-saas", weight: 10,
    patterns: [
      /pricing|plans?|enterprise|teams?|dashboard|api|integration|workflow|automation/i,
      /sign\s*up|get\s+started|book\s+(a\s+)?demo|request\s+a\s+demo|try\s+free|start\s+free/i,
      /software\s+(as\s+)?a\s+service|saas|cloud\s+(platform|solution)/i,
      /for\s+(teams?|businesses?|companies?|enterprise|organizations?)/i,
    ],
  },
  {
    type: "b2b-services", weight: 8,
    patterns: [
      /consulting|consultancy|advisory|agency|services/i,
      /our\s+(clients?|partners?|customers?)|case\s+stud(y|ies)/i,
      /portfolio|our\s+work|projects?|solutions/i,
      /contact\s+us|get\s+in\s+touch|schedule\s+a\s+call/i,
    ],
  },
  {
    type: "ecommerce", weight: 10,
    patterns: [
      /shop|store|cart|checkout|add\s+to\s+cart|buy\s+now|products?|catalog/i,
      /shipping|delivery|returns?|order\s+status|track\s+(your\s+)?order/i,
      /size\s+guide|fit\s+guide|review|rating/i,
      /categories?|collections?|new\s+arrivals|sale|discount|off/i,
    ],
  },
  {
    type: "d2c-brand", weight: 8,
    patterns: [
      /shop\s+our|our\s+(products?|collection|story)/i,
      /direct\s+to\s+consumer|d2c|direct-to-consumer/i,
      /about\s+us|our\s+story|our\s+mission|crafted|designed\s+(by|in)/i,
      /sustainable|ethically|handmade|small\s+batch/i,
    ],
  },
  {
    type: "marketplace", weight: 9,
    patterns: [
      /marketplace|buy\s+and\s+sell|list\s+(your\s+)?(product|item)|sell\s+(on|your)/i,
      /vendor|seller|merchant|partner\s+program/i,
      /browse|categories?|compare|find\s+(your\s+)?(match|deal)/i,
      /community|trust\s+and\s+safety|buyer\s+protection/i,
    ],
  },
  {
    type: "media-publishing", weight: 8,
    patterns: [
      /subscribe|newsletter|latest\s+news|articles?|blog|magazine|journal/i,
      /advertise|sponsored|media\s+kit|press|publication/i,
      /opinion|editorial|contributors?|writers?|column/i,
      /trending|popular|most\s+read|daily|weekly|today/i,
    ],
  },
  {
    type: "local-business", weight: 9,
    patterns: [
      /locations?|find\s+(a\s+)?(store|location)|near\s+you|visit\s+us/i,
      /book\s+(now|an?\s+appointment|online)|reservation|schedule/i,
      /google\s+maps|directions|our\s+address|hours|open\s+(today|now)/i,
      /serving|based\s+in|local|community/i,
    ],
  },
  {
    type: "education-edtech", weight: 8,
    patterns: [
      /courses?|learning|academy|training|program|curriculum|lesson/i,
      /enroll|register|certification|degree|diploma|classroom/i,
      /students?|teachers?|instructors?|educators?|learners?/i,
      /school|university|college|institute|education/i,
    ],
  },
  {
    type: "healthcare-wellness", weight: 8,
    patterns: [
      /health|medical|wellness|fitness|clinic|hospital|doctor|patient/i,
      /symptoms?|treatment|therapy|diagnosis|prescription|insurance/i,
      /appointment|telehealth|telemedicine|consultation/i,
      /nutrition|workout|exercise|mental\s+health|self.care/i,
    ],
  },
  {
    type: "nonprofit", weight: 7,
    patterns: [
      /donate|donation|non.profit|501\(c\)|charity|foundation/i,
      /volunteer|fundraise|cause|mission|impact|change/i,
      /about\s+us|our\s+mission|what\s+we\s+do|get\s+involved/i,
    ],
  },
  {
    type: "enterprise-b2b", weight: 7,
    patterns: [
      /enterprise|fortune|global\s+\d+|multinational|conglomerate/i,
      /industries?|solutions\s+for|sectors?|verticals?/i,
      /investors?|corporate|governance|board|leadership/i,
    ],
  },
];

const INDUSTRY_SIGNALS: Array<{ category: IndustryCategory; patterns: RegExp[] }> = [
  { category: "saas-software", patterns: [/\b(saas|software|platform|api|cloud|app)\b/i, /\b(integration|workflow|automation|deploy|hosting)\b/i] },
  { category: "ecommerce-retail", patterns: [/\b(ecommerce|retail|shop|store|product|d2c|wholesale)\b/i, /\b(shipping|delivery|returns?|cart|checkout)\b/i] },
  { category: "fintech-finance", patterns: [/\b(fintech|finance|banking|payments?|insurance|investing)\b/i, /\b(loan|mortgage|credit|crypto|blockchain|wealth)\b/i] },
  { category: "healthcare-wellness", patterns: [/\b(healthcare|health|medical|wellness|fitness|clinic|hospital)\b/i, /\b(doctor|patient|therapy|treatment|nutrition)\b/i] },
  { category: "education-edtech", patterns: [/\b(education|edtech|learning|course|training|academy|school)\b/i, /\b(student|teacher|lesson|curriculum|certification)\b/i] },
  { category: "marketing-advertising", patterns: [/\b(marketing|advertising|media|pr|branding|seo|growth)\b/i, /\b(agency|campaign|analytics|conversion|funnel|lead)\b/i] },
  { category: "hr-talent", patterns: [/\b(hr|hiring|recruiting|talent|workforce|people|culture)\b/i, /\b(job|candidate|resume|interview|onboarding)\b/i] },
  { category: "real-estate", patterns: [/\b(real\s*estate|property|housing|rental|mortgage|apartment)\b/i, /\b(agent|broker|listing|closing|neighborhood)\b/i] },
  { category: "logistics-supply-chain", patterns: [/\b(logistics|supply\s*chain|shipping|delivery|fulfillment|warehouse)\b/i, /\b(courier|freight|cargo|inventory|procurement)\b/i] },
  { category: "travel-hospitality", patterns: [/\b(travel|hospitality|hotel|tourism|booking|vacation|flight)\b/i, /\b(resort|cruise|destination|itinerary|lodging)\b/i] },
  { category: "food-restaurant", patterns: [/\b(food|restaurant|meal|kitchen|grocery|recipe|catering)\b/i, /\b(menu|delivery|takeout|cafe|bakery|dining)\b/i] },
  { category: "fashion-beauty", patterns: [/\b(fashion|beauty|cosmetic|apparel|clothing|accessory|jewelry)\b/i, /\b(makeup|skincare|haircare|perfume|footwear)\b/i] },
  { category: "legal-compliance", patterns: [/\b(legal|law|attorney|compliance|regulatory|patent|trademark)\b/i, /\b(lawyer|court|litigation|contract|estate|copyright)\b/i] },
  { category: "manufacturing", patterns: [/\b(manufacturing|industrial|factory|production|assembly|fabrication)\b/i, /\b(oem|machinery|equipment|supply.chain|quality.control)\b/i] },
  { category: "consulting-professional-services", patterns: [/\b(consulting|consultancy|advisory|strategy)\b/i, /\b(professional.services|expertise|thought.leadership|insights)\b/i] },
  { category: "media-entertainment", patterns: [/\b(media|entertainment|streaming|gaming|music|film|video)\b/i, /\b(content|creator|influencer|audience|channel|podcast)\b/i] },
  { category: "nonprofit", patterns: [/\b(charity|nonprofit|foundation|volunteer|donation|cause)\b/i, /\b(community\s+service|social\s+impact|grant|fundraising)\b/i] },
];

const EXPECTED_ASSETS: Record<BusinessType, ExpectedContentAsset[]> = {
  "b2b-saas": [
    { asset: "case studies", importance: "critical", description: "Show proof of ROI with real customer outcomes" },
    { asset: "pricing page", importance: "critical", description: "Transparent pricing to qualify leads" },
    { asset: "product documentation", importance: "high", description: "API docs, integration guides, knowledge base" },
    { asset: "blog / resources", importance: "high", description: "SEO-driven educational content for top-of-funnel" },
    { asset: "testimonials / reviews", importance: "high", description: "Social proof from existing customers" },
    { asset: "demo / free trial", importance: "critical", description: "Interactive product demo or free trial signup" },
    { asset: "comparison pages", importance: "medium", description: "Brand vs competitor comparison" },
    { asset: "webinars / events", importance: "medium", description: "Live or on-demand product demos" },
    { asset: "ROI calculator", importance: "low", description: "Interactive tool to quantify value for prospects" },
  ],
  "b2b-services": [
    { asset: "case studies", importance: "critical", description: "Proven outcomes from client engagements" },
    { asset: "testimonials / reviews", importance: "critical", description: "Client references and social proof" },
    { asset: "portfolio / work samples", importance: "critical", description: "Previous work examples and client logos" },
    { asset: "about / team page", importance: "high", description: "Team expertise and company credentials" },
    { asset: "services page", importance: "critical", description: "Detailed service offerings and process" },
    { asset: "blog / insights", importance: "high", description: "Thought leadership and industry expertise" },
    { asset: "whitepapers / reports", importance: "medium", description: "In-depth industry research and analysis" },
  ],
  ecommerce: [
    { asset: "product reviews", importance: "critical", description: "Customer reviews and star ratings on products" },
    { asset: "product guides / size guides", importance: "high", description: "Help customers choose the right product" },
    { asset: "UGC / customer photos", importance: "high", description: "User-generated content showing real usage" },
    { asset: "shipping / returns policy", importance: "critical", description: "Clear policy to reduce purchase friction" },
    { asset: "FAQ", importance: "high", description: "Answer common pre-purchase questions" },
    { asset: "gift guides", importance: "medium", description: "Curated product collections for occasions" },
    { asset: "loyalty / rewards program", importance: "medium", description: "Customer retention program" },
  ],
  "d2c-brand": [
    { asset: "about / brand story", importance: "critical", description: "Brand mission, story, and values" },
    { asset: "product reviews", importance: "critical", description: "Customer social proof and testimonials" },
    { asset: "shipping / returns policy", importance: "critical", description: "Clear policy to build purchase confidence" },
    { asset: "UGC / customer content", importance: "high", description: "Real customers using products on social media" },
    { asset: "sustainability / ethics page", importance: "high", description: "Transparency about sourcing and practices" },
    { asset: "FAQ", importance: "high", description: "Answer common questions directly" },
    { asset: "lookbook / catalog", importance: "medium", description: "Visual product showcase and inspiration" },
  ],
  marketplace: [
    { asset: "seller / vendor info", importance: "critical", description: "How to sell on the marketplace" },
    { asset: "reviews / ratings", importance: "critical", description: "Trust signals for both buyers and sellers" },
    { asset: "FAQ", importance: "high", description: "Answers for common buyer and seller questions" },
    { asset: "buyer protection / trust", importance: "critical", description: "Security guarantees and dispute resolution" },
    { asset: "category browse", importance: "high", description: "Easy navigation and product discovery" },
  ],
  "media-publishing": [
    { asset: "newsletter signup", importance: "critical", description: "Email capture for audience retention" },
    { asset: "subscription / membership", importance: "high", description: "Paid tiers or premium content access" },
    { asset: "advertise / media kit", importance: "high", description: "Advertising opportunities and rates" },
    { asset: "categories / topics", importance: "high", description: "Content organization and browse" },
    { asset: "search", importance: "high", description: "Site search for content discovery" },
  ],
  "local-business": [
    { asset: "location / hours", importance: "critical", description: "Physical address, map, and business hours" },
    { asset: "contact page", importance: "critical", description: "Phone, email, and contact form" },
    { asset: "reviews / testimonials", importance: "critical", description: "Google Reviews or customer testimonials" },
    { asset: "FAQ", importance: "high", description: "Common questions about services and policies" },
    { asset: "services / menu", importance: "critical", description: "What you offer and pricing" },
    { asset: "booking / appointment", importance: "high", description: "Online scheduling for appointments" },
  ],
  "education-edtech": [
    { asset: "courses / curriculum", importance: "critical", description: "Course catalog and learning paths" },
    { asset: "pricing page", importance: "critical", description: "Tuition, plans, or subscription pricing" },
    { asset: "testimonials / reviews", importance: "high", description: "Student outcomes and success stories" },
    { asset: "FAQ", importance: "high", description: "Admissions, format, and technical FAQs" },
    { asset: "free trial / sample", importance: "medium", description: "Try before committing" },
    { asset: "accreditation / credentials", importance: "high", description: "Certification or degrees offered" },
  ],
  "healthcare-wellness": [
    { asset: "services / treatments", importance: "critical", description: "Detailed service and treatment descriptions" },
    { asset: "about / provider team", importance: "critical", description: "Provider credentials and experience" },
    { asset: "book appointment", importance: "critical", description: "Online scheduling for consultations" },
    { asset: "FAQ", importance: "high", description: "Health concerns, insurance, and visit FAQs" },
    { asset: "blog / health guides", importance: "high", description: "Educational health content for SEO and trust" },
    { asset: "insurance / pricing", importance: "high", description: "Accepted insurance and payment options" },
    { asset: "location / hours", importance: "critical", description: "Clinic locations, maps, and hours" },
  ],
  nonprofit: [
    { asset: "donation page", importance: "critical", description: "Secure donation processing and options" },
    { asset: "about / mission", importance: "critical", description: "Cause, impact, and organizational mission" },
    { asset: "impact reports", importance: "high", description: "Transparent reporting on outcomes and spending" },
    { asset: "volunteer info", importance: "high", description: "How to get involved and volunteer" },
    { asset: "blog / stories", importance: "high", description: "Impact stories and beneficiary narratives" },
    { asset: "newsletter signup", importance: "medium", description: "Stay connected with supporters" },
  ],
  "enterprise-b2b": [
    { asset: "case studies", importance: "critical", description: "Enterprise-grade proof of ROI and scale" },
    { asset: "industries / verticals", importance: "critical", description: "Industry-specific solutions and expertise" },
    { asset: "partners / integrations", importance: "high", description: "Ecosystem and technology partnerships" },
    { asset: "resources / insights", importance: "high", description: "Research reports, whitepapers, thought leadership" },
    { asset: "contact / sales", importance: "critical", description: "Sales inquiry and enterprise contact" },
  ],
  unknown: [
    { asset: "about page", importance: "high", description: "Company information and background" },
    { asset: "contact page", importance: "high", description: "Contact information and inquiry form" },
    { asset: "FAQ", importance: "medium", description: "Common questions about products or services" },
  ],
};

const CONTENT_GAP_THRESHOLDS: Record<BusinessType, number> = {
  "b2b-saas": 0.55, "b2b-services": 0.50, ecommerce: 0.60, "d2c-brand": 0.50,
  marketplace: 0.60, "media-publishing": 0.50, "local-business": 0.55,
  "education-edtech": 0.50, "healthcare-wellness": 0.50, nonprofit: 0.45,
  "enterprise-b2b": 0.55, unknown: 0.30,
};
export function classifyBusinessType(crawlData: CrawlResultV2): BusinessClassification {
  const corpus = buildClassificationCorpus(crawlData);
  const evidence: string[] = [];
  const typeScores = new Map<BusinessType, number>();

  for (const signal of BUSINESS_TYPE_SIGNALS) {
    let score = 0;
    for (const pattern of signal.patterns) {
      score += (corpus.match(pattern) || []).length * signal.weight;
    }
    if (score > 0) {
      typeScores.set(signal.type, score);
      evidence.push(`${signal.type}: score ${score}`);
    }
  }

  const sorted = Array.from(typeScores.entries()).sort((a, b) => b[1] - a[1]);
  const businessType: BusinessType = sorted[0]?.[0] || "unknown";
  const topScore = sorted[0]?.[1] || 0;
  const secondScore = sorted[1]?.[1] || 0;
  const marginRatio = topScore > 0 ? (topScore - secondScore) / topScore : 0;
  const confidence = Math.min(100, Math.round(50 + marginRatio * 50));
  const industryCategory = detectIndustryFromCorpus(corpus);

  evidence.push(`classified as: ${businessType} (confidence ${confidence}%)`);
  return {
    businessType, industryCategory, confidence, evidence,
    expectedContentAssets: EXPECTED_ASSETS[businessType],
    contentGapThreshold: CONTENT_GAP_THRESHOLDS[businessType],
  };
}

export function detectIndustryFromCorpus(corpus: string): IndustryCategory {
  const scores = new Map<IndustryCategory, number>();
  for (const { category, patterns } of INDUSTRY_SIGNALS) {
    let score = 0;
    for (const pattern of patterns) {
      score += (corpus.match(pattern) || []).length * 3;
    }
    if (score > 0) scores.set(category, score);
  }
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";
}

export function detectContentGapsByBusinessType(
  crawlData: CrawlResultV2,
  classification: BusinessClassification
): ScopedContentGap[] {
  const gaps: ScopedContentGap[] = [];
  const urls = crawlData.pages.map((p) => p.url.toLowerCase());
  const titles = crawlData.pages.map((p) => (p.title || "").toLowerCase());
  const h1s = crawlData.pages.flatMap((p) => p.h1Tags.map((h) => h.toLowerCase()));
  const allText = [...urls, ...titles, ...h1s].join(" ");

  for (const asset of classification.expectedContentAssets) {
    const result = checkContentGap(asset.asset, allText, urls, crawlData);
    gaps.push({
      gap: `No ${asset.asset} section detected — ${asset.description}`,
      asset: asset.asset, importance: asset.importance,
      isGap: result.isGap, evidence: result.evidence,
    });
  }
  return gaps;
}

function checkContentGap(assetKey: string, allText: string, urls: string[], crawlData: CrawlResultV2): { isGap: boolean; evidence: string[] } {
  const evidence: string[] = [];
  const patterns = buildPatterns(assetKey);
  for (const pattern of patterns) {
    const foundInUrl = urls.some((u) => pattern.test(u));
    if (foundInUrl) {
      evidence.push(`found in URL: ${urls.find((u) => pattern.test(u))}`);
      return { isGap: false, evidence };
    }
    if (pattern.test(allText)) {
      evidence.push("found in page text");
      return { isGap: false, evidence };
    }
  }
  evidence.push("no matching URL, title, or classification found");
  return { isGap: true, evidence };
}

function buildPatterns(assetKey: string): RegExp[] {
  const patterns: RegExp[] = [];
  if (assetKey.includes("case stud")) patterns.push(/case.stud(y|ies)/i, /success.stor(y|ies)/i);
  else if (assetKey.includes("review") || assetKey.includes("testimonial")) patterns.push(/testimonial/i, /review/i, /rating/i);
  else if (assetKey.includes("pricing")) patterns.push(/pricing/i, /plans?/i);
  else if (assetKey.includes("demo") || assetKey.includes("free trial")) patterns.push(/demo/i, /free.trial/i);
  else if (assetKey.includes("blog") || assetKey.includes("resource")) patterns.push(/blog/i, /resources?/i, /insights?/i, /news/i);
  else if (assetKey.includes("faq")) patterns.push(/faq/i, /frequently.asked/i);
  else if (assetKey.includes("about")) patterns.push(/about/i, /our.story/i, /mission/i);
  else if (assetKey.includes("contact")) patterns.push(/contact/i, /get.in.touch/i);
  else if (assetKey.includes("shipping") || assetKey.includes("return")) patterns.push(/shipping/i, /returns?/i);
  else if (assetKey.includes("size guide") || assetKey.includes("product guide")) patterns.push(/size.guide/i, /fit.guide/i, /buying.guide/i);
  else if (assetKey.includes("UGC") || assetKey.includes("customer photo")) patterns.push(/ugc/i, /customer.photo/i, /community/i);
  else if (assetKey.includes("portfolio")) patterns.push(/portfolio/i, /our.work/i, /case.stud/i);
  else if (assetKey.includes("location") || assetKey.includes("hours")) patterns.push(/locations?/i, /hours/i, /visit.us/i);
  else if (assetKey.includes("booking") || assetKey.includes("appointment")) patterns.push(/book/i, /appointment/i, /schedule/i);
  else if (assetKey.includes("documentation")) patterns.push(/docs/i, /documentation/i, /api/i);
  else if (assetKey.includes("comparison")) patterns.push(/vs\./i, /comparison/i, /alternative/i);
  else if (assetKey.includes("whitepaper") || assetKey.includes("report")) patterns.push(/whitepaper/i, /research/i, /report/i);
  else if (assetKey.includes("newsletter")) patterns.push(/newsletter/i, /subscribe/i);
  else if (assetKey.includes("career")) patterns.push(/career/i, /job/i, /join/i);
  else if (assetKey.includes("sustainability") || assetKey.includes("ethic")) patterns.push(/sustainable/i, /ethic/i, /eco/i);
  if (patterns.length === 0) {
    const words = assetKey.split(/[\s/]+/).filter((w) => w.length > 3);
    for (const word of words) patterns.push(new RegExp("[.*+?^${}()|[\\\\]\\\\]", "g"));
  }
  return patterns;
}

function buildClassificationCorpus(crawlData: CrawlResultV2): string {
  const parts: string[] = [];
  for (const page of crawlData.pages.slice(0, 15)) {
    parts.push(page.title || "", page.metaDescription || "", ...page.h1Tags.slice(0, 3), ...page.h2Tags.slice(0, 5), page.url);
  }
  return parts.join(" ");
}
