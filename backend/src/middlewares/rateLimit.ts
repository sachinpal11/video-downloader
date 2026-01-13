import { Request, Response, NextFunction } from "express";
import { get as getCache, set as setCache } from "../services/cache";
import { logger } from "../utils/logger";
import { getRequestId } from "../utils/requestId";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiting middleware
 * Uses Redis + in-memory cache for distributed rate limiting
 */
export function rateLimit(options: RateLimitOptions) {
  const { 
    windowMs, 
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const identifier = req.ip || req.headers["cf-connecting-ip"] || "unknown";
    const cacheKey = `rate_limit:${identifier}`;
    
    try {
      const cached = await getCache<{ count: number; resetAt: number }>(cacheKey, "info");
      const now = Date.now();
      
      if (cached && cached.resetAt > now) {
        // Window still active
        if (cached.count >= maxRequests) {
          logger.warn(`[${requestId}] Rate limit exceeded for ${identifier}`);
          
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
        await setCache(cacheKey, {
          count: cached.count + 1,
          resetAt: cached.resetAt,
        }, "info", Math.ceil((cached.resetAt - now) / 1000));
        
        res.setHeader("X-RateLimit-Limit", maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", (maxRequests - cached.count - 1).toString());
        res.setHeader("X-RateLimit-Reset", new Date(cached.resetAt).toISOString());
      } else {
        // New window
        const resetAt = now + windowMs;
        await setCache(cacheKey, {
          count: 1,
          resetAt,
        }, "info", Math.ceil(windowMs / 1000));
        
        res.setHeader("X-RateLimit-Limit", maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", (maxRequests - 1).toString());
        res.setHeader("X-RateLimit-Reset", new Date(resetAt).toISOString());
      }
      
      next();
    } catch (err) {
      logger.error(`[${requestId}] Rate limit error:`, err);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Rate limit configuration from environment
 */
export function getRateLimitConfig() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute default
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10), // 100 requests/min default
  });
}
