/**
 * Knowledge Ingestion Pipeline
 * 
 * Ingests, chunks, embeds, and stores knowledge documents
 * for RAG retrieval in the AI CMO system.
 * 
 * Handles:
 * - SEO guides and best practices
 * - Fix templates with step-by-step instructions
 * - Audit examples for few-shot learning
 * - Competitor intelligence patterns
 * - Social media best practices
 * - GEO/AI visibility knowledge
 * - Industry benchmarks
 */

import {
  COLLECTIONS,
  CollectionName,
  VectorDocument,
  DocumentMetadata,
  SourceType,
  KnowledgeCategory,
  addDocuments,
  generateEmbedding,
} from "./vector-client";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface DocumentInput {
  title: string;
  content: string;
  sourceType: SourceType;
  category: KnowledgeCategory;
  sourceUrl?: string;
  industry?: string;
  issueTypes?: string[];
  tags?: string[];
  severity?: string;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
}

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  collection: CollectionName;
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 200;
const MIN_CHUNK_SIZE = 100;

// Map source types to collections
export const SOURCE_TO_COLLECTION: Record<SourceType, CollectionName> = {
  seo_guide: COLLECTIONS.SEO_KNOWLEDGE,
  google_docs: COLLECTIONS.SEO_KNOWLEDGE,
  fix_template: COLLECTIONS.FIX_TEMPLATES,
  audit_example: COLLECTIONS.AUDIT_EXAMPLES,
  competitor_pattern: COLLECTIONS.COMPETITOR_INTEL,
  social_best_practice: COLLECTIONS.SOCIAL_INTEL,
  geo_guide: COLLECTIONS.GEO_KNOWLEDGE,
  benchmark: COLLECTIONS.INDUSTRY_BENCHMARKS,
  case_study: COLLECTIONS.AUDIT_EXAMPLES,
  recommendation: COLLECTIONS.RECOMMENDATION_MEMORY,
};

// ─────────────────────────────────────────
// TEXT CHUNKING
// ─────────────────────────────────────────

/**
 * Smart text chunking with semantic boundaries
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    minChunkSize = MIN_CHUNK_SIZE,
  } = options;
  
  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, '  ')
    .trim();
  
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < cleanedText.length) {
    let end = Math.min(start + chunkSize, cleanedText.length);
    
    // Try to break at semantic boundaries
    if (end < cleanedText.length) {
      const breakPoint = findBestBreakPoint(cleanedText, start + chunkSize / 2, end);
      if (breakPoint > 0) {
        end = breakPoint;
      }
    }
    
    const chunk = cleanedText.slice(start, end).trim();
    
    if (chunk.length >= minChunkSize) {
      chunks.push(chunk);
    }
    
    // Move start with overlap, ensuring progress
    start = Math.max(start + 1, end - chunkOverlap);
  }
  
  return chunks;
}

/**
 * Find best semantic break point
 */
function findBestBreakPoint(text: string, minPos: number, maxPos: number): number {
  // Priority: paragraph > heading > sentence > line
  const boundaries = [
    { pattern: '\n\n', weight: 4 },
    { pattern: '\n## ', weight: 3 },
    { pattern: '\n### ', weight: 3 },
    { pattern: '. ', weight: 2 },
    { pattern: '.\n', weight: 2 },
    { pattern: '! ', weight: 2 },
    { pattern: '? ', weight: 2 },
    { pattern: '\n', weight: 1 },
  ];
  
  let bestBreak = -1;
  let bestWeight = 0;
  
  for (const { pattern, weight } of boundaries) {
    let pos = maxPos;
    while (pos > minPos) {
      const found = text.lastIndexOf(pattern, pos);
      if (found >= minPos && found <= maxPos) {
        if (weight > bestWeight || (weight === bestWeight && found > bestBreak)) {
          bestBreak = found + pattern.length;
          bestWeight = weight;
        }
        break;
      }
      pos = found - 1;
    }
  }
  
  return bestBreak;
}

