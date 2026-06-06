/**
 * Marketing Channel Analyzer V2
 * 
 * Key improvements:
 * 1. Subdomain detection (blog.domain.com, academy.domain.com)
 * 2. Social media profile discovery
 * 3. Review platform detection
 * 4. Email capture analysis
 * 5. Content marketing maturity scoring
 * 6. Confidence levels for each finding
 */

import { CrawlResultV2, CrawledPageV2 } from "../crawler-v2";
import { discoverSocialProfiles, SocialProfile } from "../brand-research";
import { enrichSocialProfiles } from "../social-data-providers";
import { buildSocialAnalysis } from "../social-analytics";

export interface ChannelStatusV2 {
  channel: string;
  status: "present" | "missing" | "outdated" | "weak";
  quality: "excellent" | "good" | "needs-work" | "poor" | "unknown";
  confidence: number;  // 0-100
  details: string;
  evidence: ChannelEvidence[];
  url?: string;
  recommendations: string[];
  metrics?: Record<string, unknown>;
}

export interface ChannelEvidence {
  type: "url" | "link" | "schema" | "meta" | "content" | "subdomain";
  source: string;
  value: string;
  confidence: number;
}

export interface ChannelFindingV2 {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  confidence: number;
  evidenceCount: number;
  data?: Record<string, unknown>;
  score: number;
}

export interface ChannelResultV2 {
  score: number;
  confidence: number;
  channels: ChannelStatusV2[];
  findings: ChannelFindingV2[];
  summary: {
    presentChannels: number;
    missingChannels: number;
    channelsCoverage: number;
    strongestChannel: string | null;
    weakestChannel: string | null;
    recommendedPriority: string[];
  };
}

// ============================================
// MAIN ANALYZER
// ============================================

export function analyzeMarketingChannelsV2(crawlData: CrawlResultV2): ChannelResultV2 {
  return buildChannelResult(crawlData, []);
}

export async function analyzeMarketingChannelsV2WithWebResearch(
  crawlData: CrawlResultV2
): Promise<ChannelResultV2> {
  const existingSocialUrls = uniqueUrls(crawlData.pages.flatMap((page) =>
    page.externalLinks
      .map((link) => cleanSocialUrl(link.url))
      .filter((url): url is string => Boolean(url))
      .filter((url) => /instagram\.com|linkedin\.com|facebook\.com|youtube\.com|tiktok\.com|twitter\.com|x\.com/i.test(url))
      .filter((url) => !/share|intent|sharer|hashtag|explore|watch\?v=|youtu\.be/i.test(url))
  )
  );
  const discoveredProfiles = await discoverSocialProfiles(crawlData.domain, existingSocialUrls);
  const socialProfiles = await enrichSocialProfiles(discoveredProfiles);
  return buildChannelResult(crawlData, socialProfiles);
}

function buildChannelResult(
  crawlData: CrawlResultV2,
  webSocialProfiles: SocialProfile[]
): ChannelResultV2 {
  const channels: ChannelStatusV2[] = [];
  const findings: ChannelFindingV2[] = [];
  
  // Analyze each marketing channel
  channels.push(analyzeBlogV2(crawlData));
  channels.push(analyzeSocialProfilesV2(crawlData, webSocialProfiles));
  channels.push(analyzeEmailCaptureV2(crawlData));
  channels.push(analyzeReviewPlatformsV2(crawlData));
  channels.push(analyzeContentMarketingV2(crawlData));
  channels.push(analyzeVideoContentV2(crawlData));
  channels.push(analyzePodcastPresenceV2(crawlData));
  channels.push(analyzeLocalSEOV2(crawlData));
  
  // Generate findings from channel analysis
  findings.push(...generateChannelFindingsV2(channels, crawlData));
  
  // Calculate metrics
  const presentChannels = channels.filter(
    c => c.status === "present" || c.status === "weak"
  ).length;
  const missingChannels = channels.filter(c => c.status === "missing").length;
  const channelsCoverage = Math.round((presentChannels / channels.length) * 100);
  
  // Find strongest and weakest
  const sortedByQuality = [...channels].sort((a, b) => {
    const qualityOrder: Record<string, number> = { excellent: 4, good: 3, "needs-work": 2, poor: 1, unknown: 0 };
    return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
  });
  
  const strongestChannel = sortedByQuality[0]?.status !== "missing" 
    ? sortedByQuality[0]?.channel 
    : null;
  const weakestChannel = sortedByQuality.filter(c => c.status !== "missing").pop()?.channel || null;
  
  // Priority recommendations
  const recommendedPriority = channels
    .filter(c => c.status === "missing" || c.quality === "poor")
    .sort((a, b) => getChannelPriority(b.channel) - getChannelPriority(a.channel))
    .slice(0, 3)
    .map(c => c.channel);
  
  // Calculate overall score with confidence weighting
  const channelScores = channels.map(c => {
    const baseScore = getChannelBaseScore(c);
    return baseScore * (c.confidence / 100);
  });
  const score = Math.round(
    channelScores.reduce((sum, s) => sum + s, 0) / channels.length
  );
  
  // Overall confidence
  const confidence = Math.round(
    channels.reduce((sum, c) => sum + c.confidence, 0) / channels.length
  );
  
  return {
    score,
    confidence,
    channels,
    findings,
    summary: {
      presentChannels,
      missingChannels,
      channelsCoverage,
      strongestChannel,
      weakestChannel,
      recommendedPriority,
    },
  };
}

