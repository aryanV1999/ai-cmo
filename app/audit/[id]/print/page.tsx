"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  TrendingUp,
  Lightbulb,
} from "lucide-react";

interface AuditData {
  id: string;
  siteUrl: string;
  domain: string;
  status: string;
  isUnlocked?: boolean;
  grade?: string;
  gradeScore?: number;
  fullReport?: {
    aiSummary: Record<string, unknown>;
    brandOverview?: Record<string, unknown>;
    competitors?: Record<string, unknown> | null;
    channels?: Record<string, unknown> | null;
    findings: Array<{
      id: string;
      category: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      impact: string;
      howToFix: string;
      affectedCount: number;
    }>;
  };
}

const sectionNameMap: Record<string, string> = {
  "Rand Fishkin Framework": "\uD83D\uDD0D SEO Analysis",
  "Gary Vaynerchuk Framework": "\uD83D\uDCF1 Content & Social Strategy",
  "Seth Godin Framework": "\uD83C\uDFAF Brand Positioning",
  "Andrew Chen Framework": "\uD83D\uDE80 Growth Strategy",
  "Satya Nadella Framework": "\uD83D\uDC54 Executive Summary",
};

function getPersonaLabel(framework: string | undefined): string {
  if (!framework) return "";
  return sectionNameMap[framework] || framework;
}

function getPersonaText(key: string, reviewedBy?: Record<string, string>): string {
  const framework = reviewedBy?.[key];
  if (!framework) return "";
  return `Reviewed by: ${framework}`;
}

function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function SummaryMetricLarge({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 px-6 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary">{value}</p>
      {sublabel && <p className="text-xs font-medium text-accent mt-1">{sublabel}</p>}
    </div>
  );
}

