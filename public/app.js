const urlInput = document.getElementById("videoUrl");
const downloadBtn = document.getElementById("downloadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const clearBtn = document.getElementById("clearBtn");
const platformLabel = document.getElementById("platformLabel");
const progressBar = document.getElementById("progressBar");
const toast = document.getElementById("toast");
const langSelect = document.getElementById("langSelect");
const formMessage = document.getElementById("formMessage");
const pagePlatform = document.documentElement.dataset.platform || "";

const thumb = document.getElementById("thumb");
const videoPlayer = document.getElementById("videoPlayer");
const thumbTitle = document.getElementById("thumbTitle");
const thumbPlatform = document.getElementById("thumbPlatform");
const videoTitle = document.getElementById("videoTitle");
const videoAuthor = document.getElementById("videoAuthor");
const videoDuration = document.getElementById("videoDuration");
const videoResolution = document.getElementById("videoResolution");
const videoSize = document.getElementById("videoSize");
const videoStatus = document.getElementById("videoStatus");
const analyzeTime = document.getElementById("analyzeTime");
const downloadTime = document.getElementById("downloadTime");

const fileTypeSelect = document.getElementById("fileType");
const qualitySelect = document.getElementById("quality");
const multiQualityToggle = document.getElementById("multiQuality");
const qualityList = document.getElementById("qualityList");

const BACKEND_BASE_URL = (window.BACKEND_BASE_URL || "").trim().replace(/\/+$/, "");
const apiUrl = (path) => (BACKEND_BASE_URL ? `${BACKEND_BASE_URL}${path}` : path);

let currentType = "mp4";
let currentQuality = "auto";
let currentMeta = null;
let currentQualityList = [];
let selectedQualities = [];
let userSelectedQuality = false;
let progressTimer = null;
let toastTimer = null;
let analyzeTimer = null;
let lastAnalyzedUrl = "";
let lastPreviewUrl = "";
let currentLang = "en";
let currentStatusKey = "status.ready";
let currentButtonState = "idle";
let isAnalyzing = false;
let pendingAnalyze = false;
let pendingDownload = false;
let metaSource = "none";
let formMessageKey = "form.processing";

const rtlLangs = new Set(["ar"]);

const PLATFORM_STYLES = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  pinterest: "Pinterest",
  twitter: "X",
  unknown: "Unknown",
};

const BLOCKED_PLATFORMS = new Set(["reddit", "spotify"]);

const fileTypeOptions = [
  { value: "mp4", key: "fileType.mp4" },
  { value: "webm", key: "fileType.webm" },
  { value: "mp3", key: "fileType.mp3" },
  { value: "m4a", key: "fileType.m4a" },
  { value: "wav", key: "fileType.wav" },
];

