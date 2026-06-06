/**
 * Internal Link Graph Analyser
 *
 * Builds a directed weighted graph from crawl data and computes:
 * - PageRank-style authority flow scores
 * - Orphan page detection
 * - Click depth distribution
 * - Anchor text diversity
 * - Hub/authority structure
 */

import { CrawlResultV2 } from "../crawler-v2";
import { RawFinding } from "../scoring-engine";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface LinkNode {
  url: string;
  inboundCount: number;
  outboundCount: number;
  authorityScore: number;   // 0-100 PageRank-approximated
  clickDepth: number;       // hops from homepage
  isOrphan: boolean;
  pageType?: string;
  title?: string;
}

export interface LinkEdge {
  from: string;
  to: string;
  anchorText: string;
  isNavigation: boolean;
  weight: number;
}

export interface LinkGraphResult {
  nodes: LinkNode[];
  edges: LinkEdge[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    orphanCount: number;
    orphanRate: number;                // 0-1
    avgClickDepth: number;
    deepPages: number;                 // pages > 3 hops
    avgInboundLinks: number;
    topAuthority: { url: string; score: number }[];
    anchorDiversity: number;           // 0-100
  };
  findings: RawFinding[];
}

// ─────────────────────────────────────────
// MAIN ANALYSER
// ─────────────────────────────────────────

export function analyzeLinkGraph(crawlData: CrawlResultV2): LinkGraphResult {
  const pageMap = new Map(crawlData.pages.map(p => [p.url, p]));
  const baseUrl = crawlData.baseUrl;

  // Build edge list
  const edges: LinkEdge[] = [];
  const inboundMap = new Map<string, number>();

  for (const page of crawlData.pages) {
    if (page.statusCode !== 200) continue;

    for (const link of page.internalLinks) {
      if (!pageMap.has(link.url)) continue;
      edges.push({
        from: page.url,
        to: link.url,
        anchorText: (link as { anchor?: string }).anchor || "",
        isNavigation: link.isNavigation ?? false,
        weight: link.isNavigation ? 0.3 : 1.0,
      });
      inboundMap.set(link.url, (inboundMap.get(link.url) || 0) + 1);
    }
  }

  // Compute click depth from homepage using BFS
  const clickDepth = new Map<string, number>();
  const queue: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }];
  const visited = new Set<string>([baseUrl]);
  clickDepth.set(baseUrl, 0);

  while (queue.length > 0) {
    const { url, depth } = queue.shift()!;
    const page = pageMap.get(url);
    if (!page) continue;

    for (const link of page.internalLinks) {
      if (!visited.has(link.url) && pageMap.has(link.url)) {
        visited.add(link.url);
        clickDepth.set(link.url, depth + 1);
        queue.push({ url: link.url, depth: depth + 1 });
      }
    }
  }

  // Approximate PageRank (5 iterations, damping 0.85)
  const pageRank = new Map<string, number>();
  const pages = crawlData.pages.filter(p => p.statusCode === 200);
  const N = pages.length;
  const d = 0.85;

  // Initialise
  for (const p of pages) pageRank.set(p.url, 1 / N);

  for (let iter = 0; iter < 5; iter++) {
    const newRank = new Map<string, number>();
    for (const p of pages) {
      // Sum contributions from all pages that link to p
      let sum = 0;
      for (const edge of edges) {
        if (edge.to === p.url) {
          const fromPage = pageMap.get(edge.from);
          if (!fromPage) continue;
          const outCount = fromPage.internalLinks.filter(
            l => pageMap.has(l.url) && !l.isNavigation
          ).length;
          if (outCount > 0) {
            sum += (pageRank.get(edge.from) || 0) * edge.weight / outCount;
          }
        }
      }
      newRank.set(p.url, (1 - d) / N + d * sum);
    }
    for (const [url, rank] of Array.from(newRank.entries())) pageRank.set(url, rank);
  }

  // Normalise PageRank to 0-100
  const maxRank = Math.max(...Array.from(pageRank.values()), 0.001);
  const authorityScores = new Map(
    Array.from(pageRank.entries()).map(([url, r]) => [url, Math.round((r / maxRank) * 100)])
  );

  // Build nodes
  const nodes: LinkNode[] = pages.map(p => ({
    url: p.url,
    inboundCount: inboundMap.get(p.url) || 0,
    outboundCount: p.internalLinks.filter(l => pageMap.has(l.url)).length,
    authorityScore: authorityScores.get(p.url) || 0,
    clickDepth: clickDepth.get(p.url) ?? 99,
    isOrphan: (inboundMap.get(p.url) || 0) === 0 && p.url !== baseUrl,
    pageType: p.pageType,
    title: p.title || undefined,
  }));

  // Anchor text diversity (unique anchors / total anchors)
  const allAnchors = edges.filter(e => !e.isNavigation && e.anchorText).map(e => e.anchorText.toLowerCase().trim());
  const uniqueAnchors = new Set(allAnchors).size;
  const anchorDiversity = allAnchors.length > 0
    ? Math.round((uniqueAnchors / allAnchors.length) * 100)
    : 100;

  // Metrics
  const orphans = nodes.filter(n => n.isOrphan);
  const deepPages = nodes.filter(n => n.clickDepth > 3);
  const avgClickDepth = nodes.length
    ? nodes.reduce((sum, n) => sum + Math.min(n.clickDepth, 10), 0) / nodes.length
    : 0;
  const avgInboundLinks = nodes.length
    ? nodes.reduce((sum, n) => sum + n.inboundCount, 0) / nodes.length
    : 0;
  const topAuthority = nodes
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, 5)
    .map(n => ({ url: n.url, score: n.authorityScore }));

  const metrics = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    orphanCount: orphans.length,
    orphanRate: nodes.length > 0 ? orphans.length / nodes.length : 0,
    avgClickDepth: Math.round(avgClickDepth * 10) / 10,
    deepPages: deepPages.length,
    avgInboundLinks: Math.round(avgInboundLinks * 10) / 10,
    topAuthority,
    anchorDiversity,
  };

  const findings = generateLinkGraphFindings(nodes, metrics, edges);

  return { nodes, edges, metrics, findings };
}

