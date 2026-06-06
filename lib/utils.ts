import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Normalize URL for consistent storage
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

/**
 * Calculate time ago string
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Delay execution with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out"
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Calculate percentage
 */
export function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}

/**
 * Get grade color class
 */
export function getGradeColor(grade: string): string {
  const gradeMap: Record<string, string> = {
    "A+": "text-grade-a bg-grade-a/10",
    A: "text-grade-a bg-grade-a/10",
    "A-": "text-grade-a bg-grade-a/10",
    "B+": "text-grade-b bg-grade-b/10",
    B: "text-grade-b bg-grade-b/10",
    "B-": "text-grade-b bg-grade-b/10",
    "C+": "text-grade-c bg-grade-c/10",
    C: "text-grade-c bg-grade-c/10",
    "C-": "text-grade-c bg-grade-c/10",
    "D+": "text-grade-d bg-grade-d/10",
    D: "text-grade-d bg-grade-d/10",
    "D-": "text-grade-d bg-grade-d/10",
    F: "text-grade-f bg-grade-f/10",
  };
  return gradeMap[grade] || "text-gray-500 bg-gray-100";
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: string): string {
  const severityMap: Record<string, string> = {
    CRITICAL: "text-red-600 bg-red-50 border-red-200",
    WARNING: "text-yellow-600 bg-yellow-50 border-yellow-200",
    INFO: "text-blue-600 bg-blue-50 border-blue-200",
  };
  return severityMap[severity] || "text-gray-600 bg-gray-50 border-gray-200";
}
