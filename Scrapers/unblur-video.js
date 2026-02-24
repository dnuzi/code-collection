#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');
const R = '\x1b[0m';
const b = t => `\x1b[1m${t}${R}`;
const cyan = t => `\x1b[96m${t}${R}`;
const green = t => `\x1b[92m${t}${R}`;
const yel = t => `\x1b[93m${t}${R}`;
const red = t => `\x1b[91m${t}${R}`;
const gray = t => `\x1b[90m${t}${R}`;
const whi = t => `\x1b[97m${t}${R}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ts = () => gray(`[${new Date().toLocaleTimeString()}]`);
const ok = msg => console.log(` ${green('✔')} ${msg}`);
const warn = msg => console.log(` ${yel('!')} ${msg}`);
const fail = msg => console.log(` ${red('✘')} ${msg}`);
const info = msg => console.log(` ${ts()} ${msg}`);
const sec = t => console.log(`\n ${yel('◆')} ${t}`);
const row = (icon, label, val) =>
  console.log(` ${icon} ${gray((label+':').padEnd(18))} ${whi(String(val||''))}`);
const API = 'https://api.unblurimage.ai';
const SITE = 'https://unblurimage.ai';
const CDN = 'https://cdn.unblurimage.ai';
let SERIAL = '';
let UA = '';
const UA_POOL = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
];
function headers(extra) {
  return Object.assign({
    'accept' : '*/*',
    'accept-language' : 'en-GB,en;q=0.9',
    'product-serial' : SERIAL,
    'sec-ch-ua' : '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile' : '?1',
    'sec-ch-ua-platform' : '"Android"',
    'sec-fetch-dest' : 'empty',
    'sec-fetch-mode' : 'cors',
    'sec-fetch-site' : 'same-site',
    'Referer' : SITE + '/',
    'user-agent' : UA,
  }, extra || {});
}
async function initSession() {
  sec('Initialize Session');
  UA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
  info('UA: ' + gray(UA.slice(0, 50) + '...'));
  try {
    const html = (await axios.get(SITE + '/ai-unblur-video/', {
      headers: { 'user-agent': UA, accept: 'text/html' }, timeout: 20000,
    })).data;
    const sm = html.match(/src="([^"]*app\.[a-z0-9]+\.js)"/);
    if (sm) {
      let jsUrl = sm[1];
      if (!jsUrl.startsWith('http')) jsUrl = SITE + jsUrl;
      const js = (await axios.get(jsUrl, { headers: { 'user-agent': UA, Referer: SITE }, timeout: 25000 })).data;
      for (const pat of [
        /"product-serial"\s*:\s*"([a-f0-9]{32})"/i,
        /productSerial[^'"]*['"]([a-f0-9]{32})['"]/i,
        /serial['":\s]+([a-f0-9]{32})/i,
      ]) {
        const m = js.match(pat);
        if (m) { SERIAL = m[1]; ok('Product-serial: ' + gray(SERIAL)); return; }
      }
      const anyHex = js.match(/['"]([a-f0-9]{32})['"]/);
      if (anyHex) { SERIAL = anyHex[1]; ok('Product-serial: ' + gray(SERIAL)); return; }
    }
  } catch (e) {
    warn('Failed to fetch bundle: ' + e.message);
  }
  SERIAL = crypto.createHash('md5')
    .update(UA + String(Math.floor(Date.now() / 3600000)))
    .digest('hex');
  warn('Fallback product-serial: ' + gray(SERIAL));
}
async function guestLogin() {
  try {
    await axios.post(API + '/api/pai-login/v1/user/get-userinfo', null, {
      headers: Object.assign(headers(), { 'product-code': '067003', 'content-type': 'application/json' }),
      timeout: 10000,
    });
    ok('Guest session OK');
  } catch {
    warn('Guest login skipped');
  }
}
async function downloadVideo(videoUrl) {
  sec('Download Video');
  info('URL: ' + cyan(videoUrl));
  const r = await axios.get(videoUrl, {
    responseType: 'arraybuffer', timeout: 180000,
    maxContentLength: 500 * 1024 * 1024,
    headers: { 'User-Agent': UA, Referer: SITE },
  });
  const buf = Buffer.from(r.data);
  const extM = videoUrl.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i);
  const ext = extM ? extM[1].toLowerCase() : 'mp4';
  const mime = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  ok(`Downloaded: ${green((buf.length / 1024 / 1024).toFixed(2) + ' MB')} | ext: ${ext}`);
  return { buffer: buf, mimeType: mime, ext };
}
async function registerFileName(fileName) {
  sec('Register File → OSS URL');
  info('File: ' + cyan(fileName));
  const form = new FormData();
  form.append('video_file_name', fileName);
  const r = await axios.post(
    API + '/api/upscaler/v1/ai-video-enhancer/upload-video', form,
    { headers: Object.assign(headers(), form.getHeaders()), timeout: 30000 }
  );
  if (r.data?.code !== 100000) throw new Error('register failed: ' + JSON.stringify(r.data));
  const res = r.data.result;
  ok('OSS URL received');
  ok('Object: ' + gray(res.object_name));
  return { ossUrl: res.url, objectName: res.object_name };
}
async function uploadToOSS(ossUrl, buffer, mimeType, fileName) {
  sec('Upload to OSS');
  info('Size: ' + green((buffer.length / 1024 / 1024).toFixed(2) + ' MB'));
  try {
    const res = await axios.put(ossUrl, buffer, {
      headers: { 'Content-Type': mimeType, 'User-Agent': UA },
      timeout: 180000, maxBodyLength: Infinity, maxContentLength: Infinity,
      validateStatus: s => s >= 200 && s < 300,
    });
    ok('Upload OK (PUT) → status ' + res.status);
    return;
  } catch (e) {
    warn('PUT failed: ' + (e.response?.status ?? e.message));
  }
  const form = new FormData();
  form.append('file', buffer, { filename: fileName, contentType: mimeType });
  await axios.post(ossUrl, form, {
    headers: form.getHeaders(), timeout: 180000,
    maxBodyLength: Infinity, maxContentLength: Infinity,
    validateStatus: s => s >= 200 && s < 300,
  });
  ok('Upload OK (POST form)');
}
async function createJob(cdnVideoUrl, resolution) {
  sec('Create Enhance Job');
  info('CDN: ' + cyan(cdnVideoUrl));
  info('Res: ' + cyan(resolution));
  const form = new FormData();
  form.append('original_video_file', cdnVideoUrl);
  form.append('resolution', resolution);
  form.append('is_preview', 'false');
  const r = await axios.post(
    API + '/api/upscaler/v2/ai-video-enhancer/create-job', form,
    { headers: Object.assign(headers(), form.getHeaders()), timeout: 30000 }
  );
  const code = r.data?.code;
  if (code === 100000 || code === 300010) {
    ok('Job created! Code: ' + code);
    const res = r.data.result || {};
    if (res.job_id) ok('Job ID: ' + green(res.job_id));
    if (res.output_url) ok('Output available immediately!');
    return res;
  }
  throw new Error('create-job failed: ' + JSON.stringify(r.data));
}
async function pollJob(jobId, maxWaitSec = 1800) {
  sec('Polling Result');
  info('Job ID: ' + cyan(jobId));
  info('Max wait: ' + maxWaitSec + 's');
  console.log('');
  const start = Date.now();
  let attempt = 0;
  while (true) {
    attempt++;
    await sleep(5000);
    const elapsed = Math.floor((Date.now() - start) / 1000);
    if (elapsed > maxWaitSec) {
      process.stdout.write('\n');
      fail('Timeout after ' + elapsed + 's');
      return null;
    }
    try {
      const r = await axios.get(
        API + '/api/upscaler/v2/ai-video-enhancer/get-job/' + jobId,
        { headers: headers(), timeout: 20000 }
      );
      const code = r.data?.code;
      const result = r.data?.result;
      if (code === 100000 && result?.output_url) {
        process.stdout.write('\n');
        ok('Completed! Elapsed: ' + elapsed + 's');
        return result;
      }
      if (code === 300010 || !code) {
        process.stdout.write(`\r ⏳ Processing... ${elapsed}s | poll #${attempt} `);
        continue;
      }
      process.stdout.write('\n');
      fail('Unexpected: ' + JSON.stringify(r.data).slice(0, 120));
      return null;
    } catch (e) {
      process.stdout.write(`\r ⚠️ Retry #${attempt} - ${e.message.slice(0, 40)} (${elapsed}s) `);
    }
  }
}
async function downloadResult(outputUrl, outDir, ext) {
  sec('Download Enhanced Result');
  info('URL: ' + cyan(outputUrl));
  const r = await axios.get(outputUrl, {
    responseType: 'arraybuffer', timeout: 180000,
    maxContentLength: 1024 * 1024 * 1024,
    headers: { 'User-Agent': UA },
  });
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'enhanced_' + crypto.randomBytes(4).toString('hex') + '.' + ext);
  fs.writeFileSync(outFile, Buffer.from(r.data));
  ok('Saved: ' + green(outFile) + ' (' + (r.data.byteLength / 1024 / 1024).toFixed(2) + ' MB)');
  return outFile;
}
async function runPipeline(videoUrl, resolution = '2k', outDir = './output') {
  const LINE = gray('─'.repeat(52));
  console.log(`\n ${yel('◆')} Input: ${whi(videoUrl.slice(0, 55))}`);
  console.log(` ${yel('◆')} Res: ${whi(resolution)} | Out: ${whi(outDir)}\n`);
  await initSession();
  await guestLogin();
  const vid = await downloadVideo(videoUrl);
  const fileName = crypto.randomBytes(3).toString('hex') + '_video.' + vid.ext;
  const { ossUrl, objectName } = await registerFileName(fileName);
  await uploadToOSS(ossUrl, vid.buffer, vid.mimeType, fileName);
  const cdnUrl = CDN + '/' + objectName;
  const jobInfo = await createJob(cdnUrl, resolution);
  let outFile, outputUrl, jobId;
  if (jobInfo.output_url) {
    outFile = await downloadResult(jobInfo.output_url, outDir, vid.ext);
    outputUrl = jobInfo.output_url;
    jobId = jobInfo.job_id || '-';
  } else {
    jobId = jobInfo.job_id;
    if (!jobId) throw new Error('No job_id received from create-job');
    const result = await pollJob(jobId);
    if (!result) throw new Error('Job failed or timed out');
    outFile = await downloadResult(result.output_url, outDir, vid.ext);
    outputUrl = result.output_url;
  }
  console.log(`\n${LINE}`);
  row('🎬', 'Job ID', jobId);
  row('📁', 'Output', outFile);
  row('🔗', 'URL', outputUrl);
  console.log(LINE + '\n');
  return { outFile, outputUrl, jobId };
}
async function main() {
  process.stdout.write('\x1bc');
  console.log(cyan(b('\n UNBLURIMAGE.AI VIDEO ENHANCER\n')));
  const args = process.argv.slice(2);
  let videoUrl = null;
  let res = process.env.UB_RES || '2k';
  let outDir = process.env.UB_OUT || './output';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--res' && args[i+1]) res = args[++i];
    else if (args[i] === '--out' && args[i+1]) outDir = args[++i];
    else if (!args[i].startsWith('--')) videoUrl = args[i];
  }
  if (!videoUrl) {
    console.log(` Usage: node unblur-video.js VIDEO_URL [--res 2k|4k] [--out ./output]\n`);
    return;
  }
  try {
    await runPipeline(videoUrl, res, outDir);
  } catch (e) {
    fail(e.message);
    if (process.env.DEBUG) console.error(e);
    process.exit(1);
  }
}
process.on('SIGINT', () => { console.log(''); fail('Stopped.'); process.exit(0); });
if (require.main === module) main();
module.exports = { runPipeline };
