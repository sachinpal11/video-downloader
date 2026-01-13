import { spawn, ChildProcess } from "child_process";
import { ytdlpPath } from "./ytdlp";
import { logger } from "../utils/logger";

export const warmDaemon = {
  process: null as ChildProcess | null,
  alive: false,

  start() {
    if (this.process) return;

    logger.info("🔥 Daemon warm: Initializing...");

    // Windows-safe: detached:false and windowsHide:true
    const child = spawn(ytdlpPath, ["--extractor-warmup"], {
      detached: false,
      stdio: "ignore",
      windowsHide: true
    });

    this.process = child;
    this.alive = true;

    // Allow background execution without blocking event loop
    try {
      child.unref();
    } catch (_) {
      // ignore on Windows if unref() is restricted
    }

    logger.info("✅ yt-dlp warm daemon initialized");

    child.on("exit", (code) => {
      this.alive = false;
      logger.warn(`⚠️ Warm daemon exited (code: ${code})`);
    });

    child.on("error", (err: Error) => {
      this.alive = false;
      logger.error("🔥 Warm daemon error:", err);
    });
  },

  markActivity() {
    // Keep daemon warm — Windows needs no-op
  }
};
