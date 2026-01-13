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
    const itag = req.query.itag;
    if (!videoUrl || !itag) {
        return res.status(400).json({
            status: "error",
            error: "URL & itag required",
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
        const cachedUrl = await (0, cache_1.getDownloadUrl)(videoUrl, itag);
        if (cachedUrl) {
            const cacheTime = Date.now() - startTime;
            logger_1.logger.debug(`[${requestId}] Cache hit - ${cacheTime}ms`);
            return res.json({
                status: "ok",
                downloadUrl: cachedUrl,
                requestId,
                cached: true,
                responseTime: cacheTime,
            });
        }
        // Fetch from yt-dlp
        const mergedUrl = await (0, ytdlp_1.fetchMergedMP4)(videoUrl, itag);
        const responseTime = Date.now() - startTime;
        logger_1.logger.info(`[${requestId}] Download URL fetched - ${responseTime}ms`);
        res.json({
            status: "ok",
            downloadUrl: mergedUrl,
            requestId,
            cached: false,
            responseTime,
        });
    }
    catch (err) {
        logger_1.logger.error(`[${requestId}] Download fetch error:`, err);
        res.status(500).json({
            status: "error",
            error: "Failed to generate download link",
            message: err.message || "Unknown error",
            requestId,
        });
    }
});
exports.default = router;
