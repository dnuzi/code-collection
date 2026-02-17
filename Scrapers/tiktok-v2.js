const axios = require("axios");
const cheerio = require("cheerio");

async function dxzTikTokDownload(url) {
  try {
    if (!url) throw new Error("Where is the link?");
    if (!/tiktok\.com/i.test(url)) throw new Error("Invalid TikTok URL");

    const { data: homeHtml, headers: homeHeaders } = await axios.get("https://musicaldown.com/en", {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        referer: "https://musicaldown.com/",
      },
      timeout: 60000,
    });

    const cookie = homeHeaders["set-cookie"]
      ? homeHeaders["set-cookie"].map((c) => c.split(";")[0]).join("; ")
      : "";

    const $ = cheerio.load(homeHtml);
    const formData = {};

    $("#submit-form input").each((_, el) => {
      const name = $(el).attr("name");
      const value = $(el).attr("value");
      if (name) formData[name] = value || "";
    });

    const urlFieldName = Object.keys(formData).find((k) => !formData[k]);
    if (urlFieldName) formData[urlFieldName] = url;

    const payload = new URLSearchParams(formData).toString();

    const { data: resultHtml } = await axios.post("https://musicaldown.com/download", payload, {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        cookie,
        origin: "https://musicaldown.com",
        referer: "https://musicaldown.com/",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      },
      timeout: 60000,
    });

    const $$ = cheerio.load(resultHtml);

    const title = $$(".video-desc").text().trim() || null;
    const username = $$(".video-author b").text().trim() || null;
    const avatar = $$(".img-area img").attr("src") || null;
    const styleBg = $$(".video-header").attr("style") || "";
    const cover = styleBg.match(/url\((.*?)\)/)?.[1] || null;

    const downloads = [];
    $$("a.download").each((_, el) => {
      const btn = $$(el);
      downloads.push({
        type: btn.attr("data-event")?.replace("_download_click", "") || null,
        quality: btn.text().trim() || null,
        url: btn.attr("href") || null,
      });
    });

    return {
      success: true,
      result: {
        title,
        author: {
          username,
          avatar,
        },
        cover,
      },
      downloads: downloads.filter((x) => x.url),
    };
  } catch (err) {
    return {
      success: false,
      message: "Failed to download TikTok (V2)",
      error:
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message,
      status: err?.response?.status || null,
    };
  }
}

// PUT TIKTOK LINK HERE
dxzTikTokDownload("https://vt.tiktok.com/ZSaKKtvN1/")
  .then((res) => console.log(JSON.stringify(res, null, 2)))
  .catch(console.error);
