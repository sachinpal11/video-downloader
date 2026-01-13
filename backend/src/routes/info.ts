import { Router, Request, Response } from "express";
import { fetchVideoInfo } from "../services/ytdlp";
import { logger } from "../utils/logger";
import { getRequestId } from "../utils/requestId";
import { isValidUrl } from "../services/detector";
import { get as getCache } from "../services/cache";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const videoUrl = req.query.url as string;
  
  if (!videoUrl) {
    return res.status(400).json({
      status: "error",
      error: "URL is required",
      requestId,
    });
  }

  if (!isValidUrl(videoUrl)) {
    return res.status(400).json({
      status: "error",
      error: "Invalid URL format",
      requestId,
    });
  }

  try {
    const startTime = Date.now();
    
    // Check cache first
    const cached = await getCache<any>(videoUrl, "info");
    if (cached) {
      const cacheTime = Date.now() - startTime;
      logger.debug(`[${requestId}] Cache hit - ${cacheTime}ms`);
      
      return res.json({
        ...cached,
        requestId,
        cached: true,
        responseTime: cacheTime,
      });
    }

    // Fetch from yt-dlp
    const info = await fetchVideoInfo(videoUrl);
    const responseTime = Date.now() - startTime;
    
    logger.info(`[${requestId}] Info fetched - ${responseTime}ms`);

    res.json({
      ...info,
      requestId,
      cached: false,
      responseTime,
    });
  } catch (err: any) {
    logger.error(`[${requestId}] Info fetch error:`, err);
    
    res.status(500).json({
      status: "error",
      error: "Failed to fetch video metadata",
      message: err.message || "Unknown error",
      requestId,
    });
  }
});

export default router;
