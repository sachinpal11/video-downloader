"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
exports.getRateLimitConfig = getRateLimitConfig;
const cache_1 = require("../services/cache");
const logger_1 = require("../utils/logger");
const requestId_1 = require("../utils/requestId");
/**
 * Rate limiting middleware
 * Uses Redis + in-memory cache for distributed rate limiting
 */
function rateLimit(options) {
    const { windowMs, maxRequests, skipSuccessfulRequests = false, skipFailedRequests = false, } = options;
    return async (req, res, next) => {
        const requestId = (0, requestId_1.getRequestId)(req);
        const identifier = req.ip || req.headers["cf-connecting-ip"] || "unknown";
        const cacheKey = `rate_limit:${identifier}`;
        try {
            const cached = await (0, cache_1.get)(cacheKey, "info");
            const now = Date.now();
            if (cached && cached.resetAt > now) {
                // Window still active
                if (cached.count >= maxRequests) {
                    logger_1.logger.warn(`[${requestId}] Rate limit exceeded for ${identifier}`);
                    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
                    res.setHeader("X-RateLimit-Remaining", "0");
                    res.setHeader("X-RateLimit-Reset", new Date(cached.resetAt).toISOString());
                    res.setHeader("Retry-After", Math.ceil((cached.resetAt - now) / 1000).toString());
                    return res.status(429).json({
                        status: "error",
                        error: "Too many requests",
                        retryAfter: Math.ceil((cached.resetAt - now) / 1000),
                        requestId,
                    });
                }
                // Increment count
                await (0, cache_1.set)(cacheKey, {
                    count: cached.count + 1,
                    resetAt: cached.resetAt,
                }, "info", Math.ceil((cached.resetAt - now) / 1000));
                res.setHeader("X-RateLimit-Limit", maxRequests.toString());
                res.setHeader("X-RateLimit-Remaining", (maxRequests - cached.count - 1).toString());
                res.setHeader("X-RateLimit-Reset", new Date(cached.resetAt).toISOString());
            }
            else {
                // New window
                const resetAt = now + windowMs;
                await (0, cache_1.set)(cacheKey, {
                    count: 1,
                    resetAt,
                }, "info", Math.ceil(windowMs / 1000));
                res.setHeader("X-RateLimit-Limit", maxRequests.toString());
                res.setHeader("X-RateLimit-Remaining", (maxRequests - 1).toString());
                res.setHeader("X-RateLimit-Reset", new Date(resetAt).toISOString());
            }
            next();
        }
        catch (err) {
            logger_1.logger.error(`[${requestId}] Rate limit error:`, err);
            // Fail open - allow request if rate limiting fails
            next();
        }
    };
}
/**
 * Rate limit configuration from environment
 */
function getRateLimitConfig() {
    return rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute default
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10), // 100 requests/min default
    });
}
