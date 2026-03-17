const express = require("express");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const { Readable } = require("stream");

const app = express();
const port = process.env.PORT || 3000;
const METADATA_TTL_MS = 2 * 60 * 1000;
const METADATA_FAST_TIMEOUT_MS = 8000;
const METADATA_SLOW_TIMEOUT_MS = 12000;
const METADATA_FAST_SOCKET_TIMEOUT = "7";
const METADATA_SLOW_SOCKET_TIMEOUT = "12";
const metadataCache = new Map();
let ffmpegCache = null;
let ffmpegPathCache = null;
let ytDlpCache = null;
let pythonCache = null;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";

const METADATA_ARGS = [
  "-J",
  "--no-playlist",
  "--user-agent",
  DEFAULT_USER_AGENT,
];

const ALLOWED_TYPES = new Set(["mp4", "webm", "mp3", "m4a", "wav"]);
const ALLOWED_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "facebook.com",
  "fb.watch",
  "pinterest.com",
  "pin.it",
  "twitter.com",
  "x.com",
  "t.co",
];

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowAllOrigins = corsOrigins.includes("*");

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowAllOrigins || corsOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", allowAllOrigins ? "*" : origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition,Content-Length,Content-Type,Content-Range,Accept-Ranges"
    );
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/metadata", async (req, res) => {
  const url = req.query.url;
  if (!isValidUrl(url)) {
    res.status(400).json({ error: "invalid-url" });
    return;
  }
  if (!isAllowedUrl(url)) {
    res.status(400).json({ error: "unsupported-domain" });
    return;
  }
  try {
    const data = await getMetadata(url);
    res.json(toMetadata(data));
  } catch (error) {
    res
      .status(500)
      .json({ error: "metadata-failed", detail: normalizeError(error) });
  }
});

app.get("/api/preview", async (req, res) => {
  const url = req.query.url;
  if (!isValidUrl(url)) {
    res.status(400).json({ error: "invalid-url" });
    return;
  }
  if (!isAllowedUrl(url)) {
    res.status(400).json({ error: "unsupported-domain" });
    return;
  }

  try {
    const data = await getMetadata(url);
    const format = pickPreviewFormat(data.formats);

    if (!format || !format.url) {
      res.status(404).json({ error: "preview-unavailable" });
      return;
    }

    if (isHlsFormat(format)) {
      const ffmpegPath = await getFfmpegPath();
      if (ffmpegPath) {
        await streamHlsPreview(format, ffmpegPath, res);
        return;
      }
    }

    const headers = buildPreviewHeaders(format, req.headers.range);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(format.url, {
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    res.status(response.status);
    const passthrough = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
    ];
    for (const header of passthrough) {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    if (!res.getHeader("content-type")) {
      res.setHeader(
        "content-type",
        format.ext === "webm" ? "video/webm" : "video/mp4"
      );
    }

    if (!response.body) {
      throw new Error("preview-body-empty");
    }

    const stream = Readable.fromWeb(response.body);
    stream.pipe(res);
    stream.on("error", () => res.end());
  } catch (error) {
    res
      .status(500)
      .json({ error: "preview-failed", detail: normalizeError(error) });
  }
});

app.get("/api/download", async (req, res) => {
  const url = req.query.url;
  const type = (req.query.type || "mp4").toString().toLowerCase();
  const qualityRaw = (req.query.quality || "auto").toString().toLowerCase();
  const quality = parseQuality(qualityRaw);
  const audioQuality = isAudioType(type) ? quality : null;
  const videoQuality = isAudioType(type) ? null : quality;

  if (!isValidUrl(url)) {
    res.status(400).json({ error: "invalid-url" });
    return;
  }
  if (!isAllowedUrl(url)) {
    res.status(400).json({ error: "unsupported-domain" });
    return;
  }

  if (!ALLOWED_TYPES.has(type)) {
    res.status(400).json({ error: "invalid-type" });
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linkdrop-"));
  const outputTemplate = path.join(tempDir, "%(title).80s.%(ext)s");

  try {
    const ffmpegPath = await getFfmpegPath();
    const ffmpegAvailable = Boolean(ffmpegPath);
    const args = buildDownloadArgs({
      type,
      quality: videoQuality,
      audioQuality,
      outputTemplate,
      url,
      ffmpegAvailable,
      ffmpegPath,
    });
    try {
      await runYtDlp(args, 5 * 60 * 1000);
    } catch (error) {
      if (isFormatUnavailableError(error)) {
        const fallbackArgs = buildFallbackArgs({
          type,
          outputTemplate,
          url,
          ffmpegAvailable,
          ffmpegPath,
        });
        await runYtDlp(fallbackArgs, 5 * 60 * 1000);
      } else {
        throw error;
      }
    }

    const filePath = await pickLargestFile(tempDir);
    if (!filePath) {
      throw new Error("file-not-found");
    }

    res.download(filePath, path.basename(filePath), async () => {
      await cleanupDir(tempDir);
    });
  } catch (error) {
    await cleanupDir(tempDir);
    res
      .status(500)
      .json({ error: "download-failed", detail: normalizeError(error) });
  }
});

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function isAllowedUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => {
      if (host === allowed) return true;
      return host.endsWith(`.${allowed}`);
    });
  } catch (error) {
    return false;
  }
}

function isTikTokUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "tiktok.com" || host.endsWith(".tiktok.com");
  } catch (error) {
    return false;
  }
}

function isInstagramUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch (error) {
    return false;
  }
}

function isFacebookUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch"
    );
  } catch (error) {
    return false;
  }
}

function getHeaderArgs(url) {
  const args = [];
  if (isTikTokUrl(url)) {
    args.push("--user-agent", MOBILE_USER_AGENT);
    args.push("--add-header", "Referer: https://www.tiktok.com/");
    args.push("--add-header", "Origin: https://www.tiktok.com");
    args.push("--add-header", "Accept-Language: en-US,en;q=0.9");
  }
  if (isInstagramUrl(url)) {
    args.push("--user-agent", MOBILE_USER_AGENT);
    args.push("--add-header", "Referer: https://www.instagram.com/");
    args.push("--add-header", "Origin: https://www.instagram.com");
    args.push("--add-header", "X-IG-App-ID: 936619743392459");
    args.push("--add-header", "Accept-Language: en-US,en;q=0.9");
  }
  if (isFacebookUrl(url)) {
    args.push("--user-agent", MOBILE_USER_AGENT);
    args.push("--add-header", "Referer: https://www.facebook.com/");
    args.push("--add-header", "Origin: https://www.facebook.com");
    args.push("--add-header", "Accept-Language: en-US,en;q=0.9");
  }
  return args;
}

function parseQuality(value) {
  if (!value || value === "auto") return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function isAudioType(type) {
  return type === "mp3" || type === "m4a" || type === "wav";
}

async function runYtDlp(args, timeoutMs) {
  const { command, commandArgs } = await resolveYtDlpCommand();
  return runProcess(command, [...commandArgs, ...args], timeoutMs);
}

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yt-dlp-timeout"));
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        const detail = trimError(stderr) || `yt-dlp exit ${code}`;
        reject(new Error(detail));
        return;
      }
      resolve(stdout);
    });
  });
}

async function resolveYtDlpCommand() {
  const envPath = process.env.YTDLP_PATH;
  if (envPath) {
    try {
      await fs.access(envPath);
      return { command: envPath, commandArgs: [] };
    } catch (error) {
      // Fall through to other discovery methods.
    }
  }

  const hasYtDlp = await hasYtDlpBin();
  if (hasYtDlp) {
    return { command: "yt-dlp", commandArgs: [] };
  }

  const bundledPath = await findYtDlpInUserPaths();
  if (bundledPath) {
    return { command: bundledPath, commandArgs: [] };
  }

  const pyAvailable = await hasPyLauncher();
  if (pyAvailable) {
    return { command: "py", commandArgs: ["-3", "-m", "yt_dlp"] };
  }

  const pythonAvailable = await hasPython();
  if (pythonAvailable) {
    return { command: "python", commandArgs: ["-m", "yt_dlp"] };
  }

  throw new Error(
    "yt-dlp not found. Install with: python -m pip install -U yt-dlp"
  );
}

