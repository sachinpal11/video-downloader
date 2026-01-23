import { exec } from "child_process";
import { promisify } from "util";
import {
  getDownloadUrl,
  setDownloadUrl,
  get as getCache,
  set as setCache,
} from "./cache";
import { detectPlatform } from "./detector";
import { logger } from "../utils/logger";
import { YtFormat } from "../types";

const execPromise = promisify(exec);

// ===============================
// CONFIG (Render-safe)
// ===============================
export const ytdlpPath = "yt-dlp";

const cookieFile = process.env.YTDLP_COOKIES || "";
export const cookieFlag = cookieFile ? `--cookies "${cookieFile}"` : "";

// ==========================
// GET VIDEO INFO
// ==========================
export async function fetchVideoInfo(videoUrl: string) {
  const cached = await getCache<any>(videoUrl, "info");
  if (cached) return cached;

  try {
    const cmd = `${ytdlpPath} -J --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`;
    const { stdout } = await execPromise(cmd);

    const info = JSON.parse(stdout);
    const formats: YtFormat[] = info.formats || [];

    const qualities: any[] = [];

    // Progressive formats
    for (const f of formats) {
      if (f.acodec !== "none" && f.vcodec !== "none" && f.height) {
        qualities.push({
          itag: f.format_id,
          quality: `${f.height}p`,
          size: f.filesize || f.filesize_approx || null,
        });
      }
    }

    // Audio only
    const audio = formats.find(
      (f) => f.vcodec === "none" && f.acodec !== "none"
    );

    if (audio) {
      qualities.push({
        itag: audio.format_id,
        quality: "audio",
        size: audio.filesize || audio.filesize_approx || null,
      });
    }

    const data = {
      status: "ok",
      platform: detectPlatform(videoUrl),
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      channel: info.channel || info.uploader,
      qualities,
    };

    await setCache(videoUrl, data, "info", 3600);
    return data;
  } catch (err) {
    logger.error("Video info error:", err);
    throw err;
  }
}

// ==========================
// DIRECT DOWNLOAD URL
// ==========================
export async function fetchDirectURL(videoUrl: string, itag: string) {
  itag = itag.trim();

  const cached = await getDownloadUrl(videoUrl, itag);
  if (cached) return cached;

  try {
    const cmd = `${ytdlpPath} -f ${itag} --get-url --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`;
    const { stdout } = await execPromise(cmd);

    const directUrl = stdout.trim().split("\n")[0];
    const ttl = directUrl.includes("googlevideo.com") ? 14400 : 3600;

    await setDownloadUrl(videoUrl, itag, directUrl, ttl);
    return directUrl;
  } catch (err) {
    logger.error("Direct URL fetch failed:", err);
    throw err;
  }
}

// ==========================
// MULTI VIDEO (PLAYLIST)
// ==========================
export async function fetchMultipleURLs(videoUrl: string) {
  const { stdout } = await execPromise(
    `${ytdlpPath} -J --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`
  );

  const info = JSON.parse(stdout);
  const items = info.entries || [info];

  const results = await Promise.all(
    items.map(async (item: any) => {
      const { stdout } = await execPromise(
        `${ytdlpPath} --get-url -f best ${cookieFlag} "${item.webpage_url}"`
      );

      return {
        title: item.title,
        thumbnail: item.thumbnail,
        url: stdout.trim().split("\n")[0],
      };
    })
  );

  return {
    status: "ok",
    platform: detectPlatform(videoUrl),
    items: results,
  };
}
