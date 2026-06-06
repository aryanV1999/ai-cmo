/**
 * AI Summary Layer
 * Uses OpenAI ChatGPT API to generate brutal, honest verdicts and actionable recommendations
 */

import { OpenAI } from "openai";
import { TechnicalSeoResult } from "./analyzers/technical-seo";
import { OnPageSeoResult } from "./analyzers/on-page-seo";
import { PageSpeedResult } from "./analyzers/page-speed";
import { CompetitorResult } from "./analyzers/competitors";
import { ChannelResult } from "./analyzers/channels";
import { mapFindingsToServices, ServiceRecommendation } from "./upsell-engine";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface AuditSummary {
  overallGrade: string;
  gradeScore: number;
  gradeReasoning: string;
  brutalVerdict: string;
  prioritizedFixes: PrioritizedFix[];
  timelineExpectations: {
    thirtyDays: string;
    sixtyDays: string;
    ninetyDays: string;
  };
  serviceRecommendations: ServiceRecommendation[];
}

export interface PrioritizedFix {
  priority: number;
  title: string;
  urgency: "critical" | "high" | "medium" | "low";
  whatsWrong: string;
  whyItMatters: string;
  howToFix: string;
  estimatedImpact: string;
  serviceId?: string;
  serviceCta?: string;
}

export interface AuditData {
  domain: string;
  url: string;
  technicalSeo: TechnicalSeoResult;
  onPageSeo: OnPageSeoResult;
  pageSpeed: PageSpeedResult;
  competitors?: CompetitorResult;
  channels?: ChannelResult;
}

/**
 * Generate AI summary using OpenAI ChatGPT API
 */
export async function generateAuditSummary(
  auditData: AuditData
): Promise<AuditSummary> {

  // Calculate overall grade from component scores
  const { grade, score, gradeReasoning } = calculateOverallGrade(auditData);

  // Map findings to service recommendations
  const allFindings = [
    ...auditData.technicalSeo.findings,
    ...auditData.onPageSeo.findings,
    ...auditData.pageSpeed.findings,
    ...(auditData.competitors?.findings || []),
    ...(auditData.channels?.findings || []),
  ];
  const serviceRecommendations = mapFindingsToServices(allFindings);

  // Build the expert prompt
  const prompt = buildExpertPrompt(auditData, serviceRecommendations);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });
    const text = response.choices[0]?.message?.content || "";

    // Parse OpenAI's response
    const parsed = parseGeminiResponse(text, grade, score, gradeReasoning);

    return {
      ...parsed,
      serviceRecommendations,
    };
  } catch (error) {
    console.error("Error generating AI summary:", error);
    // Return fallback summary
    return generateFallbackSummary(auditData, grade, score, gradeReasoning, serviceRecommendations);
  }
}

