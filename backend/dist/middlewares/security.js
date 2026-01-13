"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMiddleware = securityMiddleware;
exports.dmcaMiddleware = dmcaMiddleware;
const requestId_1 = require("../utils/requestId");
const logger_1 = require("../utils/logger");
/**
 * Security middleware
 * - Generates request IDs
 * - Removes sensitive data from logs
 * - Adds security headers
 */
function securityMiddleware(req, res, next) {
    // Generate request ID
    const requestId = (0, requestId_1.getRequestId)(req);
    req.headers["x-request-id"] = requestId;
    // Add security headers
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Remove sensitive data from logs
    const sanitizedUrl = req.query.url ? "[REDACTED]" : req.url;
    logger_1.logger.info(`[${requestId}] ${req.method} ${sanitizedUrl}`);
    next();
}
/**
 * DMCA notice middleware
 * Adds DMCA compliance headers
 */
function dmcaMiddleware(req, res, next) {
    res.setHeader("X-DMCA-Notice", "This service respects intellectual property rights. Report violations via DMCA.");
    next();
}
