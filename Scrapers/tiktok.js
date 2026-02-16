const axios = require("axios");

async function dxz(query, options = {}) {
  const { maxRetries = 2, timeout = 15000 } = options;
  return new Promise(async (resolve, reject) => {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const encodedParams = new URLSearchParams();
        encodedParams.set("url", query);
        encodedParams.set("hd", "1");
        const response = await axios({
          method: "POST",
          url: "https://tikwm.com/api/",
          timeout,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Cookie: "current_language=en",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          },
          data: encodedParams.toString(),
        });
        if (!response.data || response.data.code !== 0) {
          throw new Error(response.data?.msg || "API returned non-zero code");
        }
        const data = response.data.data;
        const result = {
          success: true,
          title: data.title || null,
          description: data.title || null, 
          author: {
            username: data.author?.unique_id || data.author?.nickname,
            nickname: data.author?.nickname,
            avatar: data.author?.avatar,
          },
          cover: data.cover,
          origin_cover: data.origin_cover,
          duration: data.duration || null,
          no_watermark: data.play, 
          watermark: data.wmplay || data.wm_size,
          music: data.music,
          music_info: data.music_info || null,
          stats: {
            plays: data.play_count,
            likes: data.digg_count,
            comments: data.comment_count,
            shares: data.share_count,
            favorites: data.collect_count,
          },
          region: data.region,
          create_time: data.create_time ? new Date(data.create_time * 1000) : null,
          raw: data, 
        };
        resolve(result);
        return;
      } catch (error) {
        attempts++;
        console.warn(`Attempt ${attempts} failed: ${error.message}`);
        if (attempts > maxRetries) {
          reject(error);
        }
        await new Promise(r => setTimeout(r, 1500 * attempts)); 
      }
    }
  });
}

module.exports = { dxz };

// Usage example
dxz("https://vt.tiktok.com/ZSa4J7JoB/")
  .then(console.log)
  .catch(console.error);
