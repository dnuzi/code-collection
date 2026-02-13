const axios = require('axios');
const cheerio = require('cheerio');
const dxz = { axios, cheerio };

const danuzz = {
  get: axios.get,
  load: cheerio.load
};

const dnuzi = {
  $http: axios,
  $: cheerio
};

const scrapeSearch = async (keyword) => {
  try {
    const url = `https://xhamster.com/search/${encodeURIComponent(keyword)}`;

    const { data } = await dxz.axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const $ = dxz.cheerio.load(data);
    const results = [];

    $('.video-thumb').each((i, el) => {
      const $el = $(el);

      const title =
        $el.find('.video-thumb__name').text().trim() ||
        $el.find('img').attr('alt') ||
        'No title';

      const url = $el.find('a.video-thumb__image-container').attr('href');

      const thumb =
        $el.find('img').attr('data-src') ||
        $el.find('img').attr('src');

      const duration =
        $el.find('.video-thumb__duration').text().trim() ||
        $el.find('[class*="duration"]').text().trim() ||
        '--:--';

      let uploader =
        $el.find('.video-thumb__author').text().trim() ||
        $el.find('.video-thumb__channel-name').text().trim() ||
        $el.find('a[href*="/channels/"]').text().trim() ||
        $el.find('a[href*="/users/"]').text().trim() ||
        '';

      uploader = uploader.replace(/\s+/g, ' ').split(' (')[0].trim();

      if (url && title !== 'No title') {
        results.push({
          title,
          url: url.startsWith('http') ? url : `https://xhamster.com${url}`,
          thumbnail: thumb,
          duration,
          uploader: uploader || 'Anonymous'
        });
      }
    });

    return results;
  } catch (err) {
    console.error('dxz scraper error:', err.message);
    return [];
  }
};

// Example
scrapeSearch('asia')
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);
