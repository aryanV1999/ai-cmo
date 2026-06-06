/**
 * Marketing Channel Analyzer
 * Detects and assesses presence and quality of marketing channels
 */

import { CrawlResult, CrawledPage } from "../crawler";

export interface ChannelStatus {
  channel: string;
  status: "present" | "missing" | "outdated" | "weak";
  quality: "good" | "needs-work" | "poor" | "unknown";
  details: string;
  url?: string;
  recommendations: string[];
}

export interface ChannelFinding {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  impact: string;
  howToFix: string;
  data?: Record<string, unknown>;
  score: number;
}

export interface ChannelResult {
  score: number;
  channels: ChannelStatus[];
  findings: ChannelFinding[];
  summary: {
    presentChannels: number;
    missingChannels: number;
    channelsCoverage: number;
  };
}

export function analyzeMarketingChannels(crawlData: CrawlResult): ChannelResult {
  const channels: ChannelStatus[] = [];
  const findings: ChannelFinding[] = [];

  // Check each marketing channel
  channels.push(analyzeBlog(crawlData));
  channels.push(analyzeSocialProfiles(crawlData));
  channels.push(analyzeEmailCapture(crawlData));
  channels.push(analyzeGoogleBusiness(crawlData));
  channels.push(analyzeReviewPlatforms(crawlData));

  // Generate findings from channel analysis
  findings.push(...generateChannelFindings(channels));

  // Calculate summary
  const presentChannels = channels.filter(
    (c) => c.status === "present" || c.status === "weak"
  ).length;
  const missingChannels = channels.filter((c) => c.status === "missing").length;
  const channelsCoverage = Math.round((presentChannels / channels.length) * 100);

  // Calculate score
  const channelScores: number[] = channels.map((c) => {
    if (c.status === "present" && c.quality === "good") return 100;
    if (c.status === "present" && c.quality === "needs-work") return 70;
    if (c.status === "weak" || c.quality === "poor") return 40;
    if (c.status === "outdated") return 30;
    return 0;
  });
  const score = Math.round(
    channelScores.reduce((sum, s) => sum + s, 0) / channels.length
  );

  return {
    score,
    channels,
    findings,
    summary: {
      presentChannels,
      missingChannels,
      channelsCoverage,
    },
  };
}

function analyzeBlog(crawlData: CrawlResult): ChannelStatus {
  const blogPaths = ["/blog", "/articles", "/news", "/resources", "/insights"];
  const blogPages = crawlData.pages.filter((p) =>
    blogPaths.some((path) => p.url.toLowerCase().includes(path))
  );

  if (blogPages.length === 0) {
    return {
      channel: "Blog",
      status: "missing",
      quality: "unknown",
      details: "No blog section detected on your website.",
      recommendations: [
        "Create a blog section to target informational keywords",
        "Start with 2-4 posts per month on topics your audience cares about",
        "Focus on solving problems your customers have",
      ],
    };
  }

  // Check blog quality indicators
  const avgWordCount =
    blogPages.reduce((sum, p) => sum + p.wordCount, 0) / blogPages.length;
  const hasRecentContent = blogPages.some((p) => p.wordCount > 500);

  if (blogPages.length < 5) {
    return {
      channel: "Blog",
      status: "weak",
      quality: "needs-work",
      details: `Found ${blogPages.length} blog posts. This is a start, but you need more content.`,
      url: blogPages[0]?.url,
      recommendations: [
        "Aim for at least 20-30 blog posts to establish topical authority",
        "Create a content calendar and publish consistently",
        "Focus on long-form, comprehensive content (1500+ words)",
      ],
    };
  }

  if (avgWordCount < 500) {
    return {
      channel: "Blog",
      status: "present",
      quality: "poor",
      details: `Found ${blogPages.length} posts, but average length is only ${Math.round(avgWordCount)} words.`,
      url: blogPages[0]?.url,
      recommendations: [
        "Expand thin posts to at least 1000-1500 words",
        "Add more depth, examples, and actionable advice",
        "Include images, videos, and other media",
      ],
    };
  }

  return {
    channel: "Blog",
    status: "present",
    quality: avgWordCount > 1000 ? "good" : "needs-work",
    details: `Found ${blogPages.length} blog posts with average length of ${Math.round(avgWordCount)} words.`,
    url: blogPages[0]?.url,
    recommendations:
      avgWordCount > 1000
        ? ["Keep publishing consistently", "Promote content through social and email"]
        : ["Aim for longer-form content (1500+ words)", "Add more detail and depth"],
  };
}

