const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "..", "public", "index.html");
const outDir = path.join(__dirname, "..", "public");

const pages = [
  {
    slug: "tiktok",
    label: "TikTok",
    badge: "TikTok Downloader",
    title: "CyberDrop | TikTok Video Downloader",
    description:
      "Download TikTok videos and audio in multiple qualities with CyberDrop. Paste a TikTok link and download fast.",
    heroTitle: "Download TikTok videos in seconds.",
    heroSubtitle: "Paste a TikTok link, choose quality, download fast.",
    placeholder: "https://www.tiktok.com/@user/video/123",
  },
  {
    slug: "instagram",
    label: "Instagram",
    badge: "Instagram Reels Downloader",
    title: "CyberDrop | Instagram Reels Downloader",
    description:
      "Download Instagram Reels and videos with CyberDrop. Paste an Instagram link, choose quality, download fast.",
    heroTitle: "Save Instagram Reels and videos fast.",
    heroSubtitle: "Paste an Instagram link, choose quality, download instantly.",
    placeholder: "https://www.instagram.com/reel/...",
  },
  {
    slug: "youtube",
    label: "YouTube",
    badge: "YouTube Video Downloader",
    title: "CyberDrop | YouTube Video Downloader",
    description:
      "Download YouTube videos with CyberDrop. Paste a link, pick format and quality, download quickly.",
    heroTitle: "Grab YouTube videos with smart quality.",
    heroSubtitle: "Paste a YouTube link, pick format + quality, download.",
    placeholder: "https://youtu.be/...",
  },
  {
    slug: "facebook",
    label: "Facebook",
    badge: "Facebook Reels Downloader",
    title: "CyberDrop | Facebook Video Downloader",
    description:
      "Download Facebook Reels and videos with CyberDrop. Paste a Facebook link, choose quality, download fast.",
    heroTitle: "Download Facebook Reels and videos fast.",
    heroSubtitle: "Paste a Facebook link, pick quality, download instantly.",
    placeholder: "https://www.facebook.com/reel/...",
  },
  {
    slug: "pinterest",
    label: "Pinterest",
    badge: "Pinterest Video Downloader",
    title: "CyberDrop | Pinterest Video Downloader",
    description:
      "Download Pinterest videos and pins with CyberDrop. Paste a Pinterest link, choose quality, download fast.",
    heroTitle: "Save Pinterest videos and pins quickly.",
    heroSubtitle: "Paste a Pinterest link, choose quality, download fast.",
    placeholder: "https://www.pinterest.com/pin/...",
  },
  {
    slug: "twitter",
    label: "X",
    badge: "X (Twitter) Video Downloader",
    title: "CyberDrop | X (Twitter) Video Downloader",
    description:
      "Download X (Twitter) videos with CyberDrop. Paste an X link, choose quality, download fast.",
    heroTitle: "Download X (Twitter) videos in one click.",
    heroSubtitle: "Paste an X link, pick quality, download instantly.",
    placeholder: "https://x.com/i/status/...",
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
    /(<h1[^>]*data-i18n="hero.title"[^>]*>)([\s\S]*?)(<\/h1>)/i,
    `$1${title}$3`
  );
  html = html.replace(
    /(<p[^>]*data-i18n="hero.subtitle"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${subtitle}$3`
  );
  return html;
}

function replaceBadge(html, badge) {
  return html.replace(
    /(<div class="badge">)([\s\S]*?)(<\/div>)/i,
    `$1${badge}$3`
  );
}

function replaceInputPlaceholder(html, placeholder) {
  return html.replace(
    /(<input[^>]*id="videoUrl"[^>]*placeholder=")[^"]*(")/i,
    `$1${placeholder}$2`
  );
}

function replacePlatformLabels(html, label) {
  html = html.replace(
    /(<span class="platform-label" id="platformLabel">)([\s\S]*?)(<\/span>)/i,
    `$1${label}$3`
  );
  html = html.replace(
    /(<span id="thumbPlatform">)([\s\S]*?)(<\/span>)/i,
    `$1${label}$3`
  );
  return html;
}

function replaceHtmlPlatform(html, slug) {
  return html.replace(/<html\b([^>]*)>/i, (match, attrs) => {
    const hasPlatform = /data-platform=/i.test(attrs);
    if (hasPlatform) {
      return `<html${attrs.replace(
        /data-platform="[^"]*"/i,
        `data-platform="${slug}"`
      )}>`;
    }
    return `<html${attrs} data-platform="${slug}">`;
  });
}

const template = fs.readFileSync(templatePath, "utf8");

pages.forEach((page) => {
  let html = template;
  html = replaceTitle(html, page.title);
  html = replaceMetaByName(html, "description", page.description);
  html = replaceLinkRel(html, "canonical", `/${page.slug}.html`);
  html = replaceMetaByProperty(html, "og:title", page.title);
  html = replaceMetaByProperty(html, "og:description", page.description);
  html = replaceMetaByProperty(html, "og:url", `/${page.slug}.html`);
  html = replaceMetaByName(html, "twitter:title", page.title);
  html = replaceMetaByName(html, "twitter:description", page.description);
  html = replaceBadge(html, page.badge);
  html = replaceHero(html, page.heroTitle, page.heroSubtitle);
  html = replaceInputPlaceholder(html, page.placeholder);
  html = replacePlatformLabels(html, page.label);
  html = replaceHtmlPlatform(html, page.slug);

  const outPath = path.join(outDir, `${page.slug}.html`);
  fs.writeFileSync(outPath, html, "utf8");
});

console.log(`Generated ${pages.length} platform pages.`);
