/**
 * Vector Database Client — File-Based (No Server Required)
 *
 * Stores embeddings as JSON files on disk (.vector-store/<collection>.json),
 * performs cosine similarity search in memory.
 * Zero infrastructure — no ChromaDB server needed.
 */

import fs from "fs";
import path from "path";

// ─────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────

const STORE_DIR = path.join(process.cwd(), ".vector-store");

// Collection names
export const COLLECTIONS = {
  SEO_KNOWLEDGE: "seo_knowledge",
  FIX_TEMPLATES: "fix_templates",
  AUDIT_EXAMPLES: "audit_examples",
  COMPETITOR_INTEL: "competitor_intel",
  SOCIAL_INTEL: "social_intel",
  GEO_KNOWLEDGE: "geo_knowledge",
  INDUSTRY_BENCHMARKS: "industry_benchmarks",
  RECOMMENDATION_MEMORY: "recommendation_memory",
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// Collection metadata for documentation
export const COLLECTION_METADATA: Record<CollectionName, { description: string; priority: number }> = {
  [COLLECTIONS.SEO_KNOWLEDGE]: { description: "SEO guides, best practices, Google docs", priority: 1 },
  [COLLECTIONS.FIX_TEMPLATES]: { description: "Step-by-step fix templates", priority: 2 },
  [COLLECTIONS.AUDIT_EXAMPLES]: { description: "High-quality audit examples", priority: 3 },
  [COLLECTIONS.COMPETITOR_INTEL]: { description: "Competitor patterns", priority: 4 },
  [COLLECTIONS.SOCIAL_INTEL]: { description: "Social media best practices", priority: 5 },
  [COLLECTIONS.GEO_KNOWLEDGE]: { description: "GEO/AI visibility guides", priority: 6 },
  [COLLECTIONS.INDUSTRY_BENCHMARKS]: { description: "Performance benchmarks", priority: 7 },
  [COLLECTIONS.RECOMMENDATION_MEMORY]: { description: "Proven recommendations", priority: 8 },
};

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface VectorDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface DocumentMetadata {
  title: string;
  source: string;
  sourceType: SourceType;
  category: KnowledgeCategory;
  industry?: string;
  issueTypes?: string[];
  severity?: string;
  confidence?: number;
  createdAt: string;
  url?: string;
  tags?: string[];
}

export type SourceType =
  | "seo_guide"
  | "google_docs"
  | "fix_template"
  | "audit_example"
  | "competitor_pattern"
  | "social_best_practice"
  | "geo_guide"
  | "benchmark"
  | "case_study"
  | "recommendation";

export type KnowledgeCategory =
  | "technical_seo"
  | "on_page_seo"
  | "page_speed"
  | "content_strategy"
  | "link_building"
  | "local_seo"
  | "ecommerce_seo"
  | "competitor_analysis"
  | "social_media"
  | "content_marketing"
  | "geo_visibility"
  | "conversion_optimization"
  | "brand_authority"
  | "marketing_funnel";

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  score: number;
  citation: string;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  filter?: Record<string, string | string[]>;
  includeEmbeddings?: boolean;
  semanticWeight?: number;
  keywordWeight?: number;
}

// Internal stored record
interface StoredRecord {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding: number[];
}

// ─────────────────────────────────────────
// FILE STORE HELPERS
// ─────────────────────────────────────────

function collectionPath(name: CollectionName): string {
  return path.join(STORE_DIR, `${name}.json`);
}

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadCollection(name: CollectionName): StoredRecord[] {
  ensureStoreDir();
  const p = collectionPath(name);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as StoredRecord[];
  } catch {
    return [];
  }
}

function saveCollection(name: CollectionName, records: StoredRecord[]): void {
  ensureStoreDir();
  fs.writeFileSync(collectionPath(name), JSON.stringify(records, null, 2), "utf-8");
}

// ─────────────────────────────────────────
// COSINE SIMILARITY
// ─────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────
// GEMINI CLIENT
// ─────────────────────────────────────────

// Compatibility export (previously exported ChromaDB client)
export const chromaClient = () => ({ path: STORE_DIR });

// ─────────────────────────────────────────
// LOCAL EMBEDDING GENERATION (No API needed)
// ─────────────────────────────────────────

const EMBEDDING_DIM = 384; // Compact but effective

