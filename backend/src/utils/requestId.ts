import { v4 as uuidv4 } from "uuid";

/**
 * Generate unique request ID for tracking and DMCA compliance
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Extract request ID from headers or generate new one
 */
export function getRequestId(req: any): string {
  return req.headers["x-request-id"] || 
         req.headers["cf-ray"] || 
         generateRequestId();
}
