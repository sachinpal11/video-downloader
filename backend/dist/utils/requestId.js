"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = generateRequestId;
exports.getRequestId = getRequestId;
const uuid_1 = require("uuid");
/**
 * Generate unique request ID for tracking and DMCA compliance
 */
function generateRequestId() {
    return (0, uuid_1.v4)();
}
/**
 * Extract request ID from headers or generate new one
 */
function getRequestId(req) {
    return req.headers["x-request-id"] ||
        req.headers["cf-ray"] ||
        generateRequestId();
}
