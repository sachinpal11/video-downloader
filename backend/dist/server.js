"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MUST LOAD DOTENV FIRST BEFORE ANYTHING ELSE
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const warmDaemon_1 = require("./services/warmDaemon");
const ytdlp_1 = require("./services/ytdlp");
const child_process_1 = require("child_process");
const info_1 = __importDefault(require("./routes/info"));
const download_1 = __importDefault(require("./routes/download"));
// import multiRoute from "./routes/multi";
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: "*" }));
app.use(express_1.default.json());
// START DAEMON
warmDaemon_1.warmDaemon.start();
// FULL SIGNATURE PREWARM
(0, child_process_1.exec)(`"${ytdlp_1.ytdlpPath}" https://www.youtube.com/watch?v=dQw4w9WgXcQ --skip-download`, () => console.log("🔥 Signature prewarm complete"));
app.use("/info", info_1.default);
app.use("/download", download_1.default);
// app.use("/multi", multiRoute);
app.use("/health", health_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Ultra-Fast Server running on ${PORT}`);
});
