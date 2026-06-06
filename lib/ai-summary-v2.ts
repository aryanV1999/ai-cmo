/**
 * AI Summary Layer V2
 * 
 * Enhanced AI verdict generation with:
 * 1. Confidence-aware messaging
 * 2. Data-driven claims (no hallucinations)
 * 3. Page-type context
 * 4. Subdomain awareness
 * 5. Better prompt engineering
 */

import { OpenAI } from "openai";
import { CrawlResultV2 } from "./crawler-v2";
import { TechnicalSeoResultV2 } from "./analyzers/technical-seo-v2";
import { OnPageSeoResult } from "./analyzers/on-page-seo";
import { PageSpeedResult } from "./analyzers/page-speed";
import { CompetitorResult } from "./analyzers/competitors";
import { ChannelResultV2 } from "./analyzers/channels-v2";
import { mapFindingsToServices, ServiceRecommendation } from "./upsell-engine";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface AuditSummaryV2 {
  overallGrade: string;
  gradeScore: number;
  gradeReasoning: string;
  overallConfidence: number;
  confidenceExplanation: string;
  brutalVerdict: string;
  prioritizedFixes: PrioritizedFixV2[];
  timelineExpectations: {
    thirtyDays: string;
    sixtyDays: string;
    ninetyDays: string;
  };
  whatWorksWell: string[];
  contentGrowthStrategy: ContentGrowthStrategy;
  competitorInsights: CompetitorInsights;
  socialMediaStrategy: SocialMediaStrategy;
  serviceRecommendations: ServiceRecommendation[];
  dataDisclaimer: string;
}

export interface ContentGrowthStrategy {
  contentRepurposingIdeas: string[];
  contentGaps: string[];
  distributionChannels: string[];
  prOpportunities: string[];
}

export interface CompetitorInsights {
  likelyCompetitors: string[];
  competitiveGaps: string[];
  differentiators: string[];
  marketPositioning: string;
}

export interface SocialMediaStrategy {
  platformRecommendations: PlatformRecommendation[];
  contentPillars: string[];
  engagementTactics: string[];
  linkedInSpecific: LinkedInStrategy;
}

export interface PlatformRecommendation {
  platform: string;
  currentStatus: string;
  priority: "high" | "medium" | "low";
  actionItems: string[];
}

export interface LinkedInStrategy {
  contentThemes: string[];
  postingCadence: string;
  engagementTips: string[];
  authorityBuilding: string[];
}

export interface PrioritizedFixV2 {
  priority: number;
  title: string;
  urgency: "critical" | "high" | "medium" | "low";
  whatsWrong: string;
  whyItMatters: string;
  howToFix: string;
  affectedPages: string[];  // Direct URLs with issues
  estimatedImpact: string;
  confidence: number;
  dataSource: string;
  implementationSteps: string[];  // Step-by-step actionable instructions
  toolsNeeded: string[];  // Tools/platforms to use
  serviceId?: string;
  serviceCta?: string;
}

export interface AuditDataV2 {
  domain: string;
  url: string;
  crawlData: CrawlResultV2;
  technicalSeo: TechnicalSeoResultV2;
  onPageSeo: OnPageSeoResult;
  pageSpeed: PageSpeedResult;
  competitors?: CompetitorResult;
  channels?: ChannelResultV2;
}

export async function generateAuditSummaryV2(
  auditData: AuditDataV2
): Promise<AuditSummaryV2> {
  // Calculate overall grade with confidence weighting
  const { grade, score, gradeReasoning, confidence } = calculateOverallGradeV2(auditData);

  // Map findings to service recommendations
  const allFindings = [
    ...auditData.technicalSeo.findings,
    ...auditData.onPageSeo.findings,
    ...auditData.pageSpeed.findings,
    ...(auditData.competitors?.findings || []),
    ...(auditData.channels?.findings || []),
  ];
  const serviceRecommendations = mapFindingsToServices(allFindings);

  // Build the expert prompt with confidence awareness
  const prompt = buildExpertPromptV2(auditData, serviceRecommendations);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6,
      max_tokens: 3500,
    });
    const text = response.choices[0]?.message?.content || "";

    const parsed = parseGeminiResponseV2(text, grade, score, gradeReasoning, confidence, auditData);

    return {
      ...parsed,
      serviceRecommendations,
    };
  } catch (error) {
    console.error("[AI Summary V2] Error generating AI summary:", error);
    return generateFallbackSummaryV2(auditData, grade, score, gradeReasoning, confidence, serviceRecommendations);
  }
}

