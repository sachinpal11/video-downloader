import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import { warmDaemon } from "./warmDaemon";
import { 
  getDownloadUrl, 
  setDownloadUrl, 
  get as getCache, 
  set as setCache 
} from "./cache";
import { detectPlatform } from "./detector";
import { logger } from "../utils/logger";
import { YtFormat } from "../types";

const execPromise = promisify(exec);

import fs from "fs";

// STATIC BINARY PATH - Check multiple possible locations
function findYtdlpBinary(): string {
  const possiblePaths = [
    path.join(process.cwd(), "yt-dlp", "yt-dlp"),      // Linux in yt-dlp folder
    path.join(process.cwd(), "yt-dlp", "yt-dlp.exe"),  // Windows in yt-dlp folder
    path.join(process.cwd(), "yt-dlp.exe"),            // Windows in root
    path.join(process.cwd(), "yt-dlp"),                // Linux in root
    "yt-dlp",                                           // System PATH
  ];

  for (const binPath of possiblePaths) {
    if (binPath === "yt-dlp") {
      return binPath; // System PATH - let spawn handle it
    }
    try {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    } catch {
      continue;
    }
  }

  // Fallback to system PATH
  return "yt-dlp";
}

export const ytdlpPath = findYtdlpBinary();


// ==========================
// GET VIDEO INFO (FAST)
// ==========================
export async function fetchVideoInfo(videoUrl: string) {
  warmDaemon.markActivity();

  const cached = await getCache<any>(videoUrl, "info");
  if (cached) return cached;

  try {
    const { stdout } = await execPromise(
      `"${ytdlpPath}" -J --no-warnings --no-check-certificate "${videoUrl}"`
    );

    const info = JSON.parse(stdout);

    const formats: YtFormat[] = info.formats || [];

    const qualities = [];

    // progressive first
    const progressive = formats.filter((f: YtFormat) => f.acodec !== "none" && f.vcodec !== "none");

    progressive.forEach((f: YtFormat) => {
      if (f.height) {
        qualities.push({
          itag: f.format_id,
          quality: `${f.height}p`,
          size: f.filesize || f.filesize_approx || null
        });
      }
    });

    // audio
    const audio = formats.filter((f: YtFormat) => f.acodec !== "none" && f.vcodec === "none");
    const audioFormat = audio.find((a: YtFormat) => a.format_id === "140") || audio[0];

    if (audioFormat) {
      qualities.push({
        itag: audioFormat.format_id,
        quality: "audio",
        size: audioFormat.filesize || audioFormat.filesize_approx || null
      });
    }

    const data = {
      status: "ok",
      platform: detectPlatform(videoUrl),
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      channel: info.channel || info.uploader,
      qualities
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
  warmDaemon.markActivity();

  itag = itag.trim(); // FIX NEWLINE BUG

  const cached = await getDownloadUrl(videoUrl, itag);
  if (cached) return cached;

  try {
    const command = `"${ytdlpPath}" -f ${itag} --get-url --no-warnings --no-check-certificate "${videoUrl}"`;

    const { stdout } = await execPromise(command);

    const directUrl = stdout.trim().split("\n")[0];

    const ttl = directUrl.includes("googlevideo.com") ? 14400 : 3600;

    await setDownloadUrl(videoUrl, itag, directUrl, ttl);

    return directUrl;

  } catch (err) {
    logger.error("Direct URL fetch failed:", err);
    throw err;
  }
}


export async function fetchMultipleURLs(videoUrl: string) {
  const { stdout } = await execPromise(
    `"${ytdlpPath}" -J --no-warnings --no-check-certificate "${videoUrl}"`
  );

  const info = JSON.parse(stdout);

  const items = info.entries || [info];

  const results = await Promise.all(
    items.map(async (item: any) => {
      const { stdout } = await execPromise(
        `"${ytdlpPath}" --get-url -f best "${item.webpage_url}"`
      );
      return {
        title: item.title,
        thumbnail: item.thumbnail,
        url: stdout.trim().split("\n")[0]
      };
    })
  );

  return {
    status: "ok",
    platform: detectPlatform(videoUrl),
    items: results
  };
}
