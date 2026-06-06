/**
 * Knowledge Base Ingestion Script
 * 
 * Run this script to populate the RAG vector database
 * with SEO knowledge, fix templates, and other content.
 * 
 * Usage:
 *   npm run ingest-knowledge
 */

// Load .env before anything else
import { resolve } from "path";
import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env") });

import {
  initializeCollections,
  ingestDocuments,
  ingestBenchmark,
  getCollectionStats,
  COLLECTIONS,
} from "../lib/rag";

import { getSEOKnowledge } from "../data/seo-knowledge";
import { getFixTemplates } from "../data/fix-templates";

// ─────────────────────────────────────────
// INDUSTRY BENCHMARKS
// ─────────────────────────────────────────

type BenchmarkMetrics = Record<string, { avg: number; good: number; excellent: number }>;

interface IndustryBenchmark {
  industry: string;
  metrics: BenchmarkMetrics;
}

const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    industry: "SaaS / Technology",
    metrics: {
      "Page Load Time (seconds)": { avg: 3.2, good: 2.0, excellent: 1.5 },
      "LCP (seconds)": { avg: 3.0, good: 2.5, excellent: 1.8 },
      "CLS Score": { avg: 0.15, good: 0.1, excellent: 0.05 },
      "Bounce Rate (%)": { avg: 45, good: 35, excellent: 25 },
      "Organic CTR (%)": { avg: 3.5, good: 5.0, excellent: 8.0 },
      "Pages per Session": { avg: 2.5, good: 3.5, excellent: 5.0 },
      "Session Duration (seconds)": { avg: 180, good: 240, excellent: 360 },
    }
  },
  {
    industry: "E-commerce / Retail",
    metrics: {
      "Page Load Time (seconds)": { avg: 4.0, good: 2.5, excellent: 1.8 },
      "LCP (seconds)": { avg: 3.5, good: 2.5, excellent: 2.0 },
      "CLS Score": { avg: 0.18, good: 0.1, excellent: 0.05 },
      "Bounce Rate (%)": { avg: 50, good: 40, excellent: 30 },
      "Organic CTR (%)": { avg: 2.8, good: 4.0, excellent: 6.5 },
      "Pages per Session": { avg: 4.0, good: 6.0, excellent: 10.0 },
      "Cart Abandonment (%)": { avg: 70, good: 60, excellent: 45 },
    }
  },
  {
    industry: "Professional Services / B2B",
    metrics: {
      "Page Load Time (seconds)": { avg: 3.5, good: 2.2, excellent: 1.6 },
      "LCP (seconds)": { avg: 3.2, good: 2.5, excellent: 1.8 },
      "CLS Score": { avg: 0.12, good: 0.08, excellent: 0.04 },
      "Bounce Rate (%)": { avg: 55, good: 45, excellent: 35 },
      "Organic CTR (%)": { avg: 4.0, good: 6.0, excellent: 10.0 },
      "Time on Page (seconds)": { avg: 90, good: 150, excellent: 240 },
      "Lead Form Conversion (%)": { avg: 2.5, good: 5.0, excellent: 10.0 },
    }
  },
  {
    industry: "Healthcare / Medical",
    metrics: {
      "Page Load Time (seconds)": { avg: 3.8, good: 2.5, excellent: 1.8 },
      "LCP (seconds)": { avg: 3.4, good: 2.5, excellent: 2.0 },
      "Bounce Rate (%)": { avg: 48, good: 38, excellent: 28 },
      "Organic CTR (%)": { avg: 3.8, good: 5.5, excellent: 8.5 },
      "Pages per Session": { avg: 2.8, good: 4.0, excellent: 6.0 },
      "Mobile Traffic (%)": { avg: 60, good: 65, excellent: 70 },
    }
  },
  {
    industry: "Finance / Fintech",
    metrics: {
      "Page Load Time (seconds)": { avg: 3.0, good: 2.0, excellent: 1.4 },
      "LCP (seconds)": { avg: 2.8, good: 2.2, excellent: 1.6 },
      "CLS Score": { avg: 0.10, good: 0.06, excellent: 0.03 },
      "Bounce Rate (%)": { avg: 52, good: 42, excellent: 32 },
      "Organic CTR (%)": { avg: 3.2, good: 4.8, excellent: 7.5 },
      "Trust Signals (avg count)": { avg: 3, good: 5, excellent: 8 },
    }
  },
  {
    industry: "Education / EdTech",
    metrics: {
      "Page Load Time (seconds)": { avg: 3.6, good: 2.4, excellent: 1.7 },
      "LCP (seconds)": { avg: 3.3, good: 2.5, excellent: 1.9 },
      "Bounce Rate (%)": { avg: 42, good: 32, excellent: 22 },
      "Organic CTR (%)": { avg: 4.2, good: 6.5, excellent: 10.0 },
      "Pages per Session": { avg: 3.2, good: 5.0, excellent: 8.0 },
      "Video Engagement (%)": { avg: 45, good: 60, excellent: 80 },
    }
  },
  {
    industry: "Media / Publishing",
    metrics: {
      "Page Load Time (seconds)": { avg: 4.5, good: 2.8, excellent: 2.0 },
      "LCP (seconds)": { avg: 4.0, good: 2.8, excellent: 2.2 },
      "Bounce Rate (%)": { avg: 60, good: 50, excellent: 40 },
      "Organic CTR (%)": { avg: 5.0, good: 7.5, excellent: 12.0 },
      "Pages per Session": { avg: 2.2, good: 3.0, excellent: 4.5 },
      "Time on Page (seconds)": { avg: 60, good: 120, excellent: 240 },
      "Social Shares per Article": { avg: 10, good: 50, excellent: 200 },
    }
  },
];