function calculateOverallGradeV2(auditData: AuditDataV2): {
  grade: string;
  score: number;
  gradeReasoning: string;
  confidence: number;
} {
  // Weight scores by their confidence
  const technicalWeight = 0.30;
  const onPageWeight = 0.25;
  const speedWeight = 0.25;
  const competitorWeight = 0.10;
  const channelWeight = 0.10;

  const technicalScore = auditData.technicalSeo.score * (auditData.technicalSeo.confidence / 100);
  const onPageScore = auditData.onPageSeo.score;
  const speedScore = auditData.pageSpeed.score;
  const competitorScore = auditData.competitors?.score || 50;
  const channelScore = auditData.channels?.score || 50;
  const channelConfidence = auditData.channels?.confidence || 70;

  const weightedScore = Math.round(
    technicalScore * technicalWeight +
    onPageScore * onPageWeight +
    speedScore * speedWeight +
    competitorScore * competitorWeight +
    channelScore * channelWeight
  );

  // Calculate overall confidence
  const confidence = Math.round(
    (auditData.crawlData.overallConfidence.score * 0.4) +
    (auditData.technicalSeo.confidence * 0.3) +
    (channelConfidence * 0.3)
  );

  // Convert to letter grade
  let grade: string;
  if (weightedScore >= 95) grade = "A+";
  else if (weightedScore >= 90) grade = "A";
  else if (weightedScore >= 85) grade = "A-";
  else if (weightedScore >= 80) grade = "B+";
  else if (weightedScore >= 75) grade = "B";
  else if (weightedScore >= 70) grade = "B-";
  else if (weightedScore >= 65) grade = "C+";
  else if (weightedScore >= 60) grade = "C";
  else if (weightedScore >= 55) grade = "C-";
  else if (weightedScore >= 50) grade = "D+";
  else if (weightedScore >= 45) grade = "D";
  else if (weightedScore >= 40) grade = "D-";
  else grade = "F";

  const gradeReasoning = buildGradeReasoning(auditData, weightedScore, confidence);

  return { grade, score: weightedScore, gradeReasoning, confidence };
}

function buildGradeReasoning(auditData: AuditDataV2, score: number, confidence: number): string {
  const parts: string[] = [];

  // Strengths
  if (auditData.technicalSeo.score >= 80) {
    parts.push("strong technical SEO foundation");
  }
  if (auditData.pageSpeed.score >= 80) {
    parts.push("good page speed performance");
  }
  if (auditData.channels && auditData.channels.score >= 70) {
    parts.push("decent marketing channel coverage");
  }

  // Weaknesses
  if (auditData.technicalSeo.score < 50) {
    parts.push("significant technical SEO issues");
  }
  if (auditData.pageSpeed.score < 50) {
    parts.push("poor page speed");
  }
  if (auditData.channels && auditData.channels.score < 40) {
    parts.push("weak marketing channel presence");
  }

  // Confidence caveat
  if (confidence < 60) {
    parts.push("(limited data confidence - results may be incomplete)");
  }

  if (parts.length === 0) {
    return `Overall score of ${score}/100 based on ${auditData.crawlData.totalPagesCrawled} pages analyzed.`;
  }

  return `Based on ${parts.join(", ")}. Analyzed ${auditData.crawlData.totalPagesCrawled} pages.`;
}

// Helper to extract issues from a page
function getPageIssues(page: CrawlResultV2["pages"][0]): string[] {
  const issues: string[] = [];
  if (page.statusCode !== 200) issues.push(`HTTP ${page.statusCode}`);
  if (!page.title) issues.push("missing title");
  if (!page.metaDescription) issues.push("missing meta description");
  if (page.h1Tags.length === 0) issues.push("missing H1");
  if (page.h1Tags.length > 1) issues.push("multiple H1s");
  return issues;
}

