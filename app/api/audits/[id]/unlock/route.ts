import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
const unlockSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auditId = params.id;
    const body = await request.json();
    const { email } = unlockSchema.parse(body);

    // Find the audit
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: { lead: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404,
          headers: corsHeaders,
        }
      );
    }

    if (audit.status !== "COMPLETE") {
      return NextResponse.json(
        { error: "Audit is not yet complete" },
        { status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Check if lead already exists
    if (audit.lead) {
      return NextResponse.json({
        success: true,
        message: "Report already unlocked",
        reportUrl: `/audit/${auditId}`,
      },
      {
        headers: corsHeaders,
      }
      );
    }

    // Create lead record
    await prisma.lead.create({
      data: {
        email,
        auditId,
        consentGiven: true,
        consentAt: new Date(),
      },
    });

    // Sync to CRM (in background)
    syncToCrm(auditId, email).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Report unlocked successfully",
      reportUrl: `/audit/${auditId}`,
    },
    {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error unlocking audit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address", details: error.errors },
        { status: 400,
          headers: corsHeaders,
        }
      );
    }

    return NextResponse.json(
      { error: "Failed to unlock report" },
      { status: 500,
        headers: corsHeaders,
      }
    );
  }
}

async function syncToCrm(auditId: string, email: string) {
  // Get audit data for CRM sync
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: { findings: true },
  });

  if (!audit) return;

  const criticalFindings = audit.findings
    .filter((f) => f.severity === "CRITICAL")
    .slice(0, 3);

  const aiSummary = audit.aiSummary as Record<string, unknown> | null;

  // Prepare CRM data
  const crmData = {
    email,
    siteUrl: audit.siteUrl,
    domain: audit.domain,
    grade: audit.grade,
    gradeScore: audit.gradeScore,
    topIssues: criticalFindings.map((f) => f.title),
    recommendedServices: (aiSummary?.serviceRecommendations as Array<{serviceId: string; serviceName: string}> || []).map(
      (s) => s.serviceName
    ),
    auditUrl: `${process.env.NEXT_PUBLIC_APP_URL}/audit/${auditId}`,
    auditDate: audit.completedAt,
  };

  // Send to CRM webhook (HubSpot, ConvertKit, etc.)
  if (process.env.ENABLE_CRM_SYNC === "true" && process.env.CRM_WEBHOOK_URL) {
    try {
      await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crmData),
      });

      // Mark as synced
      await prisma.lead.update({
        where: { auditId },
        data: {
          crmSynced: true,
          syncedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("CRM sync failed:", error);
    }
  }
}