function analyzeSocialProfiles(crawlData: CrawlResult): ChannelStatus {
  const socialPatterns = {
    twitter: /twitter\.com|x\.com/i,
    linkedin: /linkedin\.com/i,
    instagram: /instagram\.com/i,
    facebook: /facebook\.com/i,
    youtube: /youtube\.com/i,
    tiktok: /tiktok\.com/i,
  };

  const foundSocials: string[] = [];
  const allExternalLinks = crawlData.pages.flatMap((p) => p.externalLinks);

  for (const [platform, pattern] of Object.entries(socialPatterns)) {
    if (allExternalLinks.some((link) => pattern.test(link))) {
      foundSocials.push(platform);
    }
  }

  if (foundSocials.length === 0) {
    return {
      channel: "Social Media",
      status: "missing",
      quality: "unknown",
      details: "No social media profile links found on your website.",
      recommendations: [
        "Add social profile links to your website header/footer",
        "Focus on 2-3 platforms where your audience is most active",
        "Start with LinkedIn and Twitter/X for B2B, Instagram for B2C",
      ],
    };
  }

  if (foundSocials.length < 3) {
    return {
      channel: "Social Media",
      status: "weak",
      quality: "needs-work",
      details: `Only ${foundSocials.length} social platform(s) linked: ${foundSocials.join(", ")}.`,
      recommendations: [
        "Consider adding more social platforms",
        "Ensure all profiles are active and consistent",
        "Add YouTube if you have video content",
      ],
    };
  }

  return {
    channel: "Social Media",
    status: "present",
    quality: "good",
    details: `${foundSocials.length} social platforms linked: ${foundSocials.join(", ")}.`,
    recommendations: [
      "Keep profiles active with regular posting",
      "Engage with followers and industry conversations",
      "Use social to amplify content and build relationships",
    ],
  };
}

function analyzeEmailCapture(crawlData: CrawlResult): ChannelStatus {
  // Look for email capture indicators
  const emailIndicators = {
    formDetected: false,
    newsletterMentioned: false,
    leadMagnetDetected: false,
  };

  for (const page of crawlData.pages) {
    const pageContent = `${page.title} ${page.metaDescription} ${page.h1Tags.join(" ")} ${page.h2Tags.join(" ")}`.toLowerCase();

    if (
      pageContent.includes("newsletter") ||
      pageContent.includes("subscribe") ||
      pageContent.includes("sign up")
    ) {
      emailIndicators.newsletterMentioned = true;
    }

    if (
      pageContent.includes("download") ||
      pageContent.includes("free guide") ||
      pageContent.includes("ebook") ||
      pageContent.includes("checklist") ||
      pageContent.includes("template")
    ) {
      emailIndicators.leadMagnetDetected = true;
    }
  }

  // Check for common email platform links
  const emailPlatforms = [
    "mailchimp",
    "convertkit",
    "hubspot",
    "klaviyo",
    "mailerlite",
    "substack",
  ];
  const allLinks = crawlData.pages.flatMap((p) => [
    ...p.internalLinks,
    ...p.externalLinks,
  ]);
  const hasEmailPlatform = emailPlatforms.some((platform) =>
    allLinks.some((link) => link.toLowerCase().includes(platform))
  );

  if (!emailIndicators.newsletterMentioned && !hasEmailPlatform) {
    return {
      channel: "Email Capture",
      status: "missing",
      quality: "unknown",
      details: "No email capture or newsletter signup detected.",
      recommendations: [
        "Add a newsletter signup form to capture visitor emails",
        "Create a lead magnet (guide, checklist, template) to incentivize signups",
        "Place signup forms in header, footer, and as exit-intent popups",
      ],
    };
  }

  if (!emailIndicators.leadMagnetDetected) {
    return {
      channel: "Email Capture",
      status: "weak",
      quality: "needs-work",
      details: "Newsletter mentioned but no lead magnets detected.",
      recommendations: [
        "Create valuable lead magnets to boost signup rates",
        "Offer something specific and useful (not just 'updates')",
        "A/B test different offers and placements",
      ],
    };
  }

  return {
    channel: "Email Capture",
    status: "present",
    quality: "good",
    details: "Email capture with lead magnets detected.",
    recommendations: [
      "Test popup timing and placement for better conversion",
      "Segment your list based on lead magnet topics",
      "Nurture leads with valuable email sequences",
    ],
  };
}

function analyzeGoogleBusiness(crawlData: CrawlResult): ChannelStatus {
  // Look for Google Business indicators
  const gmbIndicators = {
    addressFound: false,
    phoneFound: false,
    localSchemaFound: false,
  };

  for (const page of crawlData.pages) {
    // Check for LocalBusiness schema
    if (
      page.schemaMarkup.some(
        (s) =>
          s.type.includes("LocalBusiness") ||
          s.type.includes("Organization") ||
          s.type.includes("Store")
      )
    ) {
      gmbIndicators.localSchemaFound = true;
    }

    const pageContent = `${page.title} ${page.metaDescription}`.toLowerCase();
    if (
      pageContent.includes("location") ||
      pageContent.includes("address") ||
      pageContent.includes("visit us")
    ) {
      gmbIndicators.addressFound = true;
    }
  }

  // Check for Google Maps embed or link
  const allLinks = crawlData.pages.flatMap((p) => p.externalLinks);
  const hasMapsLink = allLinks.some(
    (link) =>
      link.includes("google.com/maps") || link.includes("maps.google.com")
  );

  if (!gmbIndicators.localSchemaFound && !hasMapsLink && !gmbIndicators.addressFound) {
    return {
      channel: "Google Business",
      status: "missing",
      quality: "unknown",
      details: "No local business signals detected.",
      recommendations: [
        "If you serve local customers, create and optimize a Google Business Profile",
        "Add LocalBusiness schema markup to your website",
        "Include your NAP (Name, Address, Phone) consistently",
      ],
    };
  }

  if (!gmbIndicators.localSchemaFound) {
    return {
      channel: "Google Business",
      status: "weak",
      quality: "needs-work",
      details: "Some local signals found but no LocalBusiness schema.",
      recommendations: [
        "Add LocalBusiness structured data markup",
        "Ensure Google Business Profile is claimed and optimized",
        "Add photos, posts, and respond to reviews",
      ],
    };
  }

  return {
    channel: "Google Business",
    status: "present",
    quality: "good",
    details: "LocalBusiness schema and local signals detected.",
    recommendations: [
      "Keep Google Business Profile updated with posts and photos",
      "Respond to all reviews promptly",
      "Encourage satisfied customers to leave reviews",
    ],
  };
}

