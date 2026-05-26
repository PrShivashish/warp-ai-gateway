import Redis from "ioredis";

type CacheEntry<T> = {
    value: T;
    expiry: number | null;
};

export class CacheService {
    private static instance: CacheService;
    private cache: Map<string, CacheEntry<any>> = new Map();

    private constructor() {
        // Periodic cleanup every 60 seconds
        setInterval(() => this.cleanup(), 60000);
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    /**
     * Get a value from the cache.
     * @param key The key to retrieve.
     * @returns The value, or null if not found or expired.
     */
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (entry.expiry !== null && entry.expiry < Date.now()) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Set a value in the cache.
     * @param key The key to set.
     * @param value The value to set.
     * @param ttl Seconds until expiration.
     */
    public set<T>(key: string, value: T, ttl?: number): void {
        const expiry = ttl ? Date.now() + ttl * 1000 : null;
        this.cache.set(key, { value, expiry });
    }

    /**
     * Delete a value from the cache.
     * @param key The key to delete.
     */
    public del(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all expired entries.
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiry !== null && entry.expiry < now) {
                this.cache.delete(key);
            }
        }
    }
}

export const cache = CacheService.getInstance();

// ── Redis Queue — async telemetry buffer ────────────────────────────────────
//
// Provides a minimal Redis List interface for the fire-and-forget telemetry
// pipeline.  Completely separate from the in-memory CacheService above.
//
// Commands used:
//   RPUSH  — enqueue a single event to the tail (O(1), <1 ms)
//   EVAL   — atomic LRANGE + LTRIM drain via Lua script (horizontally safe)
//   LPUSH  — re-enqueue items to the front on worker DB failure (recovery)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Lua script: atomically drain up to N items from a Redis list in one round-
 * trip.  LRANGE + LTRIM are executed inside a single Lua call so no other
 * writer can interleave — safe for multiple concurrent worker replicas.
 *
 * KEYS[1] = list key
 * ARGV[1] = max items to drain (string representation of an integer)
 */
const LUA_DRAIN = `
local key   = KEYS[1]
local n     = tonumber(ARGV[1])
local items = redis.call('LRANGE', key, 0, n - 1)
if #items > 0 then
  redis.call('LTRIM', key, #items, -1)
end
return items
`;

class RedisQueue {
    private redis: Redis | null = null;
    private ready = false;

    constructor() {
        const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
        try {
            this.redis = new Redis(url, {
                maxRetriesPerRequest: 1,
                connectTimeout: 2000,
                lazyConnect: true,
            });
            this.redis.on("connect", () => {
                console.log("[RedisQueue] Connected to Redis ✓");
                this.ready = true;
            });
            this.redis.on("error", (err: Error) => {
                // Suppress noisy reconnect logs after the first failure
                if (this.ready) {
                    console.warn("[RedisQueue] Redis connection lost:", err.message);
                }
                this.ready = false;
            });
            this.redis.connect().catch(() => {
                this.ready = false;
            });
        } catch {
            console.warn("[RedisQueue] Could not initialise Redis client — queue will use DB fallback.");
            this.ready = false;
        }
    }

    /** True when Redis is connected and commands can be sent. */
    get isReady(): boolean {
        return this.ready && this.redis !== null;
    }

    /**
     * Push a single JSON-serialisable payload to the tail of `key`.
     * Returns `true` if the push succeeded, `false` if Redis was unavailable.
     */
    async push(key: string, payload: unknown): Promise<boolean> {
        if (!this.isReady || !this.redis) return false;
        try {
            await this.redis.rpush(key, JSON.stringify(payload));
            return true;
        } catch (err) {
            console.warn("[RedisQueue] RPUSH failed:", (err as Error).message);
            this.ready = false;
            return false;
        }
    }

    /**
     * Atomically drain up to `batchSize` raw JSON strings from the head of
     * `key` using the Lua drain script.  Returns an empty array when Redis is
     * unavailable or the list is empty.
     */
    async drainBatch(key: string, batchSize = 100): Promise<string[]> {
        if (!this.isReady || !this.redis) return [];
        try {
            const result = await this.redis.eval(LUA_DRAIN, 1, key, String(batchSize));
            return Array.isArray(result) ? (result as string[]) : [];
        } catch (err) {
            console.error("[RedisQueue] EVAL (drain) failed:", (err as Error).message);
            return [];
        }
    }

    /**
     * Re-enqueue raw strings at the FRONT of the list so they are retried on
     * the next worker cycle.  Items are reversed before LPUSH so the original
     * ordering is preserved at the head.
     */
    async requeue(key: string, items: string[]): Promise<void> {
        if (!this.isReady || !this.redis || items.length === 0) return;
        try {
            // LPUSH inserts each arg at the head; reversing restores original order.
            await this.redis.lpush(key, ...items.slice().reverse());
        } catch (err) {
            console.error("[RedisQueue] LPUSH (requeue) failed:", (err as Error).message);
        }
    }
    /** Expose the raw Redis client for the RateLimiter to reuse */
    get client(): Redis | null {
        return this.redis;
    }
}

/** Shared singleton — import this wherever queue operations are needed. */
export const redisQueue = new RedisQueue();

// ── Rate Limiter ─────────────────────────────────────────────────────────────

const LUA_RATE_LIMIT = `
local key = KEYS[1]
local incrementBy = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local window = tonumber(ARGV[3])

local current = tonumber(redis.call("GET", key) or "0")
if current + incrementBy > limit then
    return 0
end

redis.call("INCRBY", key, incrementBy)
if current == 0 then
    redis.call("EXPIRE", key, window)
end
return 1
`;

export class RateLimiter {
    /**
     * Atomically check and increment a rate limit counter using a fixed window.
     * Returns true if the request is ALLOWED, false if it is REJECTED.
     * 
     * @param key The Redis key for this counter (e.g., "warp:ratelimit:rpm:<hash>")
     * @param limit The maximum value allowed in the window
     * @param windowSeconds The duration of the window in seconds
     * @param incrementBy The amount to increment the counter by (defaults to 1)
     */
    async checkLimit(key: string, limit: number, windowSeconds: number, incrementBy = 1): Promise<boolean> {
        const redis = redisQueue.client;
        if (!redisQueue.isReady || !redis) {
            // Fail open if Redis is unavailable to prevent gateway outages
            return true;
        }

        try {
            const result = await redis.eval(LUA_RATE_LIMIT, 1, key, String(incrementBy), String(limit), String(windowSeconds));
            return result === 1;
        } catch (err) {
            console.error("[RateLimiter] EVAL failed:", (err as Error).message);
            // Fail open
            return true;
        }
    }
}

export const rateLimiter = new RateLimiter();
