"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ytdlpPath = void 0;
exports.fetchVideoInfo = fetchVideoInfo;
exports.fetchDirectURL = fetchDirectURL;
exports.fetchMultipleURLs = fetchMultipleURLs;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const warmDaemon_1 = require("./warmDaemon");
const cache_1 = require("./cache");
const detector_1 = require("./detector");
const logger_1 = require("../utils/logger");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const fs_1 = __importDefault(require("fs"));
// STATIC BINARY PATH - Check multiple possible locations
function findYtdlpBinary() {
    const possiblePaths = [
        path_1.default.join(process.cwd(), "yt-dlp", "yt-dlp.exe"), // Windows in yt-dlp folder
        path_1.default.join(process.cwd(), "yt-dlp", "yt-dlp"), // Linux in yt-dlp folder
        path_1.default.join(process.cwd(), "yt-dlp.exe"), // Windows in root
        path_1.default.join(process.cwd(), "yt-dlp"), // Linux in root
        "yt-dlp", // System PATH
    ];
    for (const binPath of possiblePaths) {
        if (binPath === "yt-dlp") {
            return binPath; // System PATH - let spawn handle it
        }
        try {
            if (fs_1.default.existsSync(binPath)) {
                return binPath;
            }
        }
        catch {
            continue;
        }
    }
    // Fallback to system PATH
    return "yt-dlp";
}
exports.ytdlpPath = findYtdlpBinary();
// ==========================
// GET VIDEO INFO (FAST)
// ==========================
async function fetchVideoInfo(videoUrl) {
    warmDaemon_1.warmDaemon.markActivity();
    const cached = await (0, cache_1.get)(videoUrl, "info");
    if (cached)
        return cached;
    try {
        const { stdout } = await execPromise(`"${exports.ytdlpPath}" -J --no-warnings --no-check-certificate "${videoUrl}"`);
        const info = JSON.parse(stdout);
        const formats = info.formats || [];
        const qualities = [];
        // progressive first
        const progressive = formats.filter((f) => f.acodec !== "none" && f.vcodec !== "none");
        progressive.forEach((f) => {
            if (f.height) {
                qualities.push({
                    itag: f.format_id,
                    quality: `${f.height}p`,
                    size: f.filesize || f.filesize_approx || null
                });
            }
        });
        // audio
        const audio = formats.filter((f) => f.acodec !== "none" && f.vcodec === "none");
        const audioFormat = audio.find((a) => a.format_id === "140") || audio[0];
        if (audioFormat) {
            qualities.push({
                itag: audioFormat.format_id,
                quality: "audio",
                size: audioFormat.filesize || audioFormat.filesize_approx || null
            });
        }
        const data = {
            status: "ok",
            platform: (0, detector_1.detectPlatform)(videoUrl),
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            channel: info.channel || info.uploader,
            qualities
        };
        await (0, cache_1.set)(videoUrl, data, "info", 3600);
        return data;
    }
    catch (err) {
        logger_1.logger.error("Video info error:", err);
        throw err;
    }
}
// ==========================
// DIRECT DOWNLOAD URL
// ==========================
async function fetchDirectURL(videoUrl, itag) {
    warmDaemon_1.warmDaemon.markActivity();
    itag = itag.trim(); // FIX NEWLINE BUG
    const cached = await (0, cache_1.getDownloadUrl)(videoUrl, itag);
    if (cached)
        return cached;
    try {
        const command = `"${exports.ytdlpPath}" -f ${itag} --get-url --no-warnings --no-check-certificate "${videoUrl}"`;
        const { stdout } = await execPromise(command);
        const directUrl = stdout.trim().split("\n")[0];
        const ttl = directUrl.includes("googlevideo.com") ? 14400 : 3600;
        await (0, cache_1.setDownloadUrl)(videoUrl, itag, directUrl, ttl);
        return directUrl;
    }
    catch (err) {
        logger_1.logger.error("Direct URL fetch failed:", err);
        throw err;
    }
}
async function fetchMultipleURLs(videoUrl) {
    const { stdout } = await execPromise(`"${exports.ytdlpPath}" -J --no-warnings --no-check-certificate "${videoUrl}"`);
    const info = JSON.parse(stdout);
    const items = info.entries || [info];
    const results = await Promise.all(items.map(async (item) => {
        const { stdout } = await execPromise(`"${exports.ytdlpPath}" --get-url -f best "${item.webpage_url}"`);
        return {
            title: item.title,
            thumbnail: item.thumbnail,
            url: stdout.trim().split("\n")[0]
        };
    }));
    return {
        status: "ok",
        platform: (0, detector_1.detectPlatform)(videoUrl),
        items: results
    };
}