const i18n = {
  en: {
    title: "CyberDrop | Download Hub",
    "title.tiktok": "CyberDrop | TikTok Video Downloader",
    "title.instagram": "CyberDrop | Instagram Reels Downloader",
    "title.youtube": "CyberDrop | YouTube Video Downloader",
    "title.facebook": "CyberDrop | Facebook Video Downloader",
    "title.pinterest": "CyberDrop | Pinterest Video Downloader",
    "title.twitter": "CyberDrop | X (Twitter) Video Downloader",
    "brand.tag": "Drop the link. Download instantly.",
    "nav.download": "Download",
    "nav.formats": "Formats",
    "nav.features": "Features",
    "nav.platforms": "Platforms",
    "lang.label": "Language",
    "hero.title": "Drop a link, get the video instantly.",
    "hero.subtitle": "Paste a link, pick type + quality, download instantly.",
    "hero.title.tiktok": "Download TikTok videos in seconds.",
    "hero.subtitle.tiktok": "Paste a TikTok link, choose quality, download fast.",
    "hero.title.instagram": "Save Instagram Reels and videos fast.",
    "hero.subtitle.instagram": "Paste an Instagram link, choose quality, download instantly.",
    "hero.title.youtube": "Grab YouTube videos with smart quality.",
    "hero.subtitle.youtube": "Paste a YouTube link, pick format + quality, download.",
    "hero.title.facebook": "Download Facebook Reels and videos fast.",
    "hero.subtitle.facebook": "Paste a Facebook link, pick quality, download instantly.",
    "hero.title.pinterest": "Save Pinterest videos and pins quickly.",
    "hero.subtitle.pinterest": "Paste a Pinterest link, choose quality, download fast.",
    "hero.title.twitter": "Download X (Twitter) videos in one click.",
    "hero.subtitle.twitter": "Paste an X link, pick quality, download instantly.",
    "card.title": "Paste your link",
    "card.subtitle": "Instant platform detection and smart quality.",
    "labels.fileType": "File type",
    "labels.quality": "Quality",
    "actions.download": "Download",
    "actions.processing": "Processing...",
    "actions.downloading": "Downloading...",
    "actions.done": "Done",
    "actions.paste": "Paste",
    "hint.ffmpeg": "Some formats need ffmpeg.",
    "form.processing": "Processing link...",
    "form.downloading": "Downloading...",
    "preview.cover": "Cover",
    "preview.duration": "Duration",
    "preview.resolution": "Resolution",
    "preview.size": "Size",
    "preview.status": "Status",
    "preview.analyze": "Analyze time",
    "preview.download": "Download time",
    "sections.formatsTitle": "Formats & Qualities",
    "sections.featuresTitle": "Why CyberDrop",
    "sections.platformsTitle": "Platforms",
    "formats.video.title": "Video",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "Audio",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "High quality",
    "formats.auto.title": "Auto",
    "formats.auto.desc": "Best match",
    "formats.auto.note": "Fast start",
    "features.one.title": "Smart detection",
    "features.one.desc": "Auto-detects the platform from the URL.",
    "features.two.title": "More formats",
    "features.two.desc": "Video + audio with flexible quality.",
    "features.three.title": "Mobile ready",
    "features.three.desc": "Looks great on any screen.",
    "ad.label": "Ad Space",
    "footer.tagline": "Drop the link. Download instantly.",
    "quality.auto": "Auto",
    "quality.multi": "Multi",
    "fileType.mp4": "MP4 Video",
    "fileType.webm": "WebM Video",
    "fileType.mp3": "MP3 Audio",
    "fileType.m4a": "M4A Audio",
    "fileType.wav": "WAV Audio",
    "status.ready": "Ready",
    "status.analyzing": "Analyzing...",
    "status.preparing": "Preparing...",
    "status.preview": "Preview only",
    "status.done": "Done",
    "status.waiting": "Waiting for server",
    "toast.invalidLink": "Invalid link",
    "toast.linkAnalyzed": "Link analyzed",
    "toast.serverUnavailable": "Server unavailable, preview only",
    "toast.downloadStarted": "Download started",
    "toast.pasteFailed": "Clipboard access blocked",
    "toast.pasteEmpty": "Clipboard is empty",
    "toast.enterValidLink": "Enter a valid link",
    "toast.downloadServerRequired": "Download server required",
    "error.ffmpeg": "ffmpeg is required for this format",
    "error.ytdlp": "yt-dlp is not available",
    "error.formatUnavailable": "Selected quality not available, using best",
    "error.unsupportedDomain": "This site is not supported",
    "input.placeholder": "https://www.tiktok.com/@...",
    "input.placeholder.tiktok": "https://www.tiktok.com/@user/video/123",
    "input.placeholder.instagram": "https://www.instagram.com/reel/...",
    "input.placeholder.youtube": "https://youtu.be/...",
    "input.placeholder.facebook": "https://www.facebook.com/reel/...",
    "input.placeholder.pinterest": "https://www.pinterest.com/pin/...",
    "input.placeholder.twitter": "https://x.com/i/status/...",
    "meta.creator": "Creator",
  },
  ar: {
    title: "سايبردروب | مركز تحميل نيون",
    "brand.tag": "ضع الرابط. حمّل فورًا.",
    "nav.download": "تحميل",
    "nav.formats": "الصيغ",
    "nav.features": "المزايا",
    "nav.platforms": "المنصات",
    "lang.label": "اللغة",
    "hero.title": "ضع الرابط لتحصل على الفيديو فورًا.",
    "hero.subtitle": "الصق الرابط، اختر النوع والجودة، ثم حمّل فورًا.",
    "card.title": "الصق الرابط",
    "card.subtitle": "تعرف فوري على المنصة وجودات ذكية.",
    "labels.fileType": "نوع الملف",
    "labels.quality": "الجودة",
    "actions.download": "تحميل",
    "actions.processing": "جارٍ المعالجة",
    "actions.downloading": "يتم التحميل",
    "actions.done": "تم",
    "actions.paste": "لصق",
    "hint.ffmpeg": "بعض الصيغ تحتاج ffmpeg.",
    "form.processing": "جارٍ معالجة الرابط...",
    "form.downloading": "جارٍ التحميل...",
    "preview.cover": "الغلاف",
    "preview.duration": "المدة",
    "preview.resolution": "الدقة",
    "preview.size": "الحجم",
    "preview.status": "الحالة",
    "preview.analyze": "وقت التحليل",
    "preview.download": "وقت التحميل",
    "sections.formatsTitle": "الصيغ والجودات",
    "sections.featuresTitle": "لماذا CyberDrop",
    "sections.platformsTitle": "المنصات",
    "formats.video.title": "فيديو",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "صوت",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "جودة عالية",
    "formats.auto.title": "تلقائي",
    "formats.auto.desc": "أفضل تطابق",
    "formats.auto.note": "بداية سريعة",
    "features.one.title": "كشف ذكي",
    "features.one.desc": "يتعرف على المنصة تلقائيًا من الرابط.",
    "features.two.title": "صيغ أكثر",
    "features.two.desc": "فيديو + صوت بجودة مرنة.",
    "features.three.title": "جاهز للموبايل",
    "features.three.desc": "يعمل بشكل رائع على أي شاشة.",
    "ad.label": "مساحة إعلانية",
    "footer.tagline": "ضع الرابط. حمّل فورًا.",
    "quality.auto": "تلقائي",
    "quality.multi": "متعدد",
    "fileType.mp4": "فيديو MP4",
    "fileType.webm": "فيديو WebM",
    "fileType.mp3": "صوت MP3",
    "fileType.m4a": "صوت M4A",
    "fileType.wav": "صوت WAV",
    "status.ready": "جاهز",
    "status.analyzing": "جارٍ التحليل...",
    "status.preparing": "جارٍ التحضير...",
    "status.preview": "معاينة فقط",
    "status.done": "تم",
    "status.waiting": "بانتظار الخادم",
    "toast.invalidLink": "الرابط غير صالح",
    "toast.linkAnalyzed": "تم تحليل الرابط",
    "toast.serverUnavailable": "الخادم غير متاح، معاينة فقط",
    "toast.downloadStarted": "بدأ التحميل",
    "toast.pasteFailed": "تعذر الوصول للحافظة",
    "toast.pasteEmpty": "الحافظة فارغة",
    "toast.enterValidLink": "أدخل رابطًا صحيحًا",
    "toast.downloadServerRequired": "يلزم خادم للتحميل",
    "error.ffmpeg": "مطلوب ffmpeg لهذه الصيغة",
    "error.ytdlp": "yt-dlp غير متاح",
    "error.formatUnavailable": "الجودة غير متاحة، سيتم اختيار الأفضل",
    "error.unsupportedDomain": "هذا الموقع غير مدعوم",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "صانع المحتوى",
  },
  ja: {
    title: "CyberDrop | ネオンダウンロード",
    "brand.tag": "リンクを貼って、即ダウンロード。",
    "nav.download": "ダウンロード",
    "nav.formats": "形式",
    "nav.features": "特徴",
    "nav.platforms": "プラットフォーム",
    "lang.label": "言語",
    "hero.title": "リンクを貼って、すぐ動画を取得。",
    "hero.subtitle": "リンクを貼って、形式と品質を選び、すぐ保存。",
    "card.title": "リンクを貼り付け",
    "card.subtitle": "プラットフォームを即判定、品質も賢く。",
    "labels.fileType": "ファイル種類",
    "labels.quality": "画質",
    "actions.download": "ダウンロード",
    "actions.processing": "処理中...",
    "actions.downloading": "ダウンロード中...",
    "actions.done": "完了",
    "actions.paste": "貼り付け",
    "hint.ffmpeg": "一部形式にはffmpegが必要です。",
    "form.processing": "リンクを処理しています...",
    "form.downloading": "ダウンロード中...",
    "preview.cover": "カバー",
    "preview.duration": "長さ",
    "preview.resolution": "解像度",
    "preview.size": "サイズ",
    "preview.status": "状態",
    "preview.analyze": "解析時間",
    "preview.download": "ダウンロード時間",
    "sections.formatsTitle": "形式と品質",
    "sections.featuresTitle": "CyberDrop の強み",
    "sections.platformsTitle": "プラットフォーム",
    "formats.video.title": "動画",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "音声",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "高音質",
    "formats.auto.title": "自動",
    "formats.auto.desc": "最適化",
    "formats.auto.note": "すぐ開始",
    "features.one.title": "スマート判定",
    "features.one.desc": "URLから自動で判定。",
    "features.two.title": "多彩な形式",
    "features.two.desc": "動画・音声を柔軟な品質で。",
    "features.three.title": "モバイル対応",
    "features.three.desc": "どの画面でも美しく。",
    "ad.label": "広告枠",
    "footer.tagline": "リンクを貼って、即ダウンロード。",
    "quality.auto": "自動",
    "quality.multi": "複数",
    "fileType.mp4": "MP4 動画",
    "fileType.webm": "WebM 動画",
    "fileType.mp3": "MP3 音声",
    "fileType.m4a": "M4A 音声",
    "fileType.wav": "WAV 音声",
    "status.ready": "準備完了",
    "status.analyzing": "解析中...",
    "status.preparing": "準備中...",
    "status.preview": "プレビューのみ",
    "status.done": "完了",
    "status.waiting": "サーバー待ち",
    "toast.invalidLink": "無効なリンク",
    "toast.linkAnalyzed": "リンク解析完了",
    "toast.serverUnavailable": "サーバー未接続（プレビューのみ）",
    "toast.downloadStarted": "ダウンロード開始",
    "toast.pasteFailed": "クリップボードにアクセスできません",
    "toast.pasteEmpty": "クリップボードが空です",
    "toast.enterValidLink": "有効なリンクを入力",
    "toast.downloadServerRequired": "ダウンロードサーバーが必要です",
    "error.ffmpeg": "この形式にはffmpegが必要です",
    "error.ytdlp": "yt-dlp が見つかりません",
    "error.formatUnavailable": "選択した品質がないため最適を使用します",
    "error.unsupportedDomain": "このサイトは未対応です",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "クリエイター",
  },
  zh: {
    title: "CyberDrop | 霓虹下载中心",
    "brand.tag": "放入链接，立即下载。",
    "nav.download": "下载",
    "nav.formats": "格式",
    "nav.features": "特性",
    "nav.platforms": "平台",
    "lang.label": "语言",
    "hero.title": "粘贴链接，立即获取视频。",
    "hero.subtitle": "粘贴链接，选择格式与清晰度，立即下载。",
    "card.title": "粘贴链接",
    "card.subtitle": "平台秒识别，清晰度更智能。",
    "labels.fileType": "文件类型",
    "labels.quality": "清晰度",
    "actions.download": "下载",
    "actions.processing": "处理中...",
    "actions.downloading": "下载中...",
    "actions.done": "完成",
    "actions.paste": "粘贴",
    "hint.ffmpeg": "部分格式需要 ffmpeg。",
    "form.processing": "正在处理链接...",
    "form.downloading": "正在下载...",
    "preview.cover": "封面",
    "preview.duration": "时长",
    "preview.resolution": "分辨率",
    "preview.size": "大小",
    "preview.status": "状态",
    "preview.analyze": "解析时间",
    "preview.download": "下载时间",
    "sections.formatsTitle": "格式与清晰度",
    "sections.featuresTitle": "为什么是 CyberDrop",
    "sections.platformsTitle": "平台",
    "formats.video.title": "视频",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "音频",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "高品质",
    "formats.auto.title": "自动",
    "formats.auto.desc": "最佳匹配",
    "formats.auto.note": "快速开始",
    "features.one.title": "智能识别",
    "features.one.desc": "自动识别链接平台。",
    "features.two.title": "更多格式",
    "features.two.desc": "视频与音频，清晰度可选。",
    "features.three.title": "移动友好",
    "features.three.desc": "手机也很好看。",
    "ad.label": "广告位",
    "footer.tagline": "放入链接，立即下载。",
    "quality.auto": "自动",
    "quality.multi": "多选",
    "fileType.mp4": "MP4 视频",
    "fileType.webm": "WebM 视频",
    "fileType.mp3": "MP3 音频",
    "fileType.m4a": "M4A 音频",
    "fileType.wav": "WAV 音频",
    "status.ready": "就绪",
    "status.analyzing": "解析中...",
    "status.preparing": "准备中...",
    "status.preview": "仅预览",
    "status.done": "完成",
    "status.waiting": "等待服务器",
    "toast.invalidLink": "链接无效",
    "toast.linkAnalyzed": "链接已解析",
    "toast.serverUnavailable": "服务器不可用，仅预览",
    "toast.downloadStarted": "开始下载",
    "toast.pasteFailed": "无法访问剪贴板",
    "toast.pasteEmpty": "剪贴板为空",
    "toast.enterValidLink": "请输入有效链接",
    "toast.downloadServerRequired": "需要下载服务器",
    "error.ffmpeg": "该格式需要 ffmpeg",
    "error.ytdlp": "未找到 yt-dlp",
    "error.formatUnavailable": "所选清晰度不可用，已改为最佳",
    "error.unsupportedDomain": "该网站不受支持",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "创作者",
  },
  ru: {
    title: "CyberDrop | Неоновый центр",
    "brand.tag": "Вставьте ссылку. Скачайте мгновенно.",
    "nav.download": "Скачать",
    "nav.formats": "Форматы",
    "nav.features": "Преимущества",
    "nav.platforms": "Платформы",
    "lang.label": "Язык",
    "hero.title": "Вставьте ссылку — и получите видео мгновенно.",
    "hero.subtitle": "Вставьте ссылку, выберите тип и качество — и скачайте.",
    "card.title": "Вставьте ссылку",
    "card.subtitle": "Мгновенное распознавание и умное качество.",
    "labels.fileType": "Тип файла",
    "labels.quality": "Качество",
    "actions.download": "Скачать",
    "actions.processing": "Обработка...",
    "actions.downloading": "Загрузка...",
    "actions.done": "Готово",
    "actions.paste": "Вставить",
    "hint.ffmpeg": "Некоторые форматы требуют ffmpeg.",
    "form.processing": "Обработка ссылки...",
    "form.downloading": "Загрузка...",
    "preview.cover": "Обложка",
    "preview.duration": "Длительность",
    "preview.resolution": "Разрешение",
    "preview.size": "Размер",
    "preview.status": "Статус",
    "preview.analyze": "Время анализа",
    "preview.download": "Время загрузки",
    "sections.formatsTitle": "Форматы и качество",
    "sections.featuresTitle": "Почему CyberDrop",
    "sections.platformsTitle": "Платформы",
    "formats.video.title": "Видео",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "Аудио",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "Высокое качество",
    "formats.auto.title": "Авто",
    "formats.auto.desc": "Лучшее совпадение",
    "formats.auto.note": "Быстрый старт",
    "features.one.title": "Умное распознавание",
    "features.one.desc": "Автоопределение платформы по URL.",
    "features.two.title": "Больше форматов",
    "features.two.desc": "Видео и аудио с гибким качеством.",
    "features.three.title": "Для мобильных",
    "features.three.desc": "Отлично выглядит на любом экране.",
    "ad.label": "Рекламное место",
    "footer.tagline": "Вставьте ссылку. Скачайте мгновенно.",
    "quality.auto": "Авто",
    "quality.multi": "Несколько",
    "fileType.mp4": "MP4 видео",
    "fileType.webm": "WebM видео",
    "fileType.mp3": "MP3 аудио",
    "fileType.m4a": "M4A аудио",
    "fileType.wav": "WAV аудио",
    "status.ready": "Готово",
    "status.analyzing": "Анализ...",
    "status.preparing": "Подготовка...",
    "status.preview": "Только предпросмотр",
    "status.done": "Готово",
    "status.waiting": "Ожидание сервера",
    "toast.invalidLink": "Некорректная ссылка",
    "toast.linkAnalyzed": "Ссылка проанализирована",
    "toast.serverUnavailable": "Сервер недоступен, только предпросмотр",
    "toast.downloadStarted": "Загрузка началась",
    "toast.pasteFailed": "Нет доступа к буферу обмена",
    "toast.pasteEmpty": "Буфер обмена пуст",
    "toast.enterValidLink": "Введите корректную ссылку",
    "toast.downloadServerRequired": "Нужен сервер для загрузки",
    "error.ffmpeg": "Для этого формата нужен ffmpeg",
    "error.ytdlp": "yt-dlp недоступен",
    "error.formatUnavailable": "Выбранное качество недоступно, используем лучшее",
    "error.unsupportedDomain": "Этот сайт не поддерживается",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "Автор",
  },
  fr: {
    title: "CyberDrop | Hub de téléchargement néon",
    "brand.tag": "Collez le lien. Téléchargez instantanément.",
    "nav.download": "Télécharger",
    "nav.formats": "Formats",
    "nav.features": "Fonctionnalités",
    "nav.platforms": "Plateformes",
    "lang.label": "Langue",
    "hero.title": "Collez un lien et obtenez la vidéo instantanément.",
    "hero.subtitle":
      "Collez un lien, choisissez le type et la qualité, téléchargez instantanément.",
    "card.title": "Collez votre lien",
    "card.subtitle": "Détection instantanée de la plateforme et qualité intelligente.",
    "labels.fileType": "Type de fichier",
    "labels.quality": "Qualité",
    "actions.download": "Télécharger",
    "actions.processing": "Traitement...",
    "actions.downloading": "Téléchargement...",
    "actions.done": "Terminé",
    "actions.paste": "Coller",
    "hint.ffmpeg": "Certains formats nécessitent ffmpeg.",
    "form.processing": "Traitement du lien...",
    "form.downloading": "Téléchargement...",
    "preview.cover": "Couverture",
    "preview.duration": "Durée",
    "preview.resolution": "Résolution",
    "preview.size": "Taille",
    "preview.status": "Statut",
    "preview.analyze": "Temps d’analyse",
    "preview.download": "Temps de téléchargement",
    "sections.formatsTitle": "Formats et qualités",
    "sections.featuresTitle": "Pourquoi CyberDrop",
    "sections.platformsTitle": "Plateformes",
    "formats.video.title": "Vidéo",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "Audio",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "Haute qualité",
    "formats.auto.title": "Auto",
    "formats.auto.desc": "Meilleure correspondance",
    "formats.auto.note": "Démarrage rapide",
    "features.one.title": "Détection intelligente",
    "features.one.desc": "Détecte automatiquement la plateforme depuis l’URL.",
    "features.two.title": "Plus de formats",
    "features.two.desc": "Vidéo + audio avec une qualité flexible.",
    "features.three.title": "Optimisé mobile",
    "features.three.desc": "Superbe sur tous les écrans.",
    "ad.label": "Espace pub",
    "footer.tagline": "Collez le lien. Téléchargez instantanément.",
    "quality.auto": "Auto",
    "quality.multi": "Multiple",
    "fileType.mp4": "Vidéo MP4",
    "fileType.webm": "Vidéo WebM",
    "fileType.mp3": "Audio MP3",
    "fileType.m4a": "Audio M4A",
    "fileType.wav": "Audio WAV",
    "status.ready": "Prêt",
    "status.analyzing": "Analyse...",
    "status.preparing": "Préparation...",
    "status.preview": "Aperçu uniquement",
    "status.done": "Terminé",
    "status.waiting": "En attente du serveur",
    "toast.invalidLink": "Lien invalide",
    "toast.linkAnalyzed": "Lien analysé",
    "toast.serverUnavailable": "Serveur indisponible, aperçu uniquement",
    "toast.downloadStarted": "Téléchargement démarré",
    "toast.pasteFailed": "Accès au presse-papiers refusé",
    "toast.pasteEmpty": "Presse-papiers vide",
    "toast.enterValidLink": "Entrez un lien valide",
    "toast.downloadServerRequired": "Serveur de téléchargement requis",
    "error.ffmpeg": "ffmpeg est requis pour ce format",
    "error.ytdlp": "yt-dlp n’est pas disponible",
    "error.formatUnavailable": "Qualité indisponible, utilisation du meilleur",
    "error.unsupportedDomain": "Ce site n’est pas pris en charge",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "Créateur",
  },
  es: {
    title: "CyberDrop | Centro de descargas neón",
    "brand.tag": "Pega el enlace. Descarga al instante.",
    "nav.download": "Descargar",
    "nav.formats": "Formatos",
    "nav.features": "Características",
    "nav.platforms": "Plataformas",
    "lang.label": "Idioma",
    "hero.title": "Pega un enlace y obtén el video al instante.",
    "hero.subtitle":
      "Pega un enlace, elige tipo y calidad, descarga al instante.",
    "card.title": "Pega tu enlace",
    "card.subtitle": "Detección instantánea de plataforma y calidad inteligente.",
    "labels.fileType": "Tipo de archivo",
    "labels.quality": "Calidad",
    "actions.download": "Descargar",
    "actions.processing": "Procesando...",
    "actions.downloading": "Descargando...",
    "actions.done": "Listo",
    "actions.paste": "Pegar",
    "hint.ffmpeg": "Algunos formatos requieren ffmpeg.",
    "form.processing": "Procesando enlace...",
    "form.downloading": "Descargando...",
    "preview.cover": "Portada",
    "preview.duration": "Duración",
    "preview.resolution": "Resolución",
    "preview.size": "Tamaño",
    "preview.status": "Estado",
    "preview.analyze": "Tiempo de análisis",
    "preview.download": "Tiempo de descarga",
    "sections.formatsTitle": "Formatos y calidades",
    "sections.featuresTitle": "Por qué CyberDrop",
    "sections.platformsTitle": "Plataformas",
    "formats.video.title": "Video",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "Audio",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "Alta calidad",
    "formats.auto.title": "Auto",
    "formats.auto.desc": "Mejor coincidencia",
    "formats.auto.note": "Inicio rápido",
    "features.one.title": "Detección inteligente",
    "features.one.desc": "Detecta la plataforma automáticamente desde la URL.",
    "features.two.title": "Más formatos",
    "features.two.desc": "Video + audio con calidad flexible.",
    "features.three.title": "Listo para móvil",
    "features.three.desc": "Se ve genial en cualquier pantalla.",
    "ad.label": "Espacio publicitario",
    "footer.tagline": "Pega el enlace. Descarga al instante.",
    "quality.auto": "Auto",
    "quality.multi": "Múltiple",
    "fileType.mp4": "Video MP4",
    "fileType.webm": "Video WebM",
    "fileType.mp3": "Audio MP3",
    "fileType.m4a": "Audio M4A",
    "fileType.wav": "Audio WAV",
    "status.ready": "Listo",
    "status.analyzing": "Analizando...",
    "status.preparing": "Preparando...",
    "status.preview": "Solo vista previa",
    "status.done": "Hecho",
    "status.waiting": "Esperando servidor",
    "toast.invalidLink": "Enlace inválido",
    "toast.linkAnalyzed": "Enlace analizado",
    "toast.serverUnavailable": "Servidor no disponible, solo vista previa",
    "toast.downloadStarted": "Descarga iniciada",
    "toast.pasteFailed": "Acceso al portapapeles bloqueado",
    "toast.pasteEmpty": "Portapapeles vacío",
    "toast.enterValidLink": "Introduce un enlace válido",
    "toast.downloadServerRequired": "Se requiere servidor de descarga",
    "error.ffmpeg": "ffmpeg es necesario para este formato",
    "error.ytdlp": "yt-dlp no está disponible",
    "error.formatUnavailable":
      "La calidad seleccionada no está disponible, se usará la mejor",
    "error.unsupportedDomain": "Este sitio no es compatible",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "Creador",
  },
  de: {
    title: "CyberDrop | Neon-Download-Hub",
    "brand.tag": "Link einfügen. Sofort herunterladen.",
    "nav.download": "Herunterladen",
    "nav.formats": "Formate",
    "nav.features": "Funktionen",
    "nav.platforms": "Plattformen",
    "lang.label": "Sprache",
    "hero.title": "Link einfügen und Video sofort erhalten.",
    "hero.subtitle":
      "Link einfügen, Typ und Qualität wählen, sofort herunterladen.",
    "card.title": "Link einfügen",
    "card.subtitle": "Sofortige Plattform-Erkennung und smarte Qualität.",
    "labels.fileType": "Dateityp",
    "labels.quality": "Qualität",
    "actions.download": "Herunterladen",
    "actions.processing": "Verarbeitung...",
    "actions.downloading": "Lädt...",
    "actions.done": "Fertig",
    "actions.paste": "Einfügen",
    "hint.ffmpeg": "Einige Formate benötigen ffmpeg.",
    "form.processing": "Link wird verarbeitet...",
    "form.downloading": "Wird heruntergeladen...",
    "preview.cover": "Titelbild",
    "preview.duration": "Dauer",
    "preview.resolution": "Auflösung",
    "preview.size": "Größe",
    "preview.status": "Status",
    "preview.analyze": "Analysezeit",
    "preview.download": "Downloadzeit",
    "sections.formatsTitle": "Formate & Qualität",
    "sections.featuresTitle": "Warum CyberDrop",
    "sections.platformsTitle": "Plattformen",
    "formats.video.title": "Video",
    "formats.video.desc": "MP4 · WebM",
    "formats.video.note": "360p → 4K",
    "formats.audio.title": "Audio",
    "formats.audio.desc": "MP3 · M4A · WAV",
    "formats.audio.note": "Hohe Qualität",
    "formats.auto.title": "Auto",
    "formats.auto.desc": "Beste Wahl",
    "formats.auto.note": "Schneller Start",
    "features.one.title": "Smart-Erkennung",
    "features.one.desc": "Erkennt die Plattform automatisch über die URL.",
    "features.two.title": "Mehr Formate",
    "features.two.desc": "Video + Audio mit flexibler Qualität.",
    "features.three.title": "Mobil bereit",
    "features.three.desc": "Sieht auf jedem Bildschirm gut aus.",
    "ad.label": "Werbefläche",
    "footer.tagline": "Link einfügen. Sofort herunterladen.",
    "quality.auto": "Auto",
    "quality.multi": "Mehrfach",
    "fileType.mp4": "MP4-Video",
    "fileType.webm": "WebM-Video",
    "fileType.mp3": "MP3-Audio",
    "fileType.m4a": "M4A-Audio",
    "fileType.wav": "WAV-Audio",
    "status.ready": "Bereit",
    "status.analyzing": "Analysiere...",
    "status.preparing": "Vorbereiten...",
    "status.preview": "Nur Vorschau",
    "status.done": "Fertig",
    "status.waiting": "Warte auf Server",
    "toast.invalidLink": "Ungültiger Link",
    "toast.linkAnalyzed": "Link analysiert",
    "toast.serverUnavailable": "Server nicht verfügbar, nur Vorschau",
    "toast.downloadStarted": "Download gestartet",
    "toast.pasteFailed": "Zwischenablagezugriff blockiert",
    "toast.pasteEmpty": "Zwischenablage ist leer",
    "toast.enterValidLink": "Gültigen Link eingeben",
    "toast.downloadServerRequired": "Download-Server erforderlich",
    "error.ffmpeg": "ffmpeg ist für dieses Format erforderlich",
    "error.ytdlp": "yt-dlp ist nicht verfügbar",
    "error.formatUnavailable":
      "Gewählte Qualität nicht verfügbar, beste wird verwendet",
    "error.unsupportedDomain": "Diese Website wird nicht unterstützt",
    "input.placeholder": "https://www.tiktok.com/@...",
    "meta.creator": "Ersteller",
  },
};

