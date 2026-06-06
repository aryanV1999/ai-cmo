/**
 * Social data provider integrations.
 *
 * Apify is used for multi-platform profile scraping when APIFY_API_TOKEN is set.
 * A web-scrape fallback extracts follower data from public pages (LinkedIn,
 * Twitter syndication, YouTube, Instagram).
 */

import {
  extractUsernameFromSocialUrl,
  type SocialPost,
  type SocialProfile,
  type SocialProfileMetrics,
} from "./brand-research";

type AnyRecord = Record<string, unknown>;

// ─────────────────────────────────────────
// Logging helper — shows provider prefix, domain context, and error details
// so the user can diagnose which API call is failing and why.
// ─────────────────────────────────────────
function logProviderInfo(label: string, message: string): void {
  console.log(`[Social/${label}] ${message}`);
}

function logProviderError(label: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Social/${label}] ${message}`);
}

export async function enrichSocialProfiles(
  profiles: SocialProfile[]
): Promise<SocialProfile[]> {
  const enriched = profiles.map((profile) => ({
    ...profile,
    username: profile.username || extractUsernameFromSocialUrl(profile.url),
  }));

  // Log which keys are available so the user can confirm env is loaded
  if (process.env.APIFY_API_TOKEN) {
    logProviderInfo("Config", `APIFY_API_TOKEN found (${process.env.APIFY_API_TOKEN.slice(0, 8)}...). Multi-platform enrichment enabled.`);
  } else {
    logProviderInfo("Config", "APIFY_API_TOKEN not set. Set it in your .env file to enable multi-platform social scraping.");
  }

  const [apifyProfiles, webScrapeProfiles] = await Promise.all([
    enrichWithApify(enriched),
    enrichWithWebScrape(enriched),
  ]);

  // Report how many profiles were enriched
  const apifyCount = apifyProfiles.size;
  const webScrapeCount = webScrapeProfiles.size;
  const allKeys = Array.from(apifyProfiles.keys())
    .concat(Array.from(webScrapeProfiles.keys()));
  const totalEnriched = new Set(allKeys).size;
  logProviderInfo("Summary", `${apifyCount} Apify, ${webScrapeCount} web-scrape profiles, ${totalEnriched} total enriched.`);

  return mergeProfileMetrics(enriched, apifyProfiles, webScrapeProfiles);
}



async function enrichWithApify(
  profiles: SocialProfile[]
): Promise<Map<string, SocialProfileMetrics>> {
  const metrics = new Map<string, SocialProfileMetrics>();
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return metrics;

  // Run per-platform Apify actors in parallel
  await Promise.all([
    scrapeInstagramViaApify(profiles, token, metrics),
    scrapeTwitterViaApify(profiles, token, metrics),
    scrapeYouTubeViaApify(profiles, token, metrics),
    scrapeTikTokViaApify(profiles, token, metrics),
  ]);

  logProviderInfo("Apify/Summary", `${metrics.size} profiles enriched via Apify.`);
  return metrics;
}

// ---------------------------------------------------------------------------
// Generic Apify actor caller — handles the HTTP request, error logging,
// and dataset fetching. Returns null on failure (logs details).
// ---------------------------------------------------------------------------
async function callApifyActor(
  actorId: string,
  token: string,
  input: Record<string, unknown>,
  label: string
): Promise<AnyRecord[] | null> {
  const apiActorId = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${apiActorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&waitForFinish=30`;

  try {
    logProviderInfo(`Apify/${label}`, `Calling ${actorId}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(body not readable)");
      logProviderInfo(`Apify/${label}`, `HTTP ${response.status}: ${response.statusText}`);
      // Check for monthly limit error
      if (errorBody.includes("usage hard limit") || errorBody.includes("platform-feature-disabled")) {
        logProviderInfo(`Apify/${label}`, "⚠️ APIFY MONTHLY USAGE LIMIT EXCEEDED. Upgrade at console.apify.com or rely on web-scrape fallback.");
      } else {
        logProviderInfo(`Apify/${label}`, errorBody.slice(0, 300));
      }
      return null;
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      // Non-array response (error object, empty object, etc.)
      logProviderInfo(`Apify/${label}`, `Unexpected response type: ${typeof items}. Expected array.`);
      if (items && typeof items === "object" && "error" in items) {
        const errObj = (items as AnyRecord).error as AnyRecord | undefined;
        const msg = String(errObj?.message || JSON.stringify(errObj)).slice(0, 300);
        logProviderInfo(`Apify/${label}`, `Actor error: ${msg}`);
        if (msg.includes("usage hard limit") || msg.includes("platform-feature-disabled")) {
          logProviderInfo(`Apify/${label}`, "⚠️ APIFY MONTHLY USAGE LIMIT EXCEEDED.");
        }
      }
      return null;
    }

    logProviderInfo(`Apify/${label}`, `${items.length} result items.`);
    return items as AnyRecord[];
  } catch (error) {
    logProviderError(`Apify/${label}`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Instagram — apify/instagram-profile-scraper
// Input: { usernames: string[] }
// Output: [{ username, fullName, biography, followersCount, followsCount,
//            postsCount, isBusinessAccount, verified, latestPosts }]
// ---------------------------------------------------------------------------
async function scrapeInstagramViaApify(
  profiles: SocialProfile[],
  token: string,
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(p => p.platform === "Instagram" && p.username);
  if (targets.length === 0) return;

  const actorId = process.env.APIFY_INSTAGRAM_ACTOR_ID || "apify/instagram-profile-scraper";
  const result = await callApifyActor(
    actorId,
    token,
    { usernames: targets.map(p => p.username!) },
    "Instagram"
  );
  if (!result) return;

  for (const item of result) {
    const username = String(item.username || "").toLowerCase();
    const target = targets.find(p => p.username?.toLowerCase() === username);
    if (!target) continue;

    const latestPosts: SocialPost[] = (firstArray(item, ["latestPosts"]) || [])
      .filter(isRecord)
      .map(normalizePost);

    logProviderInfo(
      `Apify/Instagram`,
      `@${username}: ${String(item.followersCount ?? "?")} followers, ${latestPosts.length} posts sampled`
    );

    metrics.set(profileKey(target), compactMetrics({
      followers: numberFrom(item.followersCount),
      following: numberFrom(item.followsCount),
      posts: numberFrom(item.postsCount),
      recentPosts: latestPosts.length,
      avgLikes: averagePostMetric(latestPosts, "likes"),
      avgComments: averagePostMetric(latestPosts, "comments"),
      verified: Boolean(item.verified),
      bio: stringFrom(item.biography),
      sampledPosts: latestPosts.length > 0 ? latestPosts : undefined,
      dataSource: "apify",
    }));
  }
}

// ---------------------------------------------------------------------------
// Twitter/X — apidojo/tweet-scraper
// Input: { usernames: string[], maxItems: number,
//          proxyConfiguration: { useApifyProxy: boolean } }
// Output: Array of tweet objects each containing user info:
//         { user: { userName, followersCount, friendsCount,
//                   statusesCount, fullName, bio, isVerified },
//           fullText, createdAt, retweetCount, replyCount,
//           likeCount, quoteCount }
// ---------------------------------------------------------------------------
async function scrapeTwitterViaApify(
  profiles: SocialProfile[],
  token: string,
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(p =>
    (p.platform === "X/Twitter") && p.username
  );
  if (targets.length === 0) return;

  const MAX_POSTS = Number(process.env.SOCIAL_RECENT_POST_LIMIT || 10);

  const actorId = process.env.APIFY_TWITTER_ACTOR_ID || "apidojo/tweet-scraper";
  const result = await callApifyActor(
    actorId,
    token,
    {
      usernames: targets.map(p => p.username!),
      maxItems: Math.max(MAX_POSTS, 5),
      proxyConfiguration: { useApifyProxy: true },
    },
    "Twitter"
  );
  if (!result) return;

  // Group tweets by user — extract user info from first tweet of each user
  const userTweets = new Map<string, AnyRecord[]>();
  for (const item of result) {
    const user = item.user as AnyRecord | undefined;
    const userName = String(user?.userName || "").toLowerCase().replace(/^@/, "");
    if (!userName) continue;
    const tweets = userTweets.get(userName) || [];
    tweets.push(item);
    userTweets.set(userName, tweets);
  }

  for (const entry of Array.from(userTweets)) {
    const [userName, tweets] = entry;
    const target = targets.find((p: SocialProfile) => p.username?.toLowerCase() === userName);
    if (!target) continue;

    // Extract user info from first tweet
    const user = tweets[0]?.user as AnyRecord | undefined;
    if (!user) continue;

    const sampledPosts: SocialPost[] = tweets
      .filter(isRecord)
      .map(normalizePost)
      .filter((p: SocialPost) => p.text || p.likes !== undefined || p.comments !== undefined)
      .slice(0, MAX_POSTS);

    logProviderInfo(
      `Apify/Twitter`,
      `@${userName}: ${String(user.followersCount ?? "?")} followers, ${sampledPosts.length} tweets sampled`
    );

    metrics.set(profileKey(target), compactMetrics({
      followers: numberFrom(user.followersCount),
      following: numberFrom(user.friendsCount),
      posts: numberFrom(user.statusesCount),
      recentPosts: sampledPosts.length,
      avgLikes: averagePostMetric(sampledPosts, "likes"),
      avgComments: averagePostMetric(sampledPosts, "comments"),
      verified: Boolean(user.isVerified),
      bio: stringFrom(user.bio || user.description),
      sampledPosts: sampledPosts.length > 0 ? sampledPosts : undefined,
      dataSource: "apify",
    }));
  }
}

// ---------------------------------------------------------------------------
// YouTube — streamers/youtube-scraper
// Input: { startUrls: string[], maxResults: number }
// Output: Channel objects with { subscriberCount, title, description,
//         viewCount, videoCount }
// ---------------------------------------------------------------------------
async function scrapeYouTubeViaApify(
  profiles: SocialProfile[],
  token: string,
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(p =>
    p.platform === "YouTube" && p.username
  );
  if (targets.length === 0) return;

  const MAX_VIDEOS = Number(process.env.SOCIAL_RECENT_POST_LIMIT || 5);

  // Build startUrls — use the profile URL or construct from handle
  const startUrls = targets.map(p => p.url).filter(Boolean);
  if (startUrls.length === 0) return;

  const actorId = process.env.APIFY_YOUTUBE_ACTOR_ID || "streamers/youtube-scraper";
  const result = await callApifyActor(
    actorId,
    token,
    {
      startUrls: startUrls.map(url => ({ url, method: "GET" })),
      maxResults: Math.max(MAX_VIDEOS, 5),
    },
    "YouTube"
  );
  if (!result) return;

  // Each result item has channel info at the top level
  for (const item of result) {
    // Try to match by handle or channel URL
    const channelUrl = String(item.channelUrl || item.url || "").toLowerCase();
    const channelName = String(item.channelName || item.title || "").toLowerCase();
    const target = targets.find(p =>
      channelUrl.includes(new URL(p.url).hostname + new URL(p.url).pathname.replace(/\/$/, "")) ||
      channelName.includes(p.username!.toLowerCase().replace(/^@/, ""))
    );
    if (!target) continue;

    // Extract videos as sampled posts
    const videosArr = firstArray(item, ["videos"]);
    const videos: SocialPost[] = (videosArr || [])
      .filter(isRecord)
      .map(normalizePost);

    logProviderInfo(
      `Apify/YouTube`,
      `${item.title ?? "?"}: ${String(item.subscriberCount ?? "?")} subscribers`
    );

    metrics.set(profileKey(target), compactMetrics({
      followers: numberFrom(item.subscriberCount),
      posts: numberFrom(item.videoCount || (videosArr ? videosArr.length : undefined)),
      recentPosts: videos.length,
      avgLikes: averagePostMetric(videos, "likes"),
      avgComments: averagePostMetric(videos, "comments"),
      avgViews: averagePostMetric(videos, "views"),
      bio: stringFrom(item.description),
      sampledPosts: videos.length > 0 ? videos : undefined,
      dataSource: "apify",
    }));
  }
}

// ---------------------------------------------------------------------------
// TikTok — clockworks/tiktok-scraper
// Input: { profiles: string[], resultsPerPage: number }
// Output: Array of video/post objects; user info in authorMeta:
//         { authorMeta: { name, fans, following, heart, video, digg },
//           text, playCount, diggCount, commentCount, shareCount, createTime }
// ---------------------------------------------------------------------------
async function scrapeTikTokViaApify(
  profiles: SocialProfile[],
  token: string,
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(p =>
    p.platform === "TikTok" && p.username
  );
  if (targets.length === 0) return;

  const actorId = process.env.APIFY_TIKTOK_ACTOR_ID || "clockworks/tiktok-scraper";
  const result = await callApifyActor(
    actorId,
    token,
    {
      profiles: targets.map(p => p.username!),
      resultsPerPage: Number(process.env.SOCIAL_RECENT_POST_LIMIT || 5),
    },
    "TikTok"
  );
  if (!result) return;

  // Group by profile — each item has authorMeta
  const profileVideos = new Map<string, AnyRecord[]>();
  for (const item of result) {
    const authorMeta = item.authorMeta as AnyRecord | undefined;
    const name = String(authorMeta?.name || "").toLowerCase().replace(/^@/, "");
    if (!name) continue;
    const videos = profileVideos.get(name) || [];
    videos.push(item);
    profileVideos.set(name, videos);
  }

  for (const entry of Array.from(profileVideos)) {
    const [name, videos] = entry;
    const target = targets.find((p: SocialProfile) => p.username?.toLowerCase() === name);
    if (!target) continue;

    const authorMeta = videos[0]?.authorMeta as AnyRecord | undefined;
    if (!authorMeta) continue;

    const sampledPosts: SocialPost[] = videos
      .filter(isRecord)
      .map(normalizePost);

    logProviderInfo(
      `Apify/TikTok`,
      `@${name}: ${String(authorMeta.fans ?? "?")} followers, ${sampledPosts.length} videos sampled`
    );

    metrics.set(profileKey(target), compactMetrics({
      followers: numberFrom(authorMeta.fans),
      following: numberFrom(authorMeta.following),
      posts: numberFrom(authorMeta.video),
      recentPosts: sampledPosts.length,
      avgLikes: averagePostMetric(sampledPosts, "likes"),
      avgComments: averagePostMetric(sampledPosts, "comments"),
      avgViews: averagePostMetric(sampledPosts, "views"),
      sampledPosts: sampledPosts.length > 0 ? sampledPosts : undefined,
      dataSource: "apify",
    }));
  }
}

function mergeProfileMetrics(
  baseProfiles: SocialProfile[],
  apify: Map<string, SocialProfileMetrics>,
  webScrape: Map<string, SocialProfileMetrics>
): SocialProfile[] {
  return baseProfiles.map((profile) => {
    const key = profileKey(profile);
    const apifyMetrics = apify.get(key);
    const webScrapeMetrics = webScrape.get(key);
    // Prefer Apify data over web-scraped; fall back to web-scrape
    const mergedMetrics = apifyMetrics || webScrapeMetrics;

    return {
      ...profile,
      metrics: mergedMetrics,
      confidence: apifyMetrics
        ? Math.max(profile.confidence, 92)
        : webScrapeMetrics
          ? Math.max(profile.confidence, 75)
          : profile.confidence,
    };
  });
}

function profileKey(profile: SocialProfile): string {
  return `${profile.platform}:${profile.username || extractUsernameFromSocialUrl(profile.url) || profile.url}`.toLowerCase();
}



function numberFrom(value: unknown): number | undefined {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function firstNumber(data: AnyRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = numberFrom(data[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function firstString(data: AnyRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringFrom(data[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function firstBoolean(data: AnyRecord, keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (typeof data[key] === "boolean") return data[key] as boolean;
  }
  return undefined;
}

function firstArrayLength(data: AnyRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    if (Array.isArray(data[key])) return (data[key] as unknown[]).length;
  }
  return undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactMetrics(metrics: SocialProfileMetrics): SocialProfileMetrics {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => value !== undefined && value !== "")
  ) as SocialProfileMetrics;
}



async function enrichWithWebScrape(
  profiles: SocialProfile[]
): Promise<Map<string, SocialProfileMetrics>> {
  const metrics = new Map<string, SocialProfileMetrics>();

  // Target platforms that have publicly accessible data without authentication:
  // - LinkedIn company pages: follower counts in meta tags and JSON-LD
  // - Twitter/X: follower counts via public syndication API (no auth needed)
  // - YouTube: subscriber counts in JSON-LD on channel pages
  // - Instagram: oEmbed API for bio/name; HTML fallback for any metadata
  // - Facebook: not crawlable without login — skip
  const handlers = [
    scrapeLinkedIn,
    scrapeTwitter,
    scrapeYouTube,
    scrapeInstagram,
  ];

  await Promise.all(handlers.map(handler => handler(profiles, metrics)));

  return metrics;
}

async function scrapeLinkedIn(
  profiles: SocialProfile[],
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(profile =>
    /linkedin\.com\/company\//i.test(profile.url)
  );

  await Promise.all(targets.map(async (profile) => {
    const result = await webScrapePage(profile);
    if (!result) return;

    let followers: number | undefined;

    // Pattern A: Title contains "| 10,001 followers on LinkedIn"
    const titleFollowerMatch = result.title.match(/([\d,]+)\s*followers?/i);
    if (titleFollowerMatch) {
      followers = parseInt(titleFollowerMatch[1].replace(/,/g, ""), 10);
    }

    // Pattern B: Meta description contains follower count
    if (!followers) {
      const descFollowerMatch = result.description.match(/([\d,]+)\s*followers?/i);
      if (descFollowerMatch) {
        followers = parseInt(descFollowerMatch[1].replace(/,/g, ""), 10);
      }
    }

    // Pattern C: JSON-LD with interactionStatistic
    if (!followers) {
      followers = extractFollowerFromJSONLD(result.jsonldBlocks);
    }

    storeWebScrapeResult(metrics, profile, followers, result.description || result.title);
  }));
}

async function scrapeTwitter(
  profiles: SocialProfile[],
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  // Twitter/X has a public syndication endpoint that returns follower count
  // without authentication: https://cdn.syndication.twimg.com/widgets/followbutton/info.json
  const targets = profiles.filter(profile =>
    /twitter\.com|x\.com/i.test(profile.url) && profile.username
  );

  if (targets.length === 0) return;

  const screenNames = targets
    .map(p => p.username)
    .filter((name): name is string => Boolean(name));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(screenNames.join(","))}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      logProviderInfo("WebScrape/Twitter", `Syndication API HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return;

    for (const item of data) {
      const screenName = String(item.screen_name || "").toLowerCase();
      const target = targets.find(p =>
        p.username?.toLowerCase() === screenName
      );
      if (!target) continue;

      const followers = numberFrom(item.followers_count);
      const following = numberFrom(item.friends_count);
      const posts = numberFrom(item.statuses_count);
      const bio = stringFrom(item.description);

      if (followers !== undefined) {
        logProviderInfo(
          `WebScrape/Twitter`,
          `Extracted ${followers} followers for @${screenName}`
        );
      }

      metrics.set(profileKey(target), compactMetrics({
        followers,
        following,
        posts,
        bio,
        dataSource: "web-scrape",
      }));
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("abort")) {
      logProviderInfo("WebScrape/Twitter", "Timeout fetching syndication data");
    } else {
      logProviderError("WebScrape/Twitter", error);
    }
  }
}

