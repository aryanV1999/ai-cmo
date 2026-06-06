"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ProgressDisplay } from "@/components/progress-display";
import { EmailCaptureModal } from "@/components/email-capture-modal";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Download,
  Share2,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Zap,
  Lock,
  TrendingUp,
  Target,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { cn, getSeverityColor } from "@/lib/utils";

interface AuditData {
  id: string;
  siteUrl: string;
  domain: string;
  status: string;
  progress: number;
  currentStep: string;
  grade?: string;
  gradeScore?: number;
  isUnlocked?: boolean;
  requiresEmail?: boolean;
  teaser?: {
    grade?: string;
    gradeScore?: number;
    criticalIssuesCount: number;
    topIssues: Array<{ title: string; severity: string; category: string }>;
    summary: string;
    summarySnippet?: string;
  };
  fullReport?: {
    brandOverview?: Record<string, unknown>;
    technicalSeo: Record<string, unknown>;
    onPageSeo: Record<string, unknown>;
    pageSpeed: Record<string, unknown>;
    competitors?: Record<string, unknown> | null;
    channels?: Record<string, unknown> | null;
    aiSummary: Record<string, unknown>;
    actions?: Array<{
      id: string;
      title: string;
      whyNow?: string;
      expectedResult?: string;
      effortMinutes?: number;
      steps?: string[];
    }>;
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
      serviceId?: string;
      serviceCta?: string;
    }>;
    pdfUrl?: string;
  };
}

