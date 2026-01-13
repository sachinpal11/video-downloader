"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ytdlp_1 = require("../services/ytdlp");
const router = express_1.default.Router();
router.get("/", async (req, res) => {
    const url = String(req.query.url || "");
    const itag = String(req.query.itag || "").trim();
    if (!url || !itag) {
        return res.status(400).json({ error: "Missing url or itag" });
    }
    try {
        const downloadUrl = await (0, ytdlp_1.fetchDirectURL)(url, itag);
        res.set("Cache-Control", "public, max-age=1800");
        return res.json({
            status: "ok",
            downloadUrl
        });
    }
    catch (err) {
        return res.status(500).json({
            status: "error",
            message: (err === null || err === void 0 ? void 0 : err.stderr) || (err === null || err === void 0 ? void 0 : err.message)
        });
    }
});
exports.default = router;