// ============================================
// CHANNEL ANALYZERS
// ============================================

function analyzeBlogV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  let confidence = 0;
  
  // Check 1: Subdomain blog (blog.domain.com)
  const blogSubdomain = crawlData.subdomainsFound.find(
    s => s.startsWith("blog.") || s.startsWith("news.") || s.startsWith("insights.")
  );
  if (blogSubdomain) {
    evidence.push({
      type: "subdomain",
      source: blogSubdomain,
      value: `Blog subdomain found: ${blogSubdomain}`,
      confidence: 95,
    });
    confidence = Math.max(confidence, 95);
  }
  
  // Check 2: Blog pages in crawl data
  const blogPages = crawlData.pagesByType["blog-post"] || [];
  const blogListingPages = crawlData.pagesByType["blog-listing"] || [];
  
  if (blogPages.length > 0) {
    evidence.push({
      type: "url",
      source: blogPages[0].url,
      value: `Found ${blogPages.length} blog posts`,
      confidence: 90,
    });
    confidence = Math.max(confidence, 90);
  }
  
  if (blogListingPages.length > 0) {
    evidence.push({
      type: "url",
      source: blogListingPages[0].url,
      value: `Blog listing page found`,
      confidence: 85,
    });
    confidence = Math.max(confidence, 85);
  }
  
  // Check 3: Links to blog section
  const blogLinks = crawlData.pages.flatMap(p => 
    p.internalLinks.filter(l => 
      /\/(blog|articles?|news|insights?|resources?|posts?)\/?/i.test(l.url)
    )
  );
  
  if (blogLinks.length > 0 && evidence.length === 0) {
    const uniqueBlogUrls = Array.from(new Set(blogLinks.map(l => l.url)));
    evidence.push({
      type: "link",
      source: "Navigation/footer links",
      value: `${uniqueBlogUrls.length} links to blog section found`,
      confidence: 70,
    });
    confidence = Math.max(confidence, 70);
  }
  
  // Check 4: Schema markup for articles
  const articleSchema = crawlData.pages.flatMap(p => 
    p.schemaMarkup.filter(s => 
      s.type.toLowerCase().includes("article") || 
      s.type.toLowerCase().includes("blogposting")
    )
  );
  
  if (articleSchema.length > 0) {
    evidence.push({
      type: "schema",
      source: "Structured data",
      value: `${articleSchema.length} article/blog schema markups found`,
      confidence: 90,
    });
    confidence = Math.max(confidence, 90);
  }
  
  // Determine status and quality
  if (evidence.length === 0) {
    return {
      channel: "Blog/Content",
      status: "missing",
      quality: "unknown",
      confidence: crawlData.overallConfidence.score,
      // If crawl was blocked or low confidence, this is likely a false negative
      details: crawlData.overallConfidence.level === "low" || crawlData.overallConfidence.level === "very-low"
        ? "Blog detection could not be verified — crawl confidence was low. The site may have a blog that was not reachable."
        : "No blog section detected. Note: If blog is on a subdomain not crawled, this may be a false negative.",
      evidence: [],
      recommendations: crawlData.overallConfidence.level === "low" || crawlData.overallConfidence.level === "very-low"
        ? ["Blog status could not be verified — your site blocked the crawler. Deeper JS rendering may bypass this restriction."]
        : [
            "Create a blog section to target informational keywords",
            "If blog exists on subdomain, ensure it's linked from main site",
            "Start with 2-4 posts per month on topics your audience cares about",
          ],
    };
  }
  
  // Calculate quality based on blog metrics
  const totalBlogContent = blogPages.length + blogListingPages.length;
  const avgWordCount = blogPages.length > 0
    ? blogPages.reduce((sum, p) => sum + p.mainContentWordCount, 0) / blogPages.length
    : 0;
  
  let quality: ChannelStatusV2["quality"];
  let status: ChannelStatusV2["status"];
  
  if (totalBlogContent >= 20 && avgWordCount >= 1000) {
    quality = "excellent";
    status = "present";
  } else if (totalBlogContent >= 10 && avgWordCount >= 500) {
    quality = "good";
    status = "present";
  } else if (totalBlogContent >= 5 || blogSubdomain) {
    quality = "needs-work";
    status = "weak";
  } else {
    quality = "poor";
    status = "weak";
  }
  
  const recommendations: string[] = [];
  if (avgWordCount < 1000) {
    recommendations.push("Expand blog posts to 1,500+ words for better rankings");
  }
  if (totalBlogContent < 20) {
    recommendations.push("Increase publishing frequency to build topical authority");
  }
  if (quality === "excellent") {
    recommendations.push("Strong blog presence! Focus on promotion and link building");
  }
  
  return {
    channel: "Blog/Content",
    status,
    quality,
    confidence,
    details: `Found ${totalBlogContent} blog pages${blogSubdomain ? ` (including subdomain: ${blogSubdomain})` : ""}. Average content length: ${Math.round(avgWordCount)} words.`,
    evidence,
    url: blogPages[0]?.url || blogListingPages[0]?.url || (blogSubdomain ? `https://${blogSubdomain}` : undefined),
    recommendations,
    metrics: {
      blogPostCount: blogPages.length,
      avgWordCount: Math.round(avgWordCount),
      hasSubdomain: blogSubdomain ? "yes" : "no",
    },
  };
}

