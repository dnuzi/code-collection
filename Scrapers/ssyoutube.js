const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Content-Type': 'application/x-www-form-urlencoded',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'origin': 'https://ssyoutube.online',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
  'referer': 'https://ssyoutube.online/en12/',
  'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
}

const quality = ['144', '240', '360', '720', '1080', 'audio']

function wfr(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.status === 'done' && data.output) {
        ws.close()
        resolve(data.output.url)
      } else if (data.error) {
        ws.close()
        reject(new Error(data.error))
      }
    }

    ws.onerror = () => {
      reject(new Error('WebSocket Error'))
    }
  })
}

async function ssyoutube(url, resolution = '720') {
  if (!quality.includes(resolution)) {
    throw new Error(`quality is not valid bro, valid ones are these: ${quality.join(', ')}`)
  }

  const r = await fetch('https://ssyoutube.online/yt-video-detail/', {
    method: 'POST',
    headers,
    body: new URLSearchParams({ videoURL: url }).toString()
  })

  const html = await r.text()

  const titleMatch = html.match(/<div class="col-lg-12 col-md-12 col-sm-12 videoTitle"[^>]*>\s*(.*?)\s*<\/div>/)
  const thumbMatch = html.match(/<img class="thumbnail" src="([^"]+)"/)
  const durationMatch = html.match(/<label class="duration">Duration: ([^<]+)<\/label>/)
  const formatUrlsMatch = html.match(/let cachedFormatUrls = ({[\s\S]*?});/)
  const videoIdMatch = html.match(/name="video_id" value="([^"]+)"/)
  const nonceMatch = html.match(/'X-WP-Nonce':\s*'([^']+)'/)

  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title'
  const thumbnail = thumbMatch ? thumbMatch[1] : null
  const duration = durationMatch ? durationMatch[1] : null
  const videoId = videoIdMatch ? videoIdMatch[1] : null
  const nonce = nonceMatch ? nonceMatch[1] : ''

  const ajaxHeaders = { 
    ...headers, 
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'x-wp-nonce': nonce 
  }

  if (resolution === 'audio') {
    const audioReq = await fetch('https://ssyoutube.online/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: ajaxHeaders,
      body: new URLSearchParams({
        action: 'get_mp3_conversion_url',
        videoUrl: url,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '256'
      }).toString()
    })

    const audioJson = await audioReq.json()

    const proxyreq = await fetch('https://ssyoutube.online/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: ajaxHeaders,
      body: new URLSearchParams({
        action: 'wp_get_proxied_url',
        targetUrl: audioJson.data.url
      }).toString()
    })

    const proxyJson = await proxyreq.json()
    const finalDownloadUrl = proxyJson.success ? proxyJson.data.proxiedUrl : audioJson.data.url

    return {
      title,
      thumbnail,
      duration,
      resolution,
      downloadUrl: finalDownloadUrl
    }
  }

  let formats = {}
  if (formatUrlsMatch) {
    const urlRegex = /'([^']+)'\s*:\s*'([^']+)'/g
    let m
    while ((m = urlRegex.exec(formatUrlsMatch[1])) !== null) {
      formats[m[1]] = m[2]
    }
  }

  const resKey = `${resolution}p`

  if (!formats[resKey]) {
    throw new Error(`Resolution not found`)
  }

  const serverReq = await fetch('https://fpa-balancer.flashydl.space/get-server')
  const wsHost = (await serverReq.text()).trim()

  const renderId = `${videoId}_${resKey}`
  const audioUrl = formats['audio'] || formats['140']

  const mergeData = {
    id: renderId,
    ttl: 3600000,
    inputs: [
      {
        url: formats[resKey],
        ext: "mp4",
        chunkDownload: { type: "header", size: 52428800, concurrency: 3 }
      },
      {
        url: audioUrl,
        ext: "m4a"
      }
    ],
    output: {
      ext: "mp4",
      downloadName: `${title}_${resKey}.mp4`,
      chunkUpload: { size: 209715200, concurrency: 3 }
    },
    operation: { type: "replace_audio_in_video" }
  }

  await fetch('https://ssyoutube.online/wp-admin/admin-ajax.php', {
    method: 'POST',
    headers: ajaxHeaders,
    body: new URLSearchParams({
      action: 'process_video_merge',
      nonce: nonce,
      request_data: JSON.stringify(mergeData)
    }).toString()
  })

  const wsUrl = `wss://${wsHost}/pub/render/status_ws/${renderId}`
  const m3u8Url = await wfr(wsUrl)

  const proxyreq = await fetch('https://ssyoutube.online/wp-admin/admin-ajax.php', {
    method: 'POST',
    headers: ajaxHeaders,
    body: new URLSearchParams({
      action: 'wp_get_proxied_url',
      targetUrl: m3u8Url
    }).toString()
  })

  const proxyJson = await proxyreq.json()
  const finalDownloadUrl = proxyJson.success ? proxyJson.data.proxiedUrl : m3u8Url

  return {
    title,
    thumbnail,
    duration,
    resolution,
    downloadUrl: finalDownloadUrl
  }
}

ssyoutube('https://youtu.be/gvunApwKIiY?si=chZvUhH78wR28uKx', 'audio')
.then(console.log)
.catch(console.error)
