"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchVideoInfo = fetchVideoInfo;
exports.fetchMergedMP4 = fetchMergedMP4;
exports.fetchMultipleURLs = fetchMultipleURLs;
const yt_dlp_exec_1 = __importDefault(require("yt-dlp-exec"));
const warmDaemon_1 = require("./warmDaemon");
const cache_1 = require("./cache");
const logger_1 = require("../utils/logger");
const detector_1 = require("./detector");
// Pre-mapped common YouTube itags for instant resolution
const COMMON_ITAGS = {
    "1080p": ["137", "248", "399"],
    "720p": ["136", "247", "398"],
    "480p": ["135", "244", "397"],
    "360p": ["134", "243", "396"],
    "240p": ["133", "242", "395"],
    "144p": ["160", "278"],
};
const AUDIO_ITAG = "140"; // Best audio itag
/**
 * Fast format resolution - avoids calling -F unless necessary
 */
function resolveCommonItag(quality) {
    const normalized = quality.toLowerCase().replace("p", "");
    const itags = COMMON_ITAGS[`${normalized}p`] || COMMON_ITAGS[quality];
    return itags ? itags[0] : null;
}
/**
 * Extract video ID for caching
 */
function extractVideoId(url) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
}
/**
 * Fetch video info with caching and optimization
 */
async function fetchVideoInfo(videoUrl) {
    warmDaemon_1.warmDaemon.markActivity();
    // Check cache first
    const cached = await (0, cache_1.get)(videoUrl, "info");
    if (cached) {
        logger_1.logger.debug("Cache hit for video info:", videoUrl);
        return cached;
    }
    try {
        const platform = (0, detector_1.detectPlatform)(videoUrl);
        logger_1.logger.debug(`Fetching info for ${platform}:`, videoUrl);
        const info = await (0, yt_dlp_exec_1.default)(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
        });
        // Extract qualities - optimize for common formats
        const videoFormats = info.formats.filter((f) => f.ext === "mp4" && f.height && f.vcodec !== "none");
        const audioFormats = info.formats.filter((f) => f.ext === "mp4" || f.ext === "m4a" && f.acodec !== "none");
        const qualities = videoFormats
            .map((f) => ({
            itag: f.format_id,
            quality: `${f.height}p`,
            size: f.filesize || f.filesize_approx || null,
        }))
            .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
        // Add audio-only option
        if (audioFormats.length > 0) {
            const bestAudio = audioFormats.find((f) => f.format_id === AUDIO_ITAG) || audioFormats[0];
            qualities.push({
                itag: bestAudio.format_id,
                quality: "audio",
                size: bestAudio.filesize || bestAudio.filesize_approx || null,
            });
        }
        const responseData = {
            status: "ok",
            platform,
            title: info.title,
            thumbnail: info.thumbnail,
            channel: info.channel || info.uploader || null,
            duration: info.duration,
            qualities,
            videoId: extractVideoId(videoUrl),
        };
        // Cache for 1 hour
        await (0, cache_1.set)(videoUrl, responseData, "info", 3600);
        return responseData;
    }
    catch (err) {
        logger_1.logger.error("Failed to fetch video info:", err);
        throw err;
    }
}
/**
 * Fetch merged MP4 URL with caching and expiry detection
 */
async function fetchMergedMP4(videoUrl, itag) {
    warmDaemon_1.warmDaemon.markActivity();
    // Check cache first
    const cachedUrl = await (0, cache_1.getDownloadUrl)(videoUrl, itag);
    if (cachedUrl) {
        // Validate URL is still valid (Google Video URLs expire)
        const isGoogleVideo = cachedUrl.includes("googlevideo.com");
        const cachedEntry = await (0, cache_1.get)(videoUrl, "download");
        const urlAge = Date.now() - ((cachedEntry === null || cachedEntry === void 0 ? void 0 : cachedEntry.cached_at) || 0);
        // Google Video URLs expire after ~6 hours, but be safe and refresh after 4 hours
        if (isGoogleVideo && urlAge > 4 * 60 * 60 * 1000) {
            logger_1.logger.debug("Cached URL expired, regenerating:", videoUrl);
            // Continue to regenerate below
        }
        else {
            logger_1.logger.debug("Cache hit for download URL:", videoUrl);
            return cachedUrl;
        }
    }
    try {
        const platform = (0, detector_1.detectPlatform)(videoUrl);
        logger_1.logger.debug(`Fetching download URL for ${platform}:`, videoUrl, "itag:", itag);
        // Fast path: Use common itag if available
        const commonItag = resolveCommonItag(itag);
        const formatSpec = commonItag
            ? `${commonItag}+${AUDIO_ITAG}` // VIDEO + AUDIO merge
            : `${itag}+${AUDIO_ITAG}`;
        const mergedUrl = (await (0, yt_dlp_exec_1.default)(videoUrl, {
            getUrl: true,
            format: formatSpec,
            mergeOutputFormat: "mp4",
            noWarnings: true,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
        }));
        // Cache with appropriate TTL based on platform
        const ttl = platform === "youtube" ? 14400 : 3600; // 4 hours for YouTube, 1 hour for others
        await (0, cache_1.setDownloadUrl)(videoUrl, itag, mergedUrl, ttl);
        return mergedUrl;
    }
    catch (err) {
        logger_1.logger.error("Failed to fetch merged MP4:", err);
        throw err;
    }
}
/**
 * Fetch multiple download URLs (for multi-video platforms)
 */
async function fetchMultipleURLs(videoUrl) {
    warmDaemon_1.warmDaemon.markActivity();
    // Check cache
    const cached = await (0, cache_1.get)(videoUrl, "multi");
    if (cached) {
        logger_1.logger.debug("Cache hit for multi URLs:", videoUrl);
        return cached;
    }
    try {
        const info = await (0, yt_dlp_exec_1.default)(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
        });
        // Handle playlists, carousels, albums
        const isPlaylist = info.playlist_index !== undefined;
        const items = isPlaylist
            ? [{ ...info }] // Single item for now, extend for full playlist support
            : [info];
        const results = await Promise.all(items.map(async (item) => {
            try {
                const qualities = item.formats
                    .filter((f) => f.ext === "mp4" && f.height)
                    .map((f) => ({
                    itag: f.format_id,
                    quality: `${f.height}p`,
                    size: f.filesize || f.filesize_approx || null,
                }));
                // Fetch best quality URL
                const bestQuality = qualities[0];
                if (bestQuality) {
                    const downloadUrl = await fetchMergedMP4(videoUrl, bestQuality.itag);
                    return {
                        title: item.title,
                        thumbnail: item.thumbnail,
                        downloadUrl,
                        qualities,
                    };
                }
            }
            catch (err) {
                logger_1.logger.warn("Failed to fetch URL for item:", err);
                return null;
            }
        }));
        const responseData = {
            status: "ok",
            platform: (0, detector_1.detectPlatform)(videoUrl),
            items: results.filter(Boolean),
        };
        // Cache for 1 hour
        await (0, cache_1.set)(videoUrl, responseData, "multi", 3600);
        return responseData;
    }
    catch (err) {
        logger_1.logger.error("Failed to fetch multiple URLs:", err);
        throw err;
    }
}