fileTypeSelect.addEventListener("change", () => {
  currentType = fileTypeSelect.value;
  userSelectedQuality = false;
  updateQualityOptions(currentMeta);
  setDownloadButtonState("idle");
});

qualitySelect.addEventListener("change", () => {
  currentQuality = qualitySelect.value;
  userSelectedQuality = true;
  setDownloadButtonState("idle");
});

multiQualityToggle.addEventListener("change", () => {
  updateQualityOptions(currentMeta);
  setDownloadButtonState("idle");
});

downloadBtn.addEventListener("click", () => handleDownload());

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    urlInput.value = "";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    urlInput.focus();
  });
}

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    const value = (text || "").trim();
    if (!value) {
      showToast(t("toast.pasteEmpty"));
      return;
    }
    urlInput.value = value;
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    if (validateUrl(value)) {
      analyzeUrl({ silent: true });
    }
  } catch (error) {
    showToast(t("toast.pasteFailed"));
  }
});

langSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

urlInput.addEventListener("input", () => {
  const value = urlInput.value.trim();
  if (clearBtn) clearBtn.classList.toggle("is-visible", Boolean(value));
  if (!value) {
    platformLabel.textContent = "—";
    thumbPlatform.textContent = "—";
    clearPreview();
    lastAnalyzedUrl = "";
    userSelectedQuality = false;
    setDownloadButtonState("idle");
  } else {
    const platform = detectPlatform(value);
    updatePlatformLabel(platform);
    if (validateUrl(value)) {
      primeVideoPreview(value);
    }
    userSelectedQuality = false;
    setDownloadButtonState("idle");
    scheduleAnalyze();
  }
});

urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    const value = urlInput.value.trim();
    if (validateUrl(value)) {
      primeVideoPreview(value);
      analyzeUrl({ silent: true });
    }
  }, 50);
});

document.querySelectorAll(".reveal").forEach((el, index) => {
  setTimeout(() => {
    el.classList.add("is-visible");
  }, 120 + index * 140);
});

videoPlayer.addEventListener("loadeddata", () => {
  thumb.classList.add("has-video");
});

videoPlayer.addEventListener("error", () => {
  const fallback = videoPlayer.dataset.fallback;
  if (fallback && !videoPlayer.dataset.usedFallback) {
    videoPlayer.dataset.usedFallback = "1";
    videoPlayer.src = fallback;
    videoPlayer.load();
    return;
  }
  thumb.classList.remove("has-video");
});

initializeLanguage();
renderFileTypeOptions();
updateQualityOptions(null);
if (pagePlatform && !urlInput.value.trim()) {
  updatePlatformLabel(pagePlatform);
}
highlightPlatformLinks();
if (clearBtn) clearBtn.classList.toggle("is-visible", Boolean(urlInput.value.trim()));

function highlightPlatformLinks() {
  const links = document.querySelectorAll("[data-platform-link]");
  links.forEach((link) => {
    if (pagePlatform && link.dataset.platformLink === pagePlatform) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
}

function t(key) {
  const langMap = i18n[currentLang] || i18n.en || {};
  if (pagePlatform) {
    const platformKey = `${key}.${pagePlatform}`;
    if (langMap[platformKey]) return langMap[platformKey];
  }
  return langMap[key] || i18n.en[key] || key;
}

function initializeLanguage() {
  const saved = localStorage.getItem("lang");
  const browser = navigator.language?.slice(0, 2);
  const initial = [saved, browser, "en"].find((lang) => i18n[lang]);
  setLanguage(initial || "en");
}

function setLanguage(lang) {
  currentLang = i18n[lang] ? lang : "en";
  localStorage.setItem("lang", currentLang);
  document.documentElement.lang = currentLang;
  document.documentElement.dir = rtlLangs.has(currentLang) ? "rtl" : "ltr";
  langSelect.value = currentLang;
  applyTranslations();
}

function applyTranslations() {
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = t(key);
  });
  renderFileTypeOptions();
  updateQualityOptions(currentMeta);
  setStatus(currentStatusKey);
  updateFormMessage();
  setDownloadButtonState(currentButtonState);
}