function buildDownloadArgs({
  type,
  quality,
  audioQuality,
  outputTemplate,
  url,
  ffmpegAvailable,
  ffmpegPath,
}) {
  const base = [
    "--no-playlist",
    "--user-agent",
    DEFAULT_USER_AGENT,
    "--retries",
    "2",
    "--retry-sleep",
    "1",
    "--fragment-retries",
    "2",
    "--extractor-retries",
    "2",
    ...getHeaderArgs(url),
  ];
  if (ffmpegPath) {
    base.push("--ffmpeg-location", ffmpegPath);
  }
  base.push("-o", outputTemplate);

  if (type === "mp3") {
    if (!ffmpegAvailable) {
      throw new Error("ffmpeg required for MP3. Install ffmpeg and retry.");
    }
    return [
      "-f",
      buildAudioSelector(audioQuality),
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      audioQuality ? `${audioQuality}K` : "0",
      ...base,
      url,
    ];
  }

  if (type === "wav") {
    if (!ffmpegAvailable) {
      throw new Error("ffmpeg required for WAV. Install ffmpeg and retry.");
    }
    return [
      "-f",
      buildAudioSelector(audioQuality),
      "-x",
      "--audio-format",
      "wav",
      ...base,
      url,
    ];
  }

  if (type === "m4a") {
    if (ffmpegAvailable) {
      return [
        "-f",
        buildAudioSelector(audioQuality),
        "-x",
        "--audio-format",
        "m4a",
        audioQuality ? "--audio-quality" : undefined,
        audioQuality ? `${audioQuality}K` : undefined,
        ...base,
        url,
      ].filter(Boolean);
    }
    return [
      "-f",
      buildAudioSelector(audioQuality, "m4a"),
      ...base,
      url,
    ];
  }

  if (type === "webm") {
    return buildVideoArgs({
      ext: "webm",
      quality,
      ffmpegAvailable,
      base,
      url,
    });
  }

  return buildVideoArgs({
    ext: "mp4",
    quality,
    ffmpegAvailable,
    base,
    url,
  });
}

function buildFallbackArgs({
  type,
  outputTemplate,
  url,
  ffmpegAvailable,
  ffmpegPath,
}) {
  const base = [
    "--no-playlist",
    "--user-agent",
    DEFAULT_USER_AGENT,
    "--retries",
    "2",
    "--retry-sleep",
    "1",
    "--fragment-retries",
    "2",
    "--extractor-retries",
    "2",
    ...getHeaderArgs(url),
  ];
  if (ffmpegPath) {
    base.push("--ffmpeg-location", ffmpegPath);
  }
  base.push("-o", outputTemplate);

  if (type === "mp3" || type === "wav") {
    if (!ffmpegAvailable) {
      throw new Error(`ffmpeg required for ${type.toUpperCase()}.`);
    }
    return ["-x", "--audio-format", type, ...base, url];
  }

  if (type === "m4a") {
    if (ffmpegAvailable) {
      return ["-x", "--audio-format", "m4a", ...base, url];
    }
    return ["-f", "bestaudio", ...base, url];
  }

  const mergeExt = type === "webm" ? "webm" : "mp4";
  if (ffmpegAvailable) {
    return [
      "-f",
      "bestvideo+bestaudio/best",
      "--merge-output-format",
      mergeExt,
      ...base,
      url,
    ];
  }
  return ["-f", "best", ...base, url];
}

function buildVideoArgs({ ext, quality, ffmpegAvailable, base, url }) {
  const heightFilter = quality ? `[height<=${quality}]` : "";

  if (!ffmpegAvailable) {
    const progressive = `b[ext=${ext}]${heightFilter}/b`;
    return ["-f", progressive, ...base, url];
  }

  const audioExt = ext === "mp4" ? "m4a" : "webm";
  const selector = `bv*${heightFilter}[ext=${ext}]+ba[ext=${audioExt}]/b[ext=${ext}]/b`;
  return ["-f", selector, "--merge-output-format", ext, ...base, url];
}

function buildAudioSelector(audioQuality, preferExt) {
  const filters = [];
  if (Number.isFinite(audioQuality)) {
    filters.push(`[abr<=${audioQuality}]`);
  }
  if (preferExt) {
    filters.push(`[ext=${preferExt}]`);
  }
  const filter = filters.join("");
  return filter ? `bestaudio${filter}/bestaudio` : "bestaudio";
}

function toMetadata(data) {
  const duration = data.duration ? formatDuration(data.duration) : "—";
  const author = pickAuthor(data);
  const title = pickTitle(data);
  const qualities = extractQualities(data.formats, data);
  const audioQualities = extractAudioQualities(data.formats, data);
  const resolution =
    data.height
      ? `${data.height}p`
      : data.resolution ||
        (qualities.length ? `${Math.max(...qualities)}p` : "—");
  const size = data.filesize || data.filesize_approx;
  const dimensions = extractDimensions(data.formats, data);
  const previewUrl =
    pickPreviewUrl(data.formats) ||
    data.preview_url ||
    data.previewUrl ||
    "";

  return {
    title,
    author,
    duration,
    resolution,
    size: size ? formatBytes(size) : "—",
    thumbnail: data.thumbnail || "",
    qualities,
    audioQualities,
    width: dimensions?.width || null,
    height: dimensions?.height || null,
    aspectRatio: dimensions?.aspectRatio || "",
    previewUrl,
  };
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function pickTitle(data) {
  return (
    firstNonEmpty(
      data.title,
      data.fulltitle,
      data.alt_title,
      data.track,
      data.episode,
      extractTitleFromDescription(data.description),
      data.webpage_url_basename,
      data.id
    ) || "Video"
  );
}

function pickAuthor(data) {
  return (
    firstNonEmpty(
      data.uploader,
      data.channel,
      data.creator,
      data.channel_id,
      data.creator_id,
      data.artist,
      data.uploader_id
    ) || "—"
  );
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && isMeaningfulValue(trimmed)) return trimmed;
    }
  }
  return "";
}