function buildExpertPromptV2(
  auditData: AuditDataV2,
  serviceRecommendations: ServiceRecommendation[]
): string {
  const crawlConfidence = auditData.crawlData.overallConfidence;
  const pagesAnalyzed = auditData.crawlData.totalPagesCrawled;
  const pagesDiscovered = auditData.crawlData.totalPagesDiscovered;

  // Collect critical and warning findings with affected URLs
  const criticalFindings = [
    ...auditData.technicalSeo.findings.filter(f => f.severity === "CRITICAL"),
    ...auditData.onPageSeo.findings.filter(f => f.severity === "CRITICAL"),
    ...auditData.pageSpeed.findings.filter(f => f.severity === "CRITICAL"),
    ...(auditData.channels?.findings.filter(f => f.severity === "CRITICAL") || []),
  ];

  const warningFindings = [
    ...auditData.technicalSeo.findings.filter(f => f.severity === "WARNING"),
    ...auditData.onPageSeo.findings.filter(f => f.severity === "WARNING"),
    ...auditData.pageSpeed.findings.filter(f => f.severity === "WARNING"),
    ...(auditData.channels?.findings.filter(f => f.severity === "WARNING") || []),
  ];

  // Collect positive findings
  const positiveFindings = [
    ...auditData.technicalSeo.findings.filter(f => f.severity === "INFO" && f.score >= 80),
    ...(auditData.channels?.channels.filter(c => c.quality === "excellent" || c.quality === "good").map(c => ({
      title: `${c.channel}: ${c.status}`,
      description: c.details,
    })) || []),
  ];

  // Extract affected URLs for issues
  const pagesWithIssues = auditData.crawlData.pages
    .filter(p => p.statusCode !== 200 || !p.title || !p.metaDescription)
    .slice(0, 10)
    .map(p => ({ url: p.url, issues: getPageIssues(p) }));

  // Infer likely competitors from domain and content
  const domainParts = auditData.domain.split(".");
  const brandName = domainParts[0];

  return `
<role>
You are Sarah Martinez, a Senior Marketing Executive with 12 years of experience at top agencies.
You're known for BRUTAL HONESTY, ACTIONABLE recommendations, and ROI-focused strategy.
You speak to founders and business owners, NOT to SEO specialists.
You always identify competitors, provide content growth strategies, and give platform-specific advice.
</role>

<critical_instruction>
NEVER make claims beyond what the data shows. Every statement must be backed by specific data from this audit.
If confidence is low, acknowledge limitations. Do NOT hallucinate statistics or features.

The crawl analyzed ${pagesAnalyzed} of ${pagesDiscovered} discovered pages.
Crawl confidence: ${crawlConfidence.level} (${crawlConfidence.score}%)
${crawlConfidence.reasons.join(". ")}

IMPORTANT: Include SPECIFIC PAGE URLs when highlighting issues. Make every recommendation ACTIONABLE with step-by-step instructions.
</critical_instruction>

<audit_data>
**Website:** ${auditData.url}
**Domain:** ${auditData.domain}
**Brand Name (inferred):** ${brandName}
**Subdomains found:** ${auditData.crawlData.subdomainsFound.length > 0 ? auditData.crawlData.subdomainsFound.join(", ") : "None detected"}

**CRAWL COVERAGE:**
- Pages analyzed: ${pagesAnalyzed} of ${pagesDiscovered} discovered
- Crawl confidence: ${crawlConfidence.level} (${crawlConfidence.score}%)
- Page types found: ${Object.entries(auditData.crawlData.pagesByType)
    .filter(([, pages]) => pages.length > 0)
    .map(([type, pages]) => `${type}: ${pages.length}`)
    .join(", ")}

**SCORES:**
- Technical SEO: ${auditData.technicalSeo.score}/100 (confidence: ${auditData.technicalSeo.confidence}%)
- On-Page SEO: ${auditData.onPageSeo.score}/100
- Page Speed: ${auditData.pageSpeed.score}/100 (Mobile: ${auditData.pageSpeed.mobileScore}, Desktop: ${auditData.pageSpeed.desktopScore})
${auditData.channels ? `- Marketing Channels: ${auditData.channels.score}/100 (confidence: ${auditData.channels.confidence}%)` : ""}
${auditData.competitors ? `- Competitive Position: ${auditData.competitors.summary.competitivePosition}` : ""}

**PAGES WITH ISSUES (sample URLs):**
${pagesWithIssues.map(p => `- ${p.url}: ${p.issues.join(", ")}`).join("\n")}

**CRITICAL ISSUES (${criticalFindings.length} found):**
${criticalFindings.length > 0 
  ? criticalFindings.map(f => {
      const urls = (f as any).affectedUrls?.slice(0, 3).join(", ") || "multiple pages";
      return `- [${(f as any).confidence || 80}% confident] ${f.title}: ${f.description}\n  Affected: ${urls}`;
    }).join("\n")
  : "No critical issues detected"}

**WARNING ISSUES (${warningFindings.length} found):**
${warningFindings.slice(0, 8).map(f => {
  const urls = (f as any).affectedUrls?.slice(0, 2).join(", ") || "";
  return `- [${(f as any).confidence || 80}% confident] ${f.title}${urls ? ` (e.g., ${urls})` : ""}`;
}).join("\n")}

**WHAT'S WORKING WELL:**
${positiveFindings.length > 0
  ? positiveFindings.slice(0, 5).map(f => `- ${f.title}`).join("\n")
  : "- No significant positive findings detected (this may be due to limited crawl data)"}

**CORE WEB VITALS:**
- LCP: ${(auditData.pageSpeed.coreWebVitals.lcp.value / 1000).toFixed(1)}s (${auditData.pageSpeed.coreWebVitals.lcp.rating})
- CLS: ${auditData.pageSpeed.coreWebVitals.cls.value.toFixed(3)} (${auditData.pageSpeed.coreWebVitals.cls.rating})
- TBT: ${Math.round(auditData.pageSpeed.coreWebVitals.fid.value)}ms (${auditData.pageSpeed.coreWebVitals.fid.rating})

${auditData.channels ? `
**MARKETING CHANNELS:**
${auditData.channels.channels.map(c => 
  `- ${c.channel}: ${c.status} (${c.quality}) - Confidence: ${c.confidence}%${c.status === "missing" && c.confidence < 70 ? " ⚠️ May exist but not detected" : ""}`
).join("\n")}

**SOCIAL MEDIA PRESENCE DETECTED:**
${auditData.channels.channels
  .filter(c => ["Twitter/X", "LinkedIn", "Facebook", "Instagram", "YouTube", "TikTok"].some(s => c.channel.includes(s)))
  .map(c => `- ${c.channel}: ${c.details}`)
  .join("\n") || "- Limited social presence detected from crawl"}
` : ""}

**TECHNICAL METRICS:**
- Pages with issues: ${auditData.technicalSeo.metrics.pagesWithIssues}
- Avg internal links (content): ${auditData.technicalSeo.metrics.avgInternalLinks}
- Pages with schema: ${auditData.technicalSeo.metrics.pagesWithSchema}/${pagesAnalyzed}
- Sitemap: ${auditData.crawlData.sitemapFound ? `Found (${auditData.crawlData.sitemapUrls.length} sitemap${auditData.crawlData.sitemapUrls.length > 1 ? "s" : ""})` : "Not found"}
- Robots.txt: ${auditData.crawlData.robotsTxtFound ? "Found" : "Not found"}

${auditData.competitors ? `
**COMPETITOR ANALYSIS:**
- Competitors analyzed: ${auditData.competitors.competitors.map(c => c.domain).join(", ")}
- Your competitive position: ${auditData.competitors.summary.competitivePosition}
- Primary gaps: ${auditData.competitors.summary.primaryGaps.join("; ")}
- Quick wins: ${auditData.competitors.summary.quickWins.join("; ")}
` : `
**COMPETITOR INFERENCE:**
Based on the domain "${auditData.domain}", infer likely competitors in the same industry/niche.
`}
</audit_data>

<task>
Generate a COMPREHENSIVE, BRUTALLY HONEST marketing audit with ACTIONABLE strategies. Important rules:

1. ONLY make claims supported by the data above
2. Include SPECIFIC PAGE URLs when highlighting issues
3. Provide STEP-BY-STEP implementation instructions for every fix
4. IDENTIFY COMPETITORS - infer from domain/content if not provided
5. Include CONTENT GROWTH STRATEGY with repurposing ideas
6. Provide PLATFORM-SPECIFIC social media advice (especially LinkedIn)
7. Suggest PR and distribution opportunities
8. Acknowledge limitations if crawl confidence is below 70%

Return ONLY valid JSON (no markdown code blocks):

{
  "brutalVerdict": "200-300 word brutally honest assessment. Start with the biggest problem WITH SPECIFIC URLs. Acknowledge what's working. Include competitor context. End with urgency and opportunity cost.",
  
  "whatWorksWell": ["List 3-5 specific positives with evidence"],
  
  "prioritizedFixes": [
    {
      "priority": 1,
      "title": "Specific actionable fix",
      "urgency": "critical|high|medium|low",
      "whatsWrong": "Problem description with specific page URLs",
      "whyItMatters": "Business impact in plain English with numbers",
      "howToFix": "Detailed explanation",
      "affectedPages": ["https://example.com/page1", "https://example.com/page2"],
      "implementationSteps": [
        "Step 1: Open your CMS and navigate to...",
        "Step 2: Edit the meta description to...",
        "Step 3: Verify by checking..."
      ],
      "toolsNeeded": ["Google Search Console", "Screaming Frog"],
      "estimatedImpact": "Specific expected outcome",
      "confidence": 85,
      "dataSource": "Which audit section this came from"
    }
  ],
  
  "competitorInsights": {
    "likelyCompetitors": ["competitor1.com", "competitor2.com", "competitor3.com"],
    "competitiveGaps": ["Gap 1 where competitors outperform you", "Gap 2"],
    "differentiators": ["What makes you unique", "Potential positioning angles"],
    "marketPositioning": "One paragraph on how to position against competitors"
  },
  
  "contentGrowthStrategy": {
    "contentRepurposingIdeas": [
      "Turn blog posts into LinkedIn carousels",
      "Create video clips from long-form content",
      "Extract quotes for Twitter/X threads"
    ],
    "contentGaps": ["Topic 1 competitors cover but you don't", "Topic 2"],
    "distributionChannels": ["Channel 1 with specific tactic", "Channel 2"],
    "prOpportunities": ["Industry publication to pitch", "Podcast guest opportunities", "HARO queries to answer"]
  },
  
  "socialMediaStrategy": {
    "platformRecommendations": [
      {
        "platform": "LinkedIn",
        "currentStatus": "Assessment of current presence",
        "priority": "high",
        "actionItems": ["Post thought leadership 3x/week", "Engage in industry groups", "Share case studies"]
      },
      {
        "platform": "YouTube",
        "currentStatus": "Assessment",
        "priority": "medium",
        "actionItems": ["Create educational shorts", "Repurpose webinar content"]
      }
    ],
    "contentPillars": ["Pillar 1 topic theme", "Pillar 2", "Pillar 3"],
    "engagementTactics": ["Specific tactic 1", "Specific tactic 2"],
    "linkedInSpecific": {
      "contentThemes": ["Thought leadership on X topic", "Behind-the-scenes of Y", "Industry insights about Z"],
      "postingCadence": "Recommended frequency with specific days/times",
      "engagementTips": ["Comment on industry leaders' posts", "Share insights from courses/products"],
      "authorityBuilding": ["Write LinkedIn articles on X", "Host LinkedIn Live sessions", "Create document carousels"]
    }
  },
  
  "timelineExpectations": {
    "thirtyDays": "Specific quick wins with expected outcomes",
    "sixtyDays": "Strategic improvements with metrics to track",
    "ninetyDays": "Measurable impact with realistic projections"
  },
  
  "dataDisclaimer": "Data limitations caveat if needed"
}

Maximum 7 prioritized fixes. Include competitor insights even if you need to infer them.
Focus on MARKETING, SEO, and CONTENT GROWTH - these are the core focus areas.
</task>`;
}