function renderFileTypeOptions() {
  fileTypeSelect.innerHTML = "";
  for (const optionDef of fileTypeOptions) {
    const option = document.createElement("option");
    option.value = optionDef.value;
    option.textContent = t(optionDef.key);
    fileTypeSelect.appendChild(option);
  }
  fileTypeSelect.value = currentType;
}

function detectPlatform(url) {
  const value = url.toLowerCase();
  if (value.includes("tiktok.com")) return "tiktok";
  if (value.includes("instagram.com")) return "instagram";
  if (value.includes("youtube.com") || value.includes("youtu.be"))
    return "youtube";
  if (value.includes("facebook.com") || value.includes("fb.watch"))
    return "facebook";
  if (value.includes("pinterest.com") || value.includes("pin.it"))
    return "pinterest";
  if (value.includes("twitter.com") || value.includes("x.com") || value.includes("t.co"))
    return "twitter";
  if (value.includes("reddit.com") || value.includes("redd.it"))
    return "reddit";
  if (value.includes("spotify.com")) return "spotify";
  return "unknown";
}

function updatePlatformLabel(platform) {
  const label = PLATFORM_STYLES[platform] || PLATFORM_STYLES.unknown;
  platformLabel.textContent = label;
  thumbPlatform.textContent = label;
}

