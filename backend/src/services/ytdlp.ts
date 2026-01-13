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
import fs from "fs";

const execPromise = promisify(exec);

// ===============================
// FIND STATIC BINARY PATH
// ===============================
function findYtdlpBinary(): string {
  const possiblePaths = [
    path.join(process.cwd(), "yt-dlp", "yt-dlp"),      
    path.join(process.cwd(), "yt-dlp", "yt-dlp.exe"),
    path.join(process.cwd(), "yt-dlp.exe"),
    path.join(process.cwd(), "yt-dlp"),
    "yt-dlp",
  ];

  for (const binPath of possiblePaths) {
    if (binPath === "yt-dlp") return binPath;
    try {
      if (fs.existsSync(binPath)) return binPath;
    } catch {}
  }
  return "yt-dlp";
}

export const ytdlpPath = findYtdlpBinary();

// ===============================
// FIND COOKIES FILE PATH
// ===============================
function getCookiePath(): string {
  const searchPaths = [
    path.join(process.cwd(), "cookies.txt"),
    path.join(process.cwd(), "cookies", "cookies.txt"),
    path.join(process.cwd(), "yt-dlp", "cookies.txt"),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }

  logger.warn("⚠️ No cookies.txt found. yt-dlp may get blocked by YouTube.");
  return ""; // return blank → yt-dlp will run without cookies
}

export const cookieFile = getCookiePath();

// Build cookie flag safely
export const cookieFlag =
  cookieFile && fs.existsSync(cookieFile)
    ? `--cookies "${cookieFile}"`
    : "";

// ==========================
// GET VIDEO INFO (FAST)
// ==========================
export async function fetchVideoInfo(videoUrl: string) {
  warmDaemon.markActivity();

  const cached = await getCache<any>(videoUrl, "info");
  if (cached) return cached;

  try {
    const cmd = `"${ytdlpPath}" -J --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`;

    const { stdout } = await execPromise(cmd);

    const info = JSON.parse(stdout);
    const formats: YtFormat[] = info.formats || [];

    const qualities: any[] = [];

    // Progressive formats
    const progressive = formats.filter(
      (f) => f.acodec !== "none" && f.vcodec !== "none"
    );

    progressive.forEach((f) => {
      if (f.height) {
        qualities.push({
          itag: f.format_id,
          quality: `${f.height}p`,
          size: f.filesize || f.filesize_approx || null,
        });
      }
    });

    // audio only
    const audio = formats.filter(
      (f) => f.acodec !== "none" && f.vcodec === "none"
    );
    const audioFormat = audio.find((a) => a.format_id === "140") || audio[0];

    if (audioFormat) {
      qualities.push({
        itag: audioFormat.format_id,
        quality: "audio",
        size: audioFormat.filesize || audioFormat.filesize_approx || null,
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
  warmDaemon.markActivity();

  itag = itag.trim();

  const cached = await getDownloadUrl(videoUrl, itag);
  if (cached) return cached;

  try {
    const cmd = `"${ytdlpPath}" -f ${itag} --get-url --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`;

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
// MULTI-VIDEO URL FETCH
// ==========================
export async function fetchMultipleURLs(videoUrl: string) {
  const { stdout } = await execPromise(
    `"${ytdlpPath}" -J --no-warnings --no-check-certificate ${cookieFlag} "${videoUrl}"`
  );

  const info = JSON.parse(stdout);
  const items = info.entries || [info];

  const results = await Promise.all(
    items.map(async (item: any) => {
      const { stdout } = await execPromise(
        `"${ytdlpPath}" --get-url -f best ${cookieFlag} "${item.webpage_url}"`
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