function parseGeminiResponseV2(
  response: string,
  grade: string,
  score: number,
  gradeReasoning: string,
  confidence: number,
  auditData: AuditDataV2
): Omit<AuditSummaryV2, "serviceRecommendations"> {
  try {
    let jsonText = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      const rawJsonMatch = response.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonText = rawJsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);

    // Build confidence explanation
    const confidenceExplanation = buildConfidenceExplanation(auditData.crawlData.overallConfidence, auditData);

    // Default strategies if not provided by AI
    const defaultContentGrowthStrategy: ContentGrowthStrategy = {
      contentRepurposingIdeas: [
        "Turn blog posts into LinkedIn carousels",
        "Create short video clips from long-form content",
        "Extract key quotes for Twitter/X threads",
      ],
      contentGaps: [],
      distributionChannels: ["LinkedIn", "Twitter/X", "Email newsletter"],
      prOpportunities: [],
    };

    const defaultCompetitorInsights: CompetitorInsights = {
      likelyCompetitors: [],
      competitiveGaps: [],
      differentiators: [],
      marketPositioning: "Competitive analysis requires additional data.",
    };

    const defaultSocialMediaStrategy: SocialMediaStrategy = {
      platformRecommendations: [],
      contentPillars: [],
      engagementTactics: [],
      linkedInSpecific: {
        contentThemes: [],
        postingCadence: "3-5 posts per week recommended",
        engagementTips: [],
        authorityBuilding: [],
      },
    };

    return {
      overallGrade: grade,
      gradeScore: score,
      gradeReasoning,
      overallConfidence: confidence,
      confidenceExplanation,
      brutalVerdict: parsed.brutalVerdict || generateFallbackVerdict(auditData),
      prioritizedFixes: (parsed.prioritizedFixes || []).map((fix: any) => ({
        ...fix,
        affectedPages: fix.affectedPages || [],
        implementationSteps: fix.implementationSteps || [fix.howToFix],
        toolsNeeded: fix.toolsNeeded || [],
        confidence: fix.confidence || 75,
        dataSource: fix.dataSource || "automated analysis",
      })),
      timelineExpectations: parsed.timelineExpectations || {
        thirtyDays: "Address critical technical issues",
        sixtyDays: "Implement on-page optimizations",
        ninetyDays: "Monitor for ranking improvements",
      },
      whatWorksWell: parsed.whatWorksWell || [],
      contentGrowthStrategy: parsed.contentGrowthStrategy || defaultContentGrowthStrategy,
      competitorInsights: parsed.competitorInsights || defaultCompetitorInsights,
      socialMediaStrategy: parsed.socialMediaStrategy || defaultSocialMediaStrategy,
      dataDisclaimer: parsed.dataDisclaimer || (confidence < 70 
        ? `Analysis based on ${auditData.crawlData.totalPagesCrawled} pages. Some findings may be incomplete.`
        : ""),
    };
  } catch (error) {
    console.error("[AI Summary V2] Failed to parse Gemini response:", error);
    return generateFallbackSummaryV2(
      auditData,
      grade,
      score,
      gradeReasoning,
      confidence,
      []
    );
  }
}