function validateUrl(url) {
  return /https?:\/\/\S+/i.test(url);
}

async function analyzeUrl(options = {}) {
  const { silent = false, force = false } = options;
  const url = urlInput.value.trim();
  if (!validateUrl(url)) {
    if (!silent) showToast(t("toast.invalidLink"));
    return;
  }

  if (isAnalyzing) {
    pendingAnalyze = true;
    return;
  }

  if (!force && url === lastAnalyzedUrl && currentMeta && metaSource === "server") {
    return;
  }

  const platform = detectPlatform(url);
  if (BLOCKED_PLATFORMS.has(platform)) {
    clearPreview();
    updatePlatformLabel("unknown");
    showToast(t("error.unsupportedDomain"));
    return;
  }
  updatePlatformLabel(platform);
  setStatus("status.analyzing");
  setDownloadButtonState("processing");
  setProgress(10);
  setFormBusy(true, "form.processing");
  isAnalyzing = true;
  const analyzeStart = performance.now();

  try {
    const data = await fetchMetadata(url);
    currentMeta = data;
    metaSource = "server";
    renderPreview(data, platform);
    updateQualityOptions(data);
    setAnalyzeTime(performance.now() - analyzeStart);
    lastAnalyzedUrl = url;
    if (!silent) showToast(t("toast.linkAnalyzed"));
    setStatus("status.ready");
  } catch (error) {
    const hadMeta = currentMeta && lastAnalyzedUrl === url;
    if (!hadMeta) {
      const data = mockMetadata(platform);
      currentMeta = data;
      metaSource = "fallback";
      renderPreview(data, platform);
      updateQualityOptions(data);
    }
    setAnalyzeTime(performance.now() - analyzeStart);
    lastAnalyzedUrl = url;
    if (!silent) {
      showToast(localizeServerMessage(formatErrorMessage(error)) || t("toast.serverUnavailable"));
    }
    setStatus(hadMeta ? "status.ready" : "status.preview");
  } finally {
    isAnalyzing = false;
    setFormBusy(false);
    setDownloadButtonState("idle");
    if (pendingAnalyze) {
      pendingAnalyze = false;
      analyzeUrl({ silent: true });
    }
    if (pendingDownload) {
      pendingDownload = false;
      handleDownload({ skipAnalyze: true });
    }
    setProgress(0);
  }
}

async function fetchMetadata(url) {
  const attempt = async (attemptIndex) => {
    const controller = new AbortController();
    const timeoutMs = attemptIndex === 0 ? 12000 : 15000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        apiUrl(`/api/metadata?url=${encodeURIComponent(url)}`),
        { signal: controller.signal }
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt(0);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return attempt(1);
  }
}

