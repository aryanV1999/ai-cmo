/**
 * In-Memory Vector Store (Fallback)
 * 
 * A simple in-memory vector store for development/testing
 * when ChromaDB is not available.
 * 
 * Uses cosine similarity for search.
 */

import { DocumentMetadata, VectorDocument, SearchResult, CollectionName, COLLECTIONS } from "./vector-client";

// ─────────────────────────────────────────
// IN-MEMORY STORAGE
// ─────────────────────────────────────────

interface StoredDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding: number[];
}

const memoryStore: Map<CollectionName, StoredDocument[]> = new Map();

// Initialize collections
for (const name of Object.values(COLLECTIONS)) {
  memoryStore.set(name, []);
}

// ─────────────────────────────────────────
// EMBEDDING SIMULATION
// ─────────────────────────────────────────

/**
 * Generate a simple hash-based pseudo-embedding
 * (For development/testing only - not for production)
 */
export function generateSimpleEmbedding(text: string): number[] {
  const dimensions = 128; // Smaller for memory efficiency
  const embedding = new Array(dimensions).fill(0);
  
  // Simple hash-based embedding (not semantic, just for similarity)
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const idx = (charCode * (i + 1) * (j + 1)) % dimensions;
      embedding[idx] += 1;
    }
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

// ─────────────────────────────────────────
// SIMILARITY
// ─────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ─────────────────────────────────────────
// OPERATIONS
// ─────────────────────────────────────────

/**
 * Add documents to in-memory store
 */
export function addToMemory(
  collectionName: CollectionName,
  documents: VectorDocument[]
): void {
  const collection = memoryStore.get(collectionName) || [];
  
  for (const doc of documents) {
    const embedding = doc.embedding || generateSimpleEmbedding(doc.content);
    collection.push({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      embedding,
    });
  }
  
  memoryStore.set(collectionName, collection);
}

/**
 * Search in-memory store
 */
export function searchMemory(
  collectionName: CollectionName,
  query: string,
  topK: number = 5,
  minScore: number = 0.3
): SearchResult[] {
  const collection = memoryStore.get(collectionName) || [];
  const queryEmbedding = generateSimpleEmbedding(query);
  
  const results: SearchResult[] = [];
  
  for (const doc of collection) {
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    
    if (score >= minScore) {
      results.push({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score,
        citation: `[${doc.metadata.title}]`,
      });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, topK);
}

/**
 * Search multiple collections
 */
export function searchMemoryMultiple(
  collections: CollectionName[],
  query: string,
  topK: number = 10,
  minScore: number = 0.3
): SearchResult[] {
  const allResults: SearchResult[] = [];
  
  for (const collection of collections) {
    const results = searchMemory(collection, query, topK, minScore);
    allResults.push(...results);
  }
  
  // Sort and deduplicate
  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, topK);
}

/**
 * Get collection count
 */
export function getMemoryCount(collectionName: CollectionName): number {
  const collection = memoryStore.get(collectionName);
  return collection?.length || 0;
}

/**
 * Clear a collection
 */
export function clearMemoryCollection(collectionName: CollectionName): void {
  memoryStore.set(collectionName, []);
}

/**
 * Check if in-memory store has data
 */
export function hasMemoryData(): boolean {
  const values = Array.from(memoryStore.values());
  for (const collection of values) {
    if (collection.length > 0) return true;
  }
  return false;
}

/**
 * Get all stats
 */
export function getMemoryStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  Array.from(memoryStore.entries()).forEach(([name, collection]) => {
    stats[name] = collection.length;
  });
  return stats;
}