// ─────────────────────────────────────────
// DOCUMENT INGESTION
// ─────────────────────────────────────────

/**
 * Ingest a single document
 */
export async function ingestDocument(
  input: DocumentInput,
  options: ChunkingOptions = {}
): Promise<IngestionResult> {
  const collection = SOURCE_TO_COLLECTION[input.sourceType];
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  console.log(`[Ingester] Processing: ${input.title}`);
  
  try {
    // Chunk the document
    const chunks = chunkText(input.content, options);
    console.log(`[Ingester] Created ${chunks.length} chunks`);
    
    // Build vector documents
    const documents: VectorDocument[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${docId}_chunk_${i}`;
      const chunkTitle = chunks.length > 1
        ? `${input.title} (Part ${i + 1}/${chunks.length})`
        : input.title;
      
      const metadata: DocumentMetadata = {
        title: chunkTitle,
        source: input.sourceUrl || "internal",
        sourceType: input.sourceType,
        category: input.category,
        industry: input.industry,
        issueTypes: input.issueTypes,
        severity: input.severity,
        confidence: 100,
        createdAt: new Date().toISOString(),
        url: input.sourceUrl,
        tags: input.tags,
      };
      
      documents.push({
        id: chunkId,
        content: chunks[i],
        metadata,
      });
    }
    
    // Add to vector database
    await addDocuments(collection, documents);
    
    // Also store reference in PostgreSQL for management
    await prisma.apiCache.upsert({
      where: { key: `knowledge:${docId}` },
      update: {
        data: {
          title: input.title,
          sourceType: input.sourceType,
          category: input.category,
          chunksCount: chunks.length,
          collection,
          updatedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        key: `knowledge:${docId}`,
        data: {
          title: input.title,
          sourceType: input.sourceType,
          category: input.category,
          chunksCount: chunks.length,
          collection,
          createdAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    
    console.log(`[Ingester] ✅ Ingested: ${input.title} (${chunks.length} chunks)`);
    
    return {
      documentId: docId,
      chunksCreated: chunks.length,
      collection,
      success: true,
    };
  } catch (error) {
    console.error(`[Ingester] ❌ Failed: ${input.title}`, error);
    return {
      documentId: docId,
      chunksCreated: 0,
      collection,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Ingest multiple documents
 */
export async function ingestDocuments(
  inputs: DocumentInput[],
  options: ChunkingOptions = {}
): Promise<{
  successful: number;
  failed: number;
  results: IngestionResult[];
}> {
  const results: IngestionResult[] = [];
  let successful = 0;
  let failed = 0;
  
  for (const input of inputs) {
    const result = await ingestDocument(input, options);
    results.push(result);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }
  
  return { successful, failed, results };
}

// ─────────────────────────────────────────
// SPECIALIZED INGESTORS
// ─────────────────────────────────────────

/**
 * Ingest SEO guide
 */
export async function ingestSEOGuide(
  title: string,
  content: string,
  category: KnowledgeCategory,
  sourceUrl?: string,
  tags?: string[]
): Promise<IngestionResult> {
  return ingestDocument({
    title,
    content,
    sourceType: "seo_guide",
    category,
    sourceUrl,
    tags,
  });
}

/**
 * Ingest fix template
 */
export async function ingestFixTemplate(
  title: string,
  content: string,
  issueTypes: string[],
  category: KnowledgeCategory,
  severity: string = "WARNING"
): Promise<IngestionResult> {
  return ingestDocument({
    title,
    content,
    sourceType: "fix_template",
    category,
    issueTypes,
    severity,
  });
}

/**
 * Ingest audit example
 */
export async function ingestAuditExample(
  title: string,
  content: string,
  industry: string,
  tags?: string[]
): Promise<IngestionResult> {
  return ingestDocument({
    title,
    content,
    sourceType: "audit_example",
    category: "technical_seo",
    industry,
    tags,
  });
}

/**
 * Ingest successful recommendation outcome
 */
export async function ingestRecommendationOutcome(
  findingType: string,
  recommendation: string,
  outcome: string,
  improvement: string,
  industry?: string
): Promise<IngestionResult> {
  const content = `
## Proven Fix: ${findingType}

### Recommendation:
${recommendation}

### Outcome:
${outcome}

### Improvement:
${improvement}

This recommendation has been verified to produce results.
  `.trim();
  
  return ingestDocument({
    title: `Proven: ${findingType}`,
    content,
    sourceType: "recommendation",
    category: inferCategory(findingType),
    issueTypes: [findingType],
    industry,
  });
}

/**
 * Ingest competitor pattern
 */
export async function ingestCompetitorPattern(
  industry: string,
  pattern: string,
  examples: string[],
  impact: string
): Promise<IngestionResult> {
  const content = `
## Competitor Pattern: ${industry}

### Pattern:
${pattern}

### Examples:
${examples.map(e => `- ${e}`).join('\n')}

### Impact:
${impact}
  `.trim();
  
  return ingestDocument({
    title: `Competitor Pattern: ${industry}`,
    content,
    sourceType: "competitor_pattern",
    category: "competitor_analysis",
    industry,
  });
}

/**
 * Ingest social media best practice
 */
export async function ingestSocialBestPractice(
  platform: string,
  practice: string,
  implementation: string,
  metrics: string
): Promise<IngestionResult> {
  const content = `
## ${platform} Best Practice

### Practice:
${practice}

### Implementation:
${implementation}

### Expected Metrics:
${metrics}
  `.trim();
  
  return ingestDocument({
    title: `${platform}: ${practice.slice(0, 50)}`,
    content,
    sourceType: "social_best_practice",
    category: "social_media",
    tags: [platform.toLowerCase()],
  });
}

/**
 * Ingest GEO/AI visibility guide
 */
export async function ingestGEOGuide(
  title: string,
  content: string,
  tags?: string[]
): Promise<IngestionResult> {
  return ingestDocument({
    title,
    content,
    sourceType: "geo_guide",
    category: "geo_visibility",
    tags,
  });
}

/**
 * Ingest industry benchmark
 */
export async function ingestBenchmark(
  industry: string,
  metrics: Record<string, { avg: number; good: number; excellent: number }>
): Promise<IngestionResult> {
  const lines = Object.entries(metrics)
    .map(([metric, values]) => 
      `- ${metric}: avg=${values.avg}, good=${values.good}, excellent=${values.excellent}`
    )
    .join('\n');
  
  const content = `
## ${industry} Industry Benchmarks

### Performance Metrics:
${lines}

Use these benchmarks to compare website performance and set realistic targets.
Last updated: ${new Date().toISOString().split('T')[0]}
  `.trim();
  
  return ingestDocument({
    title: `${industry} Benchmarks`,
    content,
    sourceType: "benchmark",
    category: "technical_seo",
    industry,
  });
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

export function inferCategory(type: string): KnowledgeCategory {
  const t = type.toLowerCase();
  
  if (t.includes("title") || t.includes("meta") || t.includes("h1") || t.includes("content")) {
    return "on_page_seo";
  }
  if (t.includes("speed") || t.includes("lcp") || t.includes("cls") || t.includes("core_web")) {
    return "page_speed";
  }
  if (t.includes("link") || t.includes("backlink")) {
    return "link_building";
  }
  if (t.includes("local") || t.includes("gmb") || t.includes("nap")) {
    return "local_seo";
  }
  if (t.includes("social") || t.includes("linkedin") || t.includes("twitter")) {
    return "social_media";
  }
  if (t.includes("geo") || t.includes("ai_visibility") || t.includes("chatgpt")) {
    return "geo_visibility";
  }
  if (t.includes("convert") || t.includes("cta") || t.includes("landing")) {
    return "conversion_optimization";
  }
  
  return "technical_seo";
}