async function scrapeYouTube(
  profiles: SocialProfile[],
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(profile =>
    /youtube\.com/i.test(profile.url) &&
    /\/@|\/channel\/|\/user\/|\/c\//i.test(profile.url)
  );

  await Promise.all(targets.map(async (profile) => {
    const result = await webScrapePage(profile);
    if (!result) return;

    let followers: number | undefined;

    // YouTube stores subscriber count in JSON-LD as interactionStatistic
    followers = extractFollowerFromJSONLD(result.jsonldBlocks);

    // Fallback: try to parse subscriber count from meta or og tags
    if (!followers) {
      const subMatch = result.description.match(
        /([\d.]+[KMB]?)\s*(?:subscribers?|subs?)/i
      );
      if (subMatch) {
        followers = parseCompactNumber(subMatch[1]);
      }
    }

    storeWebScrapeResult(metrics, profile, followers, result.description || result.title);
  }));
}

async function scrapeInstagram(
  profiles: SocialProfile[],
  metrics: Map<string, SocialProfileMetrics>
): Promise<void> {
  const targets = profiles.filter(profile =>
    /instagram\.com/i.test(profile.url) && profile.username
  );

  await Promise.all(targets.map(async (profile) => {
    // Strategy 1: Try oEmbed API — returns author_name and title (bio snippet)
    const oembed = await fetchInstagramOEmbed(profile);
    if (oembed) {
      logProviderInfo(
        `WebScrape/Instagram`,
        `oEmbed data for @${profile.username}: ${oembed.authorName}`
      );
      metrics.set(profileKey(profile), compactMetrics({
        bio: oembed.bio || oembed.authorName || undefined,
        dataSource: "web-scrape",
      }));
      return;
    }

    // Strategy 2: Try to parse the HTML profile page for any useful metadata.
    // Instagram pages are mostly JS-rendered, but may still have basic meta tags
    // and occasionally encoded initial state data.
    const result = await webScrapePage(profile, true);
    if (!result) return;

    // Try to find a meta description or og:description
    let bio = result.description || result.title || "";

    // Instagram sometimes includes profile data in a sharedData script tag
    const sharedData = extractInstagramSharedData(result.fullHtml!);
    if (sharedData) {
      const entryData = (sharedData as Record<string, unknown>)?.entry_data as Record<string, unknown> | undefined;
      const profilePage = (entryData?.ProfilePage as Array<Record<string, unknown>> | undefined)?.[0];
      const graphql = profilePage?.graphql as Record<string, unknown> | undefined;
      const instaUser = graphql?.user as Record<string, unknown> | undefined;
      if (instaUser) {
        const followers = numberFrom(instaUser.follower_count);
        const following = numberFrom(instaUser.following_count);
        const posts = numberFrom(instaUser.media_count);
        const igBio = stringFrom(instaUser.biography);

        if (followers || igBio) {
          logProviderInfo(
            `WebScrape/Instagram`,
            `Extracted ${followers ?? "?"} followers for @${profile.username}`
          );
        }

        metrics.set(profileKey(profile), compactMetrics({
          followers,
          following,
          posts,
          bio: igBio || bio || undefined,
          dataSource: "web-scrape",
        }));
        return;
      }
    }

    // Strategy 3: Fall back to whatever meta data we could extract
    if (bio) {
      storeWebScrapeResult(metrics, profile, undefined, bio);
    } else {
      logProviderInfo(
        `WebScrape/Instagram`,
        `No data extractable for ${profile.url} — Instagram pages are JS-rendered`
      );
    }
  }));
}

