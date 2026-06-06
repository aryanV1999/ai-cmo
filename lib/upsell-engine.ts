/**
 * Upsell Engine
 * Maps audit findings to Motion Labs service offerings
 */

export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  ctaCopy: string;
  urgency: "critical" | "high" | "medium" | "low";
  triggerFinding: string;
  estimatedValue: string;
  caseStudyUrl?: string;
}

export interface Finding {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description?: string;
  score?: number;
  data?: Record<string, unknown>;
}

interface UpsellRule {
  findingTypes: string[];
  severities: ("CRITICAL" | "WARNING" | "INFO")[];
  conditions?: (finding: Finding) => boolean;
  service: {
    id: string;
    name: string;
    ctaTemplate: string;
    urgencyMapping: {
      CRITICAL: "critical" | "high";
      WARNING: "high" | "medium";
      INFO: "medium" | "low";
    };
    valueEstimate: string;
    caseStudy?: string;
  };
}

// Upsell rules configuration
const UPSELL_RULES: UpsellRule[] = [
  // Technical SEO & Performance
  {
    findingTypes: [
      "poor_mobile_performance",
      "moderate_mobile_performance",
      "poor_lcp",
      "poor_cls",
      "poor_interactivity",
      "mobile_desktop_gap",
    ],
    severities: ["CRITICAL", "WARNING"],
    conditions: (f) => (f.score ?? 100) < 70,
    service: {
      id: "technical-seo",
      name: "Technical SEO & Performance Optimisation",
      ctaTemplate: "We'll get your site to 90+ PageSpeed in 30 days",
      urgencyMapping: { CRITICAL: "critical", WARNING: "high", INFO: "medium" },
      valueEstimate: "40%+ improvement in Core Web Vitals",
      caseStudy: "/case-studies/performance-optimization",
    },
  },
  
  // On-Page SEO Sprint
  {
    findingTypes: [
      "missing_meta_description",
      "missing_title",
      "duplicate_title",
      "duplicate_meta_description",
      "title_too_short",
      "title_too_long",
      "meta_desc_too_short",
      "missing_h1",
      "bad_heading_structure",
    ],
    severities: ["CRITICAL", "WARNING"],
    service: {
      id: "onpage-seo",
      name: "On-Page SEO Sprint",
      ctaTemplate: "Book a free 30-min page audit call",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "20-30% improvement in organic CTR",
      caseStudy: "/case-studies/onpage-optimization",
    },
  },
  
  // Digital PR & Link Building
  {
    findingTypes: [
      "large_da_gap",
      "moderate_da_gap",
      "large_backlink_gap",
    ],
    severities: ["CRITICAL", "WARNING"],
    service: {
      id: "link-building",
      name: "Digital PR & Link Building",
      ctaTemplate: "See how we built 200+ links for similar sites",
      urgencyMapping: { CRITICAL: "critical", WARNING: "high", INFO: "medium" },
      valueEstimate: "30+ quality backlinks per month",
      caseStudy: "/case-studies/link-building",
    },
  },
  
  // Content Strategy
  {
    findingTypes: [
      "very_thin_content",
      "thin_content",
      "keyword_coverage_gap",
      "low_content_velocity",
    ],
    severities: ["CRITICAL", "WARNING"],
    service: {
      id: "content-strategy",
      name: "Content Strategy & SEO Writing",
      ctaTemplate: "Get a free content gap analysis from our team",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "2x organic traffic in 6 months",
      caseStudy: "/case-studies/content-strategy",
    },
  },
  
  // Local SEO
  {
    findingTypes: ["missing_google_business"],
    severities: ["CRITICAL", "WARNING", "INFO"],
    conditions: (f) => f.type.includes("google_business") || f.type.includes("local"),
    service: {
      id: "local-seo",
      name: "Local SEO Setup",
      ctaTemplate: "We'll optimize your local presence this week",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "3x local search visibility",
      caseStudy: "/case-studies/local-seo",
    },
  },
  
  // Full SEO Retainer
  {
    findingTypes: ["many_missing_channels", "far_behind_competitors"],
    severities: ["CRITICAL"],
    conditions: (f) => (f.score ?? 100) < 40,
    service: {
      id: "full-retainer",
      name: "Full SEO Retainer",
      ctaTemplate: "See our competitor displacement case studies",
      urgencyMapping: { CRITICAL: "critical", WARNING: "high", INFO: "medium" },
      valueEstimate: "Complete SEO transformation in 6-12 months",
      caseStudy: "/case-studies/full-retainer",
    },
  },
  
  // CRO
  {
    findingTypes: ["missing_email_capture", "weak_channels"],
    severities: ["CRITICAL", "WARNING"],
    conditions: (f) => f.type.includes("email") || f.type.includes("conversion"),
    service: {
      id: "cro",
      name: "Conversion Rate Optimisation",
      ctaTemplate: "Free CRO audit — 30 mins, no strings",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "20-50% improvement in conversion rate",
      caseStudy: "/case-studies/cro",
    },
  },
  
  // Social Media Management
  {
    findingTypes: ["missing_social_media", "weak_channels"],
    severities: ["CRITICAL", "WARNING"],
    conditions: (f) => f.type.includes("social"),
    service: {
      id: "social-media",
      name: "Social Media Management",
      ctaTemplate: "We'll take social off your plate entirely",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "Consistent brand presence across all platforms",
      caseStudy: "/case-studies/social-media",
    },
  },
  
  // Schema & Rich Results
  {
    findingTypes: ["no_schema_markup", "low_schema_coverage"],
    severities: ["WARNING", "INFO"],
    service: {
      id: "schema-implementation",
      name: "Schema & Rich Results Setup",
      ctaTemplate: "Get rich snippets and stand out in search results",
      urgencyMapping: { CRITICAL: "high", WARNING: "medium", INFO: "low" },
      valueEstimate: "30%+ increase in organic CTR",
    },
  },
  
  // Technical Fixes
  {
    findingTypes: [
      "broken_links_4xx",
      "broken_links_5xx",
      "redirect_chains",
      "missing_sitemap",
      "no_https",
      "canonical_issues",
    ],
    severities: ["CRITICAL", "WARNING"],
    service: {
      id: "technical-fixes",
      name: "Technical SEO Audit & Fixes",
      ctaTemplate: "We'll fix all technical issues in 2 weeks",
      urgencyMapping: { CRITICAL: "critical", WARNING: "high", INFO: "medium" },
      valueEstimate: "Clean technical foundation for SEO success",
    },
  },
];

