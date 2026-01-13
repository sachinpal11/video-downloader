"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmDaemon = void 0;
const child_process_1 = require("child_process");
const ytdlp_1 = require("./ytdlp");
const logger_1 = require("../utils/logger");
exports.warmDaemon = {
    process: null,
    alive: false,
    start() {
        if (this.process)
            return;
        logger_1.logger.info("🔥 Daemon warm: Initializing...");
        // Windows-safe: detached:false and windowsHide:true
        const child = (0, child_process_1.spawn)(ytdlp_1.ytdlpPath, ["--extractor-warmup"], {
            detached: false,
            stdio: "ignore",
            windowsHide: true
        });
        this.process = child;
        this.alive = true;
        // Allow background execution without blocking event loop
        try {
            child.unref();
        }
        catch (_) {
            // ignore on Windows if unref() is restricted
        }
        logger_1.logger.info("✅ yt-dlp warm daemon initialized");
        child.on("exit", (code) => {
            this.alive = false;
            logger_1.logger.warn(`⚠️ Warm daemon exited (code: ${code})`);
        });
        child.on("error", (err) => {
            this.alive = false;
            logger_1.logger.error("🔥 Warm daemon error:", err);
        });
    },
    markActivity() {
        // Keep daemon warm — Windows needs no-op
    }
};
