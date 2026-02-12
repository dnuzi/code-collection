const axios = require('axios');

async function rednoteDownloader(url) {
    if (!url) throw new Error('URL is required.');

    try {
        const response = await axios.post(
            'https://rednotedownloader.com/id',
            [url, ""],
            {
                headers: {
                    'Accept': 'text/x-component',
                    'Content-Type': 'application/json',
                    'Next-Action': '352bef296627adedcfc99e32c80dd93a4ee49d35',
                    'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22id%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fid%22%2C%22refresh%22%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D'
                },
                responseType: 'text'   // Important for RSC / text streams
            }
        );

        let result = response.data;

        // Optional: Try to make the output more readable
        // (RSC payloads often contain JSON chunks, HTML-like strings, or media URLs)
        // You can expand this parsing logic depending on what the real response looks like
        if (typeof result === 'string') {
            // Example: extract potential direct media URLs if they appear in the stream
            const mediaUrlMatch = result.match(/(https?:\/\/[^\s"'<>]+\.(mp4|jpg|jpeg|png|gif|webp))/gi);
            if (mediaUrlMatch && mediaUrlMatch.length > 0) {
                result = {
                    raw: result,
                    possibleMediaUrls: mediaUrlMatch,
                    message: "Extracted possible direct download link(s) from response stream"
                };
            }
        }

        // Add creator credit
        const credit = `\n\nDownloaded via Rednoted Downloader by @DanuZz 💚`;

        // Return enhanced result (you can adjust format: string / object)
        if (typeof result === 'object') {
            result.credit = credit.trim();
            return result;
        } else {
            return result + credit;
        }

    } catch (err) {
        throw new Error(`Downloader error: ${err.message}`);
    }
}

// ────────────────────────────────────────────────
// USAGE EXAMPLE
// ────────────────────────────────────────────────

rednoteDownloader('https://www.xiaohongshu.com/discovery/item/697d519d000000002103fa2b')
    .then(res => console.log(res))
    .catch(err => console.error(err));
