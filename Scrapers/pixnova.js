const dxz = require("axios");
const danuzz = require("form-data");
const dnuzi = require("crypto");
const { v4: uuidv4 } = require("uuid");
 
const sessions = new Map();
const TTL = 60000;

const CONFIG = {
  URLS: {
    API: "https://api.pixnova.ai/api",
    TOOLS: "https://api.pixnova.ai/aitools"
  },
  HEADERS: {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "origin": "https://pixnova.ai",
    "theme-version": "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q"
  },
  PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`
};

const getOriginFrom = () =>
  dnuzi.createHash("md5").update("pixnova.ai").digest("hex").substring(8, 24);

const generateRandomString = (len) =>
  Array.from({ length: len }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 62)
    )
  ).join("");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rsaEncrypt = (data) =>
  dnuzi
    .publicEncrypt(
      { key: CONFIG.PUBLIC_KEY, padding: dnuzi.constants.RSA_PKCS1_PADDING },
      Buffer.from(data)
    )
    .toString("base64");

const aesCbcEncrypt = (text, keyStr) => {
  const key = Buffer.from(keyStr, "utf-8");
  const cipher = dnuzi.createCipheriv("aes-128-cbc", key, key);
  let encrypted = cipher.update(`pixnova:${text}`, "utf8", "base64");
  return encrypted + cipher.final("base64");
};

const aesGcmEncrypt = (jsonData, fp1Key) => {
  const keyHash = dnuzi.createHash("sha256").update(fp1Key).digest();
  const iv = dnuzi.randomBytes(12);
  const cipher = dnuzi.createCipheriv("aes-256-gcm", keyHash, iv);
  let encrypted = cipher.update(JSON.stringify(jsonData), "utf8");
  const final = cipher.final();
  return Buffer.concat([iv, encrypted, final, cipher.getAuthTag()]).toString("base64");
};

const Pixnova = {
  request: async (endpoint, data = {}, apiType = "API", isUpload = false) => {
    const baseUrl = apiType === "TOOLS" ? CONFIG.URLS.TOOLS : CONFIG.URLS.API;
    const aesSecret = generateRandomString(16);
    const fp = uuidv4().replace(/-/g, "");
    const fp1 = aesCbcEncrypt(fp, aesSecret);
    const headers = {
      ...CONFIG.HEADERS,
      "x-code": Date.now().toString(),
      fp,
      fp1,
      "x-guide": rsaEncrypt(aesSecret),
      referer: apiType === "TOOLS" ? "https://pixnova.ai/id/ai-baby-generator/" : "https://pixnova.ai/"
    };
    let payload = data;
    if (isUpload) {
      Object.assign(headers, data.getHeaders());
    } else {
      headers["Content-Type"] = "application/json";
      if (!payload.origin_from) payload.origin_from = getOriginFrom();
      if (endpoint.includes("generate_video_face")) {
        payload = { request_type: 2, data: aesGcmEncrypt(payload, fp1) };
      }
    }
    const res = await dxz({
      method: "POST",
      url: `${baseUrl}${endpoint}`,
      headers,
      data: payload,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.message || "API Error");
  },

  uploadImageBuffer: async (buffer, type = "API") => {
    const formData = new danuzz();
    formData.append("file", buffer, { filename: "image.jpg" });
    let endpoint = "/upload_img";
    if (type === "TOOLS") {
      endpoint = "/upload-img";
      formData.append("fn_name", "demo-ai-baby");
      formData.append("origin_from", getOriginFrom());
    } else {
      formData.append("request_from", "2");
      formData.append("origin_from", getOriginFrom());
    }
    const res = await Pixnova.request(endpoint, formData, type, true);
    return type === "TOOLS" ? res.data.path : res.data;
  },

  uploadVideoBuffer: async (buffer) => {
    const fileName = dnuzi.createHash("md5").update(buffer).digest("hex") + "_0_10.mp4";
    const presign = await Pixnova.request("/upload_file", {
      file_name: fileName,
      type: "video",
      request_from: 2,
      origin_from: getOriginFrom()
    });
    await dxz.put(presign.data.url, buffer, {
      headers: { "Content-Type": "video/mp4", "x-oss-storage-class": "Standard" },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return presign.data.url.split("?")[0].replace(/^https?:\/\/[^\/]+\//, "");
  },

  poll: async (taskId, endpoint, apiType = "API", extraPayload = {}) => {
    let attempt = 0;
    while (attempt < 200) {
      const payload = { task_id: taskId, request_from: 2, ...extraPayload };
      const res = await Pixnova.request(endpoint, payload, apiType);
      const s = res.data;
      if (s.status === 2) {
        const imgPath = s.result_image || s.result_video;
        if (imgPath.startsWith("http")) return imgPath;
        if (apiType === "TOOLS") return `https://oss-global.pixnova.ai/${imgPath}`;
        return `https://media.visro.ai/${imgPath}`;
      }
      if (s.status === 3 || s.status === -1) throw new Error("Task Failed");
      attempt++;
      await sleep(3000);
    }
    throw new Error("Timeout");
  },

  // ────────────────────────────────────────────────
  // High-level functions (main features)
  // ────────────────────────────────────────────────
  swapImageBuffer: async (targetBuf, faceBuf) => {
    const targetUrl = await Pixnova.uploadImageBuffer(targetBuf, "API");
    const faceUrl = await Pixnova.uploadImageBuffer(faceBuf, "API");
    const res = await Pixnova.request("/generate_face", {
      source_image: targetUrl,
      face_image: faceUrl,
      request_from: 2
    });
    return await Pixnova.poll(res.data.task_id, "/check_status", "API", { is_batch: true });
  },

  swapVideoBuffer: async (videoBuf, faceBuf) => {
    const videoUrl = await Pixnova.uploadVideoBuffer(videoBuf);
    const faceUrl = await Pixnova.uploadImageBuffer(faceBuf, "API");
    const res = await Pixnova.request("/pn/v1/generate_video_face", {
      source_video: videoUrl,
      face_image: faceUrl,
      start: 0,
      end: 10,
      type: 1,
      request_from: 2,
      enhance: 0
    });
    return await Pixnova.poll(res.data.task_id, "/pn/v1/check_status", "API", { is_batch: true });
  },

  generateBabyBuffer: async (fatherBuf, motherBuf, gender) => {
    const fatherUrl = await Pixnova.uploadImageBuffer(fatherBuf, "TOOLS");
    const motherUrl = await Pixnova.uploadImageBuffer(motherBuf, "TOOLS");
    const payload = {
      fn_name: "demo-ai-baby",
      call_type: 3,
      input: { gender, father_image: fatherUrl, mother_image: motherUrl, request_from: 2 },
      request_from: 2,
      origin_from: "111977c0d5def647"
    };
    const res = await Pixnova.request("/of/create", payload, "TOOLS");
    return await Pixnova.poll(res.data.task_id, "/of/check-status", "TOOLS", {
      fn_name: "demo-ai-baby",
      call_type: 3
    });
  }
};

module.exports = Pixnova;

// ────────────────────────────────────────────────
// Test / Example usage
// ────────────────────────────────────────────────

const fs = require("fs");
const Pixnova = require("./test");

(async () => {
  const target = fs.readFileSync("source.jpg");
  const face   = fs.readFileSync("example.jpg");

  try {
    const url = await Pixnova.swapImageBuffer(target, face);
    console.log("Done →", url);
  } catch (e) {
    console.error(e);
  }
})();
