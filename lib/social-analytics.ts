import type { CrawlResultV2 } from "./crawler-v2";
import type { SocialPost, SocialProfile } from "./brand-research";

export interface PlatformHealth {
  platform: string;
  url: string;
  username?: string;
  data_source: string;
  followers: number | "not available";
  following: number | "not available";
  posts: number | "not available";
  sampled_posts: number;
  avg_likes: number | "not available";
  avg_comments: number | "not available";
  avg_views: number | "not available";
  engagement_rate: number | "not available";
  posting_frequency_per_week: number | "not available";
  max_posting_gap_days: number | "not available";
  video_ratio: number;
  avg_caption_length: number;
  top_hashtags: string[];
  content_type_distribution: Record<string, number>;
  theme_distribution: Record<string, number>;
  score_breakdown: SocialScoreBreakdown;
  social_strength: number;
  evidence: string[];
  sampled_posts_preview: Array<{
    date?: string;
    type?: string;
    text?: string;
    likes?: number;
    comments?: number;
    views?: number;
    hashtags?: string[];
  }>;
}

export interface SocialScoreBreakdown {
  engagement: number;
  consistency: number;
  content_quality: number;
  audience_interaction: number;
  growth_potential: number;
}

export interface BrandConsistencyResult {
  status: "aligned" | "partial-mismatch" | "mismatch" | "insufficient-data";
  /** -1 sentinel to distinguish"no data" from"scored poorly" */
  score: number;
  /** 0-100 — how much data we had to make this assessment */
  confidence: number;
  issues: string[];
  evidence: string[];
  /** Which evidence level was reached */
  evidenceLevel: 1 | 2 | 3;
}

export interface SocialAnalysisReport {
  social_strength: number;
  breakdown: SocialScoreBreakdown;
  platform_health: PlatformHealth[];
  theme_distribution: Record<string, number>;
  website_positioning: {
    summary: string;
    signals: string[];
    evidence: string[];
  };
  social_positioning: {
    summary: string;
    dominant_themes: string[];
    evidence: string[];
  };
  brand_alignment: BrandConsistencyResult;
  aggregate_metrics: {
    total_followers: number;
    total_sampled_posts: number;
    avg_engagement_rate: number | "not available";
    avg_posting_frequency_per_week: number | "not available";
    platforms_with_metrics: number;
    platforms_with_posts: number;
  };
  data_coverage: {
    platforms_scored: number;
    platforms_total: number;
    coverage_pct: number;
    note: string;
  };
  confidence: "high" | "medium" | "low";
  data_availability: {
    engagement: boolean;
    consistency: boolean;
    content_quality: boolean;
    audience_interaction: boolean;
    growth_potential: boolean;
    platforms_with_posts: number;
    total_platforms: number;
  };
  evidence_summary: string[];
  weaknesses: string[];
  recommendations: string[];
  insufficient_data_reasons: string[];
}

type Theme =
  | "educational"
  | "product"
  | "ugc"
  | "testimonials"
  | "behind_the_scenes"
  | "trend_participation"
  | "influencer"
  | "discount_offer"
  | "community"
  | "other";

const THEME_KEYWORDS: Record<Theme, RegExp[]> = {
  educational: [
    /\b(how to|guide|tips?|learn|explainer|tutorial|webinar|mistakes?|strategy|framework|checklist)\b/i,
  ],
  product: [
    /\b(product|collection|launch|feature|demo|available|shop|buy|order|new arrival|drop)\b/i,
  ],
  ugc: [
    /\b(ugc|customer|community post|tagged us|repost|shared by|fan|user generated)\b/i,
  ],
  testimonials: [
    /\b(testimonial|review|case study|success story|customer story|results|before and after)\b/i,
  ],
  behind_the_scenes: [
    /\b(behind the scenes|bts|team|culture|office|factory|making of|day in the life|founder)\b/i,
  ],
  trend_participation: [
    /\b(trending|trend|challenge|meme|viral|sound on|pov|duet|stitch)\b/i,
  ],
  influencer: [
    /\b(influencer|creator|collab|collaboration|partner|ambassador|featuring|with @)\b/i,
  ],
  discount_offer: [
    /\b(discount|sale|offer|deal|coupon|promo|clearance|% off|free shipping|limited time)\b/i,
  ],
  community: [
    /\b(community|join us|event|meetup|members|thank you|celebrate|conversation)\b/i,
  ],
  other: [],
};

const WEBSITE_POSITIONING_SIGNALS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: "premium", pattern: /\b(premium|luxury|high-end|exclusive|crafted|bespoke)\b/i },
  { signal: "performance", pattern: /\b(performance|speed|faster|scale|reliable|powerful|efficient)\b/i },
  { signal: "value", pattern: /\b(affordable|budget|low cost|save|discount|deal|value)\b/i },
  { signal: "enterprise", pattern: /\b(enterprise|teams|platform|workflow|security|compliance|automation)\b/i },
  { signal: "education", pattern: /\b(course|learn|training|academy|guide|knowledge)\b/i },
  { signal: "community", pattern: /\b(community|members|creators|network|together)\b/i },
  { signal: "innovation", pattern: /\b(ai|innovation|future|technology|modern|intelligent)\b/i },
  { signal: "trust", pattern: /\b(trusted|secure|certified|proven|customers|case studies)\b/i },
];

// ---------------------------------------------------------------------------
// FIX: Platform-aware engagement benchmarks.
// Previous code used a single 5% ceiling for all platforms which is calibrated
// for micro-influencers. Brand accounts on Twitter routinely see 0.5–2%;
// treating 2% as "38/100" is wrong. These thresholds reflect industry medians
// for brand accounts with 10k–1M followers.
// ---------------------------------------------------------------------------
const ENGAGEMENT_BENCHMARKS: Record<string, { good: number; excellent: number }> = {
  "X/Twitter":  { good: 0.005, excellent: 0.02  },
  "Instagram":  { good: 0.015, excellent: 0.05  },
  "Facebook":   { good: 0.003, excellent: 0.01  },
  "LinkedIn":   { good: 0.02,  excellent: 0.06  },
  "YouTube":    { good: 0.01,  excellent: 0.04  },
  "TikTok":     { good: 0.04,  excellent: 0.10  },
  "default":    { good: 0.01,  excellent: 0.04  },
};

