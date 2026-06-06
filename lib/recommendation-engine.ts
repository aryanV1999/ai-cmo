/**
 * Recommendation Compiler
 *
 * Produces the daily action backlog:
 * - Top 2 high-impact daily actions
 * - Weekly ranked backlog
 * - Full action specs with implementation steps
 *
 * Uses the priority scoring engine to rank by:
 *   PriorityScore = (Impact × Urgency × Confidence) / Effort
 */

import { ScoredFinding, buildActionSpec, ActionSpec } from "./scoring-engine";
import { GeoAnalysisResult } from "./analyzers/geo-visibility";
import { LinkGraphResult } from "./analyzers/link-graph";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface DailyAction {
  rank: number;
  action: ActionSpec;
  finding: ScoredFinding;
  isTopPick: boolean;
}

export interface WeeklyBacklog {
  dailyActions: DailyAction[];   // Top 2 for "do today"
  thisWeek: DailyAction[];       // Next 5-10 ranked items
  totalPendingActions: number;
  estimatedWeeklyMinutes: number;
  topCategory: string;
}

// ─────────────────────────────────────────
// COMPILER
// ─────────────────────────────────────────

export function compileRecommendations(
  scoredFindings: ScoredFinding[],
  geoResult?: GeoAnalysisResult,
  linkGraph?: LinkGraphResult
): WeeklyBacklog {
  // Merge all findings sources
  const allFindings: ScoredFinding[] = [...scoredFindings];

  // Add GEO findings with scoring
  if (geoResult?.findings) {
    for (const gf of geoResult.findings) {
      allFindings.push({
        ...gf,
        impactScore: gf.type === "geo_not_mentioned" ? 75 : 60,
        effortScore: 65,
        urgencyScore: gf.severity === "CRITICAL" ? 90 : 55,
        confidenceScore: gf.confidence || 80,
        priorityScore: gf.severity === "CRITICAL" ? 70 : 45,
        priorityBand: gf.severity === "CRITICAL" ? "critical" : "medium",
        evidenceIds: Object.keys(gf.evidence || {}),
      });
    }
  }

  // Add link graph findings
  if (linkGraph?.findings) {
    for (const lf of linkGraph.findings) {
      allFindings.push({
        ...lf,
        impactScore: 65,
        effortScore: 40,
        urgencyScore: lf.severity === "CRITICAL" ? 90 : 55,
        confidenceScore: lf.confidence || 85,
        priorityScore: lf.severity === "CRITICAL" ? 68 : 42,
        priorityBand: lf.severity === "CRITICAL" ? "critical" : "medium",
        evidenceIds: Object.keys(lf.evidence || {}),
      });
    }
  }

  // Sort by priority score descending
  const sorted = allFindings.sort((a, b) => b.priorityScore - a.priorityScore);

  // Build action items
  const allActions: DailyAction[] = sorted
    .filter(f => f.severity !== "INFO" || f.priorityScore >= 40)
    .slice(0, 20)
    .map((finding, i) => ({
      rank: i + 1,
      action: buildActionSpec(finding),
      finding,
      isTopPick: i < 2,
    }));

  // Category frequency for "top category"
  const categoryCount: Record<string, number> = {};
  for (const a of allActions) {
    categoryCount[a.action.category] = (categoryCount[a.action.category] || 0) + 1;
  }
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "technical";

  const dailyActions = allActions.slice(0, 2);
  const thisWeek = allActions.slice(2, 12);
  const estimatedWeeklyMinutes = allActions
    .slice(0, 10)
    .reduce((sum, a) => sum + a.action.effortMinutes, 0);

  return {
    dailyActions,
    thisWeek,
    totalPendingActions: allActions.length,
    estimatedWeeklyMinutes,
    topCategory,
  };
}