// ─────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  AI CMO Knowledge Base Ingestion");
  console.log("═══════════════════════════════════════════");
  console.log("");

  try {
    // 1. Initialize collections
    console.log("📦 Initializing vector database collections...");
    await initializeCollections();
    console.log("✅ Collections initialized\n");

    // 2. Ingest SEO Knowledge
    console.log("📚 Ingesting SEO knowledge base...");
    const seoKnowledge = getSEOKnowledge();
    console.log(`   Found ${seoKnowledge.length} knowledge documents`);
    
    const seoResult = await ingestDocuments(seoKnowledge);
    console.log(`   ✅ Ingested: ${seoResult.successful} successful, ${seoResult.failed} failed\n`);

    // 3. Ingest Fix Templates
    console.log("🔧 Ingesting fix templates...");
    const fixTemplates = getFixTemplates();
    console.log(`   Found ${fixTemplates.length} fix templates`);
    
    const templatesResult = await ingestDocuments(fixTemplates);
    console.log(`   ✅ Ingested: ${templatesResult.successful} successful, ${templatesResult.failed} failed\n`);

    // 4. Ingest Industry Benchmarks
    console.log("📊 Ingesting industry benchmarks...");
    for (const benchmark of INDUSTRY_BENCHMARKS) {
      await ingestBenchmark(benchmark.industry, benchmark.metrics);
      console.log(`   ✅ ${benchmark.industry}`);
    }
    console.log("");

    // 5. Print Summary
    console.log("═══════════════════════════════════════════");
    console.log("  Ingestion Complete - Summary");
    console.log("═══════════════════════════════════════════");
    console.log("");

    const collections = Object.values(COLLECTIONS);
    for (const collection of collections) {
      try {
        const stats = await getCollectionStats(collection);
        console.log(`📁 ${collection}: ${stats.count} documents`);
      } catch {
        console.log(`📁 ${collection}: 0 documents (empty)`);
      }
    }

    console.log("");
    console.log("✅ Knowledge base ready for RAG retrieval!");
    console.log("");

  } catch (error) {
    console.error("❌ Ingestion failed:", error);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