export default function AuditPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const fetchAudit = useCallback(async () => {
    try {
      const response = await fetch(`/api/audits/${auditId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit");
      }
      const data = await response.json();
      setAudit(data);

      // Keep polling if audit is still in progress
      if (data.status !== "COMPLETE" && data.status !== "FAILED") {
        setTimeout(fetchAudit, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleUnlock = async (email: string) => {
    const response = await fetch(`/api/audits/${auditId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to unlock report");
    }

    setShowEmailModal(false);
    fetchAudit();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold">Audit Not Found</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Link href="/">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show progress screen while audit is running
  if (audit.status !== "COMPLETE" && audit.status !== "FAILED") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">Motion Labs AI</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">
              Analyzing Your Website
            </h1>
            <p className="text-muted-foreground mb-12">
              {audit.siteUrl}
            </p>

            <ProgressDisplay
              progress={audit.progress}
              currentStep={audit.currentStep}
              status={audit.status}
            />
          </div>
        </main>
      </div>
    );
  }

  // Show failed state
  if (audit.status === "FAILED") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold">Audit Failed</h2>
          <p className="mt-2 text-muted-foreground">
            We encountered an error while analyzing your website.
          </p>
          <Link href="/">
            <Button className="mt-4">Try Another Website</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fullReport = audit.fullReport;
  const aiSummary = fullReport?.aiSummary;
  const immediateActions =
    ((aiSummary?.immediateActions as Array<Record<string, unknown>> | undefined) || []);
  const hasImmediateActions = immediateActions.length > 0;
  const hasSwot = hasUsefulSwot(aiSummary);
  const hasBrandPositioning = hasUsefulBrandPositioning(aiSummary);
  const hasSocialIntel = hasUsefulSocialIntel(aiSummary);
  const hasContentIntel = hasUsefulContentIntel(aiSummary);
  const hasGrowthPlan = hasUsefulGrowthPlan(aiSummary);
  const brandPositioning = aiSummary?.brandPositioningAnalysis as Record<string, unknown> | undefined;
  const swotAnalysis = aiSummary?.swotAnalysis as Record<string, unknown> | undefined;
  const quickWins = (aiSummary?.quickWins as string[] | undefined) || [];
  const growthOpportunities = (aiSummary?.growthOpportunities as string[] | undefined) || [];
  const marketingMaturityScore = (aiSummary?.marketingMaturityScore as number | undefined) || 0;
  const marketingMaturityLabel = (aiSummary?.marketingMaturityLabel as string | undefined) || "";

  // Persona metadata from report
  const reviewedBy = (aiSummary?.reviewedBy || aiSummary?.reviewed_by) as Record<string, string> | undefined;

  const sectionNameMap: Record<string, string> = {
    "Rand Fishkin Framework": "\uD83D\uDD0D SEO Analysis",
    "Gary Vaynerchuk Framework": "\uD83D\uDCF1 Content & Social Strategy",
    "Seth Godin Framework": "\uD83C\uDFAF Brand Positioning",
    "Andrew Chen Framework": "\uD83D\uDE80 Growth Strategy",
    "Satya Nadella Framework": "\uD83D\uDC54 Executive Summary",
  };

  const getPersonaLabel = (framework: string | undefined): string => {
    if (!framework) return "";
    return sectionNameMap[framework] || framework;
  };

  const getPersonaText = (key: "seo" | "content" | "brand" | "growth" | "executive"): string => {
    const framework = reviewedBy?.[key];
    if (!framework) return "";
    return `Reviewed by: ${framework}`;
  };

  // Show results
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">Motion Labs AI</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {audit.isUnlocked && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  const printWindow = window.open(
                    `/audit/${auditId}/print`,
                    "print-report",
                    "width=900,height=700"
                  );
                  if (!printWindow) {
                    // Fallback: navigate to print page directly
                    window.location.href = `/audit/${auditId}/print`;
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-xl border bg-slate-50 px-8 py-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Overall score
                </p>
                <p className="mt-1 text-5xl font-bold text-primary">
                  {audit.gradeScore ?? "?"}
                  <span className="text-xl font-semibold text-muted-foreground">/100</span>
                </p>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              Audit Results for
            </h1>
            <a
              href={audit.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg text-accent hover:underline inline-flex items-center"
            >
              {audit.domain}
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>

            {audit.teaser && (
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                {audit.teaser.summary}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Top Issues Teaser */}
      {audit.teaser && audit.teaser.topIssues.length > 0 && (
        <section className="py-8 bg-red-50 border-b border-red-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {audit.teaser.criticalIssuesCount} Critical Issues Found
              </h2>
              <div className="space-y-3">
                {audit.teaser.topIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">{issue.title}</p>
                      <p className="text-sm text-red-600 capitalize">
                        {issue.category.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Email Gate or Full Report */}
      {!audit.isUnlocked ? (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="relative">
                {/* Blurred preview */}
                <div className="blur-gate p-8 bg-slate-100 rounded-xl">
                  <div className="h-64 bg-slate-200 rounded-lg mb-4" />
                  <div className="h-32 bg-slate-200 rounded-lg mb-4" />
                  <div className="h-48 bg-slate-200 rounded-lg" />
                </div>

                {/* Unlock overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-xl shadow-xl border max-w-md mx-4">
                    <Lock className="w-12 h-12 text-accent mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">
                      Unlock Your Full Report
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Enter your email to access the complete audit with
                      detailed findings, competitor analysis, and personalized
                      recommendations.
                    </p>
                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowEmailModal(true)}
                    >
                      Unlock My Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {fullReport?.brandOverview && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    Brand Overview
                  </h2>
                  <BrandOverview overview={fullReport.brandOverview} />
                </div>
              )}

              {/* Executive Summary + Maturity */}
              {Boolean(aiSummary) && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {getPersonaLabel(reviewedBy?.executive) || "CMO Executive Summary"}
                  </h2>
                  {reviewedBy?.executive && (
                    <p className="text-sm text-accent font-medium mb-4">
                      {getPersonaText("executive")}
                    </p>
                  )}
                  <div className="mb-6 flex flex-wrap items-center gap-4">
                    <div className="rounded-xl border bg-slate-50 px-6 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketing Maturity</p>
                      <p className="mt-1 text-3xl font-bold text-primary">{marketingMaturityScore}<span className="text-lg font-semibold text-muted-foreground">/100</span></p>
                      <p className="text-xs font-medium text-accent mt-1">{marketingMaturityLabel}</p>
                    </div>
                  </div>
                  <CMOSummary aiSummary={aiSummary!} />
                </div>
              )}

              {/* Brand Positioning */}
              {hasBrandPositioning && brandPositioning && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {getPersonaLabel(reviewedBy?.brand) || "Brand Positioning Analysis"}
                  </h2>
                  {reviewedBy?.brand && (
                    <p className="text-sm text-accent font-medium mb-4">
                      {getPersonaText("brand")}
                    </p>
                  )}
                  <BrandPositioningSection positioning={brandPositioning} />
                </div>
              )}

              {/* SWOT Analysis */}
              {hasSwot && swotAnalysis && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    SWOT Analysis
                  </h2>
                  <SwotAnalysis swot={swotAnalysis} />
                </div>
              )}

              {hasImmediateActions && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    Immediate Growth Actions
                  </h2>
                  <div className="grid gap-4">
                    {immediateActions
                      .slice(0, 5)
                      .map((action, i) => (
                        <ActionCard key={String(action.id || i)} action={action} />
                      ))}
                  </div>
                </div>
              )}

              {/* Quick Wins */}
              {quickWins.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    Quick Wins
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {reviewedBy?.seo && `Identified by ${getPersonaLabel(reviewedBy.seo)}`}
                    {reviewedBy?.seo && reviewedBy?.growth && ` & `}
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

              {/* Growth Opportunities */}
              {growthOpportunities.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {getPersonaLabel(reviewedBy?.growth) || "Growth Opportunities"}
                  </h2>
                  {reviewedBy?.growth && (
                    <p className="text-sm text-accent font-medium mb-4">
                      {getPersonaText("growth")}
                    </p>
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

              {/* Content & Social Strategy — Unified Gary Vee section */}
              {(hasSocialIntel || hasContentIntel) && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {getPersonaLabel(reviewedBy?.content) || "Content & Social Strategy"}
                  </h2>
                  {reviewedBy?.content && (
                    <p className="text-sm text-accent font-medium mb-4">
                      {getPersonaText("content")}
                    </p>
                  )}
                  <>
                    {hasSocialIntel && (
                      <div className="mb-8 border-b pb-6">
                        <h3 className="text-lg font-semibold text-primary mb-4">Social Strategy</h3>
                        <SocialIntelligence aiSummary={aiSummary!} />
                      </div>
                    )}
                    {hasContentIntel && (
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-4">Content Strategy</h3>
                        <ContentIntelligenceSection aiSummary={aiSummary!} />
                      </div>
                    )}
                  </>
                </div>
              )}

              {fullReport?.competitors && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    Competitor Intelligence
                  </h2>
                  <CompetitorAnalysis competitors={fullReport.competitors} aiSummary={aiSummary} />
                </div>
              )}

              {fullReport?.channels && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    Social Media Analysis
                  </h2>
                  <SocialChannelAnalysis channels={fullReport.channels} aiSummary={aiSummary} />
                </div>
              )}

              {/* 30/60/90 Day Plan */}
              {hasGrowthPlan && (
                <div className="bg-white rounded-xl border shadow-sm p-8 mb-8">
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {getPersonaLabel(reviewedBy?.executive) || "Growth Roadmap"}
                  </h2>
                  {reviewedBy?.executive && (
                    <p className="text-sm text-accent font-medium mb-4">
                      {getPersonaText("executive")}
                    </p>
                  )}
                  <GrowthPlanSection aiSummary={aiSummary!} />
                </div>
              )}

              {/* Findings by Category */}
              {audit.fullReport?.findings && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-primary">
                    All Findings
                  </h2>

                  <Accordion type="multiple" className="space-y-4">
                    {/* Group findings by category */}
                    {["technical", "onpage", "speed", "competitor", "marketing"].map(
                      (category) => {
                        const categoryFindings = audit.fullReport!.findings.filter(
                          (f) => f.category === category
                        );
                        if (categoryFindings.length === 0) return null;

                        const categoryNames: Record<string, string> = {
                          technical: "Technical SEO",
                          onpage: "On-Page SEO",
                          speed: "Page Speed",
                          competitor: "Competitor Analysis",
                          marketing: "Marketing Channels",
                        };

                        return (
                          <AccordionItem
                            key={category}
                            value={category}
                            className="bg-white rounded-xl border shadow-sm"
                          >
                            <AccordionTrigger className="px-6 py-4">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-semibold">
                                  {categoryNames[category]}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {categoryFindings.length} issues
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              <div className="space-y-4">
                                {categoryFindings.map((finding) => (
                                  <FindingCard
                                    key={finding.id}
                                    finding={finding}
                                  />
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                    )}
                  </Accordion>
                </div>
              )}

              {/* CTA Section */}
              <div className="mt-12 bg-primary rounded-xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to Fix These Issues?
                </h2>
                <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                  Our team of SEO experts can help you implement these fixes
                  and grow your organic traffic.
                </p>
                <Button variant="accent" size="lg">
                  Talk to Motion Labs
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Email Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleUnlock}
        auditId={auditId}
        score={audit.gradeScore ?? 0}
      />
    </div>
  );
}

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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

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

function ActionCard({ action }: { action: Record<string, unknown> }) {
  const steps = (action.implementationSteps as string[] | undefined) || [];
  const affectedPages = (action.affectedPages as string[] | undefined) || [];

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">{String(action.title || "Action")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {String(action.description || "")}
          </p>
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
          {steps.slice(0, 4).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-sm">
        <strong>Outcome:</strong> {String(action.expectedOutcome || action.impact || "Improved marketing performance")}
      </p>
    </div>
  );
}

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
    : competitorList.map((competitor) => String(competitor.domain || "")).filter(Boolean);

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
      <TwoColumnList
        leftTitle="Competitor strengths"
        leftItems={competitorStrengths}
        rightTitle="Your positioning opportunities"
        rightItems={[...differentiation, ...quickWins]}
        leftFallback="Competitor strengths need deeper market data or AI report context."
        rightFallback="No clear positioning opportunities were available from the current dataset."
      />
      <TwoColumnList
        leftTitle="Disadvantages vs competitors"
        leftItems={primaryGaps}
        rightTitle="Advantages to exploit"
        rightItems={quickWins}
        leftFallback="No clear disadvantages were available from the competitor dataset."
        rightFallback="No clear advantages were available from the competitor dataset."
      />
      {comparisons.length > 0 && (
        <div>
          <p className="font-semibold text-primary">Competitive Comparison</p>
          <div className="mt-2 space-y-2">
            {comparisons.slice(0, 4).map((comparison, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{String(comparison.dimension || "Insight")}</p>
                <p className="mt-1 text-muted-foreground">{String(comparison.insight || comparison.opportunity || "")}</p>
                {(comparison.opportunity as string | undefined) && (
                  <p className="mt-1 text-xs font-medium text-accent">
                    Opportunity: {String(comparison.opportunity)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialChannelAnalysis({
  channels,
  aiSummary,
}: {
  channels: Record<string, unknown>;
  aiSummary?: Record<string, unknown>;
}) {
  const channelList = (channels.channels as Array<Record<string, unknown>> | undefined) || [];
  const socialChannel = channelList.find((channel) =>
    String(channel.channel || "").toLowerCase().includes("social")
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
              <a
                key={i}
                href={String(item.source || "#")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border bg-slate-50 p-3 text-sm hover:border-accent"
              >
                <p className="font-medium">{String(item.value || "Social profile")}</p>
                <p className="mt-1 break-all text-muted-foreground">{String(item.source || "")}</p>
              </a>
            ))}
          </div>
        </div>
      )}
      <TwoColumnList
        leftTitle="Social strengths"
        leftItems={strengths}
        rightTitle="Social improvements"
        rightItems={improvements}
        leftFallback="No clear social strengths detected yet."
        rightFallback="No specific social improvements detected yet."
      />
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
  if (assessment && !isGenericSocialText(assessment)) {
    strengths.push(assessment);
  }

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
    if (recs.length > 0) {
      improvements.push(`${platformName}: ${recs.slice(0, 3).join("; ")}`);
    }
    if (contentTypes.length > 0) {
      improvements.push(`${platformName}: test ${contentTypes.slice(0, 3).join(", ")} content formats.`);
    }
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

function TwoColumnList({
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
  leftFallback = "No clear gaps were available from the current dataset.",
  rightFallback = "No quick wins were available from the current dataset.",
}: {
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
  leftFallback?: string;
  rightFallback?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ListPanel title={leftTitle} items={leftItems} fallback={leftFallback} />
      <ListPanel title={rightTitle} items={rightItems} fallback={rightFallback} />
    </div>
  );
}

function ListPanel({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="font-semibold text-primary">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {items.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// NEW CMO REPORT COMPONENTS
// ─────────────────────────────────────────

function hasUsefulSwot(aiSummary?: Record<string, unknown>): boolean {
  const swot = aiSummary?.swotAnalysis as Record<string, unknown> | undefined;
  if (!swot) return false;
  const strengths = (swot.strengths as Array<unknown> | undefined) || [];
  const weaknesses = (swot.weaknesses as Array<unknown> | undefined) || [];
  const opportunities = (swot.opportunities as Array<unknown> | undefined) || [];
  return strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0;
}

function hasUsefulBrandPositioning(aiSummary?: Record<string, unknown>): boolean {
  const bp = aiSummary?.brandPositioningAnalysis as Record<string, unknown> | undefined;
  if (!bp) return false;
  const vp = String(bp.valueProposition || "");
  return vp.length > 10 && !vp.includes("pending");
}

function hasUsefulSocialIntel(aiSummary?: Record<string, unknown>): boolean {
  const si = aiSummary?.socialMediaIntelligence as Record<string, unknown> | undefined;
  if (!si) return false;
  const pillars = (si.contentPillars as Array<unknown> | undefined) || [];
  const recs = (si.recommendations as Array<unknown> | undefined) || [];
  return pillars.length > 0 || recs.length > 0;
}

function hasUsefulContentIntel(aiSummary?: Record<string, unknown>): boolean {
  const ci = aiSummary?.contentIntelligence as Record<string, unknown> | undefined;
  if (!ci) return false;
  const gaps = (ci.contentGaps as Array<unknown> | undefined) || [];
  const topics = (ci.missingTopics as Array<unknown> | undefined) || [];
  return gaps.length > 0 || topics.length > 0;
}

function hasUsefulGrowthPlan(aiSummary?: Record<string, unknown>): boolean {
  const thirty = aiSummary?.thirtyDayPlan as Record<string, unknown> | undefined;
  if (!thirty) return false;
  const actions = (thirty.actions as Array<unknown> | undefined) || [];
  return actions.length > 0;
}

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

function ContentIntelligenceSection({ aiSummary }: { aiSummary: Record<string, unknown> }) {
  const ci = (aiSummary.contentIntelligence as Record<string, unknown>) || {};
  const bestPerf = (ci.bestPerformingContent as string[] | undefined) || [];
  const contentGaps = (ci.contentGaps as string[] | undefined) || [];
  const missingTopics = (ci.missingTopics as string[] | undefined) || [];
  const recommendations = (ci.recommendations as string[] | undefined) || [];

  return (
    <div className="space-y-5">
      <SummaryMetric label="Current Content Mix" value={String(ci.currentContentMix || "N/A")} />
      <SummaryMetric label="Content Velocity" value={String(ci.contentVelocity || "N/A")} />
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

function FindingCard({
  finding,
}: {
  finding: {
    severity: string;
    title: string;
    description: string;
    impact: string;
    howToFix: string;
    affectedCount: number;
    serviceId?: string;
    serviceCta?: string;
  };
}) {
  const severityIcons = {
    CRITICAL: AlertTriangle,
    WARNING: AlertCircle,
    INFO: Info,
  };
  const Icon = severityIcons[finding.severity as keyof typeof severityIcons] || Info;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        getSeverityColor(finding.severity)
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold">{finding.title}</h4>
          <p className="text-sm mt-1 opacity-90">{finding.description}</p>

          <div className="mt-3 space-y-2 text-sm">
            <div>
              <strong>Impact:</strong> {finding.impact}
            </div>
            <div>
              <strong>How to fix:</strong> {finding.howToFix}
            </div>
            {finding.affectedCount > 1 && (
              <div>
                <strong>Affected:</strong> {finding.affectedCount} pages
              </div>
            )}
          </div>

          {finding.serviceId && (
            <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-accent">
                  {finding.serviceCta}
                </p>
                <Button variant="accent" size="sm">
                  Learn More
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
