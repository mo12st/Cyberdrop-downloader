const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "..", "public", "index.html");
const outRoot = path.join(__dirname, "..", "public");

const pages = [
  {
    slug: "tiktok-downloader",
    title: "TikTok Video Downloader | CyberDrop",
    description:
      "Download TikTok videos in MP4 or audio with smart quality selection. Paste the link and download fast.",
    h1: "TikTok Video Downloader",
    subtitle:
      "Paste a TikTok link, choose format and quality, and download in seconds.",
  },
  {
    slug: "instagram-downloader",
    title: "Instagram Reels Downloader | CyberDrop",
    description:
      "Download Instagram Reels and videos with clean quality options. Paste the link and save instantly.",
    h1: "Instagram Reels Downloader",
    subtitle:
      "Paste an Instagram link, pick format and quality, and download fast.",
  },
  {
    slug: "facebook-video-downloader",
    title: "Facebook Video Downloader | CyberDrop",
    description:
      "Download Facebook Reels and videos in multiple qualities. Paste the link and save quickly.",
    h1: "Facebook Video Downloader",
    subtitle:
      "Paste a Facebook link, choose format and quality, and download quickly.",
  },
  {
    slug: "twitter-video-downloader",
    title: "X (Twitter) Video Downloader | CyberDrop",
    description:
      "Download X (Twitter) videos from posts with smart quality options. Paste the link and download.",
    h1: "X (Twitter) Video Downloader",
    subtitle:
      "Paste an X link, select format and quality, and download instantly.",
  },
  {
    slug: "pinterest-video-downloader",
    title: "Pinterest Video Downloader | CyberDrop",
    description:
      "Download Pinterest videos and pins with simple quality selection. Paste the link and save fast.",
    h1: "Pinterest Video Downloader",
    subtitle:
      "Paste a Pinterest link, choose format and quality, and download fast.",
  },
  {
    slug: "reddit-video-downloader",
    title: "Reddit Video Downloader | CyberDrop",
    description:
      "Download Reddit videos from posts with easy quality selection. Paste the link and save fast.",
    h1: "Reddit Video Downloader",
    subtitle:
      "Paste a Reddit link, pick format and quality, and download quickly.",
  },
  {
    slug: "youtube-shorts-downloader",
    title: "YouTube Shorts Downloader | CyberDrop",
    description:
      "Download YouTube Shorts and videos in multiple qualities. Paste the link and download fast.",
    h1: "YouTube Shorts Downloader",
    subtitle:
      "Paste a YouTube link, choose format and quality, and download in seconds.",
  },
];

function replaceMetaByName(html, name, content) {
  const tag = `<meta name="${name}" content="${content}" />`;
  const re = new RegExp(`<meta\\s+name="${name}"[^>]*>`, "i");
  return html.replace(re, tag);
}

function replaceMetaByProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${content}" />`;
  const re = new RegExp(`<meta\\s+property="${property}"[^>]*>`, "i");
  return html.replace(re, tag);
}

function replaceLinkRel(html, rel, href) {
  const tag = `<link rel="${rel}" href="${href}" />`;
  const re = new RegExp(`<link\\s+rel="${rel}"[^>]*>`, "i");
  return html.replace(re, tag);
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}

function replaceHero(html, title, subtitle) {
  html = html.replace(
    /<h1[^>]*data-i18n="hero.title"[^>]*>[\s\S]*?<\/h1>/i,
    `<h1 class="reveal">${title}</h1>`
  );
  html = html.replace(
    /<p[^>]*data-i18n="hero.subtitle"[^>]*>[\s\S]*?<\/p>/i,
    `<p class="reveal">${subtitle}</p>`
  );
  return html;
}

function adjustAssetPaths(html) {
  return html
    .replace(/href="styles\.css"/g, 'href="../styles.css"')
    .replace(/src="logo\.svg"/g, 'src="../logo.svg"')
    .replace(/href="logo\.svg"/g, 'href="../logo.svg"')
    .replace(/src="app\.js"/g, 'src="../app.js"');
}

const template = fs.readFileSync(templatePath, "utf8");

pages.forEach((page) => {
  let html = template;
  html = replaceTitle(html, page.title);
  html = replaceMetaByName(html, "description", page.description);
  html = replaceLinkRel(html, "canonical", `/${page.slug}/`);
  html = replaceMetaByProperty(html, "og:title", page.title);
  html = replaceMetaByProperty(html, "og:description", page.description);
  html = replaceMetaByProperty(html, "og:url", `/${page.slug}/`);
  html = replaceMetaByName(html, "twitter:title", page.title);
  html = replaceMetaByName(html, "twitter:description", page.description);
  html = replaceHero(html, page.h1, page.subtitle);
  html = adjustAssetPaths(html);

  const outDir = path.join(outRoot, page.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "index.html");
  fs.writeFileSync(outPath, html, "utf8");
});

console.log(`Generated ${pages.length} SEO pages.`);
