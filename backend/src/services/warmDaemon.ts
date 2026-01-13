import { spawn, ChildProcess } from "child_process";
import { ytdlpPath, cookieFlag } from "./ytdlp";
import { logger } from "../utils/logger";

export const warmDaemon = {
  process: null as ChildProcess | null,
  lastUse: Date.now(),
  restartInterval: 10 * 60 * 1000, // 10 minutes
  checkTimer: null as NodeJS.Timeout | null,

  start() {
    if (this.process) return;

    logger.info("🔥 Warming yt-dlp... (extractors preloading)");

    const args = [
      "--extractor-warmup",
      "--no-warnings",
      "--no-check-certificate",
      ...cookieFlag.split(" ").filter(Boolean)
    ];

    const child = spawn(ytdlpPath, args, {
      detached: false,
      stdio: "ignore",
      windowsHide: true
    });

    this.process = child;
    this.lastUse = Date.now();

    try { child.unref(); } catch {}

    logger.info("✅ yt-dlp warm daemon active");

    // Auto-respawn if yt-dlp crashes
    child.on("exit", (code) => {
      logger.warn(`⚠️ Warm daemon crashed (code ${code})`);
      this.process = null;
      setTimeout(() => this.start(), 1000);
    });

    child.on("error", (err) => {
      logger.error("🔥 Warm daemon error:", err);
      this.process = null;
    });

    // Start health monitor
    this.startMonitor();
  },

  // Called on every API request
  markActivity() {
    this.lastUse = Date.now();

    // If somehow daemon died, restart instantly
    if (!this.process) {
      this.start();
    }
  },

  // Background monitor to refresh yt-dlp every 10 min
  startMonitor() {
    if (this.checkTimer) return;

    this.checkTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastUse;

      // Restart to keep yt-dlp hot & prevent memory leak
      if (idleTime > this.restartInterval) {
        logger.info("♻️ Restarting warm daemon (10 min refresh)");

        if (this.process) {
          try { this.process.kill("SIGKILL"); } catch {}
        }

        this.process = null;
        this.start();
      }
    }, 30_000); // check every 30 seconds
  }
};