function buildExpertPrompt(
  auditData: AuditData,
  serviceRecommendations: ServiceRecommendation[]
): string {
  const criticalFindings = [
    ...auditData.technicalSeo.findings.filter((f) => f.severity === "CRITICAL"),
    ...auditData.onPageSeo.findings.filter((f) => f.severity === "CRITICAL"),
    ...auditData.pageSpeed.findings.filter((f) => f.severity === "CRITICAL"),
    ...(auditData.competitors?.findings.filter((f) => f.severity === "CRITICAL") || []),
    ...(auditData.channels?.findings.filter((f) => f.severity === "CRITICAL") || []),
  ];

  const warningFindings = [
    ...auditData.technicalSeo.findings.filter((f) => f.severity === "WARNING"),
    ...auditData.onPageSeo.findings.filter((f) => f.severity === "WARNING"),
    ...auditData.pageSpeed.findings.filter((f) => f.severity === "WARNING"),
    ...(auditData.competitors?.findings.filter((f) => f.severity === "WARNING") || []),
    ...(auditData.channels?.findings.filter((f) => f.severity === "WARNING") || []),
  ];

  return `
<role>
You are Sarah Martinez, a Senior Marketing Executive with 12 years of experience who has:
- Scaled 40+ startups from $0 to $10M+ ARR through SEO and content marketing
- Former VP of Growth at a $200M ARR SaaS company  
- Worked with 200+ websites across e-commerce, SaaS, local services, B2B
- Known for BRUTAL HONESTY and ROI-focused recommendations (no sugarcoating)
- You speak to founders and business owners, NOT to SEO specialists
</role>

<mental_models>
You think in these frameworks:

1. **Impact vs. Effort Matrix**
   - Quick Wins: High impact, low effort (do these FIRST)
   - Strategic Plays: High impact, high effort (plan for these)
   - Low Priority: Low impact, any effort (defer these)

2. **Traffic Impact Tiers**
   - CRITICAL (>50% traffic at risk): Drop everything and fix NOW
   - HIGH (20-50% potential gain): Fix this month
   - MEDIUM (5-20% gain): Fix this quarter
   - LOW (<5% gain): Nice to have

3. **The Founder Reality Check**
   - Will this make them more money? (revenue impact)
   - Will this save them time? (efficiency)
   - Will this beat competitors? (market share)
   - If none of the above, don't mention it
</mental_models>

<communication_style>
**CRITICAL RULES:**
- Address reader directly: "You're losing...", "Your competitors...", "Fix this now"
- Use SPECIFIC NUMBERS from the audit data (e.g., "47 of your 120 pages...")
- Explain BUSINESS IMPACT, not technical metrics (revenue, conversions, market share)
- NO hedging language: Never say "consider", "might want to", "could be good to"
- Say instead: "Fix this immediately", "You're hemorrhaging traffic", "Your competitors are crushing you"
- If they're doing something RIGHT, mention it briefly (builds credibility)
- Be REAL: If site is a disaster, say so. If it's mostly good, say that too.
- NO SEO jargon without immediate plain-English explanation

**Tone Examples:**
❌ BAD: "Your site could benefit from improving page speed scores."
✅ GOOD: "Your ${(auditData.pageSpeed.coreWebVitals.lcp.value / 1000).toFixed(1)}-second page load is killing 40% of your mobile visitors before they see your product."

❌ BAD: "Consider adding meta descriptions to improve CTR."
✅ GOOD: "You're missing meta descriptions on multiple pages. Google's writing terrible ones for you, costing you 30% lower click-through than competitors."
</communication_style>

<experience_base>
You've seen these patterns DESTROY businesses:

**Page Speed >3 seconds**
- Pattern: Mobile users bounce before seeing content
- Real example: E-commerce client lost $15K/month until we fixed this
- Impact: Every 0.1s improvement = 1% conversion increase

**Zero Backlinks from DA>50 Sites**
- Pattern: Google won't rank you for competitive keywords
- Real example: SaaS company spent $100K on content that got ZERO traffic
- Impact: Need 20+ quality backlinks to compete in most industries

**Thin Content (<800 words)**
- Pattern: Google's Helpful Content Update decimates short posts
- Real example: Client's rankings tanked from position 5 to 45 after update
- Impact: Comprehensive content (1,500+ words) gets 3x more backlinks

**Missing Schema Markup**
- Pattern: Competitors get rich snippets, you don't
- Real example: Recipe site lost 60% traffic to competitors with recipe schema
- Impact: 30% CTR boost with proper schema

**Duplicate Meta Descriptions**
- Pattern: Google rewrites them poorly
- Real example: Consistent across 20+ clients
- Impact: 25% CTR loss vs. unique, compelling descriptions
</experience_base>

<audit_data>
**Website Being Analyzed:**
URL: ${auditData.url}
Domain: ${auditData.domain}

**SCORES:**
- Technical SEO: ${auditData.technicalSeo.score}/100
- On-Page SEO: ${auditData.onPageSeo.score}/100
- Page Speed: ${auditData.pageSpeed.score}/100 (Mobile: ${auditData.pageSpeed.mobileScore}, Desktop: ${auditData.pageSpeed.desktopScore})
${auditData.competitors ? `- Competitive Position: ${auditData.competitors.summary.competitivePosition} (Score: ${auditData.competitors.score}/100)` : ""}
${auditData.channels ? `- Marketing Channels: ${auditData.channels.score}/100 (${auditData.channels.summary.presentChannels}/${auditData.channels.channels.length} channels present)` : ""}

**CRITICAL ISSUES (${criticalFindings.length} found - FIX IMMEDIATELY):**
${criticalFindings.map((f) => `- ${f.title}: ${f.description} | IMPACT: ${f.impact}`).join("\n")}

**WARNING ISSUES (${warningFindings.length} found):**
${warningFindings.slice(0, 8).map((f) => `- ${f.title}: ${f.description}`).join("\n")}

**CORE WEB VITALS (Google's ranking factors):**
- LCP (Largest Contentful Paint): ${(auditData.pageSpeed.coreWebVitals.lcp.value / 1000).toFixed(1)}s - ${auditData.pageSpeed.coreWebVitals.lcp.rating === "good" ? "✅ Good" : auditData.pageSpeed.coreWebVitals.lcp.rating === "needs-improvement" ? "⚠️ Needs Work" : "❌ Poor"}
- CLS (Cumulative Layout Shift): ${auditData.pageSpeed.coreWebVitals.cls.value.toFixed(3)} - ${auditData.pageSpeed.coreWebVitals.cls.rating === "good" ? "✅ Good" : auditData.pageSpeed.coreWebVitals.cls.rating === "needs-improvement" ? "⚠️ Needs Work" : "❌ Poor"}
- TBT (Total Blocking Time): ${Math.round(auditData.pageSpeed.coreWebVitals.fid.value)}ms - ${auditData.pageSpeed.coreWebVitals.fid.rating === "good" ? "✅ Good" : auditData.pageSpeed.coreWebVitals.fid.rating === "needs-improvement" ? "⚠️ Needs Work" : "❌ Poor"}

**ON-PAGE METRICS:**
- Average word count: ${auditData.onPageSeo.metrics.avgWordCount} words ${auditData.onPageSeo.metrics.avgWordCount < 500 ? "(TOO THIN - Google hates this)" : auditData.onPageSeo.metrics.avgWordCount < 1000 ? "(Could be longer)" : "(Good length)"}
- Image alt coverage: ${auditData.onPageSeo.metrics.imageAltCoverage}% ${auditData.onPageSeo.metrics.imageAltCoverage < 80 ? "(ACCESSIBILITY ISSUE)" : ""}
- Schema markup: ${auditData.onPageSeo.metrics.schemaPresent}% of pages ${auditData.onPageSeo.metrics.schemaPresent < 50 ? "(MISSING RICH SNIPPETS)" : ""}

${auditData.competitors ? `
**COMPETITIVE LANDSCAPE:**
- Your position: ${auditData.competitors.summary.competitivePosition}
- Primary gaps vs competitors: ${auditData.competitors.summary.primaryGaps.join(", ") || "None identified"}
- Quick wins available: ${auditData.competitors.summary.quickWins.join(", ") || "None identified"}
` : ""}

${auditData.channels ? `
**MARKETING CHANNELS:**
${auditData.channels.channels.map((c) => `- ${c.channel}: ${c.status === "present" ? "✅" : c.status === "weak" ? "⚠️" : "❌"} ${c.status} (${c.quality})`).join("\n")}
` : ""}
</audit_data>

<task>
Generate a BRUTALLY HONEST marketing audit verdict. Make the website owner feel the urgency to fix their issues.

Return ONLY valid JSON (no markdown code blocks, no extra text):

{
  "brutalVerdict": "A 150-250 word brutally honest assessment. Start with the SINGLE BIGGEST problem costing them money RIGHT NOW with a specific number. Explain WHY this matters in business terms. Compare to competitors if relevant. Mention 1-2 secondary critical issues. If something is working well, acknowledge it briefly. End with urgency: what they're losing every day they don't fix this.",
  "prioritizedFixes": [
    {
      "priority": 1,
      "title": "Specific actionable title (e.g., 'Fix 3.8s page load killing 40% of mobile visitors')",
      "urgency": "critical",
      "whatsWrong": "One sentence explaining the technical problem",
      "whyItMatters": "Business impact in plain English - revenue, conversions, market share",
      "howToFix": "1-2 actionable sentences on how to fix it",
      "estimatedImpact": "Specific outcome with numbers (e.g., '+40% mobile conversions in 30 days')"
    }
  ],
  "timelineExpectations": {
    "thirtyDays": "Specific achievable quick wins (use numbers)",
    "sixtyDays": "Strategic improvements showing progress (use numbers)",
    "ninetyDays": "Measurable traffic/revenue impact (use specific % increase)"
  }
}

IMPORTANT: 
- Maximum 5 prioritized fixes, ranked by (Impact × Urgency) / Effort
- Use REAL numbers from the audit data
- Be SPECIFIC about what's broken
- Explain BUSINESS IMPACT (money, market share, conversions)
- NO jargon without explanation
- Make it STING but be CONSTRUCTIVE
</task>`;
}

