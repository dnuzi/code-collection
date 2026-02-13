const axios = require('axios');
const ytSearch = require('yt-search');

async function y2mate(input) {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│          YouTube to MP3 Downloader           │');
  console.log('│             Created by @DanuZz               │');
  console.log('└──────────────────────────────────────────────┘\n');

  let videoUrl = input;

  // If input doesn't look like a YouTube URL → treat as search query
  if (!input.includes('youtube.com') && !input.includes('youtu.be')) {
    console.log(`[Search] "${input}" ...`);
    const searchResults = await ytSearch(input);
    
    if (!searchResults.videos.length) {
      throw new Error('No video found for that search term.');
    }

    const topResult = searchResults.videos[0];
    videoUrl = topResult.url;
    
    console.log('→ Found top result:');
    console.log(`  Title:   ${topResult.title}`);
    console.log(`  Channel: ${topResult.author.name}`);
    console.log(`  Duration:${topResult.duration}`);
    console.log(`  URL:     ${topResult.url}\n`);
  }

  try {
    // Step 1: Get temporary key from sanity endpoint
    const sanityRes = await axios.get('https://cnv.cx/v2/sanity/key', {
      headers: {
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 EdgA/144.0.0.0',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
        'content-type': 'application/json',
        'sec-ch-ua-mobile': '?1',
        'accept': '*/*',
        'origin': 'https://frame.y2meta-uk.com',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://frame.y2meta-uk.com/',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'priority': 'u=1, i'
      }
    });

    const key = sanityRes.data?.key;
    if (!key) throw new Error('Could not retrieve converter key');

    console.log('[OK] Converter key received');

    // Step 2: Submit conversion job
    const body = new URLSearchParams({
      link: videoUrl,
      format: 'mp3',
      audioBitrate: '128',
      videoQuality: '720',      // mostly ignored for mp3 but keep it
      filenameStyle: 'pretty',
      vCodec: 'h264'
    }).toString();

    const convertRes = await axios.post('https://cnv.cx/v2/converter', body, {
      headers: {
        'key': key,
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 EdgA/144.0.0.0',
        'accept': '*/*',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua-mobile': '?1',
        'origin': 'https://frame.y2meta-uk.com',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://frame.y2meta-uk.com/',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'priority': 'u=1, i'
      }
    });

    const result = convertRes.data;

    console.log('\n[RESULT]');
    console.log(result);

    // Most implementations expect something like result.url or result.downloadUrl
    // You can add logic here to automatically download if the field exists, e.g.:
    // if (result.url) {
    //   console.log(`Download link: ${result.url}`);
    //   // → you can pipe axios.get(result.url) → fs.createWriteStream(...)
    // }

    return result;

  } catch (err) {
    console.error('[ERROR]', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
    throw err;
  }
}

// ── Example usage ────────────────────────────────────────

(async () => {
  // ────────────────────────────────────────────────
  // CONFIG
  // ────────────────────────────────────────────────
  const directUrl = "https://youtu.be/ZU6oESluVbE";           // Option 1
  const fallbackSearch = "alan walker faded";                  // Option 2

  // You can also do: const fallbackSearch = "The Weeknd Blinding Lights"; etc.

  console.log("Starting y2mate auto-test...\n");

  try {
    // ─── Option 1: Try direct URL first ────────────────
    console.log(`[1] Trying direct URL → ${directUrl}`);
    const result1 = await y2mate(directUrl);
    
    console.log("Direct URL succeeded ✓");
    console.log("Result:", result1);
    
    // If you only want the first successful method, you can return here
    // return;
  } catch (err) {
    console.warn(`Direct URL failed → ${err.message || err}`);
    console.log("Falling back to search mode...\n");

    // ─── Option 2: Automatic fallback to search ────────
    try {
      console.log(`[2] Searching → "${fallbackSearch}"`);
      const result2 = await y2mate(fallbackSearch);
      
      console.log("Search mode succeeded ✓");
      console.log("Result:", result2);
    } catch (searchErr) {
      console.error("Search also failed →", searchErr.message || searchErr);
      console.error("Both methods failed. Check your y2mate function / connection.");
    }
  }

  console.log("\nTest finished.");
})();
