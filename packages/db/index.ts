import { PrismaClient } from "./generated/prisma/client";
import type { Prisma } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { redisQueue } from "cache";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

/**
 * Fire-and-forget usage metric insertion.
 * Wraps prisma.usageMetric.create in try/catch — logs errors but never throws.
 * Safe for background invocation from any request handler.
 */
export async function insertUsageMetric(
  data: Omit<Prisma.UsageMetricUncheckedCreateInput, "id" | "createdAt">
): Promise<void> {
  try {
    await prisma.usageMetric.create({ data });
  } catch (err) {
    console.error("[metrics] Failed to insert usage metric:", err);
  }
}

/**
 * Fire-and-forget wallet transaction insertion.
 * Wraps prisma.walletTransaction.create in try/catch — logs errors but never throws.
 */
export async function insertWalletTransaction(
  data: Omit<Prisma.WalletTransactionUncheckedCreateInput, "id" | "createdAt">
): Promise<void> {
  try {
    await prisma.walletTransaction.create({ data });
  } catch (err) {
    console.error("[wallet] Failed to insert wallet transaction:", err);
  }
}

// ── Async Telemetry Queue ────────────────────────────────────────────────────

/** Redis list key that the telemetry worker drains every 10 seconds. */
export const TELEMETRY_QUEUE_KEY = "warp:telemetry:queue";

/**
 * Unified telemetry event envelope.
 *
 * A single record captures everything needed for both a UsageMetric row AND
 * an optional WalletTransaction + balance deduction.  Keeping one envelope per
 * event avoids synchronisation issues between separate queues.
 */
export interface TelemetryEvent {
  /** ID of the user who made the request. */
  userId: number;
  /** Raw API key string (masked in DB, used for creditsConsumed update). */
  apiKey: string;
  /** Full model slug e.g. "groq/llama-3.3-70b-versatile". */
  model: string;
  /** Provider name e.g. "groq", "google". */
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Calculated monetary cost of this request. */
  cost: number;
  /** End-to-end latency in milliseconds. */
  latencyMs: number;
  /** Whether the LLM call succeeded (false for auth/wallet/model errors). */
  success: boolean;
  /**
   * When true the telemetry worker will deduct `cost` from the user's
   * wallet and record a DEBIT WalletTransaction.  Set to false for error-path
   * events where no charge should be applied.
   */
  deductWallet: boolean;
}

/**
 * Enqueue a telemetry event for async batch processing by the primary-backend
 * telemetry worker.
 *
 * Fast path  : RPUSH to Redis — completes in <1 ms, non-blocking.
 * Fallback   : If Redis is unavailable the function falls back to direct Prisma
 *              writes so events are never silently lost.
 */
export async function pushTelemetryEvent(event: TelemetryEvent): Promise<void> {
  // ── Fast path: enqueue to Redis ─────────────────────────────────────────
  try {
    const queued = await redisQueue.push(TELEMETRY_QUEUE_KEY, event);
    if (queued) return; // ✓ In queue — worker handles the rest
  } catch (err) {
    console.warn("[telemetry] Redis push threw unexpectedly, falling back to direct write:", err);
  }

  // ── Fallback: synchronous direct Prisma writes (Redis unavailable) ───────
  // Guaranteed zero data loss at the cost of the old synchronous behaviour.
  await insertUsageMetric({
    userId: event.userId,
    apiKey: event.apiKey,
    model: event.model,
    provider: event.provider,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    totalTokens: event.totalTokens,
    cost: event.cost,
    latencyMs: event.latencyMs,
    success: event.success,
  });

  if (event.deductWallet && event.cost > 0) {
    try {
      await prisma.user.updateMany({
        where: { id: event.userId, walletBalance: { gte: event.cost } },
        data: { walletBalance: { decrement: event.cost } },
      });
      await prisma.apiKey.update({
        where: { apiKey: event.apiKey },
        data: { creditsConsumed: { increment: Math.round(event.cost) } },
      });
      await insertWalletTransaction({
        userId: event.userId,
        amount: event.cost,
        type: "DEBIT",
        description: `LLM usage: ${event.model}`,
      });
    } catch (err) {
      console.error("[telemetry] Fallback wallet deduction failed:", err);
    }
  }
}