function analyzeSocialProfilesV2(
  crawlData: CrawlResultV2,
  webSocialProfiles: SocialProfile[] = []
): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  const socialPlatforms: Record<string, { pattern: RegExp; found: string[] }> = {
    Twitter: { pattern: /twitter\.com|x\.com/i, found: [] },
    LinkedIn: { pattern: /linkedin\.com/i, found: [] },
    Facebook: { pattern: /facebook\.com/i, found: [] },
    Instagram: { pattern: /instagram\.com/i, found: [] },
    YouTube: { pattern: /youtube\.com/i, found: [] },
    TikTok: { pattern: /tiktok\.com/i, found: [] },
    GitHub: { pattern: /github\.com/i, found: [] },
  };
  
  // Check all external links for social profiles
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      for (const [platform, data] of Object.entries(socialPlatforms)) {
        const cleanedUrl = cleanSocialUrl(link.url);
        if (cleanedUrl && data.pattern.test(cleanedUrl) && !data.found.includes(cleanedUrl)) {
          // Filter out share buttons (usually have /share or /intent)
          if (!/share|intent|sharer|hashtag|explore|watch\?v=|youtu\.be/i.test(cleanedUrl)) {
            data.found.push(cleanedUrl);
          }
        }
      }
    }
  }
  
  // Check OG tags and meta for social URLs
  for (const page of crawlData.pages) {
    for (const [key, value] of Object.entries(page.ogTags)) {
      if (key.includes("twitter") || key.includes("site")) {
        for (const [platform, data] of Object.entries(socialPlatforms)) {
          const cleanedUrl = cleanSocialUrl(value);
          if (cleanedUrl && data.pattern.test(cleanedUrl) && !data.found.includes(cleanedUrl)) {
            data.found.push(cleanedUrl);
          }
        }
      }
    }
  }
  
  // Build evidence
  const foundPlatforms: string[] = [];
  for (const [platform, data] of Object.entries(socialPlatforms)) {
    if (data.found.length > 0) {
      foundPlatforms.push(platform);
      evidence.push({
        type: "link",
        source: data.found[0],
        value: `${platform} profile linked`,
        confidence: 90,
      });
    }
  }

  for (const profile of webSocialProfiles) {
    const platform = displayPlatform(profile.platform);
    if (!foundPlatforms.includes(platform)) {
      foundPlatforms.push(platform);
    }
    if (!evidence.some((item) => item.source === profile.url)) {
      evidence.push({
        type: profile.source === "website" ? "link" : "url",
        source: profile.url,
        value: formatProfileEvidenceValue(profile),
        confidence: profile.confidence,
      });
    }
  }
  
  const platformCount = foundPlatforms.length;
  const profilesWithMetrics = webSocialProfiles.filter((profile) => profile.metrics);
  const socialAnalysis = buildSocialAnalysis(webSocialProfiles, crawlData);
  const totalFollowers = profilesWithMetrics.reduce(
    (sum, profile) => sum + (profile.metrics?.followers || 0),
    0
  );
  const totalRecentPosts = profilesWithMetrics.reduce(
    (sum, profile) => sum + (profile.metrics?.recentPosts || 0),
    0
  );
  const avgEngagementRates = profilesWithMetrics
    .map((profile) => profile.metrics?.avgEngagementRate)
    .filter((value): value is number => typeof value === "number");
  const avgEngagementRate = avgEngagementRates.length > 0
    ? avgEngagementRates.reduce((sum, value) => sum + value, 0) / avgEngagementRates.length
    : undefined;
  const profileBreakdown = socialAnalysis.platform_health.length > 0
    ? socialAnalysis.platform_health
    : webSocialProfiles.map(profileToMetricSummary);
  const socialScore = socialAnalysis.social_strength;
  
  if (platformCount === 0) {
    return {
      channel: "Social Media",
      status: "missing",
      quality: "unknown",
      confidence: 60, // Lower confidence - might just not be linked
      details: "No social media profiles found on-site or through public web research.",
      evidence: [],
      recommendations: [
        "Add social media links to header/footer",
        "Create profiles on LinkedIn, Twitter, and relevant industry platforms",
        "Display social proof (follower counts, testimonials)",
      ],
    };
  }
  
  let quality: ChannelStatusV2["quality"];
  let status: ChannelStatusV2["status"];

  // socialScore can be -1 when no API metrics are available at all.
  // This is NOT a failing score — it means we only had profile discovery.
  // Treat this as "unknown" quality rather than "poor" to avoid misleading the report.
  if (socialScore < 0) {
    quality = "unknown";
    status = "present";
  } else if (socialScore >= 80) {
    quality = "excellent";
    status = "present";
  } else if (socialScore >= 60) {
    quality = "good";
    status = "present";
  } else if (socialScore >= 35 || platformCount >= 2) {
    quality = "needs-work";
    status = "present";
  } else {
    quality = "poor";
    status = "weak";
  }

  const recommendations = [
    ...socialAnalysis.recommendations,
    profilesWithMetrics.length === 0
      ? "Connect APIFY_API_TOKEN to score followers, activity, and engagement instead of profile presence only"
      : "",
    platformCount < 4 ? "Expand or verify priority profiles across Instagram, LinkedIn, YouTube, TikTok, and X where relevant" : "",
    totalRecentPosts === 0 && profilesWithMetrics.length > 0 ? "Recent posting activity was not detected; sample recent posts to evaluate content consistency" : "",
  ].filter(Boolean);
  
  return {
    channel: "Social Media",
    status,
    quality,
    confidence: webSocialProfiles.length > 0 ? 90 : 85,
    details: `Found ${platformCount} social platforms: ${foundPlatforms.join(", ")}${webSocialProfiles.length > 0 ? " (includes off-site web discovery)" : ""}. ${profilesWithMetrics.length} profiles include API/scraped metrics.`,
    evidence,
    url: evidence[0]?.source,
    recommendations: recommendations.length > 0
      ? recommendations
      : ["Strong social footprint. Next step is benchmarking engagement against competitors."],
    metrics: {
      social_strength: socialScore,
      socialScore,
      breakdown: socialAnalysis.breakdown,
      platformCount,
      platforms: foundPlatforms.join(", "),
      webDiscoveredProfiles: webSocialProfiles.length,
      profilesWithMetrics: profilesWithMetrics.length,
      totalFollowers,
      totalRecentPosts,
      avgEngagementRate: avgEngagementRate !== undefined ? Number(avgEngagementRate.toFixed(4)) : "not available",
      dataSources: Array.from(new Set(profilesWithMetrics.map((profile) => profile.metrics?.dataSource).filter(Boolean))).join(", ") || "profile-discovery-only",
      profileBreakdown,
      platform_health: socialAnalysis.platform_health,
      theme_distribution: socialAnalysis.theme_distribution,
      website_positioning: socialAnalysis.website_positioning,
      social_positioning: socialAnalysis.social_positioning,
      brand_alignment: socialAnalysis.brand_alignment,
      aggregate_metrics: socialAnalysis.aggregate_metrics,
      evidence_summary: socialAnalysis.evidence_summary,
      weaknesses: socialAnalysis.weaknesses,
      insufficient_data_reasons: socialAnalysis.insufficient_data_reasons,
      socialAnalysis,
    },
  };
}

