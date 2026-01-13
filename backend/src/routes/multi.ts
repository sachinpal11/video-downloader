import { Router, Request, Response } from "express";
import { fetchMultipleURLs } from "../services/ytdlp";
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
    const cached = await getCache<any>(videoUrl, "multi");
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
    const result = await fetchMultipleURLs(videoUrl);
    const responseTime = Date.now() - startTime;
    
    logger.info(`[${requestId}] Multi URLs fetched - ${responseTime}ms`);

    res.json({
      ...result,
      requestId,
      cached: false,
      responseTime,
    });
  } catch (err: any) {
    logger.error(`[${requestId}] Multi fetch error:`, err);
    
    res.status(500).json({
      status: "error",
      error: "Failed to fetch multiple URLs",
      message: err.message || "Unknown error",
      requestId,
    });
  }
});

export default router;