function isMeaningfulValue(value) {
  const lower = value.toLowerCase();
  const blocked = new Set([
    "watch",
    "shorts",
    "reel",
    "video",
    "untitled",
  ]);
  if (blocked.has(lower)) return false;
  if (value.length < 2) return false;
  return true;
}

function isGenericTitleForHost(url, title) {
  const lowerTitle = String(title || "").trim().toLowerCase();
  if (!lowerTitle) return true;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (error) {
    return false;
  }

  const generic = new Set(["video", "reel", "shorts", "post"]);
  if (generic.has(lowerTitle)) return true;

  if (host.includes("spotify.com") && lowerTitle.includes("spotify")) return true;
  if (host.includes("instagram.com") && lowerTitle === "instagram") return true;
  if (host.includes("tiktok.com") && lowerTitle === "tiktok") return true;
  if (host.includes("facebook.com") && (lowerTitle === "facebook" || lowerTitle === "reels")) return true;
  if ((host.includes("twitter.com") || host.includes("x.com")) &&
      (lowerTitle === "twitter" || lowerTitle === "x")) return true;
  if (host.includes("reddit.com") && lowerTitle === "reddit") return true;
  if ((host.includes("pinterest.com") || host.includes("pin.it")) &&
      lowerTitle === "pinterest") return true;
  if ((host.includes("youtube.com") || host.includes("youtu.be")) &&
      lowerTitle === "youtube") return true;

  return false;
}

function isGenericAuthorForHost(url, author) {
  const lowerAuthor = String(author || "").trim().toLowerCase();
  if (!lowerAuthor) return true;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (error) {
    return false;
  }

  const genericAuthors = new Set([
    "spotify",
    "instagram",
    "tiktok",
    "facebook",
    "twitter",
    "x",
    "reddit",
    "pinterest",
    "youtube",
  ]);
  if (genericAuthors.has(lowerAuthor)) return true;

  if (host.includes("spotify.com") && lowerAuthor.includes("spotify")) return true;
  if ((host.includes("twitter.com") || host.includes("x.com")) &&
      (lowerAuthor === "twitter" || lowerAuthor === "x")) return true;

  return false;
}

function extractTitleFromDescription(description) {
  if (!description) return "";
  const lines = String(description)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  const first = lines[0];
  if (first.length <= 80) return first;
  return `${first.slice(0, 80).trim()}…`;
}

function extractQualities(formats, info) {
  const heights = new Set();
  if (Array.isArray(formats)) {
    for (const format of formats) {
      if (!format) continue;
      if (format.vcodec && format.vcodec !== "none") {
        if (format.height) {
          heights.add(Number(format.height));
        } else {
          const parsed =
            parseHeightFromText(format.resolution) ||
            parseHeightFromText(format.format_note) ||
            parseHeightFromText(format.format) ||
            parseHeightFromText(format.format_id);
          if (Number.isFinite(parsed)) {
            heights.add(parsed);
          }
        }
      }
    }
  }

  let list = Array.from(heights).filter((value) => Number.isFinite(value));

  if (!list.length && info) {
    const fallback =
      Number(info.height) ||
      parseHeightFromText(info.resolution) ||
      parseHeightFromText(info.format_note) ||
      parseHeightFromText(info.format);
    if (Number.isFinite(fallback)) {
      list = buildHeightFallbackList(fallback);
    }
  }

  return list.sort((a, b) => a - b);
}

