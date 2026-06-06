/**
 * Lightweight public web research helpers.
 *
 * These helpers intentionally avoid paid APIs so audits can still enrich brand,
 * competitor, and social context in development. If search engines block the
 * request, callers fall back to crawl-only evidence instead of fabricating data.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface SocialProfile {
  platform: string;
  url: string;
  source: "website" | "search" | "direct";
  confidence: number;
  username?: string;
  metrics?: SocialProfileMetrics;
}

export interface SocialPost {
  id?: string;
  url?: string;
  text?: string;
  type?: string;
  createdAt?: string;
  likes?: number;
  comments?: number;
  views?: number;
  shares?: number;
  replies?: number;
  hashtags?: string[];
}

export interface SocialProfileMetrics {
  followers?: number;
  following?: number;
  posts?: number;
  recentPosts?: number;
  avgEngagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  verified?: boolean;
  bio?: string;
  sampledPosts?: SocialPost[];
  dataSource: "apify" | "web-scrape";
}

// ---------------------------------------------------------------------------
// EXCLUDED ROOT DOMAINS — checked against the root domain of any candidate
// (last two parts, e.g. "marketo.net" from "munchkin.marketo.net").
// This is the primary filter and handles subdomains correctly.
// Keep entries as "second-level.tld" — NO leading dot needed.
// ---------------------------------------------------------------------------
const EXCLUDED_ROOT_DOMAINS = new Set([
  // Search engines
  "google.com", "google.co.in", "google.co.uk", "google.de", "google.fr",
  "bing.com", "duckduckgo.com", "yahoo.com", "yimg.com",   // yimg = Yahoo image CDN
  // Reference
  "wikipedia.org", "wikimedia.org",
  // Social networks
  "linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "pinterest.com", "snapchat.com",
  "reddit.com", "quora.com", "medium.com", "substack.com",
  // Ad networks & tracking — ROOT CAUSE of munchkin.marketo.net, td.doubleclick.net etc.
  "doubleclick.net",        // Google ad network (td.doubleclick.net, ad.doubleclick.net)
  "marketo.net",            // Marketo marketing automation (munchkin.marketo.net)
  "adxcel-ec2.com",         // Ad exchange infra
  "adnxs.com",              // AppNexus / Xandr ads
  "googlesyndication.com",  // Google AdSense
  "googleadservices.com",
  "moatads.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "casalemedia.com",
  "adsrvr.org",             // The Trade Desk
  "criteo.com",             // Criteo retargeting
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "sharethrough.com",
  "scorecardresearch.com",
  "rlcdn.com",
  "bluekai.com",
  "demdex.net",             // Adobe Audience Manager
  "omtrdc.net",             // Adobe Analytics
  "mktoresp.com",           // Marketo
  "pardot.com",             // Salesforce marketing
  "hubspot.com",            // HubSpot (marketing platform, not a product competitor)
  "hubspotlinks.com",
  "intercom.io",            // Customer messaging platform
  "zendesk.com",            // Support platform
  "salesforce.com",
  "eloqua.com",
  // SEO / analytics tools
  "crunchbase.com", "similarweb.com", "semrush.com", "ahrefs.com",
  "moz.com", "spyfu.com", "serpstat.com",
  // Review & comparison aggregators
  "g2.com", "capterra.com", "getapp.com", "trustradius.com", "trustpilot.com",
  "glassdoor.com", "comparably.com", "clutch.co", "goodfirms.co",
  "appadvice.com", "slant.co", "alternativeto.net", "producthunt.com",
  "stackshare.io", "sourceforge.net", "softwaresuggest.com", "softwaresuggest.co.uk",
  "softwaresuggest.co.in",
  // Company intelligence
  "craft.co", "owler.com", "cbinsights.com", "6sense.com",
  "companiesmarketcap.com", "growthnavigate.com", "businessmodelanalyst.com",
  // Job boards
  "indeed.com", "naukri.com", "monster.com", "shine.com",
  // News / media
  "bloomberg.com", "forbes.com", "reuters.com", "techcrunch.com",
  "techradar.com", "businessinsider.com", "theverge.com", "wired.com",
  "inc.com", "entrepreneur.com", "statista.com", "investopedia.com",
  "statista.com", "investopedia.com",
  "marketing91.com", "pcmag.com", "cnet.com", "zdnet.com",
  "livemint.com", "economictimes.com", "moneycontrol.com", "yourstory.com",
  "inc42.com", "entrackr.com",   // Indian startup media — not competitors
  // Business analysis / intelligence platforms — write ABOUT companies, not competitors
  "latterly.org",                    // Business analysis site (latterly.org)
  "businessengineer.ai",             // Business/AI analysis
  "consainsights.com",               // Consumer insights / analysis
  "fourweekmba.com",                 // Business model analysis (fourweekmba)
  "businessmodelanalyst.com",        // Already in list (duplicate catch)
  "craft.co",                        // Already in list
  "owler.com",                       // Already in list
  // Multi-tenant blog subdomain hosts — not brand domains
  "booker.co",                       // Subdomain host for business analysis (fourweekmba.booker.co)
  // Consent / cookie management
  "cookiehub.com", "cookiebot.com", "onetrust.com", "iubenda.com",
  // Web standards
  "gmpg.org", "w3.org", "schema.org",
  // CMS / website builders
  "wordpress.org", "wixstatic.com", "parastorage.com",
  "squarespace.com", "webflow.io",
  // E-commerce platforms (infrastructure, not competitors)
  "shopify.com", "woocommerce.com", "magento.com",
  // CDN / cloud infra
  "cloudfront.net", "cloudflare.com", "fastly.net", "akamaized.net",
  "akamai.net", "edgecastcdn.net", "azureedge.net",
  // Analytics / tag managers
  "googletagmanager.com", "google-analytics.com", "googleapis.com",
  "gstatic.com", "segment.com", "mixpanel.com", "amplitude.com",
  "hotjar.com", "fullstory.com", "heap.io",
  // Payment processors
  "stripe.com", "razorpay.com", "payu.in", "payumoney.com", "ccavenue.com",
  // Misc infra
  "gravatar.com", "facebook.net", "ycombinator.com",
  "appspot.com", "amazonaws.com", "azurewebsites.net",
]);

export function getBrandNameFromDomain(domain: string): string {
  const clean = normalizeDomain(domain);
  const parts = clean.split(".");
  const label = parts.length > 2 && parts[0] === "www" ? parts[1] : parts[0];
  return label
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeDomain(input: string): string {
  try {
    const withProtocol = input.startsWith("http") ? input : `https://${input}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

export async function searchWeb(query: string, maxResults = 10): Promise<WebSearchResult[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    }, 8000);

    if (!response.ok) return [];
    const html = await response.text();
    return parseDuckDuckGoResults(html).slice(0, maxResults);
  } catch {
    return [];
  }
}

export async function discoverCompetitorDomains(
  domain: string,
  contextTerms: string[] = []
): Promise<string[]> {
  const brand = getBrandNameFromDomain(domain);
  const ownDomain = normalizeDomain(domain);
  const queries = [
    `${brand} competitors alternatives`,
    `${brand} similar brands competitors`,
    `${brand} vs competitors`,
    contextTerms.length > 0 ? `${brand} ${contextTerms.slice(0, 4).join(" ")} competitors` : "",
  ].filter(Boolean);

  const counts = new Map<string, number>();
  const researchCorpus: string[] = [];
  const searchEvidence: string[] = [];

  for (const query of queries) {
    const results = await searchWeb(query, 8);
    for (const result of results) {
      searchEvidence.push(`${result.title} | ${result.url} | ${result.snippet}`);
      const candidate = normalizeDomain(result.domain);
      if (!isLikelyCompetitorDomain(candidate, ownDomain)) continue;
      counts.set(candidate, (counts.get(candidate) || 0) + 1);
    }

    const researchPages = results.filter((result) =>
      /competitors|alternatives|similar| vs /i.test(`${result.title} ${result.url}`)
    ).slice(0, 3);

    for (const page of researchPages) {
      const html = await fetchHtml(page.url);
      if (!html) continue;
      researchCorpus.push(stripHtml(html).slice(0, 6000));

      // Skip linked-domain extraction if the research page itself is NOT a brand domain.
      // Business analysis/review sites (latterly.org, fourweekmba, etc.) link to each
      // other within their content ecosystem, not to actual competitors.
      const pageDomain = normalizeDomain(page.domain);
      if (isLikelyCompetitorDomain(pageDomain, ownDomain)) {
        const linkedDomains = extractLinkedDomains(html)
          .filter((candidate) => candidate !== pageDomain)
          .filter((candidate) => isLikelyCompetitorDomain(candidate, ownDomain));

        for (const linkedDomain of linkedDomains) {
          counts.set(linkedDomain, (counts.get(linkedDomain) || 0) + 2);
        }
      }
    }
  }

  const modelExtractedDomains = await extractCompetitorDomainsWithAI(
    brand,
    ownDomain,
    [...searchEvidence, ...researchCorpus].join("\n\n"),
    contextTerms
  );

  for (const modelDomain of modelExtractedDomains.slice(0, 8)) {
    if (isLikelyCompetitorDomain(modelDomain, ownDomain)) {
      counts.set(modelDomain, (counts.get(modelDomain) || 0) + 6);
    }
  }

  // ── BRAND VERIFICATION ────────────────────────────────────────
  // Generic post-hoc defense: fetch the homepage <title> of each top candidate
  // and check if it reads like a content/analysis site (not a brand site).
  // This catches any content site that slipped through SLD patterns.
  const topCandidates = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const verified = await verifyBrandDomains(
    topCandidates.map(([domain]) => domain),
    brand
  );

  // Reduce weight for candidates flagged as content sites
  for (const { domain, isBrand } of verified) {
    if (!isBrand && counts.has(domain)) {
      counts.set(domain, Math.min(counts.get(domain)!, 3)); // cap to force below active search results
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([candidate]) => candidate)
    .slice(0, 5);
}

// ---------------------------------------------------------------------------
// FIX: Strengthened AI competitor extraction prompt.
// The old prompt was too permissive — it said "not article sites" but didn't
// explicitly exclude review aggregators, comparison platforms, or data tools,
// which is exactly what was leaking through (softwaresuggest, craft.co, etc).
// The new prompt adds hard exclusion categories and a "switchability" test:
// "would a customer choose this brand INSTEAD of the audited brand?"
// ---------------------------------------------------------------------------
async function extractCompetitorDomainsWithAI(
  brand: string,
  ownDomain: string,
  corpus: string,
  contextTerms: string[] = []
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [];

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const context = contextTerms.slice(0, 20).join(", ") || "not available";
    const researchText = corpus.trim() || "No external search evidence was available.";

    const result = await client.chat.completions.create({
      model: process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_CMO_MODEL || "gpt-4-turbo",
      messages: [
        {
          role: "user",          content: `
You are a market research analyst specializing in competitive analysis. Identify the TOP 5 DIRECT COMPETITORS for the brand below.

Brand: ${brand}
Domain: ${ownDomain}
Industry context: ${context}

---
CRITICAL INSTRUCTION:
A DIRECT COMPETITOR sells a similar PRODUCT or SERVICE in the same CATEGORY.
For example, if the brand is Adidas, direct competitors are OTHER FOOTWEAR/APPAREL BRANDS like Nike, Puma, Under Armour.
Category analysis sites like "fourweekmba.com" or industry intelligence sites like "craft.co" are NOT competitors.

DEFINITION OF A DIRECT COMPETITOR:
A company that sells a similar product or service such that a customer could choose it INSTEAD of ${brand}.

---
STRICT EXCLUSION LIST — never return these, even if they appear in the research text:
- Review/comparison aggregators: G2, Capterra, SoftwareSuggest, GetApp, TrustRadius, AlternativeTo, Clutch, Comparably, ProductHunt, Slant, StackShare
- Company intelligence platforms: Craft.co, Owler, CBInsights, 6sense, Crunchbase, SimilarWeb
- News/media: TechCrunch, Forbes, Bloomberg, Reuters, BusinessInsider, TheVerge, Wired, Inc, Entrepreneur
- Business analysis / strategy sites: fourweekmba.com, latterly.org, consainsights.com, businessengineer.ai, businessmodelanalyst.com, growthnavigate.com, businessengineering.ai
- Social networks: LinkedIn, Twitter, Instagram, Facebook, YouTube, TikTok, Reddit, Quora, Medium, Substack
- E-commerce / marketing infrastructure: Shopify, WooCommerce, Magento, HubSpot, Salesforce, Mailchimp, Klaviyo
- Infra/tools: any CDN, CMS, analytics, tag manager, consent management, or hosting platform
- Educational platforms: Coursera, Udemy, edX, Khan Academy, Skillshare
- Any site whose primary purpose is to ANALYZE, REVIEW, STUDY, or write ABOUT other companies rather than selling their own products
- Any site that hosts user-generated content, blogs, or educational content as its main offering
- The audited domain itself: ${ownDomain}

---
SELF-CHECK: Before returning a domain, ask yourself:
"Would a customer buy from this company INSTEAD of ${brand}?"
If the answer is no (e.g. the site is a review site, a business analysis site, or an article about brands), REJECT it.

---
CATEGORY HINT:
Based on the brand name and domain, ${brand} appears to be in this category: ${context || "not specified"}.
Return ONLY companies that compete in this same category.

RETURN FORMAT:
JSON only, exactly this shape: {"domains":["competitor1.com","competitor2.com"]}
No explanation. No markdown. Domains only, no paths or protocols.
Maximum 5 domains. If fewer than 5 genuine direct competitors exist, return fewer — do not pad with non-competitors.

Research evidence (use as supporting signal, not sole source):
${researchText.slice(0, 12000)}
`,
          },
        ],
        temperature: 0,
      response_format: { type: "json_object" },
    });

    const text = (result.choices[0]?.message?.content || "").trim();
    const parsed = JSON.parse(
      text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    ) as { domains?: string[] };
    return (parsed.domains || []).map(normalizeDomain);
  } catch {
    return [];
  }
}

export async function discoverSocialProfiles(
  domain: string,
  existingUrls: string[] = []
): Promise<SocialProfile[]> {
  const brand = getBrandNameFromDomain(domain);
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const ownDomain = normalizeDomain(domain);
  const profiles = new Map<string, SocialProfile>();

  for (const url of existingUrls) {
    const platform = platformFromUrl(url);
    const normalizedUrl = normalizeSocialUrl(url);
    if (!platform || !isLikelyProfileUrl(normalizedUrl)) continue;
    profiles.set(`${platform}:${normalizedUrl}`, {
      platform,
      url: normalizedUrl,
      source: "website",
      confidence: 90,
      username: extractUsernameFromSocialUrl(normalizedUrl),
    });
  }

  if (process.env.SOCIAL_PROFILE_GUESSING === "true") {
    const directCandidates = [
      { platform: "Instagram", url: `https://www.instagram.com/${slug}/` },
      { platform: "Facebook", url: `https://www.facebook.com/${slug}` },
      { platform: "LinkedIn", url: `https://www.linkedin.com/company/${slug}` },
      { platform: "YouTube", url: `https://www.youtube.com/@${slug}` },
      { platform: "TikTok", url: `https://www.tiktok.com/@${slug}` },
      { platform: "X/Twitter", url: `https://x.com/${slug}` },
    ];

    await Promise.all(directCandidates.map(async (candidate) => {
      if (await urlAppearsLive(candidate.url)) {
        profiles.set(`${candidate.platform}:${candidate.url}`, {
          ...candidate,
          source: "direct",
          confidence: 35,
          username: extractUsernameFromSocialUrl(candidate.url),
        });
      }
    }));
  }

  const searchResults = await searchWeb(`${brand} ${ownDomain} official social media Instagram LinkedIn YouTube TikTok`, 12);
  for (const result of searchResults) {
    const platform = platformFromUrl(result.url);
    if (!platform) continue;
    const url = normalizeSocialUrl(result.url);
    if (!isLikelyProfileUrl(url)) continue;
    if (!isSearchResultRelevantToBrand(result, brand, ownDomain, url)) continue;

    profiles.set(`${platform}:${url}`, {
      platform,
      url,
      source: "search",
      confidence: /official|verified/i.test(`${result.title} ${result.snippet}`) ? 85 : 65,
      username: extractUsernameFromSocialUrl(url),
    });
  }

  return Array.from(profiles.values()).sort((a, b) => b.confidence - a.confidence);
}

export function extractUsernameFromSocialUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("linkedin.com")) {
      const companyIndex = parts.findIndex((part) => part === "company");
      return companyIndex >= 0 ? parts[companyIndex + 1] : parts[0];
    }

    if (host.includes("youtube.com")) {
      const handle = parts.find((part) => part.startsWith("@"));
      return handle || parts.at(-1);
    }

    return parts[0]?.replace(/^@/, "");
  } catch {
    return undefined;
  }
}

function parseDuckDuckGoResults(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const resultPattern = /<a\b(?=[^>]*class=["'][^"']*result__a[^"']*["'])([^>]*)>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = resultPattern.exec(html)) !== null) {
    const hrefMatch = match[1].match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const url = decodeDuckDuckGoUrl(stripHtml(hrefMatch[1]));
    const domain = normalizeDomain(url);
    if (!url || !domain) continue;

    results.push({
      title: stripHtml(match[2]),
      url,
      snippet: "",
      domain,
    });
  }

  return results;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    }, 8000);

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;
    return response.text();
  } catch {
    return null;
  }
}

function extractLinkedDomains(html: string): string[] {
  const domains = new Set<string>();
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html)) !== null) {
    const href = stripHtml(match[1]);
    if (!/^https?:\/\//i.test(href)) continue;
    const domain = normalizeDomain(href);
    if (domain) domains.add(domain);
  }

  return Array.from(domains);
}

function decodeDuckDuckGoUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://duckduckgo.com${rawUrl}`);
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : rawUrl;
  } catch {
    return rawUrl;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// extractRootDomain — returns "second-level.tld" from any domain or subdomain.
// e.g. "munchkin.marketo.net" → "marketo.net"
//      "td.doubleclick.net"   → "doubleclick.net"
//      "blinkit.com"          → "blinkit.com"
// This is critical: the old code used candidate.includes(excluded) which only
// works when the excluded string appears anywhere in the candidate. Root-domain
// matching is exact and handles all subdomain variants automatically.
// ---------------------------------------------------------------------------
function extractRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  // Handle known two-part TLDs: co.in, co.uk, com.au, etc.
  const knownSecondLevelTlds = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (knownSecondLevelTlds.has(sld) && parts.length >= 3) {
    // e.g. ["foo", "bar", "co", "in"] → "bar.co.in"
    return parts.slice(-3).join(".");
  }
  return `${sld}.${tld}`;
}

// ---------------------------------------------------------------------------
// looksLikeBrandDomain — heuristic structural check on the SLD label.
// Catches aggregator/SEO-bait domains that aren't in the blocklist, and also
// rejects pure infrastructure subdomains (pixel., track., data., s., etc.)
// that are tracking pixels or CDN endpoints embedded in crawled pages.
// ---------------------------------------------------------------------------
function looksLikeBrandDomain(domain: string): boolean {
  const parts = domain.split(".");

  // Reject subdomains that are clearly tracking/CDN infrastructure.
  // e.g. "s.yimg.com" (s. prefix = static/CDN), "munchkin.marketo.net",
  // "data.adxcel-ec2.com", "td.doubleclick.net"
  if (parts.length > 2) {
    const subdomain = parts[0].toLowerCase();
    if (/^(s|i|img|image|static|cdn|pixel|track|tag|ads|ad|imp|beacon|analytics|metrics|stats|data|sync|bat|cm|ib|pr|p|td|munchkin|simage|media)$/.test(subdomain)) {
      return false;
    }
  }

  // Use the SLD (second-level domain) for vocabulary checks
  const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

  // ── CONTENT / ANALYSIS SITE VOCABULARY ──────────────────────
  // These patterns describe what a site DOES rather than who the brand IS.
  // Content sites (magazines, research platforms, newsletters, directories,
  // aggregators) use descriptive SLDs. Real brand SLDs are recognizable
  // names or made-up words — they rarely match these patterns.
  if (/suggest|compare|review|alternative|versus|getapp|bestof|rank|list|hub|guide|advice|finder|pick|top\d|best\d|insight|intelligence|analyst|analytics|engineer|consult|advisory|latterly|weekly|daily|digest|briefing|primer|magazine|journal|times|today|newsletter|podcast|article|research|database|directory|catalog|resource|library|archive|repository|bibliography|encyclopedia|portal|network|marketplace|platform|infrastructure/i.test(sld)) {
    return false;
  }

  // ── ADVERB SLDs („ly" ending, > 6 chars) ─────────────────────
  // Adverbs like „latterly", „ultimately", „increasingly" are almost never
  // brand names but are common for content/analysis sites.
  if (sld.length > 6 && /ly$/.test(sld)) {
    return false;
  }

  // Too many hyphens = SEO-bait domain (e.g. "best-crm-software-tools.com")
  if ((sld.match(/-/g) || []).length > 2) return false;

  // Very long SLD = usually not a brand name
  if (sld.length > 22) return false;

  // Pure numeric SLD or very short garbage (e.g. "ec2", "s3", "b2") = infra
  if (/^[a-z0-9]{1,3}$/.test(sld) || /^\d+$/.test(sld)) return false;

  // Known infra SLD suffixes regardless of TLD
  if (/^(adxcel|adnxs|mktoresp|demdex|omtrdc|rlcdn|bluekai|adsrvr|rubiconproject|pubmatic|openx|casalemedia|moatads|googlesyndication|googleadservices|scorecardresearch|sharethrough)$/.test(sld)) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// verifyBrandDomains — lightweight homepage title check.
//
// Fetches just the <title> tag of each candidate domain (first 4KB) and checks
// if it reads like a content/analysis site rather than a brand product site.
//
// Content sites use descriptive titles: "[Topic] News, Analysis & Insights"
// Brand sites use name-first titles: "Nike — Official Online Store"
//
// This is the most generic defense — it catches ANY content site without
// needing to know its domain in advance.
// ---------------------------------------------------------------------------
async function verifyBrandDomains(
  domains: string[],
  brandName: string
): Promise<{ domain: string; isBrand: boolean }[]> {
  // Content-site signals to look for in the title.
  // These describe what the site DOES (analyzes/reviews/compiles) rather
  // than who the brand IS. If the title reads like content, it's not a brand.
  const CONTENT_SITE_TITLE_PATTERNS =
    /news|blog|magazine|journal|insight|analysis|review|vs\.|versus|alternative|comparison|best\s|top\s|guide\s|how\s+to|resource|database|directory|research|report|study|survey|catalog|library|archive|marketplace|platform|portal|network|\d{4}\s+(trend|forecast|outlook|prediction)/i;

  const results = await Promise.allSettled(
    domains.map(async (domain) => {
      try {
        // Fetch just the beginning of the page to get the <title> tag
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`https://${domain}`, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        clearTimeout(timeout);

        if (!response.ok) return { domain, isBrand: true }; // can't verify → let through

        // Read only first 4KB — enough to capture <title>
        const reader = response.body?.getReader();
        let html = "";
        if (reader) {
          const { value } = await reader.read();
          if (value) html = new TextDecoder().decode(value);
          reader.releaseLock();
        }

        // Extract <title> tag content
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "";
        if (!title) return { domain, isBrand: true }; // no title → let through

        // Check for content-site signals
        if (CONTENT_SITE_TITLE_PATTERNS.test(title)) {
          // Double-check: if the brand name itself appears in the title,
          // it might be a legit competitor's official site (e.g. "Nike News")
          const brandToken = brandName.toLowerCase().split(/\s+/)[0];
          if (!title.toLowerCase().includes(brandToken)) {
            return { domain, isBrand: false };
          }
        }

        return { domain, isBrand: true };
      } catch {
        return { domain, isBrand: true }; // fetch failed → let through
      }
    })
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { domain: "", isBrand: true }
  );
}

// ---------------------------------------------------------------------------
// isLikelyCompetitorDomain — four-layer filter:
// 1. Root domain blocklist (handles all subdomains of excluded domains)
// 2. Structural brand-name heuristic (catches infra/aggregators not in list)
// 3. Basic sanity checks (own domain, must have a dot)
// 4. (Post-hoc) Homepage title verification via verifyBrandDomains
// ---------------------------------------------------------------------------
function isLikelyCompetitorDomain(candidate: string, ownDomain: string): boolean {
  if (!candidate || candidate === ownDomain || candidate.endsWith(`.${ownDomain}`)) return false;
  if (ownDomain.endsWith(`.${candidate}`)) return false;

  // Layer 1: check root domain against the set — this catches ALL subdomains
  // e.g. "munchkin.marketo.net" → root "marketo.net" → blocked
  //      "td.doubleclick.net"   → root "doubleclick.net" → blocked
  const root = extractRootDomain(candidate);
  if (EXCLUDED_ROOT_DOMAINS.has(root)) return false;

  // Layer 2: structural heuristic for infra subdomains and aggregator SLDs
  if (!looksLikeBrandDomain(candidate)) return false;

  return candidate.includes(".");
}

function platformFromUrl(url: string): string | null {
  const normalized = url.toLowerCase();
  if (normalized.includes("instagram.com")) return "Instagram";
  if (normalized.includes("linkedin.com")) return "LinkedIn";
  if (normalized.includes("facebook.com")) return "Facebook";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "YouTube";
  if (normalized.includes("tiktok.com")) return "TikTok";
  if (normalized.includes("twitter.com") || normalized.includes("x.com")) return "X/Twitter";
  return null;
}

function normalizeSocialUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function isLikelyProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const path = parsed.pathname.toLowerCase();

    if (/\/(share|intent|sharer|hashtag|explore|reel|p|posts?|status|watch|embed)\b/i.test(path)) {
      return false;
    }

    if (host.includes("linkedin.com")) {
      return pathParts[0] === "company" && Boolean(pathParts[1]);
    }

    if (host.includes("youtube.com")) {
      return pathParts[0]?.startsWith("@") || ["c", "channel", "user"].includes(pathParts[0]);
    }

    if (host.includes("youtu.be")) return false;
    if (host.includes("facebook.com")) return pathParts.length > 0 && !["share", "sharer", "groups", "events", "watch"].includes(pathParts[0]);
    if (host.includes("instagram.com")) return pathParts.length === 1;
    if (host.includes("tiktok.com")) return pathParts[0]?.startsWith("@") || false;
    if (host.includes("twitter.com") || host.includes("x.com")) return pathParts.length === 1;

    return true;
  } catch {
    return false;
  }
}

function isSearchResultRelevantToBrand(
  result: WebSearchResult,
  brand: string,
  ownDomain: string,
  socialUrl: string
): boolean {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const brandTokens = brand.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
  const domainLabel = ownDomain.split(".")[0];
  const username = extractUsernameFromSocialUrl(socialUrl)?.toLowerCase() || "";

  if (text.includes(ownDomain) || text.includes(domainLabel)) return true;
  if (username === domainLabel || username.includes(domainLabel)) return true;
  return brandTokens.some((token) => text.includes(token) || username.includes(token));
}

async function urlAppearsLive(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }, 5000);

    if (response.status === 404 || response.status === 410) return false;
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}