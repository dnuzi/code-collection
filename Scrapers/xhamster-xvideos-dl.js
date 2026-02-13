const axios = require("axios");

function getRandomUserAgent() {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Downloads metadata and video URLs from xHamster or XVideos using savethevideo API
 * @param {string} url - video page url (xhamster or xvideos)
 * @returns {Promise<Object|null>} result object or null if failed
 */
async function scrapeAdultVideo(url) {
    const apiUrl = 'https://api.v02.savethevideo.com/tasks';
    const payload = { type: "info", url: url.trim() };

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent(),
        'Referer': 'https://www.savethevideo.com/',
        'Origin': 'https://www.savethevideo.com'
    };

    let data = null;
    let attempts = 0;
    const maxAttempts = 8;
    let waitTime = 6000;

    console.log(`[SCRAPER @DanuZz] Starting → ${url}`);

    while (attempts < maxAttempts) {
        try {
            const res = await axios.post(apiUrl, payload, {
                headers,
                timeout: 30000
            });
            data = res.data;

            if (data?.state === "completed") {
                console.log("[SCRAPER @DanuZz] Success - completed");
                break;
            }

            if (data?.state === "pending" || data?.state === "processing") {
                attempts++;
                console.log(`[SCRAPER @DanuZz] Still processing... attempt ${attempts}/${maxAttempts}`);
                await sleep(waitTime);
                waitTime = Math.min(waitTime * 1.45, 25000);
                continue;
            }

            console.log("[SCRAPER @DanuZz] Unexpected state:", data?.state);
            return null;

        } catch (err) {
            if (err.response?.status === 429) {
                attempts++;
                console.log("[SCRAPER @DanuZz] Rate limit (429) → waiting longer");
                await sleep(14000);
                waitTime = 14000;
                continue;
            }

            console.error("[SCRAPER @DanuZz] Request failed:", err.message);
            if (attempts === 0) attempts = 1;
            await sleep(5000);
        }
    }

    if (!data || data.state !== "completed" || !data.result?.[0]) {
        console.log("[SCRAPER @DanuZz] Failed - timeout or no result");
        return null;
    }

    const result = data.result[0];

    return {
        creator: "@DanuZz",                    // ← added here
        title: result.title || "Untitled",
        thumbnail: result.thumbnail || null,
        duration: result.duration || "unknown",
        upload_date: result.upload_date || null,
        formats: result.formats || []
    };
}

// ────────────────────────────────────────────────
// Example usage (run with node thisfile.js)
// ────────────────────────────────────────────────

(async () => {
    // Test with xHamster
    const xhResult = await scrapeAdultVideo("https://xhamster.com/videos/pure-taboo-stepsisters-emily-willis-and-jaye-summers-take-turns-getting-fucked-by-stepuncle-part-1-and-2-xhSEsFu");
    if (xhResult) {
        console.log("xHamster result (@DanuZz):");
        console.log(JSON.stringify(xhResult, null, 2));
    }

    // Test with XVideos
    const xvResult = await scrapeAdultVideo("https://www.xvideos.com/video.ohochkb10de/keeping_it_between_the_3_of_us");
    if (xvResult) {
        console.log("XVideos result (@DanuZz):");
        console.log(JSON.stringify(xvResult, null, 2));
    }
})();