/**
 * Map audit findings to service recommendations
 */
export function mapFindingsToServices(
  findings: Finding[]
): ServiceRecommendation[] {
  const recommendations: ServiceRecommendation[] = [];
  const usedServices = new Set<string>();

  // Sort findings by severity (CRITICAL first)
  const sortedFindings = [...findings].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  for (const finding of sortedFindings) {
    // Find matching rule
    const matchingRule = UPSELL_RULES.find((rule) => {
      const typeMatch = rule.findingTypes.some((type) =>
        finding.type.toLowerCase().includes(type.toLowerCase())
      );
      const severityMatch = rule.severities.includes(finding.severity);
      const conditionMatch = !rule.conditions || rule.conditions(finding);
      return typeMatch && severityMatch && conditionMatch;
    });

    if (matchingRule && !usedServices.has(matchingRule.service.id)) {
      usedServices.add(matchingRule.service.id);

      recommendations.push({
        serviceId: matchingRule.service.id,
        serviceName: matchingRule.service.name,
        ctaCopy: matchingRule.service.ctaTemplate,
        urgency: matchingRule.service.urgencyMapping[finding.severity],
        triggerFinding: finding.title,
        estimatedValue: matchingRule.service.valueEstimate,
        caseStudyUrl: matchingRule.service.caseStudy,
      });
    }

    // Limit to 5 recommendations
    if (recommendations.length >= 5) break;
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );
}

/**
 * Get service details by ID
 */