function analyzeEmailCaptureV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  // Check for email form indicators
  const emailIndicators = [
    { pattern: /newsletter/i, type: "Newsletter signup" },
    { pattern: /subscribe/i, type: "Subscription form" },
    { pattern: /sign.?up/i, type: "Sign-up form" },
    { pattern: /email.*capture/i, type: "Email capture" },
    { pattern: /mailchimp|convertkit|hubspot|mailerlite|klaviyo/i, type: "Email marketing platform" },
    { pattern: /lead.?magnet/i, type: "Lead magnet" },
    { pattern: /download.*free|free.*download/i, type: "Downloadable content" },
  ];
  
  // Search page content and URLs
  for (const page of crawlData.pages) {
    // Check URL
    for (const indicator of emailIndicators) {
      if (indicator.pattern.test(page.url)) {
        evidence.push({
          type: "url",
          source: page.url,
          value: indicator.type,
          confidence: 80,
        });
      }
    }
    
    // Check for schema about offers/subscriptions
    for (const schema of page.schemaMarkup) {
      if (schema.type.toLowerCase().includes("offer") || 
          schema.type.toLowerCase().includes("subscription")) {
        evidence.push({
          type: "schema",
          source: page.url,
          value: "Subscription/offer schema found",
          confidence: 75,
        });
      }
    }
  }
  
  // Check for common email platform scripts in external links
  const emailPlatforms = [
    "mailchimp.com",
    "convertkit.com",
    "hubspot.com",
    "mailerlite.com",
    "klaviyo.com",
    "activecampaign.com",
    "getdrip.com",
    "buttondown.email",
  ];
  
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      for (const platform of emailPlatforms) {
        if (link.url.includes(platform)) {
          evidence.push({
            type: "link",
            source: link.url,
            value: `Email platform detected: ${platform}`,
            confidence: 85,
          });
        }
      }
    }
  }
  
  const hasCapture = evidence.length > 0;
  
  if (!hasCapture) {
    return {
      channel: "Email Marketing",
      status: "missing",
      quality: "unknown",
      confidence: 50, // Could be missed - forms require JS interaction to detect
      details: "No email capture forms detected. Note: JavaScript forms may not be fully captured.",
      evidence: [],
      recommendations: [
        "Add newsletter signup to your website footer",
        "Create lead magnets (ebooks, checklists) to capture emails",
        "Use exit-intent popups for high-value pages",
        "Consider using a dedicated email platform like ConvertKit or Mailchimp",
      ],
    };
  }
  
  const quality = evidence.length >= 3 ? "good" : "needs-work";
  
  return {
    channel: "Email Marketing",
    status: "present",
    quality,
    confidence: 75,
    details: `Found ${evidence.length} indicators of email capture/marketing`,
    evidence,
    recommendations: quality === "good"
      ? ["Good email setup! Focus on growing your list and segmentation"]
      : ["Add more email capture touchpoints across your site"],
    metrics: {
      capturePointsFound: evidence.length,
    },
  };
}