function mockMetadata(platform) {
  return {
    title: "—",
    author: "—",
    duration: "—",
    resolution: "—",
    size: "—",
    thumbnail: "",
    qualities: [],
    audioQualities: [],
    aspectRatio: "",
  };
}

function renderPreview(data, platform) {
  videoTitle.textContent = data.title || "—";
  thumbTitle.textContent = data.title || "—";
  videoAuthor.textContent = data.author || "—";
  videoDuration.textContent = data.duration || "—";
  videoResolution.textContent = data.resolution || "—";
  videoSize.textContent = data.size || "—";
  setThumbAspect(data, platform, urlInput.value.trim());

  if (data.thumbnail) {
    thumb.style.backgroundImage = `url('${data.thumbnail}')`;
    thumb.style.backgroundSize = "cover";
    thumb.style.backgroundPosition = "center";
  } else {
    thumb.style.backgroundImage =
      "linear-gradient(130deg, #0f172a, #00f5ff)";
  }

  updateVideoPlayer(data, urlInput.value.trim());
  updatePlatformLabel(platform);
}

async function handleDownload(options = {}) {
  const { skipAnalyze = false } = options;
  const url = urlInput.value.trim();
  if (!validateUrl(url)) {
    showToast(t("toast.enterValidLink"));
    return;
  }

  const platform = detectPlatform(url);
  if (BLOCKED_PLATFORMS.has(platform)) {
    showToast(t("error.unsupportedDomain"));
    return;
  }

  if (isAnalyzing) {
    pendingDownload = true;
    return;
  }

  if (!skipAnalyze) {
    if (!currentMeta || lastAnalyzedUrl !== url) {
      await analyzeUrl({ silent: true });
    }
    if (metaSource !== "server") {
      await analyzeUrl({ silent: true, force: true });
    }
  }
  setStatus("status.preparing");
  startProgress();
  setDownloadButtonState("downloading");
  setFormBusy(true, "form.downloading");
  const downloadStart = performance.now();

  try {
    const qualitiesToDownload = getQualitiesForDownload();
    for (let index = 0; index < qualitiesToDownload.length; index += 1) {
      await downloadSingle(url, qualitiesToDownload[index]);
      showToast(t("toast.downloadStarted"));
    }
    setDownloadTime(performance.now() - downloadStart);
    setStatus("status.done");
    setDownloadButtonState("done");
  } catch (error) {
    setDownloadTime(performance.now() - downloadStart);
    showToast(localizeServerMessage(formatErrorMessage(error)) || t("toast.downloadServerRequired"));
    setStatus("status.waiting");
    setDownloadButtonState("idle");
  } finally {
    setFormBusy(false);
    stopProgress();
  }
}

async function downloadSingle(url, quality) {
  const downloadUrl = `/api/download?url=${encodeURIComponent(
    url
  )}&type=${encodeURIComponent(currentType)}&quality=${encodeURIComponent(
    quality || "auto"
  )}`;
  const response = await fetch(apiUrl(downloadUrl));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    throw new Error(await readErrorMessage(response));
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromHeader(response.headers.get("content-disposition")) ||
    buildFilenameForQuality(quality);
  triggerDownload(blob, filename);
}

function buildFilename() {
  const base = currentMeta?.title || "video";
  const ext = currentType || "mp4";
  return `${sanitizeFilename(base)}.${ext}`;
}

function buildFilenameForQuality(quality) {
  if (!quality || quality === "auto") return buildFilename();
  const base = currentMeta?.title || "video";
  const ext = currentType || "mp4";
  const suffix = isAudioType(currentType)
    ? `${quality}kbps`
    : `${quality}p`;
  return `${sanitizeFilename(base)}-${suffix}.${ext}`;
}
function sanitizeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim() || "video";
}

function getFilenameFromHeader(header) {
  if (!header) return "";
  const match = header.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : "";
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setStatus(key) {
  currentStatusKey = key;
  videoStatus.textContent = t(key);
}

function setProgress(value) {
  progressBar.style.width = `${value}%`;
}

function startProgress() {
  stopProgress();
  let progress = 5;
  progressBar.style.width = "5%";
  progressTimer = setInterval(() => {
    progress = Math.min(progress + randomBetween(3, 12), 90);
    progressBar.style.width = `${progress}%`;
  }, 420);
}

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  progressBar.style.width = "100%";
  setTimeout(() => {
    progressBar.style.width = "0%";
  }, 500);
}

function showToast(message) {
  toast.textContent = truncateMessage(message);
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    return data?.detail || data?.error || "Server error";
  }
  const text = await response.text().catch(() => "");
  return text ? text.slice(0, 160) : "Server error";
}

function formatErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || "";
}

function localizeServerMessage(message) {
  if (!message) return "";
  const lower = message.toLowerCase();
  if (lower.includes("ffmpeg required")) return t("error.ffmpeg");
  if (lower.includes("yt-dlp not found")) return t("error.ytdlp");
  if (lower.includes("requested format is not available"))
    return t("error.formatUnavailable");
  if (lower.includes("unsupported-domain")) return t("error.unsupportedDomain");
  return message;
}

function truncateMessage(message) {
  if (!message) return "";
  return message.length > 120 ? `${message.slice(0, 120)}...` : message;
}

function scheduleAnalyze() {
  if (analyzeTimer) clearTimeout(analyzeTimer);
  analyzeTimer = setTimeout(() => analyzeUrl({ silent: true }), 250);
}

function clearPreview() {
  videoTitle.textContent = "—";
  thumbTitle.textContent = "—";
  videoAuthor.textContent = "—";
  videoDuration.textContent = "—";
  videoResolution.textContent = "—";
  videoSize.textContent = "—";
  analyzeTime.textContent = "—";
  downloadTime.textContent = "—";
  metaSource = "none";
  setStatus("status.ready");
  thumb.style.backgroundImage = "linear-gradient(130deg, #0f172a, #00f5ff)";
  thumb.style.removeProperty("--thumb-ratio");
  clearVideoPlayer();
  updateQualityOptions(null);
  userSelectedQuality = false;
  setDownloadButtonState("idle");
}

function updateVideoPlayer(data, url) {
  if (!validateUrl(url)) {
    clearVideoPlayer();
    return;
  }

  const previewSrc = apiUrl(`/api/preview?url=${encodeURIComponent(url)}`);
  const fallbackSrc = data?.previewUrl || "";
  if (videoPlayer.dataset.src !== previewSrc) {
    thumb.classList.remove("has-video");
    videoPlayer.dataset.src = previewSrc;
    if (fallbackSrc) {
      videoPlayer.dataset.fallback = fallbackSrc;
      videoPlayer.dataset.usedFallback = "";
    } else {
      delete videoPlayer.dataset.fallback;
      delete videoPlayer.dataset.usedFallback;
    }
    videoPlayer.src = previewSrc;
    videoPlayer.load();
  }
  videoPlayer.poster = data?.thumbnail || "";
}

