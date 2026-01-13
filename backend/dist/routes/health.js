"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const warmDaemon_1 = require("../services/warmDaemon");
const cache_1 = require("../services/cache");
const logger_1 = require("../utils/logger");
const requestId_1 = require("../utils/requestId");
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    const requestId = (0, requestId_1.getRequestId)(_req);
    const startTime = process.uptime();
    try {
        const cacheStats = (0, cache_1.getStats)();
        const daemonStatus = warmDaemon_1.warmDaemon.isWarm();
        res.json({
            status: "ok",
            requestId,
            uptime: Math.floor(startTime),
            daemon: {
                warm: daemonStatus,
                binary: warmDaemon_1.warmDaemon.getBinaryPath(),
            },
            cache: {
                lru: cacheStats.lruSize,
                nodeCache: cacheStats.nodeCacheSize,
                redis: cacheStats.redisConnected ? "connected" : "disconnected",
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        logger_1.logger.error(`[${requestId}] Health check error:`, err);
        res.status(500).json({
            status: "error",
            error: "Health check failed",
            requestId,
        });
    }
});
exports.default = router;
