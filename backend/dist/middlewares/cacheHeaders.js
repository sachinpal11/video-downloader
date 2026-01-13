"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheHeadersMiddleware = cacheHeadersMiddleware;
exports.setCachePurge = setCachePurge;
/**
 * Cloudflare cache-ready headers middleware
 * Sets appropriate cache headers for Cloudflare CDN
 */
function cacheHeadersMiddleware(req, res, next) {
    // Let Cloudflare handle caching
    const path = req.path;
    if (path === "/health" || path === "/") {
        // Health check - cache for 30 seconds
        res.setHeader("Cache-Control", "public, max-age=30");
        res.setHeader("CF-Cache-Status", "DYNAMIC");
    }
    else if (path === "/info" || path === "/download" || path === "/multi") {
        // API responses - cache for 1 hour at CDN, 15 minutes at browser
        res.setHeader("Cache-Control", "public, max-age=900, s-maxage=3600");
        res.setHeader("CF-Cache-Status", "DYNAMIC");
        // Vary by query parameters
        res.setHeader("Vary", "Accept-Encoding");
    }
    next();
}
/**
 * Set Cloudflare cache purge headers (for testing)
 */
function setCachePurge(req, res, next) {
    // Add purge header if needed (requires Cloudflare API)
    if (req.headers["x-purge-cache"] === "true") {
        res.setHeader("X-Purge-Cache", "true");
    }
    next();
}