async function fetchInstagramOEmbed(
  profile: SocialProfile
): Promise<{ authorName: string; bio?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // The oEmbed endpoint sometimes works for profile URLs, though designed for posts
    const response = await fetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(profile.url)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;
    const authorName = stringFrom(data.author_name);
    if (!authorName) return null;

    // oEmbed returns a `title` field that sometimes includes the bio
    const title = stringFrom(data.title);

    return { authorName, bio: title || undefined };
  } catch {
    return null;
  }
}

function extractInstagramSharedData(html: string): Record<string, unknown> | null {
  // Instagram embeds initial page data in a script tag like:
  // <script type="text/javascript">window.__INITIAL_STATE__ = {...};</script>
  // or as: window._sharedData = {...};
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\._sharedData\s*=\s*(\{[\s\S]*?\});/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      return JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

// ─────────────────────────────────────────
// Shared HTML fetcher — returns parsed title, description, JSON-LD blocks,
// and optionally the raw full HTML (only when `includeFullHtml` is set,
// used by Instagram handler which needs deep page parsing).
// ─────────────────────────────────────────
async function webScrapePage(
  profile: SocialProfile,
  includeFullHtml?: boolean
): Promise<{
  title: string;
  description: string;
  jsonldBlocks: string[];
  fullHtml?: string;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(profile.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logProviderInfo(
        `WebScrape/${profile.platform}`,
        `HTTP ${response.status} — cannot extract profile data`
      );
      return null;
    }

    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch?.[1] || "";

    const descMatch = html.match(
      /<meta\s+(?:name|property)="?(?:description|og:description)"?\s+content="([^"]*)"/i
    );
    const description = descMatch?.[1] || "";

    // Collect all JSON-LD blocks
    const jsonldBlocks: string[] = [];
    const scriptRegex =
      /<script\s+type=["']application\/ld\+json["'][^>]*>([^<]*)<\/script>/gi;
    let scriptMatch: RegExpExecArray | null;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      try {
        JSON.parse(scriptMatch[1]); // validate it's parseable
        jsonldBlocks.push(scriptMatch[1]);
      } catch {
        // skip invalid JSON
      }
    }

    return { title, description, jsonldBlocks, fullHtml: html };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("abort")) {
      logProviderInfo(`WebScrape/${profile.platform}`, `Timeout scraping ${profile.url}`);
    } else {
      logProviderError(`WebScrape/${profile.platform}`, error);
    }
    return null;
  }
}