function extractAudioQualities(formats, info) {
  const rates = new Set();
  if (Array.isArray(formats)) {
    for (const format of formats) {
      if (!format) continue;
      if (format.acodec && format.acodec !== "none") {
        const abr = Number(
          format.abr ??
            (format.vcodec === "none" ? format.tbr : null)
        );
        if (Number.isFinite(abr) && abr > 0 && abr <= 512) {
          rates.add(Math.round(abr));
        }
      }
    }
  }

  let list = Array.from(rates).filter((value) => Number.isFinite(value));
  if (!list.length && info) {
    const fallback = Number(info.abr ?? info.tbr);
    if (Number.isFinite(fallback)) {
      list = buildAudioFallbackList(fallback);
    }
  }

  return list.sort((a, b) => a - b);
}

function parseHeightFromText(text) {
  if (!text) return null;
  const value = String(text).toLowerCase();
  const pMatch = value.match(/(\d{3,4})p/);
  if (pMatch) return Number(pMatch[1]);
  const dimMatch = value.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
  if (dimMatch) return Number(dimMatch[2]);
  const kMatch = value.match(/\b([248])k\b/);
  if (kMatch) {
    const map = { 2: 1440, 4: 2160, 8: 4320 };
    return map[Number(kMatch[1])] || null;
  }
  return null;
}