function clearVideoPlayer() {
  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  delete videoPlayer.dataset.src;
  delete videoPlayer.dataset.fallback;
  delete videoPlayer.dataset.usedFallback;
  videoPlayer.load();
  videoPlayer.poster = "";
  thumb.classList.remove("has-video");
}

function primeVideoPreview(url) {
  if (!validateUrl(url) || url === lastPreviewUrl) return;
  lastPreviewUrl = url;
  updateVideoPlayer({ thumbnail: "" }, url);
}

function updateQualityOptions(meta) {
  const list = isAudioType(currentType)
    ? meta?.audioQualities
    : meta?.qualities;
  const available = Array.isArray(list)
    ? list.map((value) => String(value))
    : [];
  currentQualityList = available;
  const hasMultiple = available.length > 1;

  multiQualityToggle.disabled = !hasMultiple;
  const toggleWrap = multiQualityToggle.closest(".quality-toggle");
  if (toggleWrap) {
    toggleWrap.classList.toggle("is-disabled", !hasMultiple);
  }
  if (!hasMultiple) {
    multiQualityToggle.checked = false;
    selectedQualities = [];
  }

  const prevSelected = new Set(selectedQualities);
  const hasAnyPrev = available.some((value) => prevSelected.has(value));
  if (!hasAnyPrev) {
    selectedQualities = [];
  }

  const current = currentQuality || "auto";
  const values =
    available.length ? ["auto", ...available] : ["auto"];
  const numericAvailable = available
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const highest =
    numericAvailable.length > 0
      ? String(Math.max(...numericAvailable))
      : "";

  qualitySelect.innerHTML = "";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    if (value === "auto") {
      const onlyQuality =
        available.length === 1
          ? isAudioType(currentType)
            ? `${available[0]} kbps`
            : `${available[0]}p`
          : "";
      option.textContent = onlyQuality
        ? `${t("quality.auto")} (${onlyQuality})`
        : t("quality.auto");
    } else {
      option.textContent = isAudioType(currentType)
        ? `${value} kbps`
        : `${value}p`;
    }
    qualitySelect.appendChild(option);
  }

  if (available.length === 1) {
    qualitySelect.value = available[0];
  } else if (!userSelectedQuality && highest && values.includes(highest)) {
    qualitySelect.value = highest;
  } else if (values.includes(current)) {
    qualitySelect.value = current;
  } else {
    qualitySelect.value = "auto";
  }

  currentQuality = qualitySelect.value;

  renderQualityList(available, hasMultiple);
  applyAvailability();
}

function isAudioType(type) {
  return type === "mp3" || type === "m4a" || type === "wav";
}

function setThumbAspect(data, platform, url) {
  let ratio = data?.aspectRatio;
  const lower = (url || "").toLowerCase();

  if (!ratio) {
    if (lower.includes("/shorts/") || lower.includes("tiktok.com") || lower.includes("/reel/")) {
      ratio = "9 / 16";
    }
  }

  thumb.style.setProperty("--thumb-ratio", ratio || "16 / 9");
}

function renderQualityList(available, hasMultiple) {
  qualityList.innerHTML = "";
  if (!multiQualityToggle.checked || !hasMultiple) {
    qualityList.classList.remove("is-visible");
    qualitySelect.disabled = false;
    qualityList.onchange = null;
    return;
  }

  qualitySelect.disabled = true;
  qualityList.classList.add("is-visible");

  const initialSelected =
    selectedQualities.length > 0 ? new Set(selectedQualities) : null;

  for (const value of available) {
    const label = document.createElement("label");
    label.className = "quality-chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = initialSelected ? initialSelected.has(value) : true;
    const text = document.createElement("span");
    text.textContent = isAudioType(currentType)
      ? `${value} kbps`
      : `${value}p`;
    label.appendChild(input);
    label.appendChild(text);
    qualityList.appendChild(label);
  }

  selectedQualities = Array.from(
    qualityList.querySelectorAll("input[type=checkbox]:checked")
  ).map((input) => input.value);

  qualityList.onchange = () => {
    selectedQualities = Array.from(
      qualityList.querySelectorAll("input[type=checkbox]:checked")
    ).map((input) => input.value);
  };
}

function getQualitiesForDownload() {
  if (multiQualityToggle.checked && currentQualityList.length > 1) {
    return selectedQualities.length
      ? selectedQualities
      : [...currentQualityList];
  }
  if (currentQualityList.length === 1) {
    return [currentQualityList[0]];
  }
  return [currentQuality];
}

function setAnalyzeTime(ms) {
  analyzeTime.textContent = formatTime(ms);
}

function setDownloadTime(ms) {
  downloadTime.textContent = formatTime(ms);
}

function formatTime(ms) {
  if (!Number.isFinite(ms)) return "—";
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function setDownloadButtonState(state) {
  currentButtonState = state;
  const map = {
    idle: "actions.download",
    processing: "actions.processing",
    downloading: "actions.downloading",
    done: "actions.done",
  };
  const key = map[state] || map.idle;
  downloadBtn.dataset.i18n = key;
  downloadBtn.textContent = t(key);
  downloadBtn.dataset.state = state;
}

function setFormBusy(isBusy, messageKey = "form.processing") {
  const controls = [
    fileTypeSelect,
    qualitySelect,
    multiQualityToggle,
    downloadBtn,
    clearBtn,
  ];

  if (isBusy) {
    urlInput.disabled = true;
    pasteBtn.disabled = true;
    controls.forEach((control) => {
      if (control) control.disabled = true;
    });
  } else {
    urlInput.disabled = false;
    pasteBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;
    applyAvailability();
  }

  qualityList
    .querySelectorAll("input[type=checkbox]")
    .forEach((input) => {
      input.disabled = isBusy;
    });
  qualityList.classList.toggle("is-disabled", isBusy);

  formMessage.classList.toggle("is-visible", isBusy);
  formMessageKey = messageKey || "form.processing";
  updateFormMessage();
}

function updateFormMessage() {
  if (formMessage.classList.contains("is-visible")) {
    formMessage.textContent = t(formMessageKey || "form.processing");
  } else {
    formMessage.textContent = "";
  }
}

function applyAvailability() {
  if (isAnalyzing) return;
  fileTypeSelect.disabled = false;
  downloadBtn.disabled = false;
  const multiEnabled = currentQualityList.length > 1;
  multiQualityToggle.disabled = !multiEnabled;
  qualitySelect.disabled = multiQualityToggle.checked;
  const listDisabled = !multiQualityToggle.checked;
  qualityList.classList.toggle("is-disabled", listDisabled);
  qualityList
    .querySelectorAll("input[type=checkbox]")
    .forEach((input) => {
      input.disabled = listDisabled;
    });
}