function extractFollowerFromJSONLD(jsonldBlocks: string[]): number | undefined {
  for (const block of jsonldBlocks) {
    try {
      const json = JSON.parse(block);
      // Handle array structure (multiple JSON-LD objects on the page)
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const main = item?.mainEntity || item;
        const stats = main?.interactionStatistic || [];
        const statArr = Array.isArray(stats) ? stats : [stats];
        for (const stat of statArr) {
          if (
            stat?.interactionType?.includes?.("Follow") &&
            stat?.userInteractionCount
          ) {
            const count =
              typeof stat.userInteractionCount === "number"
                ? stat.userInteractionCount
                : parseInt(stat.userInteractionCount, 10);
            if (!isNaN(count) && count > 0) return count;
          }
        }
      }
    } catch {
      // skip invalid JSON
    }
  }
  return undefined;
}

function storeWebScrapeResult(
  metrics: Map<string, SocialProfileMetrics>,
  profile: SocialProfile,
  followers: number | undefined,
  bio: string
): void {
  if (followers !== undefined && followers > 0) {
    logProviderInfo(
      `WebScrape/${profile.platform}`,
      `Extracted ${followers} followers from ${profile.url}`
    );
  }

  if (followers !== undefined || bio) {
    metrics.set(profileKey(profile), compactMetrics({
      followers,
      bio: bio || undefined,
      dataSource: "web-scrape",
    }));
  }
}

