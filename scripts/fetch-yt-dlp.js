const fs = require("fs");
const path = require("path");
const https = require("https");

const isVercel = Boolean(process.env.VERCEL);
if (!isVercel) {
  process.exit(0);
}

const platform = process.platform;
let assetName = "yt-dlp";
if (platform === "win32") assetName = "yt-dlp.exe";
if (platform === "darwin") assetName = "yt-dlp_macos";

const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
const binDir = path.join(__dirname, "..", "bin");
const outputName = platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const outputPath = path.join(binDir, outputName);

fs.mkdirSync(binDir, { recursive: true });

if (fs.existsSync(outputPath)) {
  process.exit(0);
}

https
  .get(downloadUrl, (res) => {
    if (res.statusCode !== 200) {
      console.error(`yt-dlp download failed: ${res.statusCode}`);
      process.exit(1);
    }
    const file = fs.createWriteStream(outputPath);
    res.pipe(file);
    file.on("finish", () => {
      file.close(() => {
        try {
          fs.chmodSync(outputPath, 0o755);
        } catch (error) {
          // Ignore chmod on platforms that don't support it.
        }
        console.log("yt-dlp downloaded");
      });
    });
  })
  .on("error", (err) => {
    console.error("yt-dlp download error:", err.message);
    process.exit(1);
  });