function parseGeminiResponse(
  response: string,
  grade: string,
  score: number,
  gradeReasoning: string
): Omit<AuditSummary, "serviceRecommendations"> {
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonText = response;
    
    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON
      const rawJsonMatch = response.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonText = rawJsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);
    
    return {
      overallGrade: grade,
      gradeScore: score,
      gradeReasoning,
      brutalVerdict: parsed.brutalVerdict || "Unable to generate verdict.",
      prioritizedFixes: (parsed.prioritizedFixes || []).map(
        (fix: PrioritizedFix, i: number) => ({
          ...fix,
          priority: fix.priority || i + 1,
          urgency: fix.urgency || "medium",
        })
      ),
      timelineExpectations: parsed.timelineExpectations || {
        thirtyDays: "Focus on critical technical fixes",
        sixtyDays: "Expand content and build initial backlinks",
        ninetyDays: "See measurable improvement in rankings",
      },
    };
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    console.error("Raw response:", response.slice(0, 500));
    
    // Return a basic parsed response
    return {
      overallGrade: grade,
      gradeScore: score,
      gradeReasoning,
      brutalVerdict: response.slice(0, 500),
      prioritizedFixes: [],
      timelineExpectations: {
        thirtyDays: "Focus on critical technical fixes",
        sixtyDays: "Expand content and build initial backlinks",
        ninetyDays: "See measurable improvement in rankings",
      },
    };
  }
}

