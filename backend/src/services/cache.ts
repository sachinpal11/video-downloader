import NodeCache from "node-cache";
import { LRUCache } from "lru-cache";
import { Redis } from "@upstash/redis";

interface CacheEntry {
  id: string;
  metadata: any;
  direct_urls?: Record<string, string>;
  expires_at: number;
  cached_at: number;
}

// In-memory LRU cache for hottest 1000 URLs (fastest access)
const memoryLRU = new LRUCache<string, CacheEntry>({
  max: 1000,
  ttl: 900000, // 15 minutes
});

// NodeCache for medium-term caching
const nodeCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

// Redis client (Upstash compatible) - optional
let redis: Redis | null = null;

try {
  const redisUrl = process.env.REDIS_URL;
  const redisToken = process.env.REDIS_TOKEN;
  
  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log("✅ Redis cache initialized");
  } else {
    console.log("⚠️  Redis not configured, using in-memory cache only");
  }
} catch (err) {
  console.warn("⚠️  Redis initialization failed, using in-memory cache only:", err);
}

/**
 * Generate cache key from URL
 */
function getCacheKey(url: string, type: "info" | "download" | "multi" = "info"): string {
  const urlHash = Buffer.from(url).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return `${type}:${urlHash}`;
}

/**
 * Get from cache (checks LRU -> NodeCache -> Redis in order)
 */
export async function get<T>(url: string, type: "info" | "download" | "multi" = "info"): Promise<T | null> {
  const key = getCacheKey(url, type);

  // 1. Check LRU cache (fastest)
  const lruEntry = memoryLRU.get(key);
  if (lruEntry && lruEntry.expires_at > Date.now()) {
    return lruEntry.metadata as T;
  }

  // 2. Check NodeCache
  const nodeEntry = nodeCache.get<CacheEntry>(key);
  if (nodeEntry && nodeEntry.expires_at > Date.now()) {
    // Promote to LRU
    memoryLRU.set(key, nodeEntry);
    return nodeEntry.metadata as T;
  }

  // 3. Check Redis (if available)
  if (redis) {
    try {
      const redisEntry = await redis.get<CacheEntry>(key);
      if (redisEntry && redisEntry.expires_at > Date.now()) {
        // Promote to NodeCache and LRU
        nodeCache.set(key, redisEntry);
        memoryLRU.set(key, redisEntry);
        return redisEntry.metadata as T;
      }
    } catch (err) {
      console.warn("Redis get error:", err);
    }
  }

  return null;
}

// Re-export cache.get for consistency
export { get as getCache };

/**
 * Set cache (writes to all layers)
 */
export async function set<T>(
  url: string,
  data: T,
  type: "info" | "download" | "multi" = "info",
  ttl: number = 3600
): Promise<void> {
  const key = getCacheKey(url, type);
  const expiresAt = Date.now() + ttl * 1000;

  const entry: CacheEntry = {
    id: key,
    metadata: data,
    expires_at: expiresAt,
    cached_at: Date.now(),
  };

  // 1. Set LRU cache
  memoryLRU.set(key, entry);

  // 2. Set NodeCache
  nodeCache.set(key, entry, ttl);

  // 3. Set Redis (if available)
  if (redis) {
    try {
      await redis.set(key, entry, { ex: ttl });
    } catch (err) {
      console.warn("Redis set error:", err);
    }
  }
}

/**
 * Set download URL with expiry tracking
 */
export async function setDownloadUrl(
  url: string,
  itag: string,
  downloadUrl: string,
  expiresIn: number = 3600
): Promise<void> {
  const key = getCacheKey(url, "download");
  const expiresAt = Date.now() + expiresIn * 1000;

  const existing = memoryLRU.get(key) || nodeCache.get<CacheEntry>(key);
  
  const entry: CacheEntry = {
    id: key,
    metadata: existing?.metadata || {},
    direct_urls: {
      ...existing?.direct_urls,
      [itag]: downloadUrl,
    },
    expires_at: expiresAt,
    cached_at: Date.now(),
  };

  memoryLRU.set(key, entry);
  nodeCache.set(key, entry, expiresIn);

  if (redis) {
    try {
      await redis.set(key, entry, { ex: expiresIn });
    } catch (err) {
      console.warn("Redis set error:", err);
    }
  }
}

/**
 * Get download URL from cache
 */
export async function getDownloadUrl(url: string, itag: string): Promise<string | null> {
  const key = getCacheKey(url, "download");
  const entry = await get<CacheEntry>(url, "download");
  
  if (entry && entry.direct_urls && entry.direct_urls[itag]) {
    // Check if expired
    if (entry.expires_at > Date.now()) {
      return entry.direct_urls[itag];
    }
  }

  return null;
}

/**
 * Check if URL is cached
 */
export async function has(url: string, type: "info" | "download" | "multi" = "info"): Promise<boolean> {
  const key = getCacheKey(url, type);
  
  if (memoryLRU.has(key)) {
    const entry = memoryLRU.get(key);
    return entry ? entry.expires_at > Date.now() : false;
  }

  if (nodeCache.has(key)) {
    const entry = nodeCache.get<CacheEntry>(key);
    return entry ? entry.expires_at > Date.now() : false;
  }

  if (redis) {
    try {
      const entry = await redis.get<CacheEntry>(key);
      return entry ? entry.expires_at > Date.now() : false;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Delete from cache
 */
export async function del(url: string, type: "info" | "download" | "multi" = "info"): Promise<void> {
  const key = getCacheKey(url, type);
  
  memoryLRU.delete(key);
  nodeCache.del(key);
  
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("Redis delete error:", err);
    }
  }
}

/**
 * Clear all caches
 */
export function clear(): void {
  memoryLRU.clear();
  nodeCache.flushAll();
  
  if (redis) {
    // Note: Redis flush requires careful handling in production
    console.warn("Redis flush not called - use with caution in production");
  }
}

/**
 * Get cache statistics
 */
export function getStats(): {
  lruSize: number;
  nodeCacheSize: number;
  redisConnected: boolean;
} {
  return {
    lruSize: memoryLRU.size,
    nodeCacheSize: nodeCache.keys().length,
    redisConnected: redis !== null,
  };
}
