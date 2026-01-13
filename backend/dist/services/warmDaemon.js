"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmDaemon = void 0;
const child_process_1 = require("child_process");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class WarmDaemonService {
    constructor() {
        this.daemon = {
            isWarm: false,
            process: null,
            lastActivity: 0,
        };
        this.keepAliveInterval = 30000; // 30 seconds
        this.keepAliveTimer = null;
        // Detect yt-dlp binary location
        const possiblePaths = [
            path_1.default.join(process.cwd(), "yt-dlp", "yt-dlp"),
            path_1.default.join(process.cwd(), "yt-dlp", "yt-dlp.exe"),
            path_1.default.join(process.cwd(), "yt-dlp_linux"),
            path_1.default.join(process.cwd(), "yt-dlp.exe"),
            "yt-dlp", // system PATH
        ];
        this.ytdlpPath = possiblePaths.find((p) => {
            try {
                return fs_1.default.existsSync(p) || p === "yt-dlp";
            }
            catch {
                return p === "yt-dlp";
            }
        }) || "yt-dlp";
        this.initialize();
    }
    async initialize() {
        try {
            await this.preWarm();
            await this.preCacheExtractors();
            this.startKeepAlive();
            logger_1.logger.info("✅ yt-dlp warm daemon initialized");
        }
        catch (err) {
            logger_1.logger.error("Failed to initialize warm daemon:", err);
        }
    }
    /**
     * Pre-warm yt-dlp by running a simulation
     */
    async preWarm() {
        return new Promise((resolve, reject) => {
            const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
            const process = (0, child_process_1.spawn)(this.ytdlpPath, [
                "--simulate",
                "--skip-download",
                "--no-warnings",
                "--no-check-certificate",
                testUrl,
            ]);
            process.on("close", (code) => {
                if (code === 0 || code === null) {
                    this.daemon.isWarm = true;
                    this.daemon.lastActivity = Date.now();
                    resolve();
                }
                else {
                    reject(new Error(`Pre-warm failed with code ${code}`));
                }
            });
            process.on("error", reject);
            process.stderr.on("data", () => { }); // Suppress stderr
            process.stdout.on("data", () => { }); // Suppress stdout
        });
    }
    /**
     * Pre-cache extractor data
     */
    async preCacheExtractors() {
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(this.ytdlpPath, [
                "--list-extractors",
                "--no-warnings",
            ]);
            let output = "";
            process.stdout.on("data", (data) => {
                output += data.toString();
            });
            process.on("close", (code) => {
                if (code === 0 || code === null) {
                    logger_1.logger.info(`✅ Pre-cached ${output.split("\n").length} extractors`);
                    resolve();
                }
                else {
                    reject(new Error(`Extractor list failed with code ${code}`));
                }
            });
            process.on("error", reject);
        });
    }
    /**
     * Keep daemon warm with periodic activity
     */
    startKeepAlive() {
        this.keepAliveTimer = setInterval(() => {
            const timeSinceLastActivity = Date.now() - this.daemon.lastActivity;
            // Re-warm if inactive for more than 2 minutes
            if (timeSinceLastActivity > 120000) {
                this.preWarm().catch((err) => {
                    logger_1.logger.warn("Keep-alive re-warm failed:", err);
                });
            }
        }, this.keepAliveInterval);
    }
    /**
     * Update last activity timestamp
     */
    markActivity() {
        this.daemon.lastActivity = Date.now();
    }
    /**
     * Check if daemon is warm
     */
    isWarm() {
        return this.daemon.isWarm;
    }
    /**
     * Get yt-dlp binary path
     */
    getBinaryPath() {
        return this.ytdlpPath;
    }
    /**
     * Cleanup on shutdown
     */
    shutdown() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }
        if (this.daemon.process) {
            this.daemon.process.kill();
            this.daemon.process = null;
        }
        logger_1.logger.info("🛑 Warm daemon shutdown");
    }
}
exports.warmDaemon = new WarmDaemonService();
