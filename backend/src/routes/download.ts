import express from "express";
import { fetchDirectURL } from "../services/ytdlp";

const router = express.Router();

router.get("/", async (req, res) => {
  const url = String(req.query.url || "");
  const itag = String(req.query.itag || "").trim();

  if (!url || !itag) {
    return res.status(400).json({ error: "Missing url or itag" });
  }

  try {
    const downloadUrl = await fetchDirectURL(url, itag);

    res.set("Cache-Control", "public, max-age=1800");

    return res.json({
      status: "ok",
      downloadUrl
    });

  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      message: err?.stderr || err?.message
    });
  }
});

export default router;