export function buildSocialAnalysis(
  profiles: SocialProfile[],
  crawlData: CrawlResultV2
): SocialAnalysisReport {
  const totalPlatforms = profiles.length;
  const platformsWithData = profiles.filter(p => p.metrics?.sampledPosts && p.metrics.sampledPosts.length > 0).length;
  const platformHealth = profiles.map(analyzePlatform);
  const breakdown = weightedBreakdown(platformHealth);
  const themeDistribution = aggregateThemeDistribution(platformHealth);
  const websitePositioning = extractWebsitePositioning(crawlData);
  const socialPositioning = extractSocialPositioning(themeDistribution, platformHealth);
  // Determine brand consistency level and use appropriate analysis
  const consistencyLevel = determineConsistencyLevel(profiles, platformHealth, themeDistribution);
  let brandAlignment: BrandConsistencyResult;
  if (consistencyLevel === 1) {
    brandAlignment = analyzeWebsiteOnlyConsistency(crawlData);
  } else {
    brandAlignment = compareWebsiteAndSocialPositioning(
      websitePositioning,
      socialPositioning,
      themeDistribution,
      profiles,
      platformHealth
    );
  }

  const socialStrength = calculateWeightedSocialStrength(breakdown);
  const aggregateMetrics = aggregateMetricsFor(platformHealth);
  const insufficientDataReasons = buildDataGaps(profiles, platformHealth);
  const evidenceSummary = buildEvidenceSummary(platformHealth, aggregateMetrics, brandAlignment);
  const weaknesses = buildWeaknesses(breakdown, aggregateMetrics, brandAlignment, themeDistribution);

  const scoredPlatforms = platformHealth.filter(p => p.data_source !== "profile-discovery-only");
  const coveragePct = platformHealth.length > 0
    ? Math.round((scoredPlatforms.length / platformHealth.length) * 100)
    : 0;

  // Compute data availability per dimension
  const platformsWithPosts = platformHealth.filter(p => p.sampled_posts > 0).length;
  const profilesWithApiData = platformHealth.filter(p => p.data_source !== "profile-discovery-only").length;
  const dataAvailability = {
    engagement: platformHealth.some(p => typeof p.engagement_rate === "number" && p.sampled_posts > 0),
    consistency: platformHealth.some(p => p.sampled_posts > 0),
    content_quality: platformHealth.some(p => p.sampled_posts >= 3),
    audience_interaction: platformHealth.some(p => p.sampled_posts > 0),
    growth_potential: platformHealth.some(p => p.sampled_posts >= 5),
    platforms_with_posts: platformsWithPosts,
    total_platforms: platformHealth.length,
  };

  // Confidence factors:
  // - How many platforms were found vs scraped vs have posts
  // - coveragePct = % of discovered profiles with actual API metrics
  // - A brand with 5 profiles but only 1 scraped is medium, not high
  const scrapeRatio = totalPlatforms > 0 ? profilesWithApiData / totalPlatforms : 0;
  const confidence: "high" | "medium" | "low" =
    platformsWithPosts >= 3 && totalPlatforms >= 3 && scrapeRatio >= 0.5
      ? "high"
      : platformsWithPosts >= 1
        ? "medium"
        : "low";

  return {
    social_strength: socialStrength,
    breakdown,
    platform_health: platformHealth,
    theme_distribution: themeDistribution,
    website_positioning: websitePositioning,
    social_positioning: socialPositioning,
    brand_alignment: brandAlignment,
    aggregate_metrics: aggregateMetrics,
    data_coverage: {
      platforms_scored: scoredPlatforms.length,
      platforms_total: platformHealth.length,
      coverage_pct: coveragePct,
      note: coveragePct < 50
        ? "Score reflects partial data. Connect Instagram/LinkedIn APIs for a complete picture."
        : coveragePct < 75
          ? "Score reflects majority of detected social presence. Some platforms lacked API data."
          : "Score reflects full detected social presence.",
    },
    evidence_summary: evidenceSummary,
    confidence,
    data_availability: dataAvailability,
    weaknesses: buildWeaknesses(breakdown, aggregateMetrics, brandAlignment, themeDistribution, dataAvailability),
    recommendations: buildRecommendations(breakdown, brandAlignment, themeDistribution, insufficientDataReasons, dataAvailability),
    insufficient_data_reasons: insufficientDataReasons,
  };
}

function analyzePlatform(profile: SocialProfile): PlatformHealth {
  const metrics = profile.metrics;
  const posts = metrics?.sampledPosts || [];
  const followers = metrics?.followers;
  const avgLikes = metrics?.avgLikes ?? averageMetric(posts, "likes");
  const avgComments = metrics?.avgComments ?? averageMetric(posts, "comments");
  const avgViews = metrics?.avgViews ?? averageMetric(posts, "views");
  const engagementRate = normalizeEngagementRate(
    metrics?.avgEngagementRate ?? computeEngagementRate(followers, avgLikes, avgComments)
  );
  const postingStats = computePostingStats(posts);
  const contentTypes = computeContentTypes(posts);
  const themes = computeThemeDistribution(posts);
  const topHashtags = computeTopHashtags(posts);
  const avgCaptionLength = averageCaptionLength(posts);
  const videoRatio = computeVideoRatio(posts, contentTypes);

  const scoreBreakdown = {
    engagement: scoreEngagement(engagementRate, profile.platform, followers),
    consistency: scoreConsistency(
      postingStats.frequencyPerWeek,
      postingStats.maxGapDays,
      posts.length,
      metrics?.posts,
      followers
    ),
    content_quality: scoreContentQuality(contentTypes, videoRatio, avgCaptionLength, themes, posts.length, followers),
    audience_interaction: scoreAudienceInteraction(followers, avgComments, posts),
    growth_potential: 0,
  };
  scoreBreakdown.growth_potential = scoreGrowthPotential(scoreBreakdown, posts, followers);

  return {
    platform: displayPlatform(profile.platform),
    url: profile.url,
    username: profile.username,
    data_source: metrics?.dataSource || "profile-discovery-only",
    followers: numberOrUnavailable(followers),
    following: numberOrUnavailable(metrics?.following),
    posts: numberOrUnavailable(metrics?.posts),
    sampled_posts: posts.length,
    avg_likes: numberOrUnavailable(avgLikes),
    avg_comments: numberOrUnavailable(avgComments),
    avg_views: numberOrUnavailable(avgViews),
    engagement_rate: engagementRate === undefined ? "not available" : round(engagementRate * 100, 2),
    posting_frequency_per_week: postingStats.frequencyPerWeek === undefined
      ? "not available"
      : round(postingStats.frequencyPerWeek, 2),
    max_posting_gap_days: postingStats.maxGapDays === undefined ? "not available" : postingStats.maxGapDays,
    video_ratio: round(videoRatio, 2),
    avg_caption_length: Math.round(avgCaptionLength),
    top_hashtags: topHashtags,
    content_type_distribution: contentTypes,
    theme_distribution: themes,
    score_breakdown: scoreBreakdown,
    social_strength: calculateWeightedSocialStrength(scoreBreakdown),
    evidence: buildPlatformEvidence(profile, engagementRate, postingStats.frequencyPerWeek, themes, scoreBreakdown),
    sampled_posts_preview: posts.slice(0, 8).map(postPreview),
  };
}