function buildConfidenceExplanation(
  crawlConfidence: CrawlResultV2["overallConfidence"],
  auditData: AuditDataV2
): string {
  const parts: string[] = [];

  parts.push(`Analyzed ${auditData.crawlData.totalPagesCrawled} of ${auditData.crawlData.totalPagesDiscovered} discovered pages`);

  if (crawlConfidence.level === "high") {
    parts.push("Good coverage of site content");
  } else if (crawlConfidence.level === "medium") {
    parts.push("Moderate coverage - some areas may not be fully represented");
  } else {
    parts.push("Limited coverage - conclusions should be verified manually");
  }

  if (auditData.crawlData.subdomainsFound.length > 0) {
    parts.push(`Found ${auditData.crawlData.subdomainsFound.length} subdomain(s)`);
  }

  return parts.join(". ") + ".";
}

function generateFallbackVerdict(auditData: AuditDataV2): string {
  const criticalCount = auditData.technicalSeo.findings.filter(f => f.severity === "CRITICAL").length;
  const pagesAnalyzed = auditData.crawlData.totalPagesCrawled;

  if (criticalCount > 0) {
    return `Based on ${pagesAnalyzed} pages analyzed, your site has ${criticalCount} critical issues that need immediate attention. The most pressing problems are affecting your site's technical SEO health. We've identified specific areas where quick improvements can drive meaningful results. However, note that this analysis may not capture your full site - additional issues may exist on pages not crawled.`;
  }

  return `Based on ${pagesAnalyzed} pages analyzed, your site shows a mixed picture. While there are no critical issues detected, there are several areas for improvement that could help your rankings and conversions. The analysis confidence is ${auditData.crawlData.overallConfidence.level} - some findings may benefit from manual verification.`;
}

