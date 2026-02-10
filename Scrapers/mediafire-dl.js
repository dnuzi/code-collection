/**
 * Advanced MediaFire Downloader Scraper
 * Created by @DanuZz
 */

const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.mediafire.com/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
};

async function dxzBabe(url) {
  try {
    const instance = axios.create({
      maxRedirects: 8,
      timeout: 15000,
      headers,
    });

    const utto = await instance.get(url);

    if (utto.status !== 200) {
      throw new Error(`HTTP ${utto.status} - Page not accessible`);
    }

    const $ = cheerio.load(utto.data);

    let download = $('#downloadButton').attr('href') ||
                   $('a#download_link').attr('href') ||
                   $('a.input.popsok').attr('href') ||
                   $('a.download-link').attr('href') ||
                   null;

    if (!download) {
      download = $('a[href*="dl="], a:contains("Download")').first().attr('href') || null;
    }

    let filename = $('.filename').text().trim() ||
                   $('.dl-btn-label').first().text().trim() ||
                   $('div.dl-btn-label').text().trim() ||
                   $('.file-name').text().trim() ||
                   null;

    let filesize = null;
    const sizeMatch = $('.dl-btn-label, .file-size, #download_link a')
      .text()
      .match(/\(([^)]+)\)|\s*(\d+(?:\.\d+)?\s*(?:MB|GB|KB|bytes?))/i);

    if (sizeMatch) {
      filesize = sizeMatch[1] || sizeMatch[2] || null;
    }

    let filetype = $('.filetype span, .file-type, .extension')
      .first()
      .text()
      .trim()
      .replace(/[\(\)]/g, '') ||
      (filename ? filename.split('.').pop().toUpperCase() : null);

    let uploaded = $('.details li:contains("Uploaded") span, .upload-date, time')
      .text()
      .trim() ||
      $('.details-uploaded').text().trim() ||
      null;

    const description = $('#description, .file-description, .dl-description')
      .text()
      .trim() || null;

    if ($('body').text().includes('captcha') || $('body').text().includes('Verify you are not a robot')) {
      throw new Error('Captcha or human verification required — cannot scrape automatically.');
    }

    if (!download) {
      throw new Error('Could not find download link. MediaFire may have changed layout or added protection.');
    }

    return {
      success: true,
      filename,
      filetype,
      filesize: filesize || 'Unknown',
      uploaded: uploaded || 'Unknown',
      description: description || undefined,
      download,
      originalUrl: url,
      scrapedBy: '@DanuZz — Advanced MediaFire Scraper'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response
        ? `${error.response.status} ${error.response.statusText}`
        : error.code || 'Unknown error',
      url
    };
  }
}

// ────────────────────────────────────────────────
// Example usage
// ────────────────────────────────────────────────
dxzBabe('https://www.mediafire.com/file/ktzstpy3d8nturk/Kyzo+Base.zip/file')
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => console.error('Fatal:', err));
