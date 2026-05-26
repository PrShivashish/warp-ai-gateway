import { prisma, TELEMETRY_QUEUE_KEY } from "db";
import type { TelemetryEvent } from "db";
import { redisQueue } from "cache";

// ── Configuration ────────────────────────────────────────────────────────────
const BATCH_SIZE = 100;        // Max events per flush cycle
const FLUSH_INTERVAL_MS = 10_000; // 10 seconds between flush cycles

// ── Flush logic ──────────────────────────────────────────────────────────────

/**
 * Drains up to BATCH_SIZE events from the Redis telemetry queue and commits
 * them to PostgreSQL in a single Prisma transaction.
 *
 * Error recovery: if the DB transaction fails the raw JSON strings are
 * LPUSH-ed back to the FRONT of the queue so they will be retried on the
 * next cycle without data loss.
 */
async function flushTelemetryBatch(): Promise<void> {
    // Skip cycle if Redis is not available
    if (!redisQueue.isReady) return;

    // ── 1. Atomically drain up to BATCH_SIZE records ─────────────────────────
    let rawItems: string[];
    try {
        rawItems = await redisQueue.drainBatch(TELEMETRY_QUEUE_KEY, BATCH_SIZE);
    } catch (err) {
        console.error("[telemetry-worker] Failed to drain queue from Redis:", err);
        return;
    }

    if (rawItems.length === 0) return; // Nothing to flush this cycle

    // ── 2. Parse JSON envelopes ───────────────────────────────────────────────
    const events: TelemetryEvent[] = [];
    for (const raw of rawItems) {
        try {
            events.push(JSON.parse(raw) as TelemetryEvent);
        } catch {
            // Malformed events are discarded (log but don't block the batch)
            console.warn("[telemetry-worker] Skipping malformed telemetry envelope:", raw.slice(0, 120));
        }
    }

    if (events.length === 0) return;

    // ── 3. Build batched DB payloads ──────────────────────────────────────────

    // 3a. UsageMetric rows — one per event
    const metricsRows = events.map((e) => ({
        userId: e.userId,
        apiKey: e.apiKey,
        model: e.model,
        provider: e.provider,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        totalTokens: e.totalTokens,
        cost: e.cost,
        latencyMs: e.latencyMs,
        success: e.success,
    }));

    // 3b. Filter to events that require wallet deductions
    const walletEvents = events.filter((e) => e.deductWallet && e.cost > 0);

    // 3c. Group total cost by userId for a single updateMany per user
    //     This avoids multiple writes to the same row inside one transaction.
    const costByUser = new Map<number, number>();
    for (const e of walletEvents) {
        costByUser.set(e.userId, (costByUser.get(e.userId) ?? 0) + e.cost);
    }

    // 3d. Group creditsConsumed increment by API key
    const creditsByKey = new Map<string, number>();
    for (const e of walletEvents) {
        creditsByKey.set(e.apiKey, (creditsByKey.get(e.apiKey) ?? 0) + Math.round(e.cost));
    }

    // 3e. WalletTransaction rows — one per wallet event (granular history)
    const walletTxRows = walletEvents.map((e) => ({
        userId: e.userId,
        amount: e.cost,
        type: "DEBIT" as const,
        description: `LLM usage: ${e.model}`,
    }));

    // ── 4. Commit everything in a single atomic Prisma transaction ────────────
    const t0 = performance.now();
    try {
        await prisma.$transaction([
            // (a) Batch-insert all usage metrics
            prisma.usageMetric.createMany({ data: metricsRows }),

            // (b) Deduct wallet balance per user — one updateMany per unique user.
            //     The `walletBalance: { gte: totalCost }` guard prevents going negative.
            ...Array.from(costByUser.entries()).map(([userId, totalCost]) =>
                prisma.user.updateMany({
                    where: { id: userId, walletBalance: { gte: totalCost } },
                    data: { walletBalance: { decrement: totalCost } },
                })
            ),

            // (c) Increment creditsConsumed per API key — one updateMany per unique key.
            ...Array.from(creditsByKey.entries()).map(([apiKey, credits]) =>
                prisma.apiKey.updateMany({
                    where: { apiKey },
                    data: { creditsConsumed: { increment: credits } },
                })
            ),

            // (d) Batch-insert wallet transaction records (only if any exist)
            ...(walletTxRows.length > 0
                ? [prisma.walletTransaction.createMany({ data: walletTxRows })]
                : []),
        ]);

        const elapsedMs = Math.round(performance.now() - t0);
        console.log(
            `[telemetry-worker] ✅ Flushed ${events.length} events ` +
            `(${metricsRows.length} metrics, ${walletEvents.length} wallet deductions) ` +
            `in ${elapsedMs}ms`
        );
    } catch (err) {
        // ── 5. Error recovery: re-enqueue raw strings at the FRONT of the queue ─
        //      Items are preserved in original order so priority events stay first.
        console.error(
            `[telemetry-worker] ❌ DB transaction failed — re-queuing ${rawItems.length} records for retry:`,
            err
        );
        await redisQueue.requeue(TELEMETRY_QUEUE_KEY, rawItems);
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the telemetry flush worker.
 * Call once at server boot — it schedules itself via setInterval.
 */
export function startTelemetryWorker(): void {
    console.log(
        `[telemetry-worker] 🚀 Starting — ` +
        `flush interval: ${FLUSH_INTERVAL_MS / 1000}s, batch size: ${BATCH_SIZE}`
    );

    // Run one flush immediately on startup to drain any leftover queue items
    // from a previous server run (avoids waiting a full 10 s on cold start).
    flushTelemetryBatch().catch((err) =>
        console.error("[telemetry-worker] Initial flush error:", err)
    );

    setInterval(() => {
        flushTelemetryBatch().catch((err) =>
            console.error("[telemetry-worker] Scheduled flush error:", err)
        );
    }, FLUSH_INTERVAL_MS);
}
