/*
	SilentComms Redis layer (Upstash REST client).

	Used for:
	  - Session lookup caching (avoids a Postgres round-trip on every
	    authenticated request)
	  - Presence caching (who's online, without hammering Postgres)
	  - Fast rate-limit counters (in addition to the existing DB-backed
	    rate limiter, for the hottest paths)

	This is intentionally a thin wrapper: if UPSTASH_REDIS_REST_URL /
	UPSTASH_REDIS_REST_TOKEN aren't set, every method becomes a safe no-op
	(cache miss) so the server keeps working without Redis configured —
	it just won't get the caching speedup.
*/

import { Redis } from "@upstash/redis";

const enabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const client: Redis | null = enabled ? Redis.fromEnv() : null;

if (!enabled) {
	console.warn("[Redis] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — running without Redis caching.");
}

export const RedisCache = {
	enabled,

	/** Cache a user's session lookup so we don't hit Postgres on every request. */
	async cacheSession(sessionId: string, userId: string, ttlSeconds = 300): Promise<void> {
		if (!client) return;
		try {
			await client.set(`session:${sessionId}`, userId, { ex: ttlSeconds });
		} catch (e) {
			console.error("[Redis] cacheSession failed", e);
		}
	},

	async getCachedSession(sessionId: string): Promise<string | null> {
		if (!client) return null;
		try {
			const val = await client.get<string>(`session:${sessionId}`);
			return val ?? null;
		} catch (e) {
			console.error("[Redis] getCachedSession failed", e);
			return null;
		}
	},

	async invalidateSession(sessionId: string): Promise<void> {
		if (!client) return;
		try {
			await client.del(`session:${sessionId}`);
		} catch (e) {
			console.error("[Redis] invalidateSession failed", e);
		}
	},

	/** Presence: mark a user online with a TTL (expires automatically if they disconnect without a clean close). */
	async setPresence(userId: string, status: string, ttlSeconds = 90): Promise<void> {
		if (!client) return;
		try {
			await client.set(`presence:${userId}`, status, { ex: ttlSeconds });
		} catch (e) {
			console.error("[Redis] setPresence failed", e);
		}
	},

	async getPresence(userId: string): Promise<string | null> {
		if (!client) return null;
		try {
			const val = await client.get<string>(`presence:${userId}`);
			return val ?? null;
		} catch (e) {
			console.error("[Redis] getPresence failed", e);
			return null;
		}
	},

	async clearPresence(userId: string): Promise<void> {
		if (!client) return;
		try {
			await client.del(`presence:${userId}`);
		} catch (e) {
			console.error("[Redis] clearPresence failed", e);
		}
	},

	/**
	 * Fast fixed-window rate-limit counter. Returns the count *after*
	 * incrementing, so the caller can compare against their limit.
	 * Falls back to allowing the request (returns 0) if Redis is unavailable
	 * — the existing DB-backed rate limiter still applies underneath.
	 */
	async incrRateLimit(key: string, windowSeconds: number): Promise<number> {
		if (!client) return 0;
		try {
			const fullKey = `ratelimit:${key}`;
			const count = await client.incr(fullKey);
			if (count === 1) {
				await client.expire(fullKey, windowSeconds);
			}
			return count;
		} catch (e) {
			console.error("[Redis] incrRateLimit failed", e);
			return 0;
		}
	},

	/** Generic short-lived cache helper for arbitrary read-heavy lookups. */
	async cacheGet<T>(key: string): Promise<T | null> {
		if (!client) return null;
		try {
			const val = await client.get<T>(`cache:${key}`);
			return val ?? null;
		} catch (e) {
			console.error("[Redis] cacheGet failed", e);
			return null;
		}
	},

	async cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
		if (!client) return;
		try {
			await client.set(`cache:${key}`, value, { ex: ttlSeconds });
		} catch (e) {
			console.error("[Redis] cacheSet failed", e);
		}
	},

	async cacheDel(key: string): Promise<void> {
		if (!client) return;
		try {
			await client.del(`cache:${key}`);
		} catch (e) {
			console.error("[Redis] cacheDel failed", e);
		}
	},
};