// ─────────────────────────────────────────
// FINDINGS GENERATOR
// ─────────────────────────────────────────

function generateLinkGraphFindings(
  nodes: LinkNode[],
  metrics: LinkGraphResult["metrics"],
  edges: LinkEdge[]
): RawFinding[] {
  const findings: RawFinding[] = [];

  // Orphan pages
  if (metrics.orphanRate > 0.15) {
    const orphanNodes = nodes.filter(n => n.isOrphan);
    findings.push({
      type: "orphan_pages",
      severity: metrics.orphanRate > 0.3 ? "CRITICAL" : "WARNING",
      title: `${orphanNodes.length} orphan pages — no internal links pointing to them`,
      description: `${Math.round(metrics.orphanRate * 100)}% of crawled pages have zero internal links pointing to them. Googlebot may never find these pages, and they receive no PageRank flow from the rest of your site.`,
      impact: "Orphan pages cannot rank. They are invisible to both search engines and users following internal navigation.",
      howToFix: "Audit each orphan page. Either: (1) link to it from contextually relevant pages, (2) add it to your navigation/sitemap, or (3) redirect/consolidate it if it's low-value.",
      affectedUrls: orphanNodes.slice(0, 10).map(n => n.url),
      affectedCount: orphanNodes.length,
      confidence: 90,
      evidence: {
        orphanCount: orphanNodes.length,
        orphanRate: `${Math.round(metrics.orphanRate * 100)}%`,
        totalPages: metrics.totalNodes,
      },
    });
  }

  // Deep click depth
  if (metrics.deepPages > 3) {
    findings.push({
      type: "deep_click_depth",
      severity: "WARNING",
      title: `${metrics.deepPages} pages are more than 3 clicks from the homepage`,
      description: `Pages buried more than 3 clicks deep receive significantly less crawl attention and PageRank flow. Your average click depth is ${metrics.avgClickDepth}.`,
      impact: "Pages more than 3 clicks deep are crawled infrequently. Important content may not be indexed promptly, and authority flow to deep pages is diluted.",
      howToFix: "Flatten your site architecture. Add contextual links from higher-authority pages to key deep pages. Consider hub pages that aggregate and link to related content.",
      affectedUrls: [],
      affectedCount: metrics.deepPages,
      confidence: 85,
      evidence: {
        deepPages: metrics.deepPages,
        avgClickDepth: metrics.avgClickDepth,
      },
    });
  }

  // Anchor text issues
  if (metrics.anchorDiversity < 40) {
    findings.push({
      type: "anchor_text_over_optimisation",
      severity: "WARNING",
      title: "Low anchor text diversity — potential over-optimisation signal",
      description: `Only ${metrics.anchorDiversity}% of internal anchor texts are unique, suggesting repetitive anchor patterns that can trigger over-optimisation flags.`,
      impact: "Google's Penguin algorithm penalises over-optimised anchor text patterns. Low diversity signals unnatural link profiles.",
      howToFix: "Vary internal link anchor text naturally. Use page titles, contextual phrases, and branded anchors rather than repeating exact-match keywords.",
      affectedUrls: [],
      affectedCount: 0,
      confidence: 70,
      evidence: { anchorDiversity: `${metrics.anchorDiversity}%` },
    });
  }

  return findings;
}
