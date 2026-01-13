"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const warmDaemon_1 = require("./services/warmDaemon");
const logger_1 = require("./utils/logger");
const security_1 = require("./middlewares/security");
const cacheHeaders_1 = require("./middlewares/cacheHeaders");
const rateLimit_1 = require("./middlewares/rateLimit");
// Routes
const health_1 = __importDefault(require("./routes/health"));
const info_1 = __importDefault(require("./routes/info"));
const download_1 = __importDefault(require("./routes/download"));
const multi_1 = __importDefault(require("./routes/multi"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// ========== MIDDLEWARES ==========
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Security middleware (must be early)
app.use(security_1.securityMiddleware);
app.use(security_1.dmcaMiddleware);
// Cloudflare cache headers
app.use(cacheHeaders_1.cacheHeadersMiddleware);
// Rate limiting (optional, configurable via env)
if (process.env.ENABLE_RATE_LIMIT === "true") {
    app.use((0, rateLimit_1.getRateLimitConfig)());
}
// ========== ROUTES ==========
app.use("/", health_1.default);
app.use("/health", health_1.default);
app.use("/info", info_1.default);
app.use("/download", download_1.default);
app.use("/multi", multi_1.default);
// ========== 404 HANDLER ==========
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        error: "Route not found",
        path: req.path,
    });
});
// ========== ERROR HANDLER ==========
app.use((err, req, res, _next) => {
    logger_1.logger.error("Unhandled error:", err);
    res.status(500).json({
        status: "error",
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});
// ========== GRACEFUL SHUTDOWN ==========
process.on("SIGTERM", () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully...");
    warmDaemon_1.warmDaemon.shutdown();
    process.exit(0);
});
process.on("SIGINT", () => {
    logger_1.logger.info("SIGINT received, shutting down gracefully...");
    warmDaemon_1.warmDaemon.shutdown();
    process.exit(0);
});
// ========== START SERVER ==========
app.listen(PORT, () => {
    logger_1.logger.info(`🚀 Ultra-Fast Video Downloader API running on port ${PORT}`);
    logger_1.logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    logger_1.logger.info(`🔥 Daemon warm: ${warmDaemon_1.warmDaemon.isWarm() ? "Yes" : "Initializing..."}`);
});
exports.default = app;