function parseDimensionsFromText(text) {
  if (!text) return null;
  const value = String(text).toLowerCase();
  const dimMatch = value.match(/(\d{2,4})\s*x\s*(\d{2,4})/);
  if (!dimMatch) return null;
  const width = Number(dimMatch[1]);
  const height = Number(dimMatch[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function extractDimensions(formats, info) {
  let width = Number(info?.width);
  let height = Number(info?.height);

  if (!width || !height) {
    const parsed =
      parseDimensionsFromText(info?.resolution) ||
      parseDimensionsFromText(info?.format_note) ||
      parseDimensionsFromText(info?.format);
    if (parsed) {
      width = parsed.width;
      height = parsed.height;
    }
  }

  if ((!width || !height) && Array.isArray(formats)) {
    let best = null;
    let bestArea = 0;
    for (const format of formats) {
      if (!format) continue;
      if (format.width && format.height) {
        const area = Number(format.width) * Number(format.height);
        if (Number.isFinite(area) && area > bestArea) {
          best = format;
          bestArea = area;
        }
      }
    }
    if (best) {
      width = Number(best.width);
      height = Number(best.height);
    }
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const aspectRatio = formatAspectRatio(width, height);
  return { width, height, aspectRatio };
}

function formatAspectRatio(width, height) {
  const divisor = gcd(width, height);
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);
  return `${w} / ${h}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function buildHeightFallbackList(maxHeight) {
  const base = [144, 240, 360, 480, 540, 720, 1080, 1440, 2160, 4320];
  const result = base.filter((value) => value <= maxHeight);
  if (!result.includes(maxHeight)) {
    result.push(maxHeight);
  }
  return Array.from(new Set(result));
}

function buildAudioFallbackList(maxAbr) {
  const base = [64, 96, 128, 160, 192, 256, 320];
  const capped = Math.min(Math.round(maxAbr || 0), 320);
  const result = base.filter((value) => value <= capped);
  if (capped && !result.includes(capped)) {
    result.push(capped);
  }
  return Array.from(new Set(result));
}

function pickPreviewUrl(formats) {
  const chosen = pickPreviewFormat(formats);
  return chosen?.url || "";
}

function buildMetadataArgs({ socketTimeout, retries }) {
  const retryValue = Number.isFinite(retries) ? Math.max(0, retries) : 0;
  const socketValue = socketTimeout ? String(socketTimeout) : "8";
  const args = [
    ...METADATA_ARGS,
    "--socket-timeout",
    socketValue,
    "--retries",
    String(retryValue),
    "--fragment-retries",
    String(retryValue),
  ];
  if (retryValue > 0) {
    args.push("--extractor-retries", String(retryValue));
    args.push("--retry-sleep", "1");
  }
  return args;
}

function shouldRetryMetadata(error) {
  const message = (error && error.message) ? error.message : String(error || "");
  const lower = message.toLowerCase();
  if (!lower) return false;
  if (lower.includes("yt-dlp not found")) return false;
  if (lower.includes("unsupported")) return false;
  if (lower.includes("invalid url")) return false;
  if (lower.includes("unable to download webpage")) return true;
  if (lower.includes("timed out") || lower.includes("timeout")) return true;
  if (lower.includes("connection") || lower.includes("reset")) return true;
  return true;
}

function getOgUserAgent(url) {
  if (isInstagramUrl(url) || isFacebookUrl(url) || isTikTokUrl(url)) {
    return MOBILE_USER_AGENT;
  }
  return DEFAULT_USER_AGENT;
}

async function fetchOgData(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const headers = { "user-agent": getOgUserAgent(url) };
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 700000) return null;

    const html = (await response.text()).slice(0, 700000);
    if (!html) return null;

    const meta = parseMetaTags(html);
    const title =
      pickMetaValue(meta, ["og:title", "twitter:title"]) ||
      extractTitleFromHtml(html);
    const description = pickMetaValue(meta, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    let author = pickMetaValue(meta, [
      "author",
      "article:author",
      "og:site_name",
      "twitter:site",
      "twitter:creator",
    ]);
    const thumbnail = pickMetaValue(meta, [
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]);
    const video = pickMetaValue(meta, [
      "og:video",
      "og:video:url",
      "og:video:secure_url",
      "twitter:player",
    ]);
    const width = toNumber(
      meta["og:video:width"] || meta["twitter:player:width"]
    );
    const height = toNumber(
      meta["og:video:height"] || meta["twitter:player:height"]
    );

    if (!title && !author && !thumbnail && !video) return null;

    if (url.includes("spotify.com") && description) {
      const normalized = String(author || "").trim().toLowerCase();
      if (!author || normalized === "spotify") {
        const first = description.split("·")[0]?.trim();
        if (first) author = first;
      }
    }

    return {
      title,
      author,
      description,
      thumbnail,
      video,
      width,
      height,
    };
  } catch (error) {
    return null;
  }
}

function buildFallbackMetadata({ oembed, og }) {
  return {
    title: oembed?.title || og?.title || "Video",
    uploader: oembed?.author_name || og?.author || "—",
    thumbnail: oembed?.thumbnail_url || og?.thumbnail || "",
    width: og?.width || null,
    height: og?.height || null,
    preview_url: og?.video || "",
    formats: [],
    duration: null,
  };
}

function parseMetaTags(html) {
  const meta = {};
  const tagRegex = /<meta\s+[^>]*>/gi;
  let match = null;
  while ((match = tagRegex.exec(html))) {
    const tag = match[0];
    const attrs = {};
    const attrRegex = /([a-zA-Z_:.-]+)\s*=\s*["']([^"']*)["']/g;
    let attrMatch = null;
    while ((attrMatch = attrRegex.exec(tag))) {
      attrs[attrMatch[1].toLowerCase()] = attrMatch[2];
    }
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = (attrs.content || "").trim();
    if (key && content && !meta[key]) {
      meta[key] = decodeHtmlEntities(content);
    }
  }
  return meta;
}

function pickMetaValue(meta, keys) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match) return "";
  return decodeHtmlEntities(match[1]).trim();
}

function decodeHtmlEntities(value) {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickPreviewFormat(formats) {
  if (!Array.isArray(formats)) return null;

  const progressive = formats.filter(
    (format) =>
      format &&
      format.url &&
      format.vcodec &&
      format.vcodec !== "none" &&
      format.acodec &&
      format.acodec !== "none"
  );

  const candidates = progressive.length
    ? progressive
    : formats.filter(
        (format) => format && format.url && format.vcodec && format.vcodec !== "none"
      );

  return pickBestFormat(candidates);
}

function pickBestFormat(formats) {
  if (!formats.length) return null;
  const mp4 = formats.filter((format) => format.ext === "mp4");
  const webm = formats.filter((format) => format.ext === "webm");
  const pool = mp4.length ? mp4 : webm.length ? webm : formats;
  return pickByHeight(pool) || pool[0];
}

function pickByHeight(formats) {
  const withHeight = formats.filter((format) => Number(format.height));
  if (!withHeight.length) return null;
  const under = withHeight
    .filter((format) => format.height <= 720)
    .sort((a, b) => a.height - b.height);
  if (under.length) return under[under.length - 1];
  const over = withHeight.sort((a, b) => a.height - b.height);
  return over[0];
}

function buildPreviewHeaders(format, range) {
  const headers = { ...(format.http_headers || {}) };
  if (range) headers.Range = range;
  if (!headers["User-Agent"] && !headers["user-agent"]) {
    headers["User-Agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
  }
  return headers;
}

function isHlsFormat(format) {
  const protocol = (format?.protocol || "").toLowerCase();
  if (protocol.includes("m3u8")) return true;
  const url = (format?.url || "").toLowerCase();
  return url.includes(".m3u8");
}

function streamHlsPreview(format, ffmpegPath, res) {
  return new Promise((resolve, reject) => {
    res.status(200);
    res.setHeader("content-type", "video/mp4");

    const headers = buildPreviewHeaders(format);
    const headerLines = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");

    const args = [];
    if (headerLines) {
      args.push("-headers", `${headerLines}\r\n`);
    }
    args.push(
      "-i",
      format.url,
      "-c",
      "copy",
      "-f",
      "mp4",
      "-movflags",
      "frag_keyframe+empty_moov",
      "pipe:1"
    );

    const child = spawn(ffmpegPath, args, { windowsHide: true });
    res.on("close", () => child.kill("SIGKILL"));

    child.stdout.pipe(res);
    child.stderr.on("data", () => {});

    child.on("error", (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: "preview-failed" });
      } else {
        res.end();
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0 && !res.writableEnded) {
        res.end();
      }
      resolve();
    });
  });
}

async function enrichMetadata(url, data) {
  const currentTitle = pickTitle(data);
  const currentAuthor = pickAuthor(data);
  const needsTitle =
    !currentTitle ||
    currentTitle === "Video" ||
    isGenericTitleForHost(url, currentTitle);
  const needsAuthor =
    !currentAuthor ||
    currentAuthor === "—" ||
    isGenericAuthorForHost(url, currentAuthor);
  const needsThumb = !data.thumbnail;

  if (!needsTitle && !needsAuthor && !needsThumb) return data;

  let next = { ...data };
  const oembed = await fetchOEmbed(url);
  if (oembed) {
    if (needsTitle && oembed.title) {
      next.title = oembed.title;
      next.fulltitle = oembed.title;
    }
    if (needsAuthor && oembed.author_name) {
      next.uploader = oembed.author_name;
      next.channel = oembed.author_name;
    }
    if (needsThumb && oembed.thumbnail_url) {
      next.thumbnail = oembed.thumbnail_url;
    }
  }

  const updatedTitle = pickTitle(next);
  const updatedAuthor = pickAuthor(next);
  const stillNeedsTitle =
    !updatedTitle ||
    updatedTitle === "Video" ||
    isGenericTitleForHost(url, updatedTitle);
  const stillNeedsAuthor =
    !updatedAuthor ||
    updatedAuthor === "—" ||
    isGenericAuthorForHost(url, updatedAuthor);
  const stillNeedsThumb = !next.thumbnail;

  if (!stillNeedsTitle && !stillNeedsAuthor && !stillNeedsThumb) return next;

  const og = await fetchOgData(url);
  if (!og) return next;

  if (stillNeedsTitle && og.title) {
    next.title = og.title;
    next.fulltitle = og.title;
  }
  if (stillNeedsAuthor && og.author) {
    next.uploader = og.author;
    next.channel = og.author;
  }
  if (stillNeedsThumb && og.thumbnail) {
    next.thumbnail = og.thumbnail;
  }
  if (!next.preview_url && og.video) {
    next.preview_url = og.video;
  }
  if (!next.width && og.width) {
    next.width = og.width;
  }
  if (!next.height && og.height) {
    next.height = og.height;
  }

  return next;
}

async function fetchOEmbed(url) {
  const endpoint = getOEmbedEndpoint(url);
  if (!endpoint) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${endpoint}${encodeURIComponent(url)}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

function getOEmbedEndpoint(url) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (error) {
    return "";
  }
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return "https://www.youtube.com/oembed?format=json&url=";
  }
  if (host.includes("tiktok.com")) {
    return "https://www.tiktok.com/oembed?url=";
  }
  if (host.includes("pinterest.com") || host.includes("pin.it")) {
    return "https://www.pinterest.com/oembed.json?url=";
  }
  if (host.includes("twitter.com") || host.includes("x.com")) {
    return "https://publish.twitter.com/oembed?url=";
  }
  return "";
}

async function getMetadata(url) {
  const now = Date.now();
  const cached = metadataCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  if (cached) metadataCache.delete(url);

  try {
    const fastArgs = buildMetadataArgs({
      socketTimeout: METADATA_FAST_SOCKET_TIMEOUT,
      retries: 0,
    });
    const headerArgs = getHeaderArgs(url);
    const raw = await runYtDlp(
      [...fastArgs, ...headerArgs, url],
      METADATA_FAST_TIMEOUT_MS
    );
    const data = JSON.parse(raw);
    const enriched = await enrichMetadata(url, data);
    metadataCache.set(url, { data: enriched, expiresAt: now + METADATA_TTL_MS });
    return enriched;
  } catch (error) {
    if (!shouldRetryMetadata(error)) {
      throw error;
    }
    try {
      const slowArgs = buildMetadataArgs({
        socketTimeout: METADATA_SLOW_SOCKET_TIMEOUT,
        retries: 1,
      });
      const headerArgs = getHeaderArgs(url);
      const raw = await runYtDlp(
        [...slowArgs, ...headerArgs, url],
        METADATA_SLOW_TIMEOUT_MS
      );
      const data = JSON.parse(raw);
      const enriched = await enrichMetadata(url, data);
      metadataCache.set(url, { data: enriched, expiresAt: now + METADATA_TTL_MS });
      return enriched;
    } catch (slowError) {
      const [oembed, og] = await Promise.all([
        fetchOEmbed(url),
        fetchOgData(url),
      ]);
      if (oembed || og) {
        const fallback = buildFallbackMetadata({ oembed, og });
        metadataCache.set(url, { data: fallback, expiresAt: now + METADATA_TTL_MS });
        return fallback;
      }
      throw slowError;
    }
  }
}

async function pickLargestFile(dir) {
  const entries = await fs.readdir(dir);
  let best = null;
  let bestSize = 0;

  for (const entry of entries) {
    if (entry.endsWith(".part")) continue;
    const filePath = path.join(dir, entry);
    const stat = await fs.stat(filePath);
    if (stat.isFile() && stat.size > bestSize) {
      best = filePath;
      bestSize = stat.size;
    }
  }

  return best;
}

async function cleanupDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.warn("Cleanup failed", error);
    }
  }
}

function trimError(message) {
  if (!message) return "";
  const lines = message.trim().split(/\r?\n/);
  return lines.slice(-6).join("\n").slice(0, 400);
}

function normalizeError(error) {
  if (!error) return "unknown error";
  const message = error.message || String(error);
  return message.length > 400 ? `${message.slice(0, 400)}...` : message;
}

function isFormatUnavailableError(error) {
  const message = (error && error.message) ? error.message : String(error || "");
  return message.toLowerCase().includes("requested format is not available");
}

async function hasFfmpeg() {
  if (ffmpegCache !== null) return ffmpegCache;
  const path = await getFfmpegPath();
  ffmpegCache = Boolean(path);
  return ffmpegCache;
}

async function getFfmpegPath() {
  if (ffmpegPathCache !== null) return ffmpegPathCache;
  let ffmpegStaticPath = "";
  try {
    const moduleName = ["ffmpeg", "static"].join("-");
    const req =
      typeof __non_webpack_require__ === "function"
        ? __non_webpack_require__
        : Function("return require")();
    const ffmpegStatic = req(moduleName);
    if (typeof ffmpegStatic === "string") {
      ffmpegStaticPath = ffmpegStatic;
    }
  } catch (error) {
    ffmpegStaticPath = "";
  }

  if (ffmpegStaticPath) {
    try {
      await fs.access(ffmpegStaticPath);
      ffmpegPathCache = ffmpegStaticPath;
      return ffmpegPathCache;
    } catch (error) {
      // Fall back to system ffmpeg if the bundled binary is missing.
    }
  }
  const exists = await commandExists("ffmpeg", ["-version"]);
  ffmpegPathCache = exists ? "ffmpeg" : "";
  return ffmpegPathCache;
}

async function hasYtDlpBin() {
  if (ytDlpCache !== null) return ytDlpCache;
  ytDlpCache = await commandExists("yt-dlp", ["--version"]);
  return ytDlpCache;
}

async function hasPython() {
  if (pythonCache !== null) return pythonCache;
  pythonCache = await commandExists("python", ["--version"]);
  return pythonCache;
}

async function hasPyLauncher() {
  return commandExists("py", ["-3", "-m", "yt_dlp", "--version"]);
}

async function findYtDlpInUserPaths() {
  const roots = [];
  if (process.env.APPDATA) {
    roots.push(path.join(process.env.APPDATA, "Python"));
  }
  if (process.env.LOCALAPPDATA) {
    roots.push(path.join(process.env.LOCALAPPDATA, "Programs", "Python"));
  }

  for (const root of roots) {
    let entries = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    const dirs = entries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => versionFromName(b.name) - versionFromName(a.name));

    for (const dir of dirs) {
      const candidate = path.join(root, dir.name, "Scripts", "yt-dlp.exe");
      try {
        await fs.access(candidate);
        return candidate;
      } catch (error) {
        // Try next directory.
      }
    }
  }

  return "";
}

function versionFromName(name) {
  const digits = String(name).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function commandExists(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

module.exports = app;
module.exports.getMetadata = getMetadata;
module.exports.toMetadata = toMetadata;
module.exports.isValidUrl = isValidUrl;
module.exports.isAllowedUrl = isAllowedUrl;
