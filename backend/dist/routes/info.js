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
        const cached = await (0, cache_1.get)(videoUrl, "info");
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
        const info = await (0, ytdlp_1.fetchVideoInfo)(videoUrl);
        const responseTime = Date.now() - startTime;
        logger_1.logger.info(`[${requestId}] Info fetched - ${responseTime}ms`);
        res.json({
            ...info,
            requestId,
            cached: false,
            responseTime,
        });
    }
    catch (err) {
        logger_1.logger.error(`[${requestId}] Info fetch error:`, err);
        res.status(500).json({
            status: "error",
            error: "Failed to fetch video metadata",
            message: err.message || "Unknown error",
            requestId,
        });
    }
});
exports.default = router;
