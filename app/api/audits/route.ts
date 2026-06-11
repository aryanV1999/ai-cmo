
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { normalizeUrl, extractDomain } from "@/lib/utils";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Request validation schema
const createAuditSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = createAuditSchema.parse(body);

    const normalizedUrl = normalizeUrl(url);
    const domain = extractDomain(normalizedUrl);

    const audit = await prisma.audit.create({
      data: {
        siteUrl: normalizedUrl,
        domain,
        status: "PENDING",
        progress: 0,
        currentStep: "initializing",
      },
    });

    startAuditProcess(audit.id).catch(console.error);

    return NextResponse.json(
      {
        auditId: audit.id,
        status: audit.status,
        message: "Audit started successfully",
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Error creating audit:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.errors,
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to start audit",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

async function startAuditProcess(auditId: string) {
  const { runAuditV3 } = await import("@/lib/audit-runner-v3");
  await runAuditV3(auditId);
}

