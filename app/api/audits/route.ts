import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { normalizeUrl, extractDomain } from "@/lib/utils";

// Request validation schema
const createAuditSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = createAuditSchema.parse(body);

    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(url);
    const domain = extractDomain(normalizedUrl);

    // Create audit record
    const audit = await prisma.audit.create({
      data: {
        siteUrl: normalizedUrl,
        domain,
        status: "PENDING",
        progress: 0,
        currentStep: "initializing",
      },
    });

    // In a production environment, we would dispatch a background job here
    // For now, we'll start the audit process in the next API call
    // Queue job: await auditQueue.add('runAudit', { auditId: audit.id });

    // Start the audit process asynchronously
    startAuditProcess(audit.id).catch(console.error);

    return NextResponse.json({
      auditId: audit.id,
      status: audit.status,
      message: "Audit started successfully",
    });
  } catch (error) {
    console.error("Error creating audit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

async function startAuditProcess(auditId: string) {
  const { runAuditV3 } = await import("@/lib/audit-runner-v3");
  await runAuditV3(auditId);
}
