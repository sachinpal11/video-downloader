import { Request, Response, NextFunction } from "express";
import { getRequestId } from "../utils/requestId";
import { logger } from "../utils/logger";

/**
 * Security middleware
 * - Generates request IDs
 * - Removes sensitive data from logs
 * - Adds security headers
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate request ID
  const requestId = getRequestId(req);
  req.headers["x-request-id"] = requestId;
  
  // Add security headers
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Remove sensitive data from logs
  const sanitizedUrl = req.query.url ? "[REDACTED]" : req.url;
  logger.info(`[${requestId}] ${req.method} ${sanitizedUrl}`);

  next();
}

/**
 * DMCA notice middleware
 * Adds DMCA compliance headers
 */
export function dmcaMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-DMCA-Notice", "This service respects intellectual property rights. Report violations via DMCA.");
  next();
}