function analyzeReviewPlatformsV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  const reviewPlatforms = [
    { name: "G2", pattern: /g2\.com|g2crowd/i },
    { name: "Capterra", pattern: /capterra\.com/i },
    { name: "Trustpilot", pattern: /trustpilot\.com/i },
    { name: "Google Reviews", pattern: /google\.com\/maps|business\.google/i },
    { name: "Yelp", pattern: /yelp\.com/i },
    { name: "Product Hunt", pattern: /producthunt\.com/i },
    { name: "TrustRadius", pattern: /trustradius\.com/i },
    { name: "GetApp", pattern: /getapp\.com/i },
  ];
  
  // Check external links for review platforms
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      for (const platform of reviewPlatforms) {
        if (platform.pattern.test(link.url)) {
          evidence.push({
            type: "link",
            source: link.url,
            value: `${platform.name} link found`,
            confidence: 90,
          });
        }
      }
    }
  }
  
  // Check for review schema
  for (const page of crawlData.pages) {
    for (const schema of page.schemaMarkup) {
      if (schema.type.toLowerCase().includes("review") ||
          schema.type.toLowerCase().includes("rating") ||
          schema.type.toLowerCase().includes("aggregaterating")) {
        evidence.push({
          type: "schema",
          source: page.url,
          value: "Review/rating schema found",
          confidence: 85,
        });
      }
    }
  }
  
  // Check page content for testimonials indicators
  const testimonialPages = crawlData.pages.filter(p =>
    /testimonial|review|case.?stud/i.test(p.url) ||
    /testimonial|review|case.?stud/i.test(p.title || "")
  );
  
  if (testimonialPages.length > 0) {
    evidence.push({
      type: "url",
      source: testimonialPages[0].url,
      value: `Found ${testimonialPages.length} testimonial/case study pages`,
      confidence: 80,
    });
  }
  
  if (evidence.length === 0) {
    return {
      channel: "Reviews & Social Proof",
      status: "missing",
      quality: "unknown",
      confidence: 60,
      details: "No review platforms or testimonials detected on the site.",
      evidence: [],
      recommendations: [
        "Create a testimonials/case studies page",
        "Get listed on relevant review platforms (G2, Capterra, Trustpilot)",
        "Add review schema markup to display star ratings in search",
        "Feature customer logos and quotes on homepage",
      ],
    };
  }
  
  const quality = evidence.length >= 4 ? "excellent" 
    : evidence.length >= 2 ? "good" 
    : "needs-work";
  
  return {
    channel: "Reviews & Social Proof",
    status: "present",
    quality,
    confidence: 80,
    details: `Found ${evidence.length} review/social proof indicators`,
    evidence,
    recommendations: quality === "excellent"
      ? ["Strong social proof! Keep collecting and featuring reviews"]
      : ["Add more review sources and feature them prominently"],
    metrics: {
      reviewSourcesFound: evidence.length,
    },
  };
}