function parseCompactNumber(value: string): number | undefined {
  const num = parseFloat(value.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return undefined;
  if (/[Kk]/.test(value)) return Math.round(num * 1000);
  if (/[Mm]/.test(value)) return Math.round(num * 1000000);
  if (/[Bb]/.test(value)) return Math.round(num * 1000000000);
  return Math.round(num);
}



function normalizePost(post: AnyRecord): SocialPost {
  const text = firstString(post, [
    "caption",
    "text",
    "full_text",
    "description",
    "title",
    "postText",
    "message",
  ]);
  const createdAt = firstString(post, [
    "createdAt",
    "tweet_created_at",
    "timestamp",
    "date",
    "postedAt",
    "publishedAt",
    "uploadDate",
    "takenAt",
  ]);
  const type = firstString(post, [
    "type",
    "mediaType",
    "contentType",
    "productType",
    "format",
  ]);

  return compactPost({
    id: firstString(post, ["id", "postId", "shortCode", "code"]),
    url: firstString(post, ["url", "postUrl", "link", "permalink"]),
    text,
    type,
    createdAt,
    likes: firstNumber(post, ["likes", "likeCount", "likesCount", "diggCount", "favorite_count", "favoriteCount"]),
    comments: firstNumber(post, ["comments", "commentCount", "commentsCount", "reply_count"]),
    views: firstNumber(post, ["views", "viewCount", "playCount", "videoViewCount", "views_count"]),
    shares: firstNumber(post, ["shares", "shareCount", "sharesCount", "retweet_count", "quote_count"]),
    replies: firstNumber(post, ["replies", "replyCount", "authorReplyCount", "reply_count"]),
    hashtags: extractHashtags(post, text),
  });
}

function extractHashtags(post: AnyRecord, text?: string): string[] {
  const rawTags = firstArray(post, ["hashtags", "tags"]);
  const tags = new Set<string>();

  if (rawTags) {
    for (const tag of rawTags) {
      if (typeof tag === "string") tags.add(cleanHashtag(tag));
      if (isRecord(tag)) {
        const value = firstString(tag, ["name", "tag", "text"]);
        if (value) tags.add(cleanHashtag(value));
      }
    }
  }

  for (const match of text?.match(/#[A-Za-z0-9_]+/g) || []) {
    tags.add(cleanHashtag(match));
  }

  return Array.from(tags).filter(Boolean).slice(0, 12);
}

function cleanHashtag(value: string): string {
  return value.replace(/^#/, "").trim().toLowerCase();
}



function firstArray(data: AnyRecord, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  return undefined;
}

function averagePostMetric(posts: SocialPost[], key: "likes" | "comments" | "views"): number | undefined {
  const values = posts
    .map((post) => post[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return undefined;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function compactPost(post: SocialPost): SocialPost {
  return Object.fromEntries(
    Object.entries(post).filter(([, value]) => {
      if (value === undefined || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  ) as SocialPost;
}
