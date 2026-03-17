const fs = require("fs");
const path = require("path");

const raw = (process.env.BACKEND_BASE_URL || "").trim();
const cleaned = raw.replace(/\/+$/, "");
const output = `window.BACKEND_BASE_URL = ${JSON.stringify(cleaned)};\n`;
const target = path.join(__dirname, "..", "public", "config.js");

fs.writeFileSync(target, output);