// ─── Component: CMOSummary ───────────────────────────────────────
function CMOSummary({ aiSummary }: { aiSummary: Record<string, unknown> }) {
  const executiveSummary = aiSummary.executiveSummary as Record<string, unknown> | undefined;
  const categoryScores = aiSummary.categoryScores as Record<string, number> | undefined;

  if (!executiveSummary) {
    return (
      <p className="text-lg leading-relaxed">
        {(aiSummary.brutalVerdict as string) || "Your report is ready."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xl font-semibold leading-snug">
        {String(executiveSummary.headline || "")}
      </p>
      <p className="text-muted-foreground leading-relaxed">
        {String(executiveSummary.currentState || "")}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryMetric label="Top opportunity" value={String(executiveSummary.topOpportunity || "Not available")} />
        <SummaryMetric label="Expected impact" value={String(executiveSummary.expectedImpact || "Not available")} />
        <SummaryMetric label="Time to value" value={String(executiveSummary.timeToValue || "Not available")} />
      </div>
      {categoryScores && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Object.entries(categoryScores).map(([key, value]) => (
            <div key={key} className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: BrandPositioningSection ──────────────────────────
function BrandPositioningSection({ positioning }: { positioning: Record<string, unknown> }) {
  const messagingPillars = (positioning.messagingPillars as string[] | undefined) || [];
  const targetAudience = (positioning.targetAudience as string[] | undefined) || [];
  const recommendations = (positioning.recommendations as string[] | undefined) || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryMetric label="Value Proposition" value={String(positioning.valueProposition || "Not extracted")} />
        <SummaryMetric label="Industry" value={String(positioning.industryCategory || "Not specified")} />
        <SummaryMetric label="Business Model" value={String(positioning.businessModel || "Unknown")} />
        <SummaryMetric label="Brand Voice" value={String(positioning.brandVoice || "Professional")} />
        <SummaryMetric label="Positioning Clarity" value={String(positioning.positioningClarity || "Moderate")} />
        <SummaryMetric label="Tagline" value={String(positioning.tagline || "Not detected")} />
      </div>
      {messagingPillars.length > 0 && (
        <div>
          <p className="font-semibold text-primary mb-2">Messaging Pillars</p>
          <div className="flex flex-wrap gap-2">
            {messagingPillars.map((pillar, i) => (
              <span key={i} className="rounded-full bg-accent/10 text-accent text-xs font-medium px-3 py-1">
                {pillar}
              </span>
            ))}
          </div>
        </div>
      )}
      {targetAudience.length > 0 && (
        <div>
          <p className="font-semibold text-primary mb-2">Target Audience Signals</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {targetAudience.slice(0, 4).map((aud, i) => <li key={i}>{aud}</li>)}
          </ul>
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="rounded-lg border bg-amber-50 p-4">
          <p className="font-semibold text-primary mb-2">Positioning Recommendations</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Component: BrandOverview ─────────────────────────────────────
function BrandOverview({ overview }: { overview: Record<string, unknown> }) {
  const sampledPages = (overview.sampledPages as Array<Record<string, unknown>> | undefined) || [];
  const h1Tags = (overview.h1Tags as string[] | undefined) || [];
  const detectedSchema = (overview.detectedSchema as string[] | undefined) || [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xl font-semibold text-primary">
          {String(overview.title || overview.domain || "Brand")}
        </p>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          {String(overview.metaDescription || "No homepage meta description was detected, so the brand summary is limited to crawl evidence.")}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Domain" value={String(overview.domain || "Not available")} />
        <SummaryMetric label="Pages crawled" value={String(overview.pagesCrawled || 0)} />
        <SummaryMetric label="Pages discovered" value={String(overview.pagesDiscovered || 0)} />
      </div>
      {h1Tags.length > 0 && (
        <div>
          <p className="font-semibold text-primary">Primary positioning signals</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {h1Tags.slice(0, 5).map((heading, i) => <li key={i}>{heading}</li>)}
          </ul>
        </div>
      )}
      {detectedSchema.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Schema detected: {detectedSchema.join(", ")}
        </p>
      )}
      {sampledPages.length > 0 && (
        <div>
          <p className="font-semibold text-primary">Pages used for brand context</p>
          <div className="mt-2 grid gap-2">
            {sampledPages.slice(0, 5).map((page, i) => (
              <div key={i} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="font-medium">{String(page.title || page.url || "Untitled page")}</p>
                <p className="mt-1 break-all text-muted-foreground">{String(page.url || "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component: SWOT Analysis ─────────────────────────────────────
function SwotAnalysis({ swot }: { swot: Record<string, unknown> }) {
  const strengths = (swot.strengths as Array<Record<string, string>> | undefined) || [];
  const weaknesses = (swot.weaknesses as Array<Record<string, string>> | undefined) || [];
  const opportunities = (swot.opportunities as Array<Record<string, string>> | undefined) || [];
  const threats = (swot.threats as Array<Record<string, string>> | undefined) || [];

  const renderSwotCard = (
    items: Array<Record<string, string>>,
    title: string,
    icon: React.ReactNode,
    borderColor: string,
    bgColor: string
  ) => (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="font-semibold text-primary">{title}</p>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 4).map((item, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium">{item.finding || item.category || "Item"}</p>
              {item.evidence && <p className="text-muted-foreground text-xs mt-0.5">{item.evidence}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No items identified</p>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {renderSwotCard(strengths, "Strengths", <CheckCircle className="w-5 h-5 text-green-500" />, "border-green-200", "bg-green-50")}
      {renderSwotCard(weaknesses, "Weaknesses", <AlertTriangle className="w-5 h-5 text-red-500" />, "border-red-200", "bg-red-50")}
      {renderSwotCard(opportunities, "Opportunities", <Lightbulb className="w-5 h-5 text-blue-500" />, "border-blue-200", "bg-blue-50")}
      {renderSwotCard(threats, "Threats", <AlertCircle className="w-5 h-5 text-amber-500" />, "border-amber-200", "bg-amber-50")}
    </div>
  );
}

// ─── Component: SocialIntelligence ────────────────────────────────
function SocialIntelligence({ aiSummary }: { aiSummary: Record<string, unknown> }) {
  const si = (aiSummary.socialMediaIntelligence as Record<string, unknown>) || {};
  const contentPillars = (si.contentPillars as string[] | undefined) || [];
  const bestThemes = (si.bestPerformingThemes as string[] | undefined) || [];
  const weakestThemes = (si.weakestThemes as string[] | undefined) || [];
  const recommendations = (si.recommendations as string[] | undefined) || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Overall Score" value={`${(si.overallScore as number) ?? "?"}/100`} />
        <SummaryMetric label="Content Mix" value={String(si.contentMix || "N/A")} />
        <SummaryMetric label="Brand Voice" value={String(si.brandVoice || "N/A")} />
        <SummaryMetric label="Posting Consistency" value={String(si.postingConsistency || "N/A")} />
        <SummaryMetric label="Audience Quality" value={String(si.audienceQuality || "N/A")} />
        <SummaryMetric label="Community Strength" value={String(si.communityStrength || "N/A")} />
      </div>
      {contentPillars.length > 0 && (
        <div>
          <p className="font-semibold text-primary mb-2">Content Pillars</p>
          <div className="flex flex-wrap gap-2">
            {contentPillars.map((pillar, i) => (
              <span key={i} className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1">
                {pillar}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {bestThemes.length > 0 && (
          <div className="rounded-lg border bg-green-50 p-4">
            <p className="font-semibold text-primary mb-2">Best Performing Themes</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {bestThemes.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
        {weakestThemes.length > 0 && (
          <div className="rounded-lg border bg-red-50 p-4">
            <p className="font-semibold text-primary mb-2">Weakest Themes</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {weakestThemes.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
      {recommendations.length > 0 && (
        <div className="rounded-lg border bg-purple-50 p-4">
          <p className="font-semibold text-primary mb-2">Social Media Recommendations</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Component: ContentIntelligenceSection ────────────────────────
function ContentIntelligenceSection({ aiSummary }: { aiSummary: Record<string, unknown> }) {
  const ci = (aiSummary.contentIntelligence as Record<string, unknown>) || {};
  const bestPerf = (ci.bestPerformingContent as string[] | undefined) || [];
  const contentGaps = (ci.contentGaps as string[] | undefined) || [];
  const missingTopics = (ci.missingTopics as string[] | undefined) || [];
  const recommendations = (ci.recommendations as string[] | undefined) || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryMetric label="Current Content Mix" value={String(ci.currentContentMix || "N/A")} />
        <SummaryMetric label="Content Velocity" value={String(ci.contentVelocity || "N/A")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {bestPerf.length > 0 && (
          <div className="rounded-lg border bg-green-50 p-4">
            <p className="font-semibold text-primary mb-2">Best Performing Content</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {bestPerf.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {contentGaps.length > 0 && (
          <div className="rounded-lg border bg-red-50 p-4">
            <p className="font-semibold text-primary mb-2">Content Gaps</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {contentGaps.map((gap, i) => <li key={i}>{gap}</li>)}
            </ul>
          </div>
        )}
      </div>
      {missingTopics.length > 0 && (
        <div className="rounded-lg border bg-amber-50 p-4">
          <p className="font-semibold text-primary mb-2">Missing Topics to Cover</p>
          <div className="flex flex-wrap gap-2">
            {missingTopics.map((topic, i) => (
              <span key={i} className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="rounded-lg border bg-blue-50 p-4">
          <p className="font-semibold text-primary mb-2">Content Recommendations</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Component: GrowthPlanSection ─────────────────────────────────
function GrowthPlanSection({ aiSummary }: { aiSummary: Record<string, unknown> }) {
  const thirty = (aiSummary.thirtyDayPlan as Record<string, unknown>) || {};
  const sixty = (aiSummary.sixtyDayPlan as Record<string, unknown>) || {};
  const ninety = (aiSummary.ninetyDayPlan as Record<string, unknown>) || {};

  const renderPhase = (phase: Record<string, unknown>, label: string, color: string) => {
    const actions = (phase.actions as string[] | undefined) || [];
    const outcomes = (phase.expectedOutcomes as string[] | undefined) || [];
    const kpis = (phase.kpis as string[] | undefined) || [];
    return (
      <div className={`rounded-lg border-l-4 ${color} bg-white p-5 shadow-sm`}>
        <p className="font-semibold text-primary mb-1">{label}</p>
        <p className="text-sm font-medium text-accent mb-3">{String(phase.focus || "")}</p>
        {actions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Actions</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {actions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          {outcomes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Expected Outcomes</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {outcomes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          {kpis.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">KPIs</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {kpis.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {renderPhase(thirty, "30 Day Plan", "border-l-red-400")}
      {renderPhase(sixty, "60 Day Plan", "border-l-amber-400")}
      {renderPhase(ninety, "90 Day Plan", "border-l-green-400")}
    </div>
  );
}

// ─── Component: CompetitorAnalysis ────────────────────────────────
function CompetitorAnalysis({
  competitors,
  aiSummary,
}: {
  competitors: Record<string, unknown>;
  aiSummary?: Record<string, unknown>;
}) {
  const competitorIntel = aiSummary?.competitorIntelligence as Record<string, unknown> | undefined;
  const competitorList = (competitors.competitors as Array<Record<string, unknown>> | undefined) || [];
  const aiIdentifiedCompetitors = (competitorIntel?.directCompetitors as string[] | undefined) || [];
  const comparisons = (competitors.comparisons as Array<Record<string, unknown>> | undefined) || [];
  const competitorSummary = competitors.summary as Record<string, unknown> | undefined;
  const notes = (competitors.notes as string[] | undefined) || [];
  const dataQuality = String(competitors.dataQuality || "unavailable");
  const competitorStrengths = (competitorIntel?.competitorStrengths as string[] | undefined) || [];
  const differentiation = (competitorIntel?.differentiationOpportunities as string[] | undefined) || [];
  const primaryGaps = (competitorIntel?.contentGaps as string[] | undefined) || (competitorSummary?.primaryGaps as string[] | undefined) || [];
  const quickWins = (competitorSummary?.quickWins as string[] | undefined) || (competitorIntel?.differentiationOpportunities as string[] | undefined) || [];
  const displayedCompetitors = aiIdentifiedCompetitors.length > 0
    ? aiIdentifiedCompetitors
    : competitorList.map((c) => String(c.domain || "")).filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Competitors found ({dataQuality.replace(/-/g, " ")})
        </p>
        <p className="mt-2 text-lg font-semibold text-primary">
          {displayedCompetitors.length > 0
            ? displayedCompetitors.join(", ")
            : "No reliable competitor domains found yet"}
        </p>
      </div>
      {notes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {notes.slice(0, 2).map((note, i) => <p key={i}>{note}</p>)}
        </div>
      )}
      {competitorList.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {competitorList.slice(0, 4).map((competitor, i) => {
            const compData = competitorList.find(c => String(c.domain || "") === String(competitor.domain || ""));
            const positioning = compData?.positioning as string | undefined;
            const contentStrategy = compData?.contentStrategy as string | undefined;
            const socialPresence = compData?.socialPresence as string | undefined;
            const confidence = compData?.confidence as number | undefined;
            return (
              <div key={i} className="rounded-lg border bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-primary">{String(competitor.domain || "Competitor")}</p>
                  {confidence != null && confidence > 0 && (
                    <span className="text-xs text-muted-foreground">{confidence}% match</span>
                  )}
                </div>
                {positioning && positioning !== "N/A" ? (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-primary">Positioning:</span> {positioning.slice(0, 200)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">
                    🎯 <span className="font-medium">Positioning insight:</span> This competitor operates in the same space. A full competitive crawl would reveal their messaging strategies and content gaps you can exploit.
                  </p>
                )}
                {contentStrategy && (
                  <p className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium">Content:</span> {contentStrategy.slice(0, 150)}
                  </p>
                )}
                {socialPresence && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Social:</span> {socialPresence.slice(0, 150)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="font-semibold text-primary">Competitor strengths</p>
          {competitorStrengths.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {competitorStrengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Competitor strengths need deeper market data or AI report context.</p>
          )}
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="font-semibold text-primary">Your positioning opportunities</p>
          {[...differentiation, ...quickWins].length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {[...differentiation, ...quickWins].map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No clear positioning opportunities were available from the current dataset.</p>
          )}
        </div>
      </div>
      {comparisons.length > 0 && (
        <div>
          <p className="font-semibold text-primary mb-2">Competitive Comparison</p>
          <div className="space-y-2">
            {comparisons.slice(0, 4).map((comparison, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{String(comparison.dimension || "Insight")}</p>
                <p className="mt-1 text-muted-foreground">{String(comparison.insight || comparison.opportunity || "")}</p>
                {(comparison.opportunity as string | undefined) && (
                  <p className="mt-1 text-xs font-medium text-accent">Opportunity: {String(comparison.opportunity)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component: SocialChannelAnalysis ─────────────────────────────
function SocialChannelAnalysis({
  channels,
  aiSummary,
}: {
  channels: Record<string, unknown>;
  aiSummary?: Record<string, unknown>;
}) {
  const channelList = (channels.channels as Array<Record<string, unknown>> | undefined) || [];
  const socialChannel = channelList.find((ch) =>
    String(ch.channel || "").toLowerCase().includes("social")
  );
  const socialStrategy = (aiSummary?.socialStrategy || aiSummary?.socialMediaIntelligence) as Record<string, unknown> | undefined;
  const platformRecommendations =
    (socialStrategy?.platformRecommendations as Array<Record<string, unknown>> | undefined) || [];
  const evidence = (socialChannel?.evidence as Array<Record<string, unknown>> | undefined) || [];
  const recommendations = (socialChannel?.recommendations as string[] | undefined) || [];
  const socialMetrics = (socialChannel?.metrics as Record<string, unknown> | undefined) || {};
  const socialBreakdown = (socialMetrics.breakdown as Record<string, unknown> | undefined) || {};
  const themeDistribution = (socialMetrics.theme_distribution as Record<string, unknown> | undefined) || {};
  const brandAlignment = (socialMetrics.brand_alignment as Record<string, unknown> | undefined) || {};
  const socialScore = getSocialMediaScore(socialChannel);
  const strengths = buildSocialStrengths(socialChannel, evidence, platformRecommendations, socialStrategy);
  const improvements = buildSocialImprovements(socialChannel, recommendations, platformRecommendations, socialStrategy);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Social media score" value={`${socialScore}/100`} />
        <SummaryMetric label="Status" value={String(socialChannel?.status || "Not detected")} />
        <SummaryMetric label="Platforms found" value={String(socialMetrics.platformCount || evidence.length || 0)} />
        <SummaryMetric label="Profiles with API data" value={String(socialMetrics.profilesWithMetrics || 0)} />
        <SummaryMetric label="Total followers" value={formatMetricNumber(socialMetrics.totalFollowers)} />
        <SummaryMetric label="Data sources" value={String(socialMetrics.dataSources || "profile-discovery-only")} />
      </div>
      <p className="text-muted-foreground leading-relaxed">
        {String(socialChannel?.details || "No public social media profiles were detected from the website or web research.")}
      </p>
      {Object.keys(socialBreakdown).length > 0 && (
        <div>
          <p className="font-semibold text-primary">Computed score breakdown</p>
          <div className="mt-2 grid gap-2 md:grid-cols-5">
            {Object.entries(socialBreakdown).map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-slate-50 p-3">
                <p className="text-xs uppercase text-muted-foreground">{key.replace(/_/g, " ")}</p>
                <p className="mt-1 text-xl font-bold text-primary">{String(value)}/100</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {Object.keys(themeDistribution).length > 0 && (
        <div>
          <p className="font-semibold text-primary">Recent content theme mix</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {Object.entries(themeDistribution).slice(0, 6).map(([theme, percent]) => (
              <div key={theme} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="font-medium capitalize">{theme.replace(/_/g, " ")}</p>
                <p className="mt-1 text-muted-foreground">{String(percent)}% of sampled posts</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {Boolean(brandAlignment.status) && (
        <div className="rounded-lg border bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-primary">Brand Consistency</p>
          {(brandAlignment.score as number) != null && Number(brandAlignment.score) >= 0 ? (
            <p className="mt-1 capitalize text-muted-foreground">
              {String(brandAlignment.status).replace(/-/g, " ")} — Score: {String(brandAlignment.score)}/100
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Not enough evidence available to assess brand consistency.
            </p>
          )}
          {Array.isArray(brandAlignment.issues) && brandAlignment.issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {(brandAlignment.issues as string[]).slice(0, 3).map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          )}
        </div>
      )}
      {evidence.length > 0 && (
        <div>
          <p className="font-semibold text-primary">Detected social platforms</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {evidence.map((item, i) => (
              <div key={i} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="font-medium">{String(item.value || "Social profile")}</p>
                <p className="mt-1 break-all text-muted-foreground">{String(item.source || "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="font-semibold text-primary">Social strengths</p>
          {strengths.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {strengths.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No clear social strengths detected yet.</p>
          )}
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="font-semibold text-primary">Social improvements</p>
          {improvements.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {improvements.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No specific social improvements detected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getSocialMediaScore(socialChannel?: Record<string, unknown>): number {
  if (!socialChannel) return 0;
  const status = String(socialChannel.status || "missing");
  const metrics = (socialChannel.metrics as Record<string, unknown> | undefined) || {};
  const storedScore = Number(metrics.social_strength ?? metrics.socialScore);
  const platformCount = Number(metrics.platformCount || 0);
  const profilesWithMetrics = Number(metrics.profilesWithMetrics || 0);
  const totalFollowers = Number(metrics.totalFollowers || 0);
  const totalRecentPosts = Number(metrics.totalRecentPosts || 0);
  const avgEngagementRate = Number(metrics.avgEngagementRate || 0);

  if (status === "missing") return 0;
  if (Number.isFinite(storedScore) && storedScore > 0) return storedScore;

  const engagement = avgEngagementRate > 1 ? avgEngagementRate / 100 : avgEngagementRate;
  const presenceScore = Math.min(30, platformCount * 6);
  const dataQualityScore = Math.min(20, profilesWithMetrics * 10);
  const audienceScore = totalFollowers > 0 ? Math.min(20, Math.log10(totalFollowers + 1) * 4) : 0;
  const activityScore = Math.min(15, totalRecentPosts * 1.5);
  const engagementScore = engagement > 0 ? Math.min(15, engagement * 250) : 0;

  return Math.min(100, Math.round(presenceScore + dataQualityScore + audienceScore + activityScore + engagementScore));
}

function formatMetricNumber(value: unknown): string {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "Not available";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function buildSocialStrengths(
  socialChannel: Record<string, unknown> | undefined,
  evidence: Array<Record<string, unknown>>,
  platformRecommendations: Array<Record<string, unknown>>,
  socialStrategy?: Record<string, unknown>
): string[] {
  if (!socialChannel) return [];
  const metrics = (socialChannel.metrics as Record<string, unknown> | undefined) || {};
  const profileBreakdown = (metrics.profileBreakdown as Array<Record<string, unknown>> | undefined) || [];
  const evidenceSummary = (metrics.evidence_summary as string[] | undefined) || [];
  const strengths: string[] = [];
  strengths.push(
    ...((socialStrategy?.strengths as string[] | undefined) || []).filter((item) => !isGenericSocialText(item)),
    ...evidenceSummary
  );
  for (const profile of profileBreakdown) {
    const platform = String(profile.platform || "Social profile");
    const followers = formatMetricNumber(profile.followers);
    const source = String(profile.dataSource || profile.data_source || "profile-discovery-only");
    const url = String(profile.url || "");
    if (followers !== "Not available") {
      strengths.push(`${platform}: ${followers} followers found from ${source}${url ? ` (${url})` : ""}.`);
    } else if (url) {
      strengths.push(`${platform}: official profile detected at ${url}; audience metrics are not available yet.`);
    }
  }
  for (const platform of platformRecommendations) {
    const platformName = String(platform.platform || "Platform");
    const currentState = String(platform.currentState || "").trim();
    if (currentState && !isGenericSocialText(currentState)) {
      strengths.push(`${platformName}: ${currentState}`);
    }
  }
  const assessment = String(socialStrategy?.overallAssessment || "").trim();
  if (assessment && !isGenericSocialText(assessment)) strengths.push(assessment);
  if (strengths.length === 0 && evidence.length > 0) {
    strengths.push(...evidence.slice(0, 4).map((item) => String(item.value || item.source || "Social profile detected.")));
  }
  return Array.from(new Set(strengths)).slice(0, 8);
}

function buildSocialImprovements(
  socialChannel: Record<string, unknown> | undefined,
  recommendations: string[],
  platformRecommendations: Array<Record<string, unknown>>,
  socialStrategy?: Record<string, unknown>
): string[] {
  const improvements: string[] = [];
  improvements.push(
    ...((socialStrategy?.weaknesses as string[] | undefined) || []).filter((item) => !isGenericSocialText(item)),
    ...((socialStrategy?.growthOpportunities as string[] | undefined) || []).filter((item) => !isGenericSocialText(item)),
    ...((socialStrategy?.ninetyDayActionPlan as string[] | undefined) || []).filter((item) => !isGenericSocialText(item))
  );
  for (const platform of platformRecommendations) {
    const platformName = String(platform.platform || "Platform");
    const recs = (platform.recommendations as string[] | undefined) || [];
    const contentTypes = (platform.contentTypes as string[] | undefined) || [];
    if (recs.length > 0) improvements.push(`${platformName}: ${recs.slice(0, 3).join("; ")}`);
    if (contentTypes.length > 0) improvements.push(`${platformName}: test ${contentTypes.slice(0, 3).join(", ")} content formats.`);
  }
  improvements.push(
    ...((socialStrategy?.contentCalendarIdeas as string[] | undefined) || []).slice(0, 4),
    ...((socialStrategy?.integrationOpportunities as string[] | undefined) || []).slice(0, 4)
  );
  improvements.push(...recommendations.filter((item) => !isGenericSocialText(item)));
  if (!socialChannel || String(socialChannel.status || "") === "missing") {
    improvements.push("Add official social profile links to the site header or footer so users and crawlers can verify the brand ecosystem.");
  }
  if (Number((socialChannel?.metrics as Record<string, unknown> | undefined)?.profilesWithMetrics || 0) === 0) {
    improvements.push("Connect SocialData for X/Twitter and Apify for Instagram, TikTok, YouTube, and other public profile metrics.");
  }
  return Array.from(new Set(improvements)).slice(0, 8);
}

function isGenericSocialText(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return [
    "needs review",
    "social presence analysis pending",
    "share industry insights",
    "engage with community",
    "weekly tips",
    "monthly deep dives",
    "repurpose blog content to social",
  ].some((generic) => normalized === generic || normalized.includes(generic));
}

function FindingCard({ finding }: {
  finding: {
    severity: string;
    title: string;
    description: string;
    impact: string;
    howToFix: string;
    affectedCount: number;
  };
}) {
  const severityConfig: Record<string, { icon: React.ReactNode; border: string; bg: string }> = {
    CRITICAL: { icon: <AlertTriangle className="w-5 h-5 text-red-500" />, border: "border-red-200", bg: "bg-red-50" },
    WARNING: { icon: <AlertCircle className="w-5 h-5 text-amber-500" />, border: "border-amber-200", bg: "bg-amber-50" },
    INFO: { icon: <Info className="w-5 h-5 text-blue-500" />, border: "border-blue-200", bg: "bg-blue-50" },
  };
  const config = severityConfig[finding.severity] || severityConfig.INFO;

  return (
    <div className={`p-4 rounded-lg border ${config.border} ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold">{finding.title}</h4>
          <p className="text-sm mt-1 opacity-90">{finding.description}</p>
          <div className="mt-3 space-y-2 text-sm">
            <div><strong>Impact:</strong> {finding.impact}</div>
            <div><strong>How to fix:</strong> {finding.howToFix}</div>
            {finding.affectedCount > 1 && <div><strong>Affected:</strong> {finding.affectedCount} pages</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════

export default function PrintReportPage() {
  const params = useParams();
  const auditId = params.id as string;
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printTriggered = useRef(false);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const response = await fetch(`/api/audits/${auditId}`);
        if (!response.ok) throw new Error("Failed to fetch audit");
        const data = await response.json();
        setAudit(data);
        if (!printTriggered.current) {
          printTriggered.current = true;
          setTimeout(() => window.print(), 500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [auditId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Failed to load report. {error}</p>
      </div>
    );
  }

  const fullReport = audit.fullReport;
  const aiSummary = fullReport?.aiSummary || {};
  const reviewedBy = (aiSummary.reviewedBy || aiSummary.reviewed_by) as Record<string, string> | undefined;
  const executiveSummary = aiSummary.executiveSummary as Record<string, unknown> | undefined;
  const categoryScores = aiSummary.categoryScores as Record<string, number> | undefined;
  const brandPositioning = aiSummary.brandPositioningAnalysis as Record<string, unknown> | undefined;
  const swotAnalysis = aiSummary.swotAnalysis as Record<string, unknown> | undefined;
  const socialIntel = aiSummary.socialMediaIntelligence as Record<string, unknown> | undefined;
  const contentIntel = aiSummary.contentIntelligence as Record<string, unknown> | undefined;
  const immediateActions = (aiSummary.immediateActions as Array<Record<string, unknown>> | undefined) || [];
  const quickWins = (aiSummary.quickWins as string[] | undefined) || [];
  const growthOpportunities = (aiSummary.growthOpportunities as string[] | undefined) || [];
  const marketingMaturityScore = (aiSummary.marketingMaturityScore as number | undefined) || 0;
  const marketingMaturityLabel = safeString(aiSummary.marketingMaturityLabel);
  const findings = fullReport?.findings || [];

  const hasSwot = (() => {
    const swot = swotAnalysis;
    if (!swot) return false;
    const strengths = (swot.strengths as Array<unknown> | undefined) || [];
    const weaknesses = (swot.weaknesses as Array<unknown> | undefined) || [];
    const opportunities = (swot.opportunities as Array<unknown> | undefined) || [];
    return strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0;
  })();

  const hasBrandPositioning = (() => {
    const bp = brandPositioning;
    if (!bp) return false;
    const vp = String(bp.valueProposition || "");
    return vp.length > 10 && !vp.includes("pending");
  })();

  const hasSocialIntel = (() => {
    if (!socialIntel) return false;
    const pillars = (socialIntel.contentPillars as Array<unknown> | undefined) || [];
    const recs = (socialIntel.recommendations as Array<unknown> | undefined) || [];
    return pillars.length > 0 || recs.length > 0;
  })();

  const hasContentIntel = (() => {
    if (!contentIntel) return false;
    const gaps = (contentIntel.contentGaps as Array<unknown> | undefined) || [];
    const topics = (contentIntel.missingTopics as Array<unknown> | undefined) || [];
    return gaps.length > 0 || topics.length > 0;
  })();

  const hasGrowthPlan = (() => {
    const thirty = aiSummary.thirtyDayPlan as Record<string, unknown> | undefined;
    if (!thirty) return false;
    const actions = (thirty.actions as Array<unknown> | undefined) || [];
    return actions.length > 0;
  })();

  return (
    <div>
      {/* Print-specific CSS */}
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .page-break { page-break-before: always; }
          .no-print { display: none !important; }
          .shadow-sm { box-shadow: none !important; }
          .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-red-50 { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-blue-50 { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-amber-50 { background-color: #fffbeb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-purple-50 { background-color: #faf5ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-white { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-accent\\/10 { background-color: rgba(234, 88, 12, 0.1) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-accent { color: #ea580c !important; }
          .text-primary { color: #1e3a5f !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-6">
        {/* ── Header ── */}
        <div className="text-center mb-10 pb-6 border-b-2 border-primary/10">
          <h1 className="text-3xl font-extrabold text-primary">Marketing Intelligence Report</h1>
          <p className="text-lg text-accent mt-1">{audit.domain}</p>
          <p className="text-sm text-muted-foreground mt-2">Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* ── Brand Overview ── */}
        {fullReport?.brandOverview && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">Brand Overview</h2>
            <BrandOverview overview={fullReport.brandOverview} />
          </div>
        )}

        {/* ── Executive Summary ── */}
        {Boolean(aiSummary) && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {getPersonaLabel(reviewedBy?.executive) || "CMO Executive Summary"}
            </h2>
            {reviewedBy?.executive && (
              <p className="text-sm text-accent font-medium mb-4">{getPersonaText("executive", reviewedBy)}</p>
            )}

            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="rounded-xl border bg-slate-50 px-6 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall Score</p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {audit.gradeScore ?? "?"}<span className="text-lg font-semibold text-muted-foreground">/100</span>
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 px-6 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketing Maturity</p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {marketingMaturityScore}<span className="text-lg font-semibold text-muted-foreground">/100</span>
                </p>
                <p className="text-xs font-medium text-accent mt-1">{marketingMaturityLabel}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 px-6 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grade</p>
                <p className="mt-1 text-3xl font-bold text-primary">{audit.grade || "N/A"}</p>
              </div>
            </div>

            <CMOSummary aiSummary={aiSummary} />
          </div>
        )}

        {/* ── Brand Positioning ── */}
        {hasBrandPositioning && brandPositioning && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {getPersonaLabel(reviewedBy?.brand) || "Brand Positioning Analysis"}
            </h2>
            {reviewedBy?.brand && (
              <p className="text-sm text-accent font-medium mb-4">{getPersonaText("brand", reviewedBy)}</p>
            )}
            <BrandPositioningSection positioning={brandPositioning} />
          </div>
        )}

        {/* ── SWOT Analysis ── */}
        {hasSwot && swotAnalysis && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">SWOT Analysis</h2>
            <SwotAnalysis swot={swotAnalysis} />
          </div>
        )}

        {/* ── Immediate Growth Actions ── */}
        {immediateActions.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">Immediate Growth Actions</h2>
            <div className="grid gap-4">
              {immediateActions.slice(0, 5).map((action, i) => {
                const steps = (action.implementationSteps as string[] | undefined) || [];
                const affectedPages = (action.affectedPages as string[] | undefined) || [];
                return (
                  <div key={String(action.id || i)} className="rounded-lg border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{String(action.title || "Action")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{String(action.description || "")}</p>
                      </div>
                      <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                        {String(action.priority || "HIGH")}
                      </span>
                    </div>
                    {affectedPages.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Pages: {affectedPages.slice(0, 3).join(", ")}
                      </p>
                    )}
                    {steps.length > 0 && (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                        {steps.slice(0, 4).map((step, j) => <li key={j}>{step}</li>)}
                      </ol>
                    )}
                    <p className="mt-3 text-sm">
                      <strong>Outcome:</strong> {String(action.expectedOutcome || action.impact || "Improved marketing performance")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick Wins ── */}
        {quickWins.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">Quick Wins</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {reviewedBy?.seo && `Identified by ${getPersonaLabel(reviewedBy.seo)}`}
              {reviewedBy?.seo && reviewedBy?.growth && " & "}
              {reviewedBy?.growth && `${getPersonaLabel(reviewedBy.growth)}`}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {quickWins.map((win, i) => (
                <div key={i} className="rounded-lg border bg-green-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{win}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Growth Opportunities ── */}
        {growthOpportunities.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {getPersonaLabel(reviewedBy?.growth) || "Growth Opportunities"}
            </h2>
            {reviewedBy?.growth && (
              <p className="text-sm text-accent font-medium mb-4">{getPersonaText("growth", reviewedBy)}</p>
            )}
            <div className="grid gap-3">
              {growthOpportunities.map((opp, i) => (
                <div key={i} className="rounded-lg border bg-blue-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{opp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Content & Social Strategy — Unified Gary Vee section ── */}
        {(hasSocialIntel || hasContentIntel) && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {getPersonaLabel(reviewedBy?.content) || "Content & Social Strategy"}
            </h2>
            {reviewedBy?.content && (
              <p className="text-sm text-accent font-medium mb-4">{getPersonaText("content", reviewedBy)}</p>
            )}
            {hasSocialIntel && (
              <div className="mb-8 border-b pb-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Social Strategy</h3>
                <SocialIntelligence aiSummary={aiSummary} />
              </div>
            )}
            {hasContentIntel && (
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Content Strategy</h3>
                <ContentIntelligenceSection aiSummary={aiSummary} />
              </div>
            )}
          </div>
        )}

        {/* ── Competitor Intelligence ── */}
        {fullReport?.competitors && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">Competitor Intelligence</h2>
            <CompetitorAnalysis competitors={fullReport.competitors} aiSummary={aiSummary} />
          </div>
        )}

        {/* ── Social Media Analysis ── */}
        {fullReport?.channels && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">Social Media Analysis</h2>
            <SocialChannelAnalysis channels={fullReport.channels} aiSummary={aiSummary} />
          </div>
        )}

        {/* ── Growth Roadmap ── */}
        {hasGrowthPlan && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section">
            <h2 className="text-2xl font-bold text-primary mb-4">
              {getPersonaLabel(reviewedBy?.executive) || "Growth Roadmap"}
            </h2>
            {reviewedBy?.executive && (
              <p className="text-sm text-accent font-medium mb-4">{getPersonaText("executive", reviewedBy)}</p>
            )}
            <GrowthPlanSection aiSummary={aiSummary} />
          </div>
        )}

        {/* ── All Findings ── */}
        {findings.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-8 mb-8 print-section page-break">
            <h2 className="text-2xl font-bold text-primary mb-4">All Findings ({findings.length})</h2>
            <div className="space-y-4">
              {["technical", "onpage", "speed", "competitor", "marketing"].map((category) => {
                const categoryFindings = findings.filter((f) => f.category === category);
                if (categoryFindings.length === 0) return null;
                const categoryNames: Record<string, string> = {
                  technical: "Technical SEO",
                  onpage: "On-Page SEO",
                  speed: "Page Speed",
                  competitor: "Competitor Analysis",
                  marketing: "Marketing Channels",
                };
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-primary mb-3">{categoryNames[category]} ({categoryFindings.length} issues)</h3>
                    <div className="space-y-3">
                      {categoryFindings.map((finding) => (
                        <FindingCard key={finding.id} finding={finding} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center mt-10 pt-6 border-t text-xs text-muted-foreground">
          <p>Generated by Motion Labs AI &middot; {audit.domain}</p>
          <p className="mt-1">This report is for informational purposes only.</p>
        </div>

        {/* Print trigger badge */}
        {!printTriggered.current && (
          <div className="no-print fixed bottom-6 right-6 bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            Saving as PDF... Please wait.
          </div>
        )}
      </div>
    </div>
  );
}
