"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
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
// ------------------------------
// 1. In-Memory LRU Cache
// ------------------------------
const memoryLRU = new lru_cache_1.LRUCache({
    max: 1000, // hottest 1000 URLs
    ttl: 15 * 60 * 1000 // 15 minutes
});
// ------------------------------
// 2. NodeCache for mid-term caching (RAM)
// ------------------------------
const nodeCache = new node_cache_1.default({
    stdTTL: 3600 // 1 hour
});
// ------------------------------
// 3. Upstash Redis (REST mode)
// ------------------------------
let redis = null;
try {
    const redisUrl = (_a = process.env.REDIS_URL) === null || _a === void 0 ? void 0 : _a.trim();
    const redisToken = (_b = process.env.REDIS_TOKEN) === null || _b === void 0 ? void 0 : _b.trim();
    if (redisUrl && redisToken) {
        redis = new redis_1.Redis({
            url: redisUrl,
            token: redisToken
        });
        console.log("🟩 Redis cache initialized");
    }
    else {
        console.log("⚠️ Redis not configured, using in-memory cache only");
    }
}
catch (err) {
    console.warn("⚠️ Redis initialization failed, using in-memory cache only:", err);
}
// ------------------------------
// Helper: Generate cache key
// ------------------------------
function getCacheKey(url, type = "info") {
    const encoded = Buffer.from(url).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
    return `${type}:${encoded}`;
}
// ------------------------------
// Get from cache (LRU → NodeCache → Redis)
// ------------------------------
async function get(url, type = "info") {
    const key = getCacheKey(url, type);
    // 1. LRU Cache
    const entry = memoryLRU.get(key);
    if (entry && entry.expires_at > Date.now()) {
        return entry.metadata;
    }
    // 2. NodeCache
    const nc = nodeCache.get(key);
    if (nc && nc.expires_at > Date.now()) {
        memoryLRU.set(key, nc); // promote
        return nc.metadata;
    }
    // 3. Redis
    if (redis) {
        try {
            const re = await redis.get(key);
            if (re && re.expires_at > Date.now()) {
                nodeCache.set(key, re);
                memoryLRU.set(key, re);
                return re.metadata;
            }
        }
        catch (err) {
            console.warn("Redis get error:", err);
        }
    }
    return null;
}
// ------------------------------
// Set cache (writes to all layers)
// ------------------------------
async function set(url, data, type = "info", ttl = 3600) {
    const key = getCacheKey(url, type);
    const expires = Date.now() + ttl * 1000;
    const entry = {
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
        }
        catch (err) {
            console.warn("Redis set error:", err);
        }
    }
}
// ------------------------------
// Track download URLs
// ------------------------------
async function setDownloadUrl(url, itag, downloadUrl, expiresIn = 3600) {
    const key = getCacheKey(url, "download");
    const expires = Date.now() + expiresIn * 1000;
    const existing = await get(url, "download");
    const entry = {
        id: key,
        metadata: (existing === null || existing === void 0 ? void 0 : existing.metadata) || {},
        direct_urls: {
            ...existing === null || existing === void 0 ? void 0 : existing.direct_urls,
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
        }
        catch (err) {
            console.warn("Redis set error:", err);
        }
    }
}
// ------------------------------
// Retrieve download URL
// ------------------------------
async function getDownloadUrl(url, itag) {
    var _a;
    const entry = await get(url, "download");
    if ((_a = entry === null || entry === void 0 ? void 0 : entry.direct_urls) === null || _a === void 0 ? void 0 : _a[itag]) {
        if (entry.expires_at > Date.now()) {
            return entry.direct_urls[itag];
        }
    }
    return null;
}
// ------------------------------
// Utilities
// ------------------------------
async function has(url, type = "info") {
    const key = getCacheKey(url, type);
    if (memoryLRU.has(key)) {
        const e = memoryLRU.get(key);
        return e ? e.expires_at > Date.now() : false;
    }
    const e2 = nodeCache.get(key);
    if (e2)
        return e2.expires_at > Date.now();
    if (redis) {
        try {
            const e3 = await redis.get(key);
            return e3 ? e3.expires_at > Date.now() : false;
        }
        catch {
            return false;
        }
    }
    return false;
}
async function del(url, type = "info") {
    const key = getCacheKey(url, type);
    memoryLRU.delete(key);
    nodeCache.del(key);
    if (redis) {
        try {
            await redis.del(key);
        }
        catch { }
    }
}
function clear() {
    memoryLRU.clear();
    nodeCache.flushAll();
}
function getStats() {
    return {
        lruSize: memoryLRU.size,
        nodeCacheSize: nodeCache.keys().length,
        redisConnected: redis !== null
    };
}
