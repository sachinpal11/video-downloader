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
  max: 1000,            // hottest 1000 URLs
  ttl: 15 * 60 * 1000   // 15 minutes
});

// ------------------------------
// 2. NodeCache (mid-term cache)
// ------------------------------
const nodeCache = new NodeCache({
  stdTTL: 3600 // 1 hour
});

// ------------------------------
// 3. Redis (Upstash)
// ------------------------------
let redis: Redis | null = null;

try {
  const redisUrl = process.env.REDIS_URL?.trim();
  const redisToken = process.env.REDIS_TOKEN?.trim();

  if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
    console.log("🟩 Redis cache initialized");
  } else {
    console.log("⚠️ Redis not configured, using in-memory cache only");
  }
} catch (err) {
  console.warn("⚠️ Redis initialization failed:", err);
}


// ------------------------------
// Helper: Generate Cache Key
// ------------------------------
function getCacheKey(url: string, type: "info" | "download" | "multi" = "info") {
  const encoded = Buffer.from(url).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return `${type}:${encoded}`;
}


// ======================================================
// ⭐ GET METADATA ONLY (old behaviour)
// ======================================================
export async function get<T>(
  url: string,
  type: "info" | "download" | "multi" = "info"
): Promise<T | null> {

  const key = getCacheKey(url, type);

  // LRU
  const lru = memoryLRU.get(key);
  if (lru && lru.expires_at > Date.now()) return lru.metadata as T;

  // NodeCache
  const nc = nodeCache.get<CacheEntry>(key);
  if (nc && nc.expires_at > Date.now()) {
    memoryLRU.set(key, nc);
    return nc.metadata as T;
  }

  // Redis
  if (redis) {
    try {
      const re = await redis.get<CacheEntry>(key);
      if (re && re.expires_at > Date.now()) {
        nodeCache.set(key, re);
        memoryLRU.set(key, re);
        return re.metadata as T;
      }
    } catch {}
  }

  return null;
}

export { get as getCache };


// ======================================================
// ⭐ NEW: GET FULL RAW ENTRY (needed for direct URLs!)
// ======================================================
export async function getRaw(
  url: string,
  type: "info" | "download" | "multi" = "info"
): Promise<CacheEntry | null> {

  const key = getCacheKey(url, type);

  const lru = memoryLRU.get(key);
  if (lru && lru.expires_at > Date.now()) return lru;

  const nc = nodeCache.get<CacheEntry>(key);
  if (nc && nc.expires_at > Date.now()) {
    memoryLRU.set(key, nc);
    return nc;
  }

  if (redis) {
    try {
      const re = await redis.get<CacheEntry>(key);
      if (re && re.expires_at > Date.now()) {
        nodeCache.set(key, re);
        memoryLRU.set(key, re);
        return re;
      }
    } catch {}
  }

  return null;
}


// ======================================================
// SET CACHE (writes to all layers)
// ======================================================
export async function set<T>(
  url: string,
  data: T,
  type: "info" | "download" | "multi" = "info",
  ttl: number = 3600
) {
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
    } catch {}
  }
}


// ======================================================
// SET DIRECT DOWNLOAD URL
// ======================================================
export async function setDownloadUrl(
  url: string,
  itag: string,
  directUrl: string,
  expiresIn = 3600
) {
  const key = getCacheKey(url, "download");
  const expires = Date.now() + expiresIn * 1000;

  const existing = await getRaw(url, "download");

  const entry: CacheEntry = {
    id: key,
    metadata: existing?.metadata || {},
    direct_urls: {
      ...(existing?.direct_urls ?? {}),
      [itag]: directUrl
    },
    expires_at: expires,
    cached_at: Date.now()
  };

  memoryLRU.set(key, entry);
  nodeCache.set(key, entry, expiresIn);

  if (redis) {
    try {
      await redis.set(key, entry, { ex: expiresIn });
    } catch {}
  }
}


// ======================================================
// GET DIRECT DOWNLOAD URL (NOW FAST!)
// ======================================================
export async function getDownloadUrl(
  url: string,
  itag: string
): Promise<string | null> {

  const entry = await getRaw(url, "download");
  if (!entry) return null;

  const cached = entry.direct_urls?.[itag];
  if (!cached) return null;

  if (entry.expires_at > Date.now()) {
    return cached;
  }

  return null;
}


// ======================================================
// Utilities
// ======================================================
export async function has(
  url: string,
  type: "info" | "download" | "multi" = "info"
) {
  const key = getCacheKey(url, type);

  const e1 = memoryLRU.get(key);
  if (e1 && e1.expires_at > Date.now()) return true;

  const e2 = nodeCache.get<CacheEntry>(key);
  if (e2 && e2.expires_at > Date.now()) return true;

  if (redis) {
    try {
      const e3 = await redis.get<CacheEntry>(key);
      return e3 ? e3.expires_at > Date.now() : false;
    } catch {}
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