function analyzeReviewPlatforms(crawlData: CrawlResult): ChannelStatus {
  const reviewPlatforms = {
    trustpilot: /trustpilot\.com/i,
    g2: /g2\.com|g2crowd\.com/i,
    capterra: /capterra\.com/i,
    yelp: /yelp\.com/i,
    glassdoor: /glassdoor\.com/i,
  };

  const foundPlatforms: string[] = [];
  const allLinks = crawlData.pages.flatMap((p) => [
    ...p.internalLinks,
    ...p.externalLinks,
  ]);

  for (const [platform, pattern] of Object.entries(reviewPlatforms)) {
    if (allLinks.some((link) => pattern.test(link))) {
      foundPlatforms.push(platform);
    }
  }

  // Also check for testimonials page
  const hasTestimonials = crawlData.pages.some((p) =>
    p.url.toLowerCase().includes("testimonial") ||
    p.url.toLowerCase().includes("reviews") ||
    p.url.toLowerCase().includes("case-stud")
  );

  if (foundPlatforms.length === 0 && !hasTestimonials) {
    return {
      channel: "Reviews & Social Proof",
      status: "missing",
      quality: "unknown",
      details: "No review platform links or testimonials page detected.",
      recommendations: [
        "Create profiles on relevant review platforms (G2, Trustpilot, etc.)",
        "Add a testimonials or case studies section to your website",
        "Proactively ask satisfied customers for reviews",
      ],
    };
  }

  if (foundPlatforms.length === 0 && hasTestimonials) {
    return {
      channel: "Reviews & Social Proof",
      status: "weak",
      quality: "needs-work",
      details: "Testimonials page found but no third-party review platforms.",
      recommendations: [
        "Get listed on third-party review sites for credibility",
        "Display star ratings and review counts on your site",
        "Link to your profiles on review platforms",
      ],
    };
  }

  return {
    channel: "Reviews & Social Proof",
    status: "present",
    quality: foundPlatforms.length > 1 ? "good" : "needs-work",
    details: `Review platforms linked: ${foundPlatforms.join(", ")}${hasTestimonials ? " + testimonials page" : ""}.`,
    recommendations: [
      "Display aggregate ratings prominently on your homepage",
      "Embed recent reviews on relevant pages",
      "Respond to all reviews, especially negative ones",
    ],
  };
}

function generateChannelFindings(channels: ChannelStatus[]): ChannelFinding[] {
  const findings: ChannelFinding[] = [];

  const missingChannels = channels.filter((c) => c.status === "missing");
  const weakChannels = channels.filter(
    (c) => c.status === "weak" || c.quality === "poor"
  );

  if (missingChannels.length >= 3) {
    findings.push({
      type: "many_missing_channels",
      severity: "CRITICAL",
      title: `${missingChannels.length} key marketing channels are missing`,
      description: `Your site is missing: ${missingChannels.map((c) => c.channel).join(", ")}.`,
      impact:
        "You're leaving significant traffic and conversion opportunities on the table by not having a presence on these channels.",
      howToFix:
        "Prioritize setting up the most impactful channels first: Blog for organic traffic, Email for nurturing, Social for awareness.",
      score: Math.max(0, 100 - missingChannels.length * 20),
    });
  } else if (missingChannels.length > 0) {
    for (const channel of missingChannels) {
      findings.push({
        type: `missing_${channel.channel.toLowerCase().replace(/\s+/g, "_")}`,
        severity: "WARNING",
        title: `${channel.channel} is missing`,
        description: channel.details,
        impact: `Not having ${channel.channel} means missing out on a key marketing opportunity.`,
        howToFix: channel.recommendations.join(" "),
        score: 50,
      });
    }
  }

  if (weakChannels.length > 0) {
    findings.push({
      type: "weak_channels",
      severity: "WARNING",
      title: `${weakChannels.length} marketing channel(s) need improvement`,
      description: `These channels exist but need work: ${weakChannels.map((c) => c.channel).join(", ")}.`,
      impact: "Underperforming channels are missing their full potential for driving traffic and conversions.",
      howToFix:
        "Review each weak channel and implement the recommended improvements. Consistency and quality are key.",
      score: Math.max(0, 100 - weakChannels.length * 15),
    });
  }

  return findings;
}