function analyzeContentMarketingV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  // Check for resource/content pages
  const contentSections = [
    { pattern: /\/resources?\//, name: "Resources section" },
    { pattern: /\/guides?\//, name: "Guides section" },
    { pattern: /\/ebooks?\//, name: "Ebooks section" },
    { pattern: /\/whitepapers?\//, name: "Whitepapers section" },
    { pattern: /\/webinars?\//, name: "Webinars section" },
    { pattern: /\/templates?\//, name: "Templates section" },
    { pattern: /\/tools?\//, name: "Tools section" },
    { pattern: /\/calculators?\//, name: "Calculators section" },
  ];
  
  for (const page of crawlData.pages) {
    for (const section of contentSections) {
      if (section.pattern.test(page.url)) {
        evidence.push({
          type: "url",
          source: page.url,
          value: section.name,
          confidence: 85,
        });
      }
    }
  }
  
  // Check for downloadable content indicators
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks.concat(page.internalLinks)) {
      if (/\.pdf$/i.test(link.url)) {
        evidence.push({
          type: "link",
          source: link.url,
          value: "PDF download available",
          confidence: 75,
        });
      }
    }
  }
  
  if (evidence.length === 0) {
    return {
      channel: "Content Marketing",
      status: "missing",
      quality: "unknown",
      confidence: 70,
      details: "No dedicated content marketing assets detected (guides, ebooks, webinars, etc.)",
      evidence: [],
      recommendations: [
        "Create downloadable lead magnets (ebooks, checklists, templates)",
        "Build a resources/guides section",
        "Consider hosting webinars to capture leads",
        "Create interactive tools or calculators for your industry",
      ],
    };
  }
  
  const quality = evidence.length >= 5 ? "excellent"
    : evidence.length >= 3 ? "good"
    : "needs-work";
  
  return {
    channel: "Content Marketing",
    status: "present",
    quality,
    confidence: 80,
    details: `Found ${evidence.length} content marketing assets`,
    evidence,
    recommendations: quality === "excellent"
      ? ["Strong content library! Focus on promotion and gating"]
      : ["Expand your content library with more formats"],
    metrics: {
      contentAssetsFound: evidence.length,
    },
  };
}

function analyzeVideoContentV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  // Check for video platform links
  const videoPlatforms = [
    { name: "YouTube", pattern: /youtube\.com|youtu\.be/i },
    { name: "Vimeo", pattern: /vimeo\.com/i },
    { name: "Wistia", pattern: /wistia\.com|wistia\.net/i },
    { name: "Loom", pattern: /loom\.com/i },
  ];
  
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      for (const platform of videoPlatforms) {
        // Exclude share links
        if (platform.pattern.test(link.url) && !/share|watch\?v=/i.test(link.url)) {
          evidence.push({
            type: "link",
            source: link.url,
            value: `${platform.name} presence`,
            confidence: 80,
          });
        }
      }
    }
  }
  
  // Check for video schema
  for (const page of crawlData.pages) {
    for (const schema of page.schemaMarkup) {
      if (schema.type.toLowerCase().includes("video")) {
        evidence.push({
          type: "schema",
          source: page.url,
          value: "Video schema markup found",
          confidence: 85,
        });
      }
    }
  }
  
  if (evidence.length === 0) {
    return {
      channel: "Video Content",
      status: "missing",
      quality: "unknown",
      confidence: 60,
      details: "No video content detected. Embedded videos may not be captured by crawler.",
      evidence: [],
      recommendations: [
        "Create a YouTube channel for tutorials and demos",
        "Add product demo videos to key landing pages",
        "Consider video testimonials from customers",
      ],
    };
  }
  
  return {
    channel: "Video Content",
    status: "present",
    quality: evidence.length >= 3 ? "good" : "needs-work",
    confidence: 75,
    details: `Found ${evidence.length} video content indicators`,
    evidence,
    recommendations: ["Continue expanding video library", "Add video schema for rich snippets"],
    metrics: {
      videoIndicatorsFound: evidence.length,
    },
  };
}

function analyzePodcastPresenceV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  // Check for podcast platforms
  const podcastPlatforms = [
    { name: "Apple Podcasts", pattern: /podcasts\.apple\.com/i },
    { name: "Spotify", pattern: /open\.spotify\.com.*podcast|spotify.*podcast/i },
    { name: "Google Podcasts", pattern: /podcasts\.google\.com/i },
    { name: "Anchor", pattern: /anchor\.fm/i },
    { name: "SoundCloud", pattern: /soundcloud\.com/i },
  ];
  
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      for (const platform of podcastPlatforms) {
        if (platform.pattern.test(link.url)) {
          evidence.push({
            type: "link",
            source: link.url,
            value: `${platform.name} link`,
            confidence: 90,
          });
        }
      }
    }
  }
  
  // Check for podcast pages
  const podcastPages = crawlData.pages.filter(p => /podcast/i.test(p.url));
  if (podcastPages.length > 0) {
    evidence.push({
      type: "url",
      source: podcastPages[0].url,
      value: "Podcast section found",
      confidence: 85,
    });
  }
  
  if (evidence.length === 0) {
    return {
      channel: "Podcast",
      status: "missing",
      quality: "unknown",
      confidence: 70,
      details: "No podcast presence detected.",
      evidence: [],
      recommendations: [
        "Consider starting a podcast for your industry",
        "Guest on other podcasts to build authority",
        "If you have a podcast, link to it prominently",
      ],
    };
  }
  
  return {
    channel: "Podcast",
    status: "present",
    quality: evidence.length >= 2 ? "good" : "needs-work",
    confidence: 80,
    details: `Found ${evidence.length} podcast presence indicators`,
    evidence,
    recommendations: ["Distribute to all major platforms", "Feature episodes on your website"],
  };
}

