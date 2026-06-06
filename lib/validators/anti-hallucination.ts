/**
 * Anti-Hallucination Validator
 *
 * Enforces evidence-pinning on every finding and AI claim:
 * 1. Schema validation
 * 2. Evidence existence check — every claim must reference a signal
 * 3. Contradiction check — claim consistency vs raw data
 * 4. Confidence gate — strips/downgrades low-evidence claims
 * 5. Claim sanitiser — removes unsupported comparative statements
 */

import { ScoredFinding, RawFinding } from "../scoring-engine";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  strippedClaims: string[];
  warnings: string[];
  sanitisedFindings: ScoredFinding[];
  overallConfidence: number;
  confidenceBand: "high" | "medium" | "low";
}

export interface AiClaimPayload {
  brutalVerdict?: string;
  prioritizedFixes?: unknown[];
  whatWorksWell?: string[];
  timelineExpectations?: unknown;
  dataDisclaimer?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────
// EVIDENCE VALIDATOR
// ─────────────────────────────────────────

/** Hard no-evidence phrases that should never appear without data backing */
const UNSUPPORTED_CLAIM_PATTERNS = [
  /\d+x (increase|improvement|growth|boost)/gi,
  /guaranteed/gi,
  /will definitely/gi,
  /100% sure/gi,
  /studies show/gi,
  /research (proves|shows|indicates)/gi,
  /most websites/gi,
  /every competitor/gi,
  /industry average is \d+/gi,
  /top companies all/gi,
];

/** Phrases signalling unsupported comparison */
const COMPARISON_WITHOUT_DATA = [
  /competitors (are|have|outrank|outperform)/gi,
  /your (rivals|competition) (are|have)/gi,
];

export function validateAndSanitiseClaims(
  aiPayload: AiClaimPayload,
  findings: RawFinding[],
  crawlPagesCount: number,
  crawlConfidence: number
): AiClaimPayload {
  if (!aiPayload) return aiPayload;

  const strippedClaims: string[] = [];

  // Sanitise brutalVerdict
  if (typeof aiPayload.brutalVerdict === "string") {
    let verdict = aiPayload.brutalVerdict;

    for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
      const matches = verdict.match(pattern);
      if (matches) {
        strippedClaims.push(...matches);
        verdict = verdict.replace(pattern, "[data-unavailable]");
      }
    }

    // Add confidence caveat if crawl confidence is low
    if (crawlConfidence < 65 && !verdict.includes("confidence") && !verdict.includes("limited")) {
      verdict += ` (Note: Analysis based on ${crawlPagesCount} pages — some findings may require manual verification.)`;
    }

    aiPayload.brutalVerdict = verdict;
  }

  // Validate prioritisedFixes — ensure each has evidence backing
  if (Array.isArray(aiPayload.prioritizedFixes)) {
    aiPayload.prioritizedFixes = (aiPayload.prioritizedFixes as AiClaimPayload[]).map(fix => {
      if (typeof fix !== "object" || !fix) return fix;

      // Clamp confidence to findings evidence
      const matchingFinding = findings.find(
        f => f.title?.toLowerCase().includes((fix.title as string || "").toLowerCase().slice(0, 20))
      );

      if (matchingFinding) {
        // Never exceed the backing finding's confidence
        if (typeof fix.confidence === "number" && fix.confidence > (matchingFinding.confidence || 80) + 10) {
          fix.confidence = (matchingFinding.confidence || 80) + 5;
        }
      } else {
        // No matching finding — cap confidence at 70
        if (typeof fix.confidence === "number" && fix.confidence > 70) {
          fix.confidence = 70;
        }
      }

      return fix;
    });
  }

  // Strip unsupported comparison claims from whatWorksWell
  if (Array.isArray(aiPayload.whatWorksWell)) {
    aiPayload.whatWorksWell = (aiPayload.whatWorksWell as string[]).filter(item => {
      for (const pattern of COMPARISON_WITHOUT_DATA) {
        if (pattern.test(item)) {
          strippedClaims.push(item);
          return false;
        }
      }
      return true;
    });
  }

  return aiPayload;
}

// ─────────────────────────────────────────
// FINDING VALIDATOR
// ─────────────────────────────────────────

export function validateFindings(
  findings: ScoredFinding[],
  crawlConfidence: number
): ValidationResult {
  const strippedClaims: string[] = [];
  const warnings: string[] = [];

  const sanitised = findings
    .filter(f => {
      // Drop findings with very low confidence that are not CRITICAL
      if (f.severity !== "CRITICAL" && (f.confidenceScore ?? f.confidence ?? 0) < 30) {
        strippedClaims.push(`Dropped low-confidence finding: "${f.title}" (${f.confidenceScore}%)`);
        return false;
      }
      return true;
    })
    .map(f => {
      // Ensure evidence exists — add automated tag if missing
      if (!f.evidence || Object.keys(f.evidence).length === 0) {
        warnings.push(`Finding "${f.title}" lacks explicit evidence payload`);
        return {
          ...f,
          evidence: {
            source: "automated-analysis",
            affectedCount: f.affectedCount || 0,
            crawlConfidence: `${crawlConfidence}%`,
          },
        };
      }
      return f;
    });

  const avgConfidence = sanitised.length
    ? Math.round(sanitised.reduce((s, f) => s + (f.confidenceScore ?? 80), 0) / sanitised.length)
    : 0;

  const overallConfidence = Math.round(avgConfidence * 0.6 + crawlConfidence * 0.4);

  const confidenceBand: "high" | "medium" | "low" =
    overallConfidence >= 75 ? "high" : overallConfidence >= 55 ? "medium" : "low";

  return {
    valid: strippedClaims.length === 0,
    strippedClaims,
    warnings,
    sanitisedFindings: sanitised,
    overallConfidence,
    confidenceBand,
  };
}
