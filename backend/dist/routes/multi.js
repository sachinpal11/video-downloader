"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytdlp_1 = require("../services/ytdlp");
const logger_1 = require("../utils/logger");
const requestId_1 = require("../utils/requestId");
const detector_1 = require("../services/detector");
const cache_1 = require("../services/cache");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    const requestId = (0, requestId_1.getRequestId)(req);
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({
            status: "error",
            error: "URL is required",
            requestId,
        });
    }
    if (!(0, detector_1.isValidUrl)(videoUrl)) {
        return res.status(400).json({
            status: "error",
            error: "Invalid URL format",
            requestId,
        });
    }
    try {
        const startTime = Date.now();
        // Check cache first
        const cached = await (0, cache_1.get)(videoUrl, "multi");
        if (cached) {
            const cacheTime = Date.now() - startTime;
            logger_1.logger.debug(`[${requestId}] Cache hit - ${cacheTime}ms`);
            return res.json({
                ...cached,
                requestId,
                cached: true,
                responseTime: cacheTime,
            });
        }
        // Fetch from yt-dlp
        const result = await (0, ytdlp_1.fetchMultipleURLs)(videoUrl);
        const responseTime = Date.now() - startTime;
        logger_1.logger.info(`[${requestId}] Multi URLs fetched - ${responseTime}ms`);
        res.json({
            ...result,
            requestId,
            cached: false,
            responseTime,
        });
    }
    catch (err) {
        logger_1.logger.error(`[${requestId}] Multi fetch error:`, err);
        res.status(500).json({
            status: "error",
            error: "Failed to fetch multiple URLs",
            message: err.message || "Unknown error",
            requestId,
        });
    }
});
exports.default = router;