// Patterns that indicate a bot-block / anti-crawl page (not real brand content)
const BOT_BLOCK_PATTERNS = [
  /access denied/i,
  /forbidden/i,
  /please verify you are a human/i,
  /automated access/i,
  /rate limit/i,
  /too many requests/i,
  /your request has been blocked/i,
];

function computeEngagementRate(
  followers: number | undefined,
  avgLikes: number | undefined,
  avgComments: number | undefined
): number | undefined {
  if (!followers || followers <= 0) return undefined;
  const interactions = (avgLikes || 0) + (avgComments || 0);
  return interactions > 0 ? interactions / followers : undefined;
}

function normalizeEngagementRate(value?: number): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  return value > 1 ? value / 100 : value;
}

function computePostingStats(posts: SocialPost[]): {
  frequencyPerWeek?: number;
  maxGapDays?: number;
} {
  const dates = posts
    .map((post) => parsePostDate(post.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) return {};

  const rangeDays = Math.max(1, daysBetween(dates[0], dates[dates.length - 1]));
  const gaps = dates.slice(1).map((date, index) => daysBetween(dates[index], date));
  return {
    frequencyPerWeek: (dates.length / rangeDays) * 7,
    maxGapDays: Math.max(...gaps),
  };
}

function computeContentTypes(posts: SocialPost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    const type = normalizeContentType(post.type, post);
    counts[type] = (counts[type] || 0) + 1;
  }
  return percentDistribution(counts);
}

function computeVideoRatio(posts: SocialPost[], contentTypes: Record<string, number>): number {
  if (posts.length === 0) return 0;
  return round(((contentTypes.video || 0) + (contentTypes.reel || 0) + (contentTypes.short || 0)) / 100, 2);
}

function normalizeContentType(type: string | undefined, post: SocialPost): string {
  const value = String(type || "").toLowerCase();
  if (/reel/.test(value)) return "reel";
  if (/short/.test(value)) return "short";
  if (/video|clip|tiktok/.test(value) || post.views !== undefined) return "video";
  if (/carousel|album|sidecar/.test(value)) return "carousel";
  if (/image|photo|picture/.test(value)) return "image";
  return post.views !== undefined ? "video" : "unknown";
}

function computeThemeDistribution(posts: SocialPost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    const theme = classifyTheme(post.text || "", post.hashtags || []);
    counts[theme] = (counts[theme] || 0) + 1;
  }
  return percentDistribution(counts);
}

function classifyTheme(text: string, hashtags: string[]): Theme {
  const corpus = `${text} ${hashtags.map(tag => `#${tag}`).join(" ")}`;
  for (const theme of Object.keys(THEME_KEYWORDS) as Theme[]) {
    if (theme === "other") continue;
    if (THEME_KEYWORDS[theme].some(pattern => pattern.test(corpus))) return theme;
  }
  return "other";
}

// Extended theme vocabulary for GPT-based classification
const EXTENDED_THEMES = [
  "educational", "product", "ugc", "testimonials",
  "behind_the_scenes", "trend_participation", "influencer",
  "discount_offer", "community", "thought_leadership",
  "customer_success", "brand_story", "entertainment",
  "promotional", "other",
] as const;

type ExtendedTheme = typeof EXTENDED_THEMES[number];

/**
 * GPT-based content classification that replaces regex keyword matching.
 * Takes a batch of post texts and returns theme percentages per post.
 * Uses the OpenAI API for more accurate classification than regex.
 */