/**
 * Simple hash function for deterministic randomness
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function metadataMatches(
  metadata: DocumentMetadata,
  filter?: Record<string, string | string[]>
): boolean {
  if (!filter) return true;

  return Object.entries(filter).every(([key, val]) => {
    const metaVal = (metadata as unknown as Record<string, unknown>)[key];
    if (metaVal === undefined || metaVal === null) return true;

    const accepted = Array.isArray(val) ? val.map(String) : [String(val)];
    const actual = Array.isArray(metaVal) ? metaVal.map(String) : [String(metaVal)];

    return actual.some((v) => accepted.includes(v));
  });
}

function keywordScore(query: string, content: string, metadata: DocumentMetadata): number {
  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0) return 0;

  const titleTokens = tokenize(metadata.title || "");
  const tagTokens = (metadata.tags || []).flatMap(tokenize);
  const issueTokens = (metadata.issueTypes || []).flatMap(tokenize);
  const bodyTokens = tokenize(content);
  const bodyCounts = new Map<string, number>();

  for (const token of bodyTokens) {
    bodyCounts.set(token, (bodyCounts.get(token) || 0) + 1);
  }

  let matched = 0;
  let weighted = 0;

  for (const term of queryTerms) {
    const inTitle = titleTokens.includes(term);
    const inTags = tagTokens.includes(term);
    const inIssueTypes = issueTokens.includes(term);
    const bodyTf = bodyCounts.get(term) || 0;

    if (inTitle || inTags || inIssueTypes || bodyTf > 0) matched++;
    weighted += (inTitle ? 2.5 : 0) + (inTags ? 1.8 : 0) + (inIssueTypes ? 2.2 : 0);
    weighted += Math.min(2.5, Math.log1p(bodyTf));
  }

  const coverage = matched / queryTerms.length;
  const density = Math.min(1, weighted / (queryTerms.length * 3));
  return Math.min(1, coverage * 0.65 + density * 0.35);
}

function authorityScore(metadata: DocumentMetadata): number {
  const confidence = (metadata.confidence || 70) / 100;
  const sourceBoost: Partial<Record<SourceType, number>> = {
    google_docs: 1,
    fix_template: 0.95,
    case_study: 0.9,
    recommendation: 0.9,
    benchmark: 0.85,
  };

  return Math.min(1, confidence * (sourceBoost[metadata.sourceType] || 0.75));
}

function recencyScore(metadata: DocumentMetadata): number {
  if (!metadata.createdAt) return 0.6;
  const ageMs = Date.now() - new Date(metadata.createdAt).getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  return Math.max(0.25, 1 - ageDays / 365);
}

/**
 * Generate embedding vector using local word-hash approach
 * Creates deterministic vectors — same text = same embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  const tokens = tokenize(text);
  
  if (tokens.length === 0) {
    // Return normalized zero vector for empty text
    return embedding.map(() => 1 / Math.sqrt(EMBEDDING_DIM));
  }
  
  // Hash each token into embedding dimensions
  for (const token of tokens) {
    const hash = hashCode(token);
    // Spread influence across multiple dimensions
    for (let offset = 0; offset < 5; offset++) {
      const idx = Math.abs((hash + offset * 7919) % EMBEDDING_DIM);
      const sign = ((hash >> offset) & 1) === 0 ? 1 : -1;
      embedding[idx] += sign * (1 / Math.sqrt(tokens.length));
    }
  }
  
  // Normalize to unit vector
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? embedding : embedding.map((v) => v / mag);
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}

// ─────────────────────────────────────────
// COLLECTION MANAGEMENT
// ─────────────────────────────────────────

/**
 * Get or create a collection (returns a stub for API compatibility)
 */
export async function getCollection(name: CollectionName): Promise<{ name: CollectionName }> {
  ensureStoreDir();
  if (!fs.existsSync(collectionPath(name))) {
    saveCollection(name, []);
  }
  return { name };
}

/**
 * List all collections
 */
