"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPlatform = detectPlatform;
exports.isValidUrl = isValidUrl;
exports.extractVideoId = extractVideoId;
exports.requiresAuth = requiresAuth;
function detectPlatform(url) {
    if (!url)
        return "unknown";
    const normalizedUrl = url.toLowerCase();
    // YouTube
    if (normalizedUrl.includes("youtube.com/shorts/") || normalizedUrl.includes("youtu.be/shorts/")) {
        return "youtube_shorts";
    }
    if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) {
        return "youtube";
    }
    // Instagram
    if (normalizedUrl.includes("instagram.com")) {
        return "instagram";
    }
    // TikTok
    if (normalizedUrl.includes("tiktok.com")) {
        return "tiktok";
    }
    // Facebook
    if (normalizedUrl.includes("facebook.com") || normalizedUrl.includes("fb.com")) {
        return "facebook";
    }
    // Twitter/X
    if (normalizedUrl.includes("twitter.com") || normalizedUrl.includes("x.com")) {
        return "twitter";
    }
    // Reddit
    if (normalizedUrl.includes("reddit.com")) {
        return "reddit";
    }
    // Vimeo
    if (normalizedUrl.includes("vimeo.com")) {
        return "vimeo";
    }
    // Streamable
    if (normalizedUrl.includes("streamable.com")) {
        return "streamable";
    }
    // Rumble
    if (normalizedUrl.includes("rumble.com")) {
        return "rumble";
    }
    // DailyMotion
    if (normalizedUrl.includes("dailymotion.com") || normalizedUrl.includes("dai.ly")) {
        return "dailymotion";
    }
    // ShareChat
    if (normalizedUrl.includes("sharechat.com")) {
        return "sharechat";
    }
    // Moj
    if (normalizedUrl.includes("mojapp.in") || normalizedUrl.includes("moj.live")) {
        return "moj";
    }
    // Chingari
    if (normalizedUrl.includes("chingari.io")) {
        return "chingari";
    }
    // LinkedIn
    if (normalizedUrl.includes("linkedin.com")) {
        return "linkedin";
    }
    return "unknown";
}
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return ["http:", "https:"].includes(urlObj.protocol);
    }
    catch {
        return false;
    }
}
function extractVideoId(url, platform) {
    const actualPlatform = platform || detectPlatform(url);
    switch (actualPlatform) {
        case "youtube":
        case "youtube_shorts": {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
            const match = url.match(youtubeRegex);
            return match ? match[1] : null;
        }
        case "tiktok": {
            const tiktokRegex = /tiktok\.com\/.*\/video\/(\d+)/;
            const match = url.match(tiktokRegex);
            return match ? match[1] : null;
        }
        case "instagram": {
            const instagramRegex = /instagram\.com\/(?:p|reel|reels)\/([^\/\?]+)/;
            const match = url.match(instagramRegex);
            return match ? match[1] : null;
        }
        default:
            return null;
    }
}
/**
 * Check if platform requires cookies/authentication
 */
function requiresAuth(platform) {
    return ["instagram"].includes(platform); // Extend as needed
}
