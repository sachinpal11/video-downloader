"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.getCache = get;
exports.set = set;
exports.setDownloadUrl = setDownloadUrl;
exports.getDownloadUrl = getDownloadUrl;
exports.has = has;
exports.del = del;
exports.clear = clear;
exports.getStats = getStats;
const node_cache_1 = __importDefault(require("node-cache"));
const lru_cache_1 = require("lru-cache");
const redis_1 = require("@upstash/redis");
// In-memory LRU cache for hottest 1000 URLs (fastest access)
const memoryLRU = new lru_cache_1.LRUCache({
    max: 1000,
    ttl: 900000, // 15 minutes
});
// NodeCache for medium-term caching
const nodeCache = new node_cache_1.default({ stdTTL: 3600 }); // 1 hour
// Redis client (Upstash compatible) - optional
let redis = null;
try {
    const redisUrl = process.env.REDIS_URL;
    const redisToken = process.env.REDIS_TOKEN;
    if (redisUrl && redisToken) {
        redis = new redis_1.Redis({
            url: redisUrl,
            token: redisToken,
        });
        console.log("✅ Redis cache initialized");
    }
    else {
        console.log("⚠️  Redis not configured, using in-memory cache only");
    }
}
catch (err) {
    console.warn("⚠️  Redis initialization failed, using in-memory cache only:", err);
}
/**
 * Generate cache key from URL
 */
function getCacheKey(url, type = "info") {
    const urlHash = Buffer.from(url).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
    return `${type}:${urlHash}`;
}
/**
 * Get from cache (checks LRU -> NodeCache -> Redis in order)
 */
async function get(url, type = "info") {
    const key = getCacheKey(url, type);
    // 1. Check LRU cache (fastest)
    const lruEntry = memoryLRU.get(key);
    if (lruEntry && lruEntry.expires_at > Date.now()) {
        return lruEntry.metadata;
    }
    // 2. Check NodeCache
    const nodeEntry = nodeCache.get(key);
    if (nodeEntry && nodeEntry.expires_at > Date.now()) {
        // Promote to LRU
        memoryLRU.set(key, nodeEntry);
        return nodeEntry.metadata;
    }
    // 3. Check Redis (if available)
    if (redis) {
        try {
            const redisEntry = await redis.get(key);
            if (redisEntry && redisEntry.expires_at > Date.now()) {
                // Promote to NodeCache and LRU
                nodeCache.set(key, redisEntry);
                memoryLRU.set(key, redisEntry);
                return redisEntry.metadata;
            }
        }
        catch (err) {
            console.warn("Redis get error:", err);
        }
    }
    return null;
}
/**
 * Set cache (writes to all layers)
 */
async function set(url, data, type = "info", ttl = 3600) {
    const key = getCacheKey(url, type);
    const expiresAt = Date.now() + ttl * 1000;
    const entry = {
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
        }
        catch (err) {
            console.warn("Redis set error:", err);
        }
    }
}
/**
 * Set download URL with expiry tracking
 */
async function setDownloadUrl(url, itag, downloadUrl, expiresIn = 3600) {
    const key = getCacheKey(url, "download");
    const expiresAt = Date.now() + expiresIn * 1000;
    const existing = memoryLRU.get(key) || nodeCache.get(key);
    const entry = {
        id: key,
        metadata: (existing === null || existing === void 0 ? void 0 : existing.metadata) || {},
        direct_urls: {
            ...existing === null || existing === void 0 ? void 0 : existing.direct_urls,
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
        }
        catch (err) {
            console.warn("Redis set error:", err);
        }
    }
}
/**
 * Get download URL from cache
 */
async function getDownloadUrl(url, itag) {
    const key = getCacheKey(url, "download");
    const entry = await get(url, "download");
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
async function has(url, type = "info") {
    const key = getCacheKey(url, type);
    if (memoryLRU.has(key)) {
        const entry = memoryLRU.get(key);
        return entry ? entry.expires_at > Date.now() : false;
    }
    if (nodeCache.has(key)) {
        const entry = nodeCache.get(key);
        return entry ? entry.expires_at > Date.now() : false;
    }
    if (redis) {
        try {
            const entry = await redis.get(key);
            return entry ? entry.expires_at > Date.now() : false;
        }
        catch {
            return false;
        }
    }
    return false;
}
/**
 * Delete from cache
 */
async function del(url, type = "info") {
    const key = getCacheKey(url, type);
    memoryLRU.delete(key);
    nodeCache.del(key);
    if (redis) {
        try {
            await redis.del(key);
        }
        catch (err) {
            console.warn("Redis delete error:", err);
        }
    }
}
/**
 * Clear all caches
 */
function clear() {
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
function getStats() {
    return {
        lruSize: memoryLRU.size,
        nodeCacheSize: nodeCache.keys().length,
        redisConnected: redis !== null,
    };
}
