import { Request, Response, NextFunction } from "express";

/**
 * Cloudflare cache-ready headers middleware
 * Sets appropriate cache headers for Cloudflare CDN
 */
export function cacheHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Let Cloudflare handle caching
  const path = req.path;
  
  if (path === "/health" || path === "/") {
    // Health check - cache for 30 seconds
    res.setHeader("Cache-Control", "public, max-age=30");
    res.setHeader("CF-Cache-Status", "DYNAMIC");
  } else if (path === "/info" || path === "/download" || path === "/multi") {
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
export function setCachePurge(req: Request, res: Response, next: NextFunction): void {
  // Add purge header if needed (requires Cloudflare API)
  if (req.headers["x-purge-cache"] === "true") {
    res.setHeader("X-Purge-Cache", "true");
  }
  next();
}
