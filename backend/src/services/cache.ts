import NodeCache from "node-cache";
import { LRUCache } from "lru-cache";
import { Redis } from "@upstash/redis";

// Types
interface CacheEntry {
  id: string;
  metadata: any;
  direct_urls?: Record<string, string>;
  expires_at: number;
  cached_at: number;
}

// ------------------------------
// 1. In-Memory LRU Cache
// ------------------------------
const memoryLRU = new LRUCache<string, CacheEntry>({
  max: 1000,       // hottest 1000 URLs
  ttl: 15 * 60 * 1000 // 15 minutes
});

// ------------------------------
// 2. NodeCache for mid-term caching (RAM)
// ------------------------------
const nodeCache = new NodeCache({
  stdTTL: 3600 // 1 hour
});

// ------------------------------
// 3. Upstash Redis (REST mode)
// ------------------------------
let redis: Redis | null = null;

try {
  const redisUrl = process.env.REDIS_URL?.trim();
  const redisToken = process.env.REDIS_TOKEN?.trim();

  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken
    });
    console.log("🟩 Redis cache initialized");
  } else {
    console.log("⚠️ Redis not configured, using in-memory cache only");
  }
} catch (err) {
  console.warn("⚠️ Redis initialization failed, using in-memory cache only:", err);
}


// ------------------------------
// Helper: Generate cache key
// ------------------------------
function getCacheKey(
  url: string,
  type: "info" | "download" | "multi" = "info"
): string {
  const encoded = Buffer.from(url).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return `${type}:${encoded}`;
}


// ------------------------------
// Get from cache (LRU → NodeCache → Redis)
// ------------------------------
export async function get<T>(
  url: string,
  type: "info" | "download" | "multi" = "info"
): Promise<T | null> {
  const key = getCacheKey(url, type);

  // 1. LRU Cache
  const entry = memoryLRU.get(key);
  if (entry && entry.expires_at > Date.now()) {
    return entry.metadata as T;
  }

  // 2. NodeCache
  const nc = nodeCache.get<CacheEntry>(key);
  if (nc && nc.expires_at > Date.now()) {
    memoryLRU.set(key, nc); // promote
    return nc.metadata as T;
  }

  // 3. Redis
  if (redis) {
    try {
      const re = await redis.get<CacheEntry>(key);
      if (re && re.expires_at > Date.now()) {
        nodeCache.set(key, re);
        memoryLRU.set(key, re);
        return re.metadata as T;
      }
    } catch (err) {
      console.warn("Redis get error:", err);
    }
  }

  return null;
}

export { get as getCache };


// ------------------------------
// Set cache (writes to all layers)
// ------------------------------
export async function set<T>(
  url: string,
  data: T,
  type: "info" | "download" | "multi" = "info",
  ttl: number = 3600
): Promise<void> {
  const key = getCacheKey(url, type);
  const expires = Date.now() + ttl * 1000;

  const entry: CacheEntry = {
    id: key,
    metadata: data,
    expires_at: expires,
    cached_at: Date.now()
  };

  memoryLRU.set(key, entry);
  nodeCache.set(key, entry, ttl);

  if (redis) {
    try {
      await redis.set(key, entry, { ex: ttl });
    } catch (err) {
      console.warn("Redis set error:", err);
    }
  }
}


// ------------------------------
// Track download URLs
// ------------------------------
export async function setDownloadUrl(
  url: string,
  itag: string,
  downloadUrl: string,
  expiresIn = 3600
) {
  const key = getCacheKey(url, "download");
  const expires = Date.now() + expiresIn * 1000;

  const existing = await get<CacheEntry>(url, "download");

  const entry: CacheEntry = {
    id: key,
    metadata: existing?.metadata || {},
    direct_urls: {
      ...existing?.direct_urls,
      [itag]: downloadUrl
    },
    expires_at: expires,
    cached_at: Date.now()
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


// ------------------------------
// Retrieve download URL
// ------------------------------
export async function getDownloadUrl(
  url: string,
  itag: string
): Promise<string | null> {
  const entry = await get<CacheEntry>(url, "download");

  if (entry?.direct_urls?.[itag]) {
    if (entry.expires_at > Date.now()) {
      return entry.direct_urls[itag];
    }
  }

  return null;
}


// ------------------------------
// Utilities
// ------------------------------
export async function has(
  url: string,
  type: "info" | "download" | "multi" = "info"
) {
  const key = getCacheKey(url, type);

  if (memoryLRU.has(key)) {
    const e = memoryLRU.get(key);
    return e ? e.expires_at > Date.now() : false;
  }

  const e2 = nodeCache.get<CacheEntry>(key);
  if (e2) return e2.expires_at > Date.now();

  if (redis) {
    try {
      const e3 = await redis.get<CacheEntry>(key);
      return e3 ? e3.expires_at > Date.now() : false;
    } catch {
      return false;
    }
  }

  return false;
}

export async function del(url: string, type: "info" | "download" | "multi" = "info") {
  const key = getCacheKey(url, type);
  memoryLRU.delete(key);
  nodeCache.del(key);
  if (redis) {
    try {
      await redis.del(key);
    } catch {}
  }
}

export function clear() {
  memoryLRU.clear();
  nodeCache.flushAll();
}

export function getStats() {
  return {
    lruSize: memoryLRU.size,
    nodeCacheSize: nodeCache.keys().length,
    redisConnected: redis !== null
  };
}