export async function classifyThemesViaAI(
  posts: Array<{ text?: string; hashtags?: string[]; platform?: string }>
): Promise<Record<string, number>> {
  // If no API key or no posts, fall back to regex
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "";
  if (!apiKey || apiKey.startsWith("gsk_") || posts.length === 0 || posts.every(p => !p.text?.trim())) {
    // Fallback: use regex for each post
    const counts: Record<string, number> = {};
    for (const post of posts) {
      const theme = classifyTheme(post.text || "", post.hashtags || []);
      counts[theme] = (counts[theme] || 0) + 1;
    }
    return percentDistribution(counts);
  }

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    // Sample up to 30 posts to keep the API call manageable
    const sampled = posts.slice(0, 30);
    const postTexts = sampled.map((p, i) =>
      `Post ${i + 1} (${p.platform || "unknown"}): ${(p.text || "").slice(0, 300)}`
    ).join("\n");

    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Classify each social media post below into ONE of these themes:

${EXTENDED_THEMES.join(", ")}

Definitions:
- educational: How-to, tips, tutorials, explanations, advice
- product: Product showcases, launches, features, demos, availability
- ugc: User-generated content, reposts, fan content, community posts
- testimonials: Reviews, case studies, success stories, before/after
- behind_the_scenes: Team, culture, office, factory, day-in-life, founder stories
- trend_participation: Trending topics, memes, challenges, viral content
- influencer: Collaborations, ambassadors, partnerships, featuring others
- discount_offer: Sales, discounts, promos, coupons, limited-time offers
- community: Events, meetups, join us, celebration, community engagement
- thought_leadership: Industry insights, expert opinions, original research
- customer_success: Customer wins, outcomes, results, impact stories
- brand_story: Brand mission, values, origin story, brand heritage
- entertainment: Fun, humor, relatable content, lifestyle, inspiration
- promotional: General brand promotion, awareness campaigns, announcements

For each post, return ONLY the theme name. Then return the final aggregate distribution as percentages.

Posts:
${postTexts}

Return a JSON object with theme names as keys and percentage values as numbers.`,
      }],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const text = result.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());

    // Validate and return only valid themes
    const distribution: Record<string, number> = {};
    const validThemes = new Set<string>(EXTENDED_THEMES);
    for (const [theme, pct] of Object.entries(parsed)) {
      if (validThemes.has(theme) && typeof pct === "number" && pct > 0) {
        distribution[theme] = Math.round(pct);
      }
    }

    if (Object.keys(distribution).length > 0) return distribution;
    // Fallback if GPT returns invalid format
    const counts: Record<string, number> = {};
    for (const post of sampled) {
      const theme = classifyTheme(post.text || "", post.hashtags || []);
      counts[theme] = (counts[theme] || 0) + 1;
    }
    return percentDistribution(counts);
  } catch {
    // Fallback to regex on API failure
    const counts: Record<string, number> = {};
    for (const post of posts) {
      const theme = classifyTheme(post.text || "", post.hashtags || []);
      counts[theme] = (counts[theme] || 0) + 1;
    }
    return percentDistribution(counts);
  }
}

function computeTopHashtags(posts: SocialPost[]): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const hashtag of post.hashtags || []) {
      counts.set(hashtag, (counts.get(hashtag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
}

function averageCaptionLength(posts: SocialPost[]): number {
  const lengths = posts
    .map(post => post.text?.trim().length || 0)
    .filter(length => length > 0);
  if (lengths.length === 0) return 0;
  return lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
}

// ---------------------------------------------------------------------------
// FIX: scoreEngagement — replaced single 5% threshold with per-platform
// calibrated benchmarks. A brand account at 1.9% on Twitter is above average
// and should score ~75/100, not 38/100 as the old formula produced.
// ---------------------------------------------------------------------------
function scoreEngagement(engagementRate?: number, platform?: string, followers?: number): number {
  if (engagementRate === undefined) {
    // If we know followers exist but have no interaction data, give baseline presence score
    if (followers !== undefined && followers > 0) return 15;
    return 0;
  }
  const benchmarks =
    ENGAGEMENT_BENCHMARKS[platform ?? "default"] ?? ENGAGEMENT_BENCHMARKS["default"];

  if (engagementRate >= benchmarks.excellent) return 100;
  if (engagementRate >= benchmarks.good) {
    // Linear interpolation between good (score 60) → excellent (score 100)
    const ratio = (engagementRate - benchmarks.good) / (benchmarks.excellent - benchmarks.good);
    return clamp(Math.round(60 + ratio * 40), 60, 100);
  }
  // Linear interpolation between 0 → good (score 60)
  const ratio = engagementRate / benchmarks.good;
  return clamp(Math.round(ratio * 60), 0, 59);
}

// ---------------------------------------------------------------------------
// FIX: scoreConsistency — added totalPosts parameter as a fallback proxy.
// When frequencyPerWeek is unavailable (no timeline scraped) but the profile
// has thousands of historical posts, the old code capped at 55. Now we use
// log10(totalPosts) to give an evidence-based estimate.
// ---------------------------------------------------------------------------
function scoreConsistency(
  frequencyPerWeek: number | undefined,
  maxGapDays: number | undefined,
  sampledPosts: number,
  totalPosts?: number,
  followers?: number
): number {
  if (frequencyPerWeek === undefined) {
    if (totalPosts !== undefined && totalPosts > 0) {
      // log10(500) ≈ 2.7 → ~49+40 = 89 cap at 85
      // log10(5000) ≈ 3.7 → ~67+40 capped at 85
      const postProxy = clamp(Math.round(40 + Math.log10(totalPosts + 1) * 18), 40, 85);
      return sampledPosts > 0 ? Math.min(postProxy + 5, 88) : postProxy;
    }
    // If no posting data but the brand maintains a profile with followers, give baseline
    if (followers !== undefined && followers > 0) return 10;
    return sampledPosts > 0 ? clamp(30 + sampledPosts * 3, 0, 55) : 0;
  }
  const frequencyScore = clamp(Math.round((frequencyPerWeek / 5) * 100), 0, 100);
  const gapPenalty = maxGapDays === undefined
    ? 0
    : maxGapDays >= 30
      ? 35
      : maxGapDays >= 14
        ? 20
        : maxGapDays >= 7
          ? 8
          : 0;
  return clamp(frequencyScore - gapPenalty, 0, 100);
}

function scoreContentQuality(
  contentTypes: Record<string, number>,
  videoRatio: number,
  avgCaptionLength: number,
  themes: Record<string, number>,
  sampledPosts: number,
  followers?: number
): number {
  if (sampledPosts === 0) {
    // Profile with followers = content exists, even if not sampled
    if (followers !== undefined && followers > 0) return 10;
    return 0;
  }
  const typeCount = Object.keys(contentTypes).filter(type => type !== "unknown" && contentTypes[type] > 0).length;
  const diversityScore = clamp(typeCount * 18, 0, 45);
  const videoScore = clamp(Math.round(videoRatio * 35), 0, 20);
  const captionScore = avgCaptionLength >= 60 && avgCaptionLength <= 240
    ? 20
    : avgCaptionLength > 0
      ? 10
      : 0;
  const themeCount = Object.keys(themes).filter(theme => theme !== "other" && themes[theme] > 0).length;
  const themeScore = clamp(themeCount * 5, 0, 15);
  return clamp(diversityScore + videoScore + captionScore + themeScore, 0, 100);
}

function scoreAudienceInteraction(
  followers: number | undefined,
  avgComments: number | undefined,
  posts: SocialPost[]
): number {
  const replyAvg = averageMetric(posts, "replies") || 0;

  // If we have followers but no post interaction data, give baseline presence score
  if (posts.length === 0 && followers !== undefined && followers > 0) {
    // log10(10000) * 6 = 24; log10(100000) * 6 = 30 → cap at 25
    return Math.min(25, Math.round(Math.log10(followers) * 6));
  }

  if (!followers || followers <= 0) {
    return clamp(Math.round((avgComments || 0) * 2 + replyAvg * 4), 0, 60);
  }
  const commentRate = (avgComments || 0) / followers;
  const commentRateScore = clamp(Math.round((commentRate / 0.001) * 70), 0, 70);
  const replyScore = clamp(Math.round(replyAvg * 4), 0, 30);
  return clamp(commentRateScore + replyScore, 0, 100);
}

function scoreGrowthPotential(
  breakdown: Omit<SocialScoreBreakdown, "growth_potential">,
  posts: SocialPost[],
  followers?: number
): number {
  if (posts.length === 0) {
    // Without post data, use follower count as a baseline indicator
    if (followers !== undefined && followers > 0) {
      return clamp(Math.round(Math.log10(followers) * 4), 5, 25);
    }
    return 0;
  }
  const performanceVariance = scorePerformanceVariance(posts);
  const smallAudienceBonus = followers !== undefined && followers > 0 && followers < 20000
    ? 8
    : 0;
  return clamp(Math.round(
    breakdown.engagement * 0.45 +
    breakdown.consistency * 0.2 +
    breakdown.content_quality * 0.15 +
    performanceVariance * 0.2 +
    smallAudienceBonus
  ), 0, 100);
}

function scorePerformanceVariance(posts: SocialPost[]): number {
  const values = posts
    .map(post => (post.likes || 0) + (post.comments || 0) + Math.round((post.views || 0) / 100))
    .filter(value => value > 0);
  if (values.length < 3) return 25;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const max = Math.max(...values);
  if (avg === 0) return 0;
  return clamp(Math.round((max / avg - 1) * 40), 0, 100);
}

function weightedBreakdown(platformHealth: PlatformHealth[]): SocialScoreBreakdown {
  // Include platforms that have data OR followers (from web-scrape).
  // profile-discovery-only with 0 followers still excluded — they'd drag
  // the average down with meaningless zeros.
  const withData = platformHealth.filter(p =>
    p.data_source !== "profile-discovery-only" ||
    p.sampled_posts > 0 ||
    (typeof p.followers === "number" && p.followers > 0)
  );

  if (withData.length === 0) {
    // No platforms have API or web-scraped data.
    // Compute presence-based scores so we show meaningful (not -1) values.
    return computePresenceBreakdown(platformHealth);
  }

  const dataBreakdown = {
    engagement: weightedScore(withData, "engagement"),
    consistency: weightedScore(withData, "consistency"),
    content_quality: weightedScore(withData, "content_quality"),
    audience_interaction: weightedScore(withData, "audience_interaction"),
    growth_potential: weightedScore(withData, "growth_potential"),
  };

  // When only some platforms have data, blend with presence-based scores
  // so the overall result reflects all discovered platforms, not just the few
  // with API data. E.g., 1 of 4 platforms with web-scraped data gives ~37.5% weight to data.
  const dataRatio = withData.length / platformHealth.length;
  if (dataRatio < 1.0 && platformHealth.length > 0) {
    const presenceBreakdown = computePresenceBreakdown(platformHealth);
    const blendWeight = Math.min(0.8, Math.max(0.3, dataRatio * 1.5));
    return blendBreakdown(dataBreakdown, presenceBreakdown, blendWeight);
  }

  return dataBreakdown;
}

function computePresenceBreakdown(platformHealth: PlatformHealth[]): SocialScoreBreakdown {
  // Produces evidence-based scores from profile discovery alone.
  // Having a profile on LinkedIn + Instagram + Facebook + Twitter is itself
  // a positive signal — it shows social investment even without API metrics.
  // Baseline multipliers doubled so 2 platforms produce ~22/100, not 11/100.
  const platformCount = platformHealth.length;
  const businessPlatforms = platformHealth.filter(p =>
    ["LinkedIn", "Instagram", "Facebook", "Twitter/X", "YouTube", "TikTok"].includes(p.platform)
  ).length;

  return {
    engagement: Math.min(40, platformCount * 8 + businessPlatforms * 4),
    consistency: Math.min(35, platformCount * 6 + businessPlatforms * 4),
    content_quality: Math.min(35, platformCount * 6 + businessPlatforms * 4),
    audience_interaction: Math.min(40, platformCount * 8 + businessPlatforms * 4),
    growth_potential: Math.min(40, platformCount * 8 + businessPlatforms * 4),
  };
}

function blendBreakdown(
  data: SocialScoreBreakdown,
  presence: SocialScoreBreakdown,
  dataWeight: number
): SocialScoreBreakdown {
  const presenceWeight = 1 - dataWeight;
  return {
    engagement: Math.round(data.engagement * dataWeight + presence.engagement * presenceWeight),
    consistency: Math.round(data.consistency * dataWeight + presence.consistency * presenceWeight),
    content_quality: Math.round(data.content_quality * dataWeight + presence.content_quality * presenceWeight),
    audience_interaction: Math.round(data.audience_interaction * dataWeight + presence.audience_interaction * presenceWeight),
    growth_potential: Math.round(data.growth_potential * dataWeight + presence.growth_potential * presenceWeight),
  };
}

// ---------------------------------------------------------------------------
// DATA_DEPENDENT_KEYS — dimensions that require actual post data to score.
// Platforms with zero sampled posts are excluded from these averages.
// Engagement and consistency are now included because scoring them without
// any post data produces misleading 0 scores that drag the aggregate down.
// ---------------------------------------------------------------------------
const DATA_DEPENDENT_KEYS = new Set<keyof SocialScoreBreakdown>([
  "content_quality",
  "audience_interaction",
  "engagement",
  "consistency",
  "growth_potential",
]);

function weightedScore(
  platformHealth: PlatformHealth[],
  key: keyof SocialScoreBreakdown
): number {
  const eligible = DATA_DEPENDENT_KEYS.has(key)
    ? platformHealth.filter(p =>
        p.sampled_posts > 0 ||
        (typeof p.followers === "number" && p.followers > 0)
      )
    : platformHealth;

  if (eligible.length === 0) return 0;

  const totalWeight = eligible.reduce((sum, platform) => sum + platformWeight(platform), 0);
  if (totalWeight === 0) return 0;

  return Math.round(
    eligible.reduce((sum, platform) => (
      sum + platform.score_breakdown[key] * platformWeight(platform)
    ), 0) / totalWeight
  );
}

// Evidence-based scoring weights (user-requested framework):
// Content Quality: 30%       → content_quality (format diversity, captions, video ratio)
// Posting Consistency: 20%   → consistency (posting frequency, gap analysis)
// Brand Presence: 20%        → engagement (engagement-rate scoring — proxy for brand resonance)
// Audience Engagement: 15%   → audience_interaction (comment rates, reply depth)
// Community Strength: 15%    → growth_potential (variance, upside, small-audience bonus)
// NOTE: Brand Presence and Community Strength don't have dedicated calculation functions;
// they are approximated by engagement (rate-based interaction quality) and
// growth_potential (performance variance). This is a pragmatic mapping that
// avoids a full rewrite of the 12 scoring functions.
const SOCIAL_WEIGHTS: Record<keyof SocialScoreBreakdown, number> = {
  content_quality: 0.30,
  consistency: 0.20,
  engagement: 0.20,
  audience_interaction: 0.15,
  growth_potential: 0.15,
};

export function calculateWeightedSocialStrength(breakdown: SocialScoreBreakdown): number {
  let score = 0;
  let activeWeight = 0;

  for (const [key, weight] of Object.entries(SOCIAL_WEIGHTS) as [keyof SocialScoreBreakdown, number][]) {
    const value = breakdown[key];
    if (value === -1) continue; // Sentinel: dimension had no data
    score += value * weight;
    activeWeight += weight;
  }

  if (activeWeight === 0) return -1; // No data at all
  return Math.round(score / activeWeight);
}

// ---------------------------------------------------------------------------
// FIX: platformWeight — now factors in data quality so that a platform with
// millions of followers but zero sampled posts doesn't dominate the aggregate
// with a noisy, zero-inflated score.
// ---------------------------------------------------------------------------
function platformWeight(platform: PlatformHealth): number {
  const followers = typeof platform.followers === "number" ? platform.followers : 0;
  const followerWeight = Math.max(1, Math.log10(followers + 10));
  const dataQualityMultiplier =
    platform.sampled_posts > 10 ? 1.0
    : platform.sampled_posts > 3  ? 0.8
    : platform.data_source !== "profile-discovery-only" ? 0.5
    : 0.3;
  return followerWeight * dataQualityMultiplier;
}

function aggregateThemeDistribution(platformHealth: PlatformHealth[]): Record<string, number> {
  const weightedCounts: Record<string, number> = {};
  let totalPosts = 0;

  for (const platform of platformHealth) {
    totalPosts += platform.sampled_posts;
    for (const [theme, percent] of Object.entries(platform.theme_distribution)) {
      weightedCounts[theme] = (weightedCounts[theme] || 0) + (percent / 100) * platform.sampled_posts;
    }
  }

  if (totalPosts === 0) return {};
  return Object.fromEntries(
    Object.entries(weightedCounts)
      .map(([theme, count]) => [theme, Math.round((count / totalPosts) * 100)])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
  );
}

function aggregateMetricsFor(platformHealth: PlatformHealth[]): SocialAnalysisReport["aggregate_metrics"] {
  const totalFollowers = platformHealth.reduce((sum, platform) => (
    sum + (typeof platform.followers === "number" ? platform.followers : 0)
  ), 0);
  const engagementRates = platformHealth
    .map(platform => typeof platform.engagement_rate === "number" ? platform.engagement_rate : undefined)
    .filter((value): value is number => value !== undefined);
  const postingFrequencies = platformHealth
    .map(platform => typeof platform.posting_frequency_per_week === "number" ? platform.posting_frequency_per_week : undefined)
    .filter((value): value is number => value !== undefined);

  return {
    total_followers: totalFollowers,
    total_sampled_posts: platformHealth.reduce((sum, platform) => sum + platform.sampled_posts, 0),
    avg_engagement_rate: engagementRates.length > 0
      ? round(engagementRates.reduce((sum, value) => sum + value, 0) / engagementRates.length, 2)
      : "not available",
    avg_posting_frequency_per_week: postingFrequencies.length > 0
      ? round(postingFrequencies.reduce((sum, value) => sum + value, 0) / postingFrequencies.length, 2)
      : "not available",
    platforms_with_metrics: platformHealth.filter(platform => platform.data_source !== "profile-discovery-only").length,
    platforms_with_posts: platformHealth.filter(platform => platform.sampled_posts > 0).length,
  };
}

function extractWebsitePositioning(crawlData: CrawlResultV2): SocialAnalysisReport["website_positioning"] {
  const evidence = crawlData.pages.slice(0, 12).flatMap(page => [
    page.title || "",
    page.metaDescription || "",
    ...page.h1Tags.slice(0, 2),
    ...page.h2Tags.slice(0, 3),
  ]).filter(Boolean);
  const corpus = evidence.join(" ");
  const signals = WEBSITE_POSITIONING_SIGNALS
    .filter(item => item.pattern.test(corpus))
    .map(item => item.signal);

  return {
    summary: signals.length > 0
      ? `${crawlData.domain} website positioning emphasizes ${signals.slice(0, 4).join(", ")}.`
      : "Website positioning could not be confidently classified from crawled titles and headings.",
    signals,
    evidence: evidence.slice(0, 8),
  };
}

function extractSocialPositioning(
  themeDistribution: Record<string, number>,
  platformHealth: PlatformHealth[]
): SocialAnalysisReport["social_positioning"] {
  const dominantThemes = Object.entries(themeDistribution)
    .filter(([, percent]) => percent >= 10)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, percent]) => `${theme}: ${percent}%`);
  const evidence = platformHealth
    .flatMap(platform => platform.sampled_posts_preview.map(post => post.text || ""))
    .filter(Boolean)
    .slice(0, 8);

  return {
    summary: dominantThemes.length > 0
      ? `Social content is dominated by ${dominantThemes.slice(0, 3).join(", ")}.`
      : "Social content themes could not be classified because no recent post text was available.",
    dominant_themes: dominantThemes,
    evidence,
  };
}

/**
 * Determines the brand consistency evidence level based on available data.
 *
 * Level 1 — Website only (homepage, about, services, meta data)
 * Level 2 — Website + Social (post samples, engagement metrics)
 * Level 3 — Website + Social (with engagement data — multiple platforms with posts)
 */
function determineConsistencyLevel(
  profiles: SocialProfile[],
  platformHealth: PlatformHealth[],
  themeDistribution: Record<string, number>
): 1 | 2 | 3 {
  const profilesWithPosts = platformHealth.filter(p => p.sampled_posts > 0).length;
  const totalSampledPosts = platformHealth.reduce((s, p) => s + p.sampled_posts, 0);
  const hasEngagementData = platformHealth.some(p => typeof p.engagement_rate === "number");

  if (profiles.length > 0 && profilesWithPosts > 0 && totalSampledPosts >= 10 && hasEngagementData) {
    return 3; // Enough social data for a thorough comparison
  }
  if (profiles.length > 0 && totalSampledPosts >= 3) {
    return 2; // Some social data available
  }
  return 1; // Website-only
}

/**
 * Level 1 brand consistency — derived purely from website crawl data.
 * Works for any URL without needing social profiles or API keys.
 * Compares internal messaging (homepage, about, services) for
 * message consistency and positioning clarity.
 */
function analyzeWebsiteOnlyConsistency(
  crawlData: CrawlResultV2
): BrandConsistencyResult {
  const pages = crawlData.pages.slice(0, 10);
  const evidence: string[] = [];
  const issues: string[] = [];

  // Extract key positioning copy from homepage, about, and service pages
  const homepage = pages.find(p => p.pageType === "homepage");
  const aboutPage = pages.find(p => p.pageType === "about");
  const servicePages = pages.filter(p => p.pageType === "product" || p.pageType === "landing-page");

  const homepageCopy = homepage
    ? `${homepage.title || ""} ${homepage.h1Tags.join(" ")} ${homepage.h2Tags.slice(0, 4).join(" ")}`
    : "";
  const aboutCopy = aboutPage
    ? `${aboutPage.title || ""} ${aboutPage.h1Tags.join(" ")} ${aboutPage.h2Tags.slice(0, 4).join(" ")}`
    : "";
  const serviceCopy = servicePages.slice(0, 3)
    .map(p => `${p.title || ""} ${p.h1Tags.join(" ")}`).join(" ");

  evidence.push(`Homepage: ${homepageCopy.slice(0, 150)}`);
  if (aboutCopy) evidence.push(`About: ${aboutCopy.slice(0, 150)}`);
  if (serviceCopy) evidence.push(`Services: ${serviceCopy.slice(0, 150)}`);

  // Check if primary messaging is consistent across pages
  const coreTerms = [
    /\b(best|leading|premier|top|trusted|reliable|innovative|powerful|simple|easy|fast|secure|enterprise)\b/i,
    /\b(we\s+(help|enable|empower|provide|deliver|offer))\b.{10,80}/gi,
  ];

  const pageThemes = pages.slice(0, 5).map(p => {
    const text = `${p.title || ""} ${p.h1Tags.join(" ")} ${p.h2Tags.slice(0, 3).join(" ")}`;
    return coreTerms.map(re => {
      const matches = Array.from(text.matchAll(re));
      return matches.map(m => m[0].toLowerCase().trim());
    }).flat();
  });

  // Check for message drift — if different pages emphasize different things
  const uniqueThemes = new Set(pageThemes.flat());
  if (uniqueThemes.size >= 2 && pageThemes[0]?.length > 0) {
    evidence.push(`Core messaging themes detected across pages: ${Array.from(uniqueThemes).slice(0, 5).join(", ")}.`);
  }

  // Check for bot-blocked content that would pollute the analysis
  const isHomepageBlocked = BOT_BLOCK_PATTERNS.some(p => p.test(homepageCopy));
  if (isHomepageBlocked) {
    issues.push("Homepage appears to be a bot-block / anti-crawl page. Extracted content does not reflect actual brand positioning.");
  }

  // Overall alignment score for Level 1: based on page structure, not social
  // If homepage + about + services all exist and have distinct messaging, it's well-structured
  const hasAboutAndHomepage = !!(homepage && aboutPage);
  const hasServicePages = servicePages.length > 0;
  const hasDistinctMessaging = uniqueThemes.size >= 2;

  const structureScore = hasAboutAndHomepage ? 30 : 10;
  const depthScore = hasServicePages ? 20 : 5;
  const messageScore = hasDistinctMessaging ? 25 : 5;
  const signalScore = homepageCopy.length > 100 ? 10 : 0;

  const score = structureScore + depthScore + messageScore + signalScore;

  if (score < 40) {
    issues.push("Limited website content to assess brand consistency — consider adding more pages (about, services, FAQ).");
  }

  const hasIssues = issues.length > 0 && !isHomepageBlocked;

  return {
    status: hasIssues ? "partial-mismatch" : "aligned",
    score: clamp(score, 0, 100),
    confidence: Math.min(100, pages.length * 6 + 30), // Lower baseline confidence for Level 1
    issues,
    evidence: evidence.slice(0, 5),
    evidenceLevel: 1,
  };
}

/**
 * Level 2/3 — website + social positioning comparison.
 */
function compareWebsiteAndSocialPositioning(
  website: SocialAnalysisReport["website_positioning"],
  social: SocialAnalysisReport["social_positioning"],
  themes: Record<string, number>,
  profiles: SocialProfile[],
  platformHealth: PlatformHealth[]
): BrandConsistencyResult {
  const evidenceLevel = determineConsistencyLevel(profiles, platformHealth, themes);

  if (website.signals.length === 0 || Object.keys(themes).length === 0) {
    return {
      status: "insufficient-data",
      score: -1,
      confidence: 15,
      issues: ["Insufficient website or recent social post evidence to compare positioning — data gap, not poor alignment."],
      evidence: [...website.evidence.slice(0, 3), ...social.evidence.slice(0, 3)],
      evidenceLevel,
    };
  }

  const issues: string[] = [];
  if ((website.signals.includes("premium") || website.signals.includes("performance")) && (themes.discount_offer || 0) >= 35) {
    issues.push(`Website positioning emphasizes ${website.signals.join(", ")} while ${themes.discount_offer}% of social posts are discount/offer-led.`);
  }
  if (website.signals.includes("enterprise") && (themes.product || 0) > 50 && (themes.educational || 0) < 15) {
    issues.push(`Website has enterprise signals, but social content is ${themes.product}% product-led and only ${themes.educational || 0}% educational.`);
  }
  if (website.signals.includes("community") && (themes.community || 0) < 10 && (themes.ugc || 0) < 10) {
    issues.push("Website suggests community positioning, but recent social posts show limited community or UGC themes.");
  }

  const score = issues.length === 0 ? 85 : issues.length === 1 ? 55 : 35;
  const platformsWithData = platformHealth.filter(p => p.sampled_posts > 0).length;
  const totalPosts = platformHealth.reduce((s, p) => s + p.sampled_posts, 0);
  // Confidence goes up with more evidence sources
  const confidence = Math.min(100, 40 + platformsWithData * 10 + Math.min(totalPosts, 30));

  return {
    status: issues.length === 0 ? "aligned" : issues.length === 1 ? "partial-mismatch" : "mismatch",
    score,
    confidence,
    issues,
    evidence: [...website.evidence.slice(0, 3), ...social.evidence.slice(0, 3)],
    evidenceLevel,
  };
}

function buildEvidenceSummary(
  platformHealth: PlatformHealth[],
  aggregate: SocialAnalysisReport["aggregate_metrics"],
  alignment: SocialAnalysisReport["brand_alignment"]
): string[] {
  const strongest = [...platformHealth].sort((a, b) => b.social_strength - a.social_strength)[0];
  const weakest = [...platformHealth].sort((a, b) => a.social_strength - b.social_strength)[0];
  const items: string[] = [];

  if (strongest) {
    items.push(`${strongest.platform} is the strongest measured channel with social strength ${strongest.social_strength}/100 and engagement ${formatMetric(strongest.engagement_rate, "%")}.`);
  }
  if (weakest && weakest !== strongest) {
    items.push(`${weakest.platform} is the weakest measured channel with social strength ${weakest.social_strength}/100.`);
  }
  items.push(`${aggregate.platforms_with_metrics} platforms have API/scraped metrics and ${aggregate.platforms_with_posts} platforms include recent post samples.`);
  if (aggregate.platforms_with_metrics === 0 && platformHealth.length > 0) {
    items.push(`All ${platformHealth.length} platforms were discovered via web link analysis only—no API/scraped metrics were available. Scores reflect profile presence, not performance.`);
  }
  if (aggregate.total_followers > 0) {
    items.push(`Measured social audience totals ${aggregate.total_followers.toLocaleString("en")} followers/subscribers.`);
  }
  if (alignment.status !== "aligned") {
    items.push(...alignment.issues);
  }

  return items;
}

function buildWeaknesses(
  breakdown: SocialScoreBreakdown,
  aggregate: SocialAnalysisReport["aggregate_metrics"],
  alignment: SocialAnalysisReport["brand_alignment"],
  themes: Record<string, number>,
  dataAvailability?: SocialAnalysisReport["data_availability"]
): string[] {
  const weaknesses: string[] = [];
  // Only flag low scores when there's actual data to support the assessment
  if (dataAvailability?.engagement && breakdown.engagement < 45) weaknesses.push(`Engagement score is ${breakdown.engagement}/100, indicating low or unavailable interaction relative to audience size.`);
  if (dataAvailability?.consistency && breakdown.consistency < 45) weaknesses.push(`Consistency score is ${breakdown.consistency}/100, indicating posting gaps or missing timestamp data.`);
  if (dataAvailability?.content_quality && breakdown.content_quality < 45) weaknesses.push(`Content quality/diversity score is ${breakdown.content_quality}/100 across sampled posts.`);
  if (dataAvailability?.audience_interaction && breakdown.audience_interaction < 45) weaknesses.push(`Audience interaction score is ${breakdown.audience_interaction}/100 based on comment and reply signals.`);
  if (aggregate.total_sampled_posts === 0) weaknesses.push("No recent post samples were available, so content theme and consistency analysis is limited.");
  if ((themes.other || 0) >= 60) weaknesses.push(`${themes.other}% of sampled posts could not be assigned a specific strategy theme.`);
  // If no platforms have any post data, add a top-level caveat instead of per-dimension weaknesses
  if (aggregate.total_sampled_posts === 0 || dataAvailability?.platforms_with_posts === 0) {
    weaknesses.push("Social metrics are unavailable across all platforms — scores reflect profile discovery only, not performance.");
  }
  weaknesses.push(...alignment.issues);
  return Array.from(new Set(weaknesses));
}

function buildRecommendations(
  breakdown: SocialScoreBreakdown,
  alignment: SocialAnalysisReport["brand_alignment"],
  themes: Record<string, number>,
  dataGaps: string[],
  dataAvailability?: SocialAnalysisReport["data_availability"]
): string[] {
  const recommendations: string[] = [];
  // Only make data-dependent recommendations when actual data is available
  if (dataAvailability?.engagement && breakdown.engagement < 55) recommendations.push("Prioritize formats and topics with measurable comment/like lift before increasing posting volume.");
  if (dataAvailability?.consistency && breakdown.consistency < 55) recommendations.push("Build a weekly publishing cadence and reduce long gaps between posts.");
  if (dataAvailability?.content_quality && breakdown.content_quality < 55) recommendations.push("Increase format diversity across video, carousel/image, educational, testimonial, and community proof posts.");
  if (dataAvailability?.audience_interaction && breakdown.audience_interaction < 55) recommendations.push("Add explicit comment prompts, reply workflows, and community-led post formats to lift interaction quality.");
  if ((themes.educational || 0) < 15 && dataAvailability?.content_quality) recommendations.push("Add more educational posts tied to website product/category messaging.");
  if ((themes.testimonials || 0) < 10 && (themes.ugc || 0) < 10 && dataAvailability?.content_quality) recommendations.push("Add customer proof through UGC, testimonials, or case-study snippets.");
  if (alignment.status === "partial-mismatch" || alignment.status === "mismatch") {
    recommendations.push("Realign the social content mix with the website positioning before scaling paid amplification.");
  }
  if (dataGaps.length > 0 && dataGaps.length === dataAvailability?.total_platforms) {
    recommendations.push("Social metrics are unavailable across all detected platforms. Set up SOCIALDATA_API_KEY and APIFY_API_TOKEN to enable data-driven recommendations.");
  } else if (dataGaps.length > 0) {
    recommendations.push("Resolve remaining social data gaps before making channel budget decisions.");
  }
  return Array.from(new Set(recommendations)).slice(0, 8);
}

function buildDataGaps(profiles: SocialProfile[], platformHealth: PlatformHealth[]): string[] {
  const gaps: string[] = [];
  if (profiles.length === 0) gaps.push("No social profiles were discovered.");
  for (const platform of platformHealth) {
    if (platform.data_source === "profile-discovery-only") {
      gaps.push(`${platform.platform}: API metrics unavailable.`);
    }
    if (platform.sampled_posts === 0) {
      gaps.push(`${platform.platform}: no recent post samples available from Apify/SocialData.`);
    }
    if (platform.engagement_rate === "not available") {
      gaps.push(`${platform.platform}: engagement rate unavailable because follower and interaction data are incomplete.`);
    }
  }
  return Array.from(new Set(gaps));
}

function buildPlatformEvidence(
  profile: SocialProfile,
  engagementRate: number | undefined,
  frequency: number | undefined,
  themes: Record<string, number>,
  breakdown: SocialScoreBreakdown
): string[] {
  const evidence: string[] = [];
  const metrics = profile.metrics;
  if (metrics?.followers !== undefined) evidence.push(`${displayPlatform(profile.platform)} followers: ${metrics.followers.toLocaleString("en")}.`);
  if (engagementRate !== undefined) evidence.push(`${displayPlatform(profile.platform)} engagement rate: ${round(engagementRate * 100, 2)}%.`);
  if (frequency !== undefined) evidence.push(`${displayPlatform(profile.platform)} posting frequency: ${round(frequency, 2)} posts/week.`);
  const dominantTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0];
  if (dominantTheme) evidence.push(`${displayPlatform(profile.platform)} dominant theme: ${dominantTheme[0]} (${dominantTheme[1]}%).`);
  evidence.push(`${displayPlatform(profile.platform)} computed score breakdown: engagement ${breakdown.engagement}, consistency ${breakdown.consistency}, content quality ${breakdown.content_quality}, audience interaction ${breakdown.audience_interaction}, growth potential ${breakdown.growth_potential}.`);
  return evidence;
}

function averageMetric(posts: SocialPost[], key: "likes" | "comments" | "views" | "replies"): number | undefined {
  const values = posts
    .map(post => post[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function postPreview(post: SocialPost): PlatformHealth["sampled_posts_preview"][number] {
  return {
    date: post.createdAt,
    type: post.type,
    text: post.text?.slice(0, 220),
    likes: post.likes,
    comments: post.comments,
    views: post.views,
    hashtags: post.hashtags?.slice(0, 8),
  };
}

function percentDistribution(counts: Record<string, number>): Record<string, number> {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return {};
  return Object.fromEntries(
    Object.entries(counts)
      .map(([key, count]) => [key, Math.round((count / total) * 100)])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
  );
}

function parsePostDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function numberOrUnavailable(value: number | undefined): number | "not available" {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : "not available";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function displayPlatform(platform: string): string {
  return platform === "X/Twitter" ? "Twitter/X" : platform;
}

function formatMetric(value: number | "not available", suffix = ""): string {
  return typeof value === "number" ? `${value}${suffix}` : value;
}