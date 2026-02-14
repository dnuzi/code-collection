const dxz = require("axios");
const danuzz = require("form-data");

class ILoveIMGClient {
    constructor() {
        this.token = null;
        this.csrfToken = null;
        this.cookies = null;
        this.task = null;
        this.server = null;
    }

    async fetchConfig() {
        try {
            const response = await dxz.get('https://www.iloveimg.com/blur-face', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            const cookies = response.headers['set-cookie'];
            const html = response.data;
            const configMatch = html.match(/var ilovepdfConfig = (\{[\s\S]*?\});/);
            if (!configMatch) throw { error: "Configuration not found on page", code: 404 };
          
            const config = JSON.parse(configMatch[1]);
            const csrfMatch = html.match(/<meta name="csrf-token" content="(.*?)">/);
            const csrfToken = csrfMatch ? csrfMatch[1] : null;
            this.token = config.token;
            this.csrfToken = csrfToken;
            this.cookies = cookies;
            return { token: config.token, csrfToken, cookies };
        } catch (error) {
            throw {
                success: false,
                error: "Failed to fetch initial configuration",
                message: error.message,
                details: error.response?.data || null
            };
        }
    }
  
    _getHeaders(contentType = null) {
        if (!this.token) throw { error: "Token not available. Run fetchConfig() first.", code: 401 };
      
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'X-CSRF-TOKEN': this.csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (this.cookies) {
            headers['Cookie'] = Array.isArray(this.cookies) ? this.cookies.join('; ') : this.cookies;
        }
        if (contentType) headers['Content-Type'] = contentType;
        return headers;
    }

    async startTask(tool = 'blurfaceimage') {
        try {
            const res = await dxz.get(`https://api.iloveimg.com/v1/start/${tool}`, {
                headers: this._getHeaders()
            });
          
            const data = res.data;
            if (!data.task || !data.server) throw { error: "API did not return Task ID or Server", details: data };
          
            this.task = data.task;
            this.server = data.server;
            return data;
        } catch (error) {
            throw {
                success: false,
                error: `Failed to start task ${tool}`,
                code: error.response?.status || 500,
                details: error.response?.data || error.message
            };
        }
    }

    async upload(fileBuffer, filename = 'img-' + Date.now() + '.jpg') {
        try {
            const formData = new danuzz();
            formData.append('task', this.task);
            formData.append('file', fileBuffer, { filename });
            const res = await dxz.post(`https://${this.server}/v1/upload`, formData, {
                headers: { ...this._getHeaders(), ...formData.getHeaders() }
            });
            if (!res.data.server_filename) throw { error: "Upload succeeded but server_filename is empty", details: res.data };
            return res.data;
        } catch (error) {
            throw {
                success: false,
                error: "Failed to upload image",
                code: error.response?.status || 500,
                details: error.response?.data || error.message
            };
        }
    }

    async detectFaces(serverFilename, level = 'recommended') {
        try {
            const formData = new danuzz();
            formData.append('task', this.task);
            formData.append('level', level);
            formData.append('fileArray[0][server_filename]', serverFilename);
          
            const res = await dxz.post(`https://${this.server}/v1/detectfaces`, formData, {
                headers: { ...this._getHeaders(), ...formData.getHeaders() }
            });
            return res.data?.data?.coordArray || [];
        } catch (error) {
            console.warn('Warning: Face detection failed, using fallback.');
            return [];
        }
    }
  
    async process(serverFilename, faceCoords, level = 'recommended') {
        try {
            const elementArray = faceCoords.map(coord => ({
                type: 'blur',
                x: Math.round(coord.x),
                y: Math.round(coord.y),
                width: Math.round(coord.width),
                height: Math.round(coord.height),
                gravity: 'NorthWest',
                pixelMode: 1
            }));
          
            const payload = {
                task: this.task,
                tool: 'blurfaceimage',
                level: level,
                files: [{
                    server_filename: serverFilename,
                    filename: `result-${Date.now()}.jpg`,
                    elementArray: elementArray
                }]
            };
            const res = await dxz.post(`https://${this.server}/v1/process`, payload, {
                headers: this._getHeaders('application/json')
            });
            if (res.data.status !== 'TaskSuccess') throw { error: "Server failed to process image", details: res.data };
            return res.data;
        } catch (error) {
            throw {
                success: false,
                error: "Failed to process image",
                code: error.response?.status || 500,
                details: error.response?.data || error.message
            };
        }
    }

    getDownloadUrl() {
        if (!this.server || !this.task) return null;
        return `https://${this.server}/v1/download/${this.task}`;
    }

    async execute(fileBuffer, filename = 'img-' + Date.now() + '.jpg') {
        const startTime = Date.now();
        try {
            if (!this.token) await this.fetchConfig();
            await this.startTask();
          
            const uploadRes = await this.upload(fileBuffer, filename);
            const serverFilename = uploadRes.server_filename;
            let faceCoords = await this.detectFaces(serverFilename);
            const isFallback = faceCoords.length === 0;
            if (isFallback) {
                faceCoords = [{ x: 50, y: 50, width: 100, height: 100 }];
            }
            await this.process(serverFilename, faceCoords);
            return {
                success: true,
                status: "success",
                data: {
                    task_id: this.task,
                    tool: "blurfaceimage",
                    server: this.server,
                    download_url: this.getDownloadUrl(),
                    process_info: {
                        faces_detected: isFallback ? 0 : faceCoords.length,
                        is_fallback_used: isFallback,
                        face_coordinates: faceCoords,
                        processing_time_ms: Date.now() - startTime
                    },
                    file_info: {
                        original_name: filename,
                        server_filename: serverFilename,
                        size_bytes: fileBuffer.length
                    }
                },
                message: "Image successfully processed and ready to download."
            };
        } catch (error) {
            return {
                success: true,
                is_error: true,
                status: "error",
                error: error.error || "Internal Client Error",
                message: error.message || "An error occurred during execution",
                code: error.code || 500,
                details: error.details || null,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = ILoveIMGClient;

// test-blur.js
// Requires Node.js >= 18 (for fetch + better async support)
// Run with: node test-blur.js

const fs = require('fs').promises;
const path = require('path');
const ILoveIMGClient = require('./test');   // adjust path if needed

async function main() {
  try {
    // Prepare an image (change this path to your own test image)
    const imagePath = path.join(__dirname, 'test-face.jpg');
    const fileBuffer = await fs.readFile(imagePath);

    console.log('Starting face blur process...');
    console.log(`Image size: ${(fileBuffer.length / 1024).toFixed(1)} KB`);

    const client = new ILoveIMGClient();

    const result = await client.execute(fileBuffer, 'my-test-photo.jpg');

    if (result.success && !result.is_error) {
      console.log('\n┌──────────────────────────────────────────────┐');
      console.log('│              Blur completed!                 │');
      console.log('└──────────────────────────────────────────────┘');
      console.log('Download URL:', result.data.download_url);
      console.log('Task ID:     ', result.data.task_id);
      console.log('Server:      ', result.data.server);
      console.log('Faces found: ', result.data.process_info.faces_detected);
      console.log('Used fallback?', result.data.process_info.is_fallback_used ? 'YES' : 'no');
      console.log('Processing time:', result.data.process_info.processing_time_ms, 'ms');
      console.log('\nYou can download the result directly from:');
      console.log(result.data.download_url);
    } else {
      console.error('\nFailed to process image:');
      console.error('Message:', result.message);
      console.error('Error  :', result.error);
      console.error('Code   :', result.code);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
    }
  } catch (err) {
    console.error('Unexpected error in test script:');
    console.error(err);
  }
}

main();
