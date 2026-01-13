import express from "express";
import cors from "cors";
import { warmDaemon } from "./services/warmDaemon";
import { ytdlpPath } from "./services/ytdlp";
import { exec } from "child_process";
import infoRoute from "./routes/info";
import downloadRoute from "./routes/download";
import multiRoute from "./routes/multi";
import healthRoute from "./routes/health";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// START DAEMON
warmDaemon.start();

// FULL SIGNATURE PREWARM
exec(`"${ytdlpPath}" https://www.youtube.com/watch?v=dQw4w9WgXcQ --skip-download`,
  () => console.log("🔥 Signature prewarm complete"));

app.use("/info", infoRoute);
app.use("/download", downloadRoute);
// app.use("/multi", multiRoute);
app.use("/health", healthRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Ultra-Fast Server running on ${PORT}`);
});
