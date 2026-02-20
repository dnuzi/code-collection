const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const crypto = require('crypto');
const { promisify } = require('util');
const stream = require('stream');
const pipelineAsync = promisify(stream.pipeline);

function dxzGenSerial() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

async function dxzUpload(filename) {
  const form = new FormData();
  form.append('file_name', filename);
  const res = await axios.post('https://api.imgupscaler.ai/api/common/upload/upload-image',
    form,
    {
      headers: {
        ...form.getHeaders(),
        origin: 'https://imgupscaler.ai',
        referer: 'https://imgupscaler.ai/'
      }
    }
  );
  return res.data.result;
}

async function dxzUploadToOss(putUrl, filePath) {
  const file = fs.readFileSync(filePath);
  const type = path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  const res = await axios.put(putUrl,
    file,
    {
      headers: {
        'Content-Type': type,
        'Content-Length': file.length
      },
      maxBodyLength: Infinity
    }
  );
  return res.status === 200;
}

async function dxzCreateJob(imageUrl, prompt) {
  const form = new FormData();
  form.append('model_name', 'magiceraser_v4');
  form.append('original_image_url', imageUrl);
  form.append('prompt', prompt);
  form.append('ratio', 'match_input_image');
  form.append('output_format', 'jpg');
  const res = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'product-code': 'magiceraser',
        'product-serial': dxzGenSerial(),
        origin: 'https://imgupscaler.ai',
        referer: 'https://imgupscaler.ai/'
      }
    }
  );
  return res.data.result.job_id;
}

async function dxzCheckJob(jobId) {
  const res = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`,
    {
      headers: {
        origin: 'https://imgupscaler.ai',
        referer: 'https://imgupscaler.ai/'
      }
    }
  );
  return res.data;
}

async function dxzDownloadToTemp(imageUrl) {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filename = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
  const tempPath = path.join(tempDir, filename);
  const writer = fs.createWriteStream(tempPath);
  const response = await axios.get(imageUrl, { responseType: 'stream', timeout: 30000 });
  await pipelineAsync(response.data, writer);
  return tempPath;
}

async function dxzCleanupTemp(filePath) {
  setTimeout(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }, 600000); 
}

async function dxzMagic(imagePath, prompt) {
  const filename = path.basename(imagePath);
  const uploadResult = await dxzUpload(filename);
  await dxzUploadToOss(uploadResult.url, imagePath);
  const cdn = 'https://cdn.imgupscaler.ai/' + uploadResult.object_name;
  const jobId = await dxzCreateJob(cdn, prompt);
  let result;
  do {
    await new Promise(r => setTimeout(r, 3000));
    result = await dxzCheckJob(jobId);
  } while (result.code === 300006);
  return {
    job_id: jobId,
    image: result.result.output_url[0]
  };
}

async function dxzMagicFromUrl(imageUrl, prompt, options = {}) {
  const { maxTries = 20, interval = 3000 } = options;
  const tempPath = await dxzDownloadToTemp(imageUrl);
  try {
    let tries = 0;
    const filename = path.basename(tempPath);
    const uploadResult = await dxzUpload(filename);
    await dxzUploadToOss(uploadResult.url, tempPath);
    const cdn = 'https://cdn.imgupscaler.ai/' + uploadResult.object_name;
    const jobId = await dxzCreateJob(cdn, prompt);
    let result;
    do {
      await new Promise(r => setTimeout(r, interval));
      tries++;
      result = await dxzCheckJob(jobId);
    } while (tries < maxTries && result.code === 300006);
    if (result.code !== 100000) throw new Error('Job failed or timed out');
    dxzCleanupTemp(tempPath);
    return {
      status: true,
      creator: '@DanuZz',
      job_id: jobId,
      input_url: imageUrl,
      prompt,
      output_url: result.result.output_url[0],
      count: 1
    };
  } catch (error) {
    dxzCleanupTemp(tempPath);
    throw error;
  }
}

module.exports = {
  name: 'nanobanana-pub',
  dxzGenSerial,
  dxzUpload,
  dxzUploadToOss,
  dxzCreateJob,
  dxzCheckJob,
  dxzMagic,
  dxzMagicFromUrl
};

// ────────────────────────────────────────────────
// Test code (runs only when file is executed directly)
// ────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log("=== NanoBanana Magic Eraser Test ===");
    console.log("Starting test...");

    // Option 2: Test with URL (recommended for quick testing)
    const testImageUrl = "https://files.catbox.moe/5s2bra.jfif";
    const testPrompt   = "change hair color with natural black color";

    try {
      console.log(`Processing image: ${testImageUrl}`);
      console.log(`Prompt: "${testPrompt}"`);
      const result = await dxzMagicFromUrl(testImageUrl, testPrompt, {
        maxTries: 25,
        interval: 4000
      });
      console.log("\nSuccess!");
      console.log("Output URL:", result.output_url);
      console.log("Full result:", result);
    } catch (err) {
      console.error("\nTest failed:", err.message);
      if (err.response) {
        console.error("Response data:", err.response.data);
      }
    }

    console.log("Test finished.");
  })();
}
