import { spawn } from "child_process";
import path from "path";
import { ytdlpPath } from "./ytdlp";
import { logger } from "../utils/logger";

export const warmDaemon = {
  process: null as any,
  alive: false,

  start() {
    if (this.process) return;

    logger.info("🔥 Daemon warm: Initializing...");

    this.process = spawn(ytdlpPath, ["--extractor-warmup"], {
      detached: true,
      stdio: "ignore"
    });

    this.alive = true;

    logger.info("✅ yt-dlp warm daemon initialized");

    this.process.on("exit", () => {
      this.alive = false;
      logger.warn("⚠️ Warm daemon exited");
    });

    this.process.on("error", (err:Error) => {
      logger.error("🔥 Warm daemon error:", err);
    });
  },

  markActivity() {
    // keep-alive hook
  }
};
