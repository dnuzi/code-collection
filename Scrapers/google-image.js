const fetch = require("node-fetch");
const cheerio = require("cheerio");
const CREATOR = "@DanuZz";

async function googleImage(query, options = {}) {
    if (!query) throw new Error("Query is required");
    
    const {
        safeSearch = "off"  // Default to off for broader results, especially for sensitive queries
    } = options;

    const params = new URLSearchParams({
        q: query,
        tbm: "isch",
        safe: safeSearch
    });

    const response = await fetch(`https://www.google.com/search?${params.toString()}`, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        }
    });

    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

    const data = await response.text();
    const $ = cheerio.load(data);
    
    // Enhanced regex to capture more robustly from Google's serialized data
    const pattern = /\[1,\[0,"(?<id>[\d\w\-_]+)",\["https?:\/\/(?:[^"]+)",\d+,\d+\]\s?,\["(?<url>https?:\/\/(?:[^"]+))",\d+,\d+\]/gm;
    const matches = $.html().matchAll(pattern);
    
    const decodeUrl = (url) => decodeURIComponent(JSON.parse(`"${url}"`));
    
    // Collect URLs into a Set for deduplication (inspired by the second script's use of Set)
    const urlSet = new Set();
    for (const match of matches) {
        const { groups } = match;
        if (groups?.url) {
            const decodedUrl = decodeUrl(groups.url);
            if (/.*\.(jpe?g|png|gif|webp)$/gi.test(decodedUrl)) {
                urlSet.add(decodedUrl);
            }
        }
    }
    
    // Convert to array with no limit, and add creator
    const images = Array.from(urlSet)
        .map(url => ({ url, creator: CREATOR }));
    
    return {
        status: response.status,
        query,
        safeSearch,
        count: images.length,
        images
    };
}

module.exports = { googleImage };