export function getServiceDetails(serviceId: string): {
  name: string;
  description: string;
  features: string[];
  startingPrice: string;
  ctaUrl: string;
} | null {
  const services: Record<string, ReturnType<typeof getServiceDetails>> = {
    "technical-seo": {
      name: "Technical SEO & Performance Optimisation",
      description:
        "We'll fix all technical issues holding back your site — page speed, Core Web Vitals, crawlability, and mobile optimization.",
      features: [
        "Complete technical audit and fix implementation",
        "Core Web Vitals optimization (target: 90+ scores)",
        "Mobile-first optimization",
        "Crawl efficiency improvements",
        "Ongoing monitoring and maintenance",
      ],
      startingPrice: "$2,500/project",
      ctaUrl: "/services/technical-seo",
    },
    "onpage-seo": {
      name: "On-Page SEO Sprint",
      description:
        "Rapid optimization of your key pages — titles, meta descriptions, headings, content structure, and internal linking.",
      features: [
        "Optimization of up to 50 key pages",
        "Title and meta description rewriting",
        "Heading structure optimization",
        "Internal linking strategy",
        "Schema markup implementation",
      ],
      startingPrice: "$1,500/sprint",
      ctaUrl: "/services/onpage-seo",
    },
    "link-building": {
      name: "Digital PR & Link Building",
      description:
        "Build authoritative backlinks through digital PR, guest posting, and relationship-based outreach.",
      features: [
        "Monthly link building campaigns",
        "Digital PR and journalist outreach",
        "Guest posting on relevant sites",
        "Broken link building",
        "Competitor backlink analysis",
      ],
      startingPrice: "$3,000/month",
      ctaUrl: "/services/link-building",
    },
    "content-strategy": {
      name: "Content Strategy & SEO Writing",
      description:
        "Comprehensive content strategy and production to capture organic traffic and establish thought leadership.",
      features: [
        "Content gap analysis",
        "Keyword research and mapping",
        "Editorial calendar creation",
        "SEO-optimized content writing",
        "Content performance tracking",
      ],
      startingPrice: "$2,000/month",
      ctaUrl: "/services/content-strategy",
    },
    "local-seo": {
      name: "Local SEO Setup",
      description:
        "Dominate local search results with optimized Google Business Profile and local SEO strategy.",
      features: [
        "Google Business Profile optimization",
        "Local citation building",
        "Review management strategy",
        "Local schema markup",
        "Local content optimization",
      ],
      startingPrice: "$1,000/project",
      ctaUrl: "/services/local-seo",
    },
    "full-retainer": {
      name: "Full SEO Retainer",
      description:
        "Comprehensive, ongoing SEO management covering all aspects of your search presence.",
      features: [
        "Complete technical and on-page SEO",
        "Monthly content production",
        "Link building campaigns",
        "Competitor monitoring",
        "Monthly strategy calls and reporting",
      ],
      startingPrice: "$5,000/month",
      ctaUrl: "/services/full-retainer",
    },
    cro: {
      name: "Conversion Rate Optimisation",
      description:
        "Turn more of your traffic into leads and customers through systematic conversion optimization.",
      features: [
        "Conversion audit and analysis",
        "A/B testing strategy",
        "Landing page optimization",
        "Form and CTA optimization",
        "User behavior analysis",
      ],
      startingPrice: "$2,500/project",
      ctaUrl: "/services/cro",
    },
    "social-media": {
      name: "Social Media Management",
      description:
        "Full-service social media management to build your brand and engage your audience.",
      features: [
        "Content creation and scheduling",
        "Community management",
        "Social advertising",
        "Analytics and reporting",
        "Influencer partnerships",
      ],
      startingPrice: "$1,500/month",
      ctaUrl: "/services/social-media",
    },
  };

  return services[serviceId] || null;
}

/**
 * Generate contextual CTA based on finding and service
 */
export function generateContextualCta(
  finding: Finding,
  serviceId: string
): string {
  const ctaTemplates: Record<string, Record<string, string>> = {
    "technical-seo": {
      poor_mobile_performance: `Your ${finding.data?.score || 0}/100 mobile score is losing you customers. We'll fix it in 30 days.`,
      poor_lcp: `Your ${((finding.data?.lcp || 0) as number / 1000).toFixed(1)}s load time is killing conversions. Let us fix it.`,
      default: "We'll get your site to 90+ PageSpeed in 30 days",
    },
    "link-building": {
      large_da_gap: `You're ${finding.data?.gap || 20}+ points behind competitors. Let's close the gap.`,
      default: "See how we built 200+ links for similar sites",
    },
    "content-strategy": {
      thin_content: `Your ${finding.data?.avgWordCount || 0}-word average isn't enough. Let's create content that ranks.`,
      default: "Get a free content gap analysis from our team",
    },
  };

  const serviceCtas = ctaTemplates[serviceId];
  if (!serviceCtas) return "Let us help you fix this";

  return serviceCtas[finding.type] || serviceCtas.default || "Let us help you fix this";
}
