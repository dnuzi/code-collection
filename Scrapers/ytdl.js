const axios = require('axios');
const yts = require('yt-search');

const CONFIG = {
  audio: { ext: ["mp3", "m4a", "wav", "opus", "flac"], q: ["best", "320k", "128k"] },
  video: { ext: ["mp4"], q: ["144p", "240p", "360p", "480p", "720p", "1080p"] }
};

const headers = {
  accept: "application/json",
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0 (Android)",
  referer: "https://ytmp3.gg/"
};

const poll = async (statusUrl) => {
  try {
    const { data } = await axios.get(statusUrl, { headers });
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error(data.message || "Conversion failed");
    
    await new Promise(r => setTimeout(r, 2000));
    return poll(statusUrl);
  } catch (err) {
    throw new Error(`Polling failed: ${err.message}`);
  }
};

async function convertYouTube(url, format = "mp3", quality = "128k") {
  try {
    const type = Object.keys(CONFIG).find(k => CONFIG[k].ext.includes(format));
    if (!type) throw new Error(`Format tidak didukung: ${format}`);

    const allowedQualities = CONFIG[type].q;
    if (!allowedQualities.includes(quality)) {
      throw new Error(`Kualitas tidak valid untuk ${type}. Pilih: ${allowedQualities.join(", ")}`);
    }

    // Get basic metadata via oEmbed (reliable & fast)
    const { data: meta } = await axios.get("https://www.youtube.com/oembed", {
      params: { url, format: "json" }
    });

    const payload = {
      url,
      os: "android",
      output: {
        type,
        format,
        ...(type === "video" && { quality })
      },
      ...(type === "audio" && { audio: { bitrate: quality } })
    };

    // Try hub → fallback to api subdomain
    let downloadInit;
    try {
      downloadInit = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers });
    } catch {
      downloadInit = await axios.post("https://api.ytconvert.org/api/download", payload, { headers });
    }

    const { data: initData } = downloadInit;

    if (!initData?.statusUrl) {
      throw new Error("No status URL received from converter");
    }

    const result = await poll(initData.statusUrl);

    return {
      title: meta.title,
      author: meta.author_name,
      duration: meta.duration || result.duration || "Unknown",
      thumbnail: meta.thumbnail_url || null,
      views: null,           // oEmbed doesn't give views → optional: use yts if needed
      downloadUrl: result.downloadUrl,
      format,
      quality,
      filename: `${meta.title.replace(/[^\w\s-]/gi, '')}.${format}`
    };
  } catch (err) {
    console.error("Convert error:", err.message);
    return {
      status: false,
      message: err.message || "Gagal mengambil file"
    };
  }
}

// ────────────────────────────────────────
// Public API functions (same names as before)
// ────────────────────────────────────────

async function ytmp3(url) {
  if (!url) return { status: false, message: "YouTube URL dibutuhkan" };

  const result = await convertYouTube(url, "mp3", "128k");

  if (result.status === false) return result;

  return {
    status: true,
    creator: "@DanuZz",
    title: result.title,
    channel: result.author,
    duration: result.duration,
    views: "—",               // can be improved later with yts
    thumbnail: result.thumbnail,
    downloadUrl: result.downloadUrl,
    filename: result.filename,
    quality: "128kbps"
  };
}

async function ytmp4(url, quality = "720p") {
  if (!url) return { status: false, message: "YouTube URL dibutuhkan" };

  const result = await convertYouTube(url, "mp4", quality);

  if (result.status === false) return result;

  return {
    status: true,
    creator: "@DanuZz",
    title: result.title,
    channel: result.author,
    duration: result.duration,
    views: "—",
    thumbnail: result.thumbnail,
    downloadUrl: result.downloadUrl,
    quality_list: {
      [quality]: {
        resolution: quality,
        size: "Unknown",
        url: result.downloadUrl
      }
    },
    filename: result.filename
  };
}

async function search(teks) {
  try {
    let data = await yts(teks);
    return {
      status: true,
      creator: "@DanuZz",
      results: data.all
    };
  } catch (error) {
    return {
      status: false,
      message: error.message
    };
  }
}

module.exports = {
  search,
  ytmp3,
  ytmp4
};
