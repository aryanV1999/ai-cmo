import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id;

    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        lead: true,
        findings: {
          orderBy: [
            { priorityScore: "desc" },
            { severity: "asc" },
          ],
        },
        actions: {
          orderBy: { priorityScore: "desc" },
          where: { status: "PENDING" },
        },
        geoProbes: {
          orderBy: { probedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" }, 
        { 
          status: 404,
          headers: corsHeaders,
        });
    }

    const isUnlocked = !!audit.lead;

    const base: Record<string, unknown> = {
      id: audit.id,
      siteUrl: audit.siteUrl,
      domain: audit.domain,
      status: audit.status,
      progress: audit.progress,
      currentStep: audit.currentStep,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt,
    };

    if (audit.status === "COMPLETE") {
      base.grade = audit.grade;
      base.gradeScore = audit.gradeScore;
      base.geoScore = audit.geoScore;

      const aiSummary = audit.aiSummary as Record<string, unknown> | null;
      const criticalFindings = audit.findings.filter(f => f.severity === "CRITICAL").slice(0, 3);
      const dailyActions = audit.actions.slice(0, 2);
      const executiveSummary = aiSummary?.executiveSummary as Record<string, unknown> | undefined;
      const summaryText =
        executiveSummary?.headline?.toString() ||
        executiveSummary?.currentState?.toString() ||
        aiSummary?.brutalVerdict?.toString() ||
        "Your audit is ready.";

      base.teaser = {
        grade: audit.grade,
        gradeScore: audit.gradeScore,
        geoScore: audit.geoScore,
        criticalIssuesCount: audit.findings.filter(f => f.severity === "CRITICAL").length,
        warningCount: audit.findings.filter(f => f.severity === "WARNING").length,
        topIssues: criticalFindings.map(f => ({
          title: f.title,
          severity: f.severity,
          category: f.category,
          priorityScore: f.priorityScore,
        })),
        summary: summaryText,
        summarySnippet: `${summaryText.slice(0, 220)}...`,
        topActionTitle: dailyActions[0]?.title || null,
        geoProviderScores: (aiSummary?.geoSummary as Record<string, unknown> | undefined)?.providerScores || null,
      };

      if (isUnlocked) {
        const crawlData = audit.crawlData as Record<string, unknown> | null;
        const crawlPages = (crawlData?.pages as Array<Record<string, unknown>> | undefined) || [];
        const homePage = crawlPages[0] || {};

        base.isUnlocked = true;
        base.fullReport = {
          brandOverview: {
            domain: audit.domain,
            siteUrl: audit.siteUrl,
            title: homePage.title || null,
            metaDescription: homePage.metaDescription || null,
            h1Tags: homePage.h1Tags || [],
            pagesCrawled: audit.pagesCrawled,
            pagesDiscovered: audit.pagesDiscovered,
            detectedSchema: ((homePage.schemaMarkup as Array<Record<string, unknown>> | undefined) || [])
              .map(s => s.type)
              .filter(Boolean)
              .slice(0, 8),
            sampledPages: crawlPages.slice(0, 8).map(p => ({
              url: p.url,
              title: p.title,
              wordCount: p.mainContentWordCount || p.wordCount,
            })),
          },
          technicalSeo: audit.technicalSeo,
          onPageSeo: audit.onPageSeo,
          pageSpeed: audit.pageSpeed,
          competitors: audit.competitors,
          channels: audit.channels,
          linkGraph: audit.linkGraph,
          geoData: audit.geoData,
          aiSummary: audit.aiSummary,
          findings: audit.findings.map(f => ({
            id: f.id,
            category: f.category,
            type: f.type,
            severity: f.severity,
            title: f.title,
            description: f.description,
            impact: f.impact,
            howToFix: f.howToFix,
            affectedUrls: f.affectedUrls,
            affectedCount: f.affectedCount,
            evidence: f.evidence,
            confidence: f.confidence,
            impactScore: f.impactScore,
            effortScore: f.effortScore,
            priorityScore: f.priorityScore,
            serviceId: f.serviceId,
            serviceCta: f.serviceCta,
          })),
          actions: audit.actions.map(a => ({
            id: a.id,
            title: a.title,
            category: a.category,
            severity: a.severity,
            status: a.status,
            whyNow: a.whyNow,
            whyThisPage: a.whyThisPage,
            steps: a.steps,
            verificationChecks: a.verificationChecks,
            codeSnippet: a.codeSnippet,
            expectedResult: a.expectedResult,
            expectedResultWindow: a.expectedResultWindow,
            effortMinutes: a.effortMinutes,
            impactScore: a.impactScore,
            confidenceScore: a.confidenceScore,
            priorityScore: a.priorityScore,
          })),
          geoProbes: audit.geoProbes,
          pdfUrl: audit.pdfUrl,
        };
      } else {
        base.isUnlocked = false;
        base.requiresEmail = true;
      }
    }

    return NextResponse.json(base, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching audit:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit" },
      {
        status: 500,
        headers: corsHeaders,
      }
);
  }
}