function calculateOverallGrade(auditData: AuditData): {
  grade: string;
  score: number;
  gradeReasoning: string;
} {
  // Weighted average of component scores
  const weights = {
    technicalSeo: 0.3,
    onPageSeo: 0.25,
    pageSpeed: 0.25,
    competitors: 0.1,
    channels: 0.1,
  };

  let totalWeight = weights.technicalSeo + weights.onPageSeo + weights.pageSpeed;
  let weightedScore =
    auditData.technicalSeo.score * weights.technicalSeo +
    auditData.onPageSeo.score * weights.onPageSeo +
    auditData.pageSpeed.score * weights.pageSpeed;

  if (auditData.competitors) {
    weightedScore += auditData.competitors.score * weights.competitors;
    totalWeight += weights.competitors;
  }

  if (auditData.channels) {
    weightedScore += auditData.channels.score * weights.channels;
    totalWeight += weights.channels;
  }

  const score = Math.round(weightedScore / totalWeight);

  // Map score to grade
  let grade: string;
  if (score >= 95) grade = "A+";
  else if (score >= 90) grade = "A";
  else if (score >= 85) grade = "A-";
  else if (score >= 80) grade = "B+";
  else if (score >= 75) grade = "B";
  else if (score >= 70) grade = "B-";
  else if (score >= 65) grade = "C+";
  else if (score >= 60) grade = "C";
  else if (score >= 55) grade = "C-";
  else if (score >= 50) grade = "D+";
  else if (score >= 45) grade = "D";
  else if (score >= 40) grade = "D-";
  else grade = "F";

  // Generate reasoning
  const criticalCount =
    auditData.technicalSeo.summary.criticalCount +
    auditData.onPageSeo.summary.criticalCount +
    auditData.pageSpeed.summary.criticalCount;

  let gradeReasoning: string;
  if (grade.startsWith("A")) {
    gradeReasoning = "Your site has solid SEO foundations with only minor improvements needed.";
  } else if (grade.startsWith("B")) {
    gradeReasoning = "Good baseline with some important issues that should be addressed soon.";
  } else if (grade.startsWith("C")) {
    gradeReasoning = `Several significant issues need attention. Found ${criticalCount} critical problems.`;
  } else if (grade.startsWith("D")) {
    gradeReasoning = `Multiple serious problems are hurting your rankings. ${criticalCount} critical issues found.`;
  } else {
    gradeReasoning = `Your site has fundamental SEO problems that are severely limiting growth. ${criticalCount} critical issues require immediate attention.`;
  }

  return { grade, score, gradeReasoning };
}

function generateFallbackSummary(
  auditData: AuditData,
  grade: string,
  score: number,
  gradeReasoning: string,
  serviceRecommendations: ServiceRecommendation[]
): AuditSummary {
  // Generate a basic summary when Claude is unavailable
  const criticalFindings = [
    ...auditData.technicalSeo.findings.filter((f) => f.severity === "CRITICAL"),
    ...auditData.onPageSeo.findings.filter((f) => f.severity === "CRITICAL"),
    ...auditData.pageSpeed.findings.filter((f) => f.severity === "CRITICAL"),
  ];

  const brutalVerdict = criticalFindings.length > 0
    ? `Your website has ${criticalFindings.length} critical issues that are actively hurting your search rankings. The most urgent problem: ${criticalFindings[0].title}. ${criticalFindings[0].impact} Your technical SEO score of ${auditData.technicalSeo.score}/100 and page speed score of ${auditData.pageSpeed.score}/100 indicate significant room for improvement. Without fixing these issues, you're leaving traffic and revenue on the table.`
    : `Your website is in decent shape with a score of ${score}/100. While there are no critical emergencies, there's still room for improvement. Focus on the warnings below to take your SEO to the next level.`;

  const prioritizedFixes: PrioritizedFix[] = criticalFindings.slice(0, 5).map((f, i) => ({
    priority: i + 1,
    title: f.title,
    urgency: "critical" as const,
    whatsWrong: f.description,
    whyItMatters: f.impact,
    howToFix: f.howToFix,
    estimatedImpact: "High impact on rankings and traffic",
  }));

  return {
    overallGrade: grade,
    gradeScore: score,
    gradeReasoning,
    brutalVerdict,
    prioritizedFixes,
    timelineExpectations: {
      thirtyDays: "Fix critical technical issues and improve page speed",
      sixtyDays: "Address content gaps and on-page optimization",
      ninetyDays: "Build authority through backlinks and see ranking improvements",
    },
    serviceRecommendations,
  };
}