function generateFallbackSummaryV2(
  auditData: AuditDataV2,
  grade: string,
  score: number,
  gradeReasoning: string,
  confidence: number,
  serviceRecommendations: ServiceRecommendation[]
): AuditSummaryV2 {
  const criticalFindings = auditData.technicalSeo.findings.filter(f => f.severity === "CRITICAL");

  return {
    overallGrade: grade,
    gradeScore: score,
    gradeReasoning,
    overallConfidence: confidence,
    confidenceExplanation: buildConfidenceExplanation(auditData.crawlData.overallConfidence, auditData),
    brutalVerdict: generateFallbackVerdict(auditData),
    prioritizedFixes: criticalFindings.slice(0, 5).map((finding, idx) => ({
      priority: idx + 1,
      title: finding.title,
      urgency: finding.severity.toLowerCase() as "critical" | "high" | "medium" | "low",
      whatsWrong: finding.description,
      whyItMatters: finding.impact,
      howToFix: finding.howToFix,
      affectedPages: finding.affectedUrls?.slice(0, 5) || [],
      implementationSteps: [finding.howToFix],
      toolsNeeded: ["Google Search Console"],
      estimatedImpact: "Improved site health and potential ranking boost",
      confidence: finding.confidence,
      dataSource: "Technical SEO analysis",
    })),
    timelineExpectations: {
      thirtyDays: "Address critical technical issues",
      sixtyDays: "Implement on-page optimizations",
      ninetyDays: "Monitor for measurable improvements",
    },
    whatWorksWell: [],
    contentGrowthStrategy: {
      contentRepurposingIdeas: [
        "Turn existing blog posts into LinkedIn carousels",
        "Create short video clips from long-form content",
        "Extract key quotes for Twitter/X threads",
      ],
      contentGaps: [],
      distributionChannels: ["LinkedIn", "Twitter/X", "Email newsletter"],
      prOpportunities: [],
    },
    competitorInsights: {
      likelyCompetitors: [],
      competitiveGaps: [],
      differentiators: [],
      marketPositioning: "Run a full competitor analysis to identify market positioning opportunities.",
    },
    socialMediaStrategy: {
      platformRecommendations: [],
      contentPillars: [],
      engagementTactics: ["Engage with industry leaders", "Share valuable insights regularly"],
      linkedInSpecific: {
        contentThemes: ["Industry insights", "Behind-the-scenes content", "Thought leadership"],
        postingCadence: "3-5 posts per week recommended",
        engagementTips: ["Comment on relevant posts", "Share expertise in comments"],
        authorityBuilding: ["Write LinkedIn articles", "Create document carousels"],
      },
    },
    serviceRecommendations,
    dataDisclaimer: confidence < 70 
      ? `Analysis based on ${auditData.crawlData.totalPagesCrawled} pages. Some findings may be incomplete.`
      : "",
  };
}