export async function listCollections(): Promise<string[]> {
  ensureStoreDir();
  return fs
    .readdirSync(STORE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Delete a collection
 */
export async function deleteCollection(name: CollectionName): Promise<void> {
  const p = collectionPath(name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ─────────────────────────────────────────
// DOCUMENT OPERATIONS
// ─────────────────────────────────────────

/**
 * Add documents to a collection
 */
export async function addDocuments(
  collectionName: CollectionName,
  documents: VectorDocument[]
): Promise<void> {
  const records = loadCollection(collectionName);
  const existingIds = new Set(records.map((r) => r.id));

  for (const doc of documents) {
    const embedding =
      doc.embedding ?? (await generateEmbedding(`${doc.metadata.title}\n\n${doc.content}`));

    if (existingIds.has(doc.id)) {
      const idx = records.findIndex((r) => r.id === doc.id);
      records[idx] = { id: doc.id, content: doc.content, metadata: doc.metadata, embedding };
    } else {
      records.push({ id: doc.id, content: doc.content, metadata: doc.metadata, embedding });
      existingIds.add(doc.id);
    }

    await new Promise((r) => setTimeout(r, 50));
  }

  saveCollection(collectionName, records);
  console.log(`[Vector Client] Added/updated ${documents.length} documents in ${collectionName}`);
}

/**
 * Update a document
 */
export async function updateDocument(
  collectionName: CollectionName,
  document: VectorDocument
): Promise<void> {
  await addDocuments(collectionName, [document]);
}

/**
 * Delete documents by ID
 */
export async function deleteDocuments(
  collectionName: CollectionName,
  ids: string[]
): Promise<void> {
  const records = loadCollection(collectionName);
  saveCollection(collectionName, records.filter((r) => !ids.includes(r.id)));
}

// ─────────────────────────────────────────
// SEMANTIC SEARCH
// ─────────────────────────────────────────

/**
 * Search for similar documents using cosine similarity
 */
export async function searchDocuments(
  collectionName: CollectionName,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { topK = 10, minScore = 0.5, filter } = options;

  const records = loadCollection(collectionName);
  if (records.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);

  return records
    .filter((r) => metadataMatches(r.metadata, filter))
    .map((r) => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      score: cosineSimilarity(queryEmbedding, r.embedding),
      citation: `[${r.metadata.title || "Unknown"}]`,
    }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Hybrid semantic + keyword search.
 *
 * The local hash embeddings are useful for rough semantic overlap but weak for
 * precise SEO issue retrieval. Hybrid scoring keeps exact issue/template matches
 * in the candidate set while still rewarding semantic similarity.
 */
export async function hybridSearchDocuments(
  collectionName: CollectionName,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    topK = 10,
    minScore = 0.35,
    filter,
    semanticWeight = 0.55,
    keywordWeight = 0.45,
  } = options;

  const records = loadCollection(collectionName);
  if (records.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  const weightTotal = semanticWeight + keywordWeight || 1;

  return records
    .filter((r) => metadataMatches(r.metadata, filter))
    .map((r) => {
      const semantic = cosineSimilarity(queryEmbedding, r.embedding);
      const keyword = keywordScore(query, r.content, r.metadata);
      const quality = authorityScore(r.metadata) * 0.12 + recencyScore(r.metadata) * 0.08;
      const score = ((semantic * semanticWeight) + (keyword * keywordWeight)) / weightTotal + quality;

      return {
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        score: Math.min(1, score),
        citation: `[${r.metadata.title || "Unknown"}]`,
      };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Multi-collection search
 */
export async function searchMultipleCollections(
  collections: CollectionName[],
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const allResults = await Promise.all(
    collections.map(c => searchDocuments(c, query, options))
  );
  
  return allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, options.topK || 10);
}

export async function hybridSearchMultipleCollections(
  collections: CollectionName[],
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const allResults = await Promise.all(
    collections.map(c => hybridSearchDocuments(c, query, options))
  );

  return allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, options.topK || 10);
}

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────

/**
 * Check if vector DB is available (always true for file-based store)
 */
export async function isVectorDBAvailable(): Promise<boolean> {
  try {
    ensureStoreDir();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(collectionName: CollectionName): Promise<{
  count: number;
  name: string;
}> {
  const records = loadCollection(collectionName);
  return { count: records.length, name: collectionName };
}

/**
 * Get all collection statistics
 */
export async function getAllStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  for (const name of Object.values(COLLECTIONS)) {
    try {
      const { count } = await getCollectionStats(name);
      stats[name] = count;
    } catch {
      stats[name] = 0;
    }
  }
  
  return stats;
}

// ─────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────

/**
 * Initialize all collections (creates JSON files if missing)
 */
export async function initializeCollections(): Promise<void> {
  console.log("[Vector Client] Initializing file-based collections...");
  ensureStoreDir();
  
  for (const name of Object.values(COLLECTIONS)) {
    try {
      await getCollection(name);
      console.log(`[Vector Client] Collection ready: ${name}`);
    } catch (error) {
      console.error(`[Vector Client] Failed to init ${name}:`, error);
    }
  }
  
  console.log("[Vector Client] All collections initialized");
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(
  collectionName: CollectionName,
  id: string
): Promise<void> {
  await deleteDocuments(collectionName, [id]);
}

/**
 * Clear all documents from a collection
 */
export async function clearCollection(collectionName: CollectionName): Promise<void> {
  saveCollection(collectionName, []);
  console.log(`[Vector Client] Cleared collection: ${collectionName}`);
}
