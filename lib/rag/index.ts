/**
 * RAG Module - Central Export
 * 
 * Provides unified access to the RAG (Retrieval-Augmented Generation)
 * system for the AI CMO platform.
 */

// Vector Database Client
export {
  // Collections
  COLLECTIONS,
  COLLECTION_METADATA,
  
  // Types
  type VectorDocument,
  type DocumentMetadata,
  type SearchResult,
  type SearchOptions,
  type SourceType,
  type KnowledgeCategory,
  type CollectionName,
  
  // Functions
  initializeCollections,
  generateEmbedding,
  addDocuments,
  searchDocuments,
  hybridSearchDocuments,
  searchMultipleCollections,
  hybridSearchMultipleCollections,
  getCollectionStats,
  deleteDocument,
  clearCollection,
  isVectorDBAvailable,
  getAllStats,
} from "./vector-client";

// Knowledge Ingestion
export {
  // Types
  type DocumentInput,
  type ChunkingOptions,
  type IngestionResult,
  
  // Functions
  chunkText,
  ingestDocument,
  ingestDocuments,
  ingestSEOGuide,
  ingestFixTemplate,
  ingestAuditExample,
  ingestRecommendationOutcome,
  ingestCompetitorPattern,
  ingestSocialBestPractice,
  ingestGEOGuide,
  ingestBenchmark,
  inferCategory,
  SOURCE_TO_COLLECTION,
} from "./knowledge-ingester";

// Context Retrieval
export {
  // Types
  type Finding,
  type RetrievalQuery,
  type RetrievedContext,
  type EnhancedSearchResult,
  type ContextBundle,
  type Citation,
  
  // Query Builders
  buildQueriesFromFindings,
  buildGeneralQuery,
  buildCompetitorQuery,
  buildSocialQuery,
  buildGEOQuery,
  
  // Retrieval Functions
  retrieveContext,
  retrieveAuditContext,
  
  // Prompt Building
  buildRAGPromptSection,
  buildCitationsSection,
  
  // Utilities
  estimateTokens,
  truncateToTokens,
  deduplicateResults,
} from "./context-retriever";

// ─────────────────────────────────────────
// CONVENIENCE FUNCTIONS
// ─────────────────────────────────────────

import { initializeCollections } from "./vector-client";
import { retrieveAuditContext, buildRAGPromptSection, type Finding, type ContextBundle } from "./context-retriever";

/**
 * Initialize the RAG system
 */
export async function initializeRAG(): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeCollections();
    console.log('[RAG] System initialized');
    return { success: true };
  } catch (error) {
    console.error('[RAG] Initialization failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get RAG context for an audit
 */
export async function getAuditRAGContext(
  findings: Finding[],
  domain: string,
  industry?: string
): Promise<{ prompt: string; context: ContextBundle }> {
  const context = await retrieveAuditContext(findings, domain, industry);
  const prompt = buildRAGPromptSection(context);
  
  return { prompt, context };
}

/**
 * Check RAG system health
 */
export async function checkRAGHealth(): Promise<{
  healthy: boolean;
  collections: number;
  totalDocuments: number;
}> {
  try {
    const { getCollectionStats, COLLECTIONS } = await import("./vector-client");
    
    let totalDocuments = 0;
    const collectionNames = Object.values(COLLECTIONS);
    
    for (const name of collectionNames) {
      try {
        const stats = await getCollectionStats(name);
        totalDocuments += stats.count;
      } catch {
        // Collection may not exist yet
      }
    }
    
    return {
      healthy: true,
      collections: collectionNames.length,
      totalDocuments,
    };
  } catch (error) {
    return {
      healthy: false,
      collections: 0,
      totalDocuments: 0,
    };
  }
}
