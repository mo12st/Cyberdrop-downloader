const { getMetadata, toMetadata } = require("../server");

const urls = [
  "https://www.facebook.com/reel/1981599779124343/?mibextid=9drbnH&s=yWDuG2&fs=e",
  "https://vt.tiktok.com/ZSuumhBAs/",
  "https://youtu.be/pIjOVuJy5JY?si=DWsoRiLobGsJIiyS",
  "https://youtube.com/shorts/7iIAPRplQLo?si=wqOHObY6jZ-2GEDo",
  "https://www.instagram.com/reel/DV5pv0zCPEm/?igsh=MW1meTMzdnllcHJiNw==",
  "https://pin.it/5VHAuQSgh",
  "https://x.com/i/status/2032145884423589943",
  "https://open.spotify.com/track/2drXvACELcvwryaFRiRPdA?si=JS6_vSecQR6n26OVJUDgmA",
];

async function run() {
  for (const url of urls) {
    try {
      const raw = await getMetadata(url);
      const meta = toMetadata(raw);
      const qualityCount = Array.isArray(meta.qualities) ? meta.qualities.length : 0;
      const audioCount = Array.isArray(meta.audioQualities) ? meta.audioQualities.length : 0;
      console.log("\nURL:", url);
      console.log("Title:", meta.title);
      console.log("Author:", meta.author);
      console.log("Duration:", meta.duration);
      console.log("Resolution:", meta.resolution);
      console.log("Qualities:", qualityCount ? meta.qualities.join(", ") : "(none)");
      console.log("Audio qualities:", audioCount ? meta.audioQualities.join(", ") : "(none)");
      console.log("Thumbnail:", meta.thumbnail ? "yes" : "no");
      console.log("Preview:", meta.previewUrl ? "yes" : "no");
    } catch (error) {
      console.log("\nURL:", url);
      console.log("Error:", error?.message || String(error));
    }
  }
}

run();