function analyzeLocalSEOV2(crawlData: CrawlResultV2): ChannelStatusV2 {
  const evidence: ChannelEvidence[] = [];
  
  // Check for local business indicators
  const localIndicators = [
    { pattern: /\/locations?\//, name: "Locations page" },
    { pattern: /\/contact\/?$/, name: "Contact page" },
    { pattern: /\/about.*address|address/i, name: "Address information" },
  ];
  
  for (const page of crawlData.pages) {
    for (const indicator of localIndicators) {
      if (indicator.pattern.test(page.url)) {
        evidence.push({
          type: "url",
          source: page.url,
          value: indicator.name,
          confidence: 70,
        });
      }
    }
  }
  
  // Check for local business schema
  for (const page of crawlData.pages) {
    for (const schema of page.schemaMarkup) {
      const type = schema.type.toLowerCase();
      if (type.includes("localbusiness") ||
          type.includes("organization") ||
          type.includes("place") ||
          type.includes("store")) {
        evidence.push({
          type: "schema",
          source: page.url,
          value: `${schema.type} schema found`,
          confidence: 90,
        });
      }
    }
  }
  
  // Check for Google Maps links
  for (const page of crawlData.pages) {
    for (const link of page.externalLinks) {
      if (/google\.com\/maps|maps\.google/i.test(link.url)) {
        evidence.push({
          type: "link",
          source: link.url,
          value: "Google Maps link",
          confidence: 80,
        });
      }
    }
  }
  
  if (evidence.length === 0) {
    return {
      channel: "Local SEO",
      status: "missing",
      quality: "unknown",
      confidence: 50, // May not be applicable to all businesses
      details: "No local SEO indicators found. May not be applicable for online-only businesses.",
      evidence: [],
      recommendations: [
        "If you have a physical location, add LocalBusiness schema",
        "Create/claim your Google Business Profile",
        "Add your address to the footer or contact page",
      ],
    };
  }
  
  return {
    channel: "Local SEO",
    status: "present",
    quality: evidence.length >= 3 ? "good" : "needs-work",
    confidence: 75,
    details: `Found ${evidence.length} local SEO indicators`,
    evidence,
    recommendations: evidence.length >= 3
      ? ["Good local presence! Monitor and respond to reviews"]
      : ["Add more local signals - schema, GMB link, NAP consistency"],
  };
}

// ============================================
// FINDINGS GENERATOR
// ============================================

function generateChannelFindingsV2(
  channels: ChannelStatusV2[],
  crawlData: CrawlResultV2
): ChannelFindingV2[] {
  const findings: ChannelFindingV2[] = [];
  
  // Critical: Multiple missing high-priority channels
  const missingHighPriority = channels.filter(
    c => c.status === "missing" && getChannelPriority(c.channel) > 70
  );
  
  if (missingHighPriority.length >= 2) {
    findings.push({
      type: "missing_key_channels",
      severity: "CRITICAL",
      title: `${missingHighPriority.length} key marketing channels are missing`,
      description: `Your site is missing: ${missingHighPriority.map(c => c.channel).join(", ")}. These are essential for a complete marketing strategy.`,
      impact: "Without these channels, you're losing potential traffic, leads, and revenue to competitors who have them.",
      howToFix: missingHighPriority.map(c => c.recommendations[0] || "").join(". "),
      confidence: Math.round(
        missingHighPriority.reduce((sum, c) => sum + c.confidence, 0) / missingHighPriority.length
      ),
      evidenceCount: 0,
      score: Math.max(0, 100 - missingHighPriority.length * 20),
    });
  }
  
  // Warning: Weak channels
  const weakChannels = channels.filter(c => c.quality === "poor" || c.quality === "needs-work");
  
  if (weakChannels.length >= 2) {
    findings.push({
      type: "weak_channels",
      severity: "WARNING",
      title: `${weakChannels.length} marketing channels need improvement`,
      description: `The following channels exist but need work: ${weakChannels.map(c => c.channel).join(", ")}`,
      impact: "Weak channel presence means you're not maximizing the potential of your marketing infrastructure.",
      howToFix: weakChannels.slice(0, 2).map(c => c.recommendations[0] || "").join(". "),
      confidence: Math.round(
        weakChannels.reduce((sum, c) => sum + c.confidence, 0) / weakChannels.length
      ),
      evidenceCount: weakChannels.reduce((sum, c) => sum + c.evidence.length, 0),
      score: Math.max(0, 100 - weakChannels.length * 10),
    });
  }
  
  // Info: Strong channels
  const strongChannels = channels.filter(c => c.quality === "excellent" || c.quality === "good");
  
  if (strongChannels.length > 0) {
    findings.push({
      type: "strong_channels",
      severity: "INFO",
      title: `${strongChannels.length} marketing channels performing well`,
      description: `Strong presence in: ${strongChannels.map(c => c.channel).join(", ")}`,
      impact: "These are your competitive advantages. Continue investing in them.",
      howToFix: "Focus on promotion and optimization rather than setup.",
      confidence: Math.round(
        strongChannels.reduce((sum, c) => sum + c.confidence, 0) / strongChannels.length
      ),
      evidenceCount: strongChannels.reduce((sum, c) => sum + c.evidence.length, 0),
      score: 90,
    });
  }
  
  // Add confidence warning if crawl confidence is low
  if (crawlData.overallConfidence.level === "low" || crawlData.overallConfidence.level === "very-low") {
    findings.push({
      type: "low_confidence_warning",
      severity: "INFO",
      title: "Marketing channel analysis may be incomplete",
      description: `Crawl confidence is ${crawlData.overallConfidence.level}. Some channels (especially subdomain blogs or gated content) may not have been detected.`,
      impact: "Some findings may be false negatives. Manual verification recommended.",
      howToFix: crawlData.overallConfidence.recommendations[0] || "Increase crawl depth for more accurate analysis.",
      confidence: crawlData.overallConfidence.score,
      evidenceCount: 0,
      score: 70,
    });
  }
  
  return findings;
}

// ============================================
// UTILITIES
// ============================================

function getChannelPriority(channel: string): number {
  const priorities: Record<string, number> = {
    "Blog/Content": 95,
    "Email Marketing": 90,
    "Social Media": 85,
    "Reviews & Social Proof": 80,
    "Content Marketing": 75,
    "Video Content": 60,
    "Podcast": 40,
    "Local SEO": 50,
  };
  return priorities[channel] || 50;
}

function getChannelBaseScore(channel: ChannelStatusV2): number {
  // Missing channels: if low crawl confidence suggests a false negative,
  // give a partial benefit-of-doubt score (30) instead of 0.
  // Check both the original false-negative text and the new low-confidence text.
  if (channel.status === "missing") {
    const isFalseNegative = channel.details?.includes("could not be verified") ||
      channel.details?.includes("may be a false negative");
    return isFalseNegative ? 30 : 0;
  }

  if (channel.channel === "Social Media") {
    const storedScore = Number(channel.metrics?.social_strength ?? channel.metrics?.socialScore);
    if (Number.isFinite(storedScore) && storedScore > 0) return storedScore;

    return calculateSocialMediaScore({
      platformCount: Number(channel.metrics?.platformCount || 0),
      profilesWithMetrics: Number(channel.metrics?.profilesWithMetrics || 0),
      totalFollowers: Number(channel.metrics?.totalFollowers || 0),
      totalRecentPosts: Number(channel.metrics?.totalRecentPosts || 0),
      avgEngagementRate: Number(channel.metrics?.avgEngagementRate || 0),
    });
  }
  
  const qualityScores: Record<ChannelStatusV2["quality"], number> = {
    excellent: 100,
    good: 80,
    "needs-work": 60,
    poor: 40,
    unknown: 30,
  };
  
  const statusMultiplier = channel.status === "present" ? 1 : 0.7;
  
  return qualityScores[channel.quality] * statusMultiplier;
}

function cleanSocialUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

function displayPlatform(platform: string): string {
  return platform === "X/Twitter" ? "Twitter" : platform;
}

function calculateSocialMediaScore({
  platformCount,
  profilesWithMetrics,
  totalFollowers,
  totalRecentPosts,
  avgEngagementRate,
}: {
  platformCount: number;
  profilesWithMetrics: number;
  totalFollowers: number;
  totalRecentPosts: number;
  avgEngagementRate?: number;
}): number {
  const engagement = normalizeEngagementRate(avgEngagementRate);
  const presenceScore = Math.min(30, platformCount * 6);
  const dataQualityScore = Math.min(20, profilesWithMetrics * 10);
  const audienceScore = totalFollowers > 0 ? Math.min(20, Math.log10(totalFollowers + 1) * 4) : 0;
  const activityScore = Math.min(15, totalRecentPosts * 1.5);
  const engagementScore = engagement > 0 ? Math.min(15, engagement * 250) : 0;

  return Math.min(100, Math.round(
    presenceScore + dataQualityScore + audienceScore + activityScore + engagementScore
  ));
}

function normalizeEngagementRate(value?: number): number {
  if (!value || !Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

function formatProfileEvidenceValue(profile: SocialProfile): string {
  const platform = displayPlatform(profile.platform);
  const metrics = profile.metrics;
  if (!metrics) return `${platform} profile discovered via ${profile.source}`;

  const details = [
    formatCount(metrics.followers, "followers"),
    formatCount(metrics.posts, "posts"),
    formatCount(metrics.recentPosts, "recent sampled posts"),
    metrics.avgEngagementRate !== undefined
      ? `${formatPercent(metrics.avgEngagementRate)} avg engagement`
      : "",
    metrics.dataSource ? `source: ${metrics.dataSource}` : "",
  ].filter(Boolean);

  return `${platform} profile discovered via ${profile.source}${details.length > 0 ? ` - ${details.join(", ")}` : ""}`;
}

function profileToMetricSummary(profile: SocialProfile): Record<string, unknown> {
  return {
    platform: displayPlatform(profile.platform),
    url: profile.url,
    username: profile.username,
    source: profile.source,
    confidence: profile.confidence,
    followers: profile.metrics?.followers ?? "not available",
    following: profile.metrics?.following ?? "not available",
    posts: profile.metrics?.posts ?? "not available",
    recentPosts: profile.metrics?.recentPosts ?? "not available",
    avgEngagementRate: profile.metrics?.avgEngagementRate ?? "not available",
    avgLikes: profile.metrics?.avgLikes ?? "not available",
    avgComments: profile.metrics?.avgComments ?? "not available",
    avgViews: profile.metrics?.avgViews ?? "not available",
    sampledPosts: profile.metrics?.sampledPosts?.length ?? 0,
    verified: profile.metrics?.verified ?? "not available",
    bio: profile.metrics?.bio ?? "not available",
    dataSource: profile.metrics?.dataSource ?? "profile-discovery-only",
  };
}

function formatCount(value: number | undefined, label: string): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return `${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)} ${label}`;
}

function formatPercent(value: number): string {
  const normalized = normalizeEngagementRate(value);
  return `${(normalized * 100).toFixed(normalized >= 0.1 ? 0 : 1)}%`;
}
