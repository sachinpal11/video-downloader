import { Router, Request, Response } from "express";
// import { warmDaemon } from "../services/warmDaemon";
import { ytdlpPath } from "../services/ytdlp";
import { getStats } from "../services/cache";
import { logger } from "../utils/logger";
import { getRequestId } from "../utils/requestId";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const requestId = getRequestId(_req);
  const startTime = process.uptime();

  try {
    const cacheStats = getStats();

    res.json({
      status: "ok",
      requestId,
      uptime: Math.floor(startTime),


      cache: {
        lru: cacheStats.lruSize,
        nodeCache: cacheStats.nodeCacheSize,
        redis: cacheStats.redisConnected ? "connected" : "disconnected",
      },

      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    logger.error(`[${requestId}] Health check error:`, err);

    res.status(500).json({
      status: "error",
      error: "Health check failed",
      requestId,
    });
  }
});

export default router;
