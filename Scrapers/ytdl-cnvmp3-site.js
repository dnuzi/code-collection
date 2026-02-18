const axios = require('axios')

const dxzVideoQualities = ['144', '240', '360', '720', '1080']
const dxzAudioQualities = ['96', '128', '256', '320']

function dxzExtractId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/
  const match = url.match(regex)
  return match ? match[1] : null
}

function dxzMapAudioQuality(bitrate) {
  if (bitrate == 320) return 0
  if (bitrate == 256) return 1
  if (bitrate == 128) return 4
  if (bitrate == 96)  return 5
  return 4
}

async function dxzRequest(url, data) {
  return axios.post(url, data, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
      'Content-Type': 'application/json',
      origin: 'https://cnvmp3.com',
      referer: 'https://cnvmp3.com/v51'
    }
  })
}

async function dxzDownload(yturl, quality, format = 'mp3') {
  const dxzYoutubeId = dxzExtractId(yturl)
  if (!dxzYoutubeId) throw new Error('Invalid yt url')

  const dxzFormatValue = format === 'mp4' ? 0 : 1
  let dxzFinalQuality

  if (dxzFormatValue === 0) {
    if (!dxzVideoQualities.includes(String(quality))) {
      throw new Error('invalid mp4 quality')
    }
    dxzFinalQuality = parseInt(quality)
  } else {
    if (!dxzAudioQualities.includes(String(quality))) {
      throw new Error('invalid mp3 quality')
    }
    dxzFinalQuality = dxzMapAudioQuality(parseInt(quality))
  }

  const dxzCheck = await dxzRequest('https://cnvmp3.com/check_database.php', {
    youtube_id: dxzYoutubeId,
    quality: dxzFinalQuality,
    formatValue: dxzFormatValue
  })

  if (dxzCheck.data && dxzCheck.data.success) {
    return {
      title: dxzCheck.data.data.title,
      download: dxzCheck.data.data.server_path
    }
  }

  const dxzFullUrl = `https://www.youtube.com/watch?v=${dxzYoutubeId}`
  
  const dxzVideoData = await dxzRequest('https://cnvmp3.com/get_video_data.php', {
    url: dxzFullUrl,
    token: "1234"
  })

  if (dxzVideoData.data.error) throw new Error(dxzVideoData.data.error)

  const dxzTitle = dxzVideoData.data.title

  const dxzDownloadResp = await dxzRequest('https://cnvmp3.com/download_video_ucep.php', {
    url: dxzFullUrl,
    quality: dxzFinalQuality,
    title: dxzTitle,
    formatValue: dxzFormatValue
  })

  if (dxzDownloadResp.data.error) throw new Error(dxzDownloadResp.data.error)

  const dxzFinalLink = dxzDownloadResp.data.download_link

  await dxzRequest('https://cnvmp3.com/insert_to_database.php', {
    youtube_id: dxzYoutubeId,
    server_path: dxzFinalLink,
    quality: dxzFinalQuality,
    title: dxzTitle,
    formatValue: dxzFormatValue
  })

  return {
    title: dxzTitle,
    download: dxzFinalLink
  }
}

// usage example
dxzDownload('https://www.youtube.com/watch?v=DrulgpXAGCA', 1080, 'mp4')
  .then(console.log)
  .catch(console.error)

/*
{
  title: 'Hindia - Kita ke Sana (Official Lyric Video)',
  download: 'https://apio19dlp.cnvmp3.online/downloads/download.php?file=/Hindia - Kita ke Sana (Official Lyric Video)_8f23e.mp4'
}
*/

dxzDownload('https://www.youtube.com/watch?v=DrulgpXAGCA', 320, 'mp3')
  .then(console.log)
  .catch(console.error)

/*
{
  title: 'Hindia - Kita ke Sana (Official Lyric Video)',
  download: 'https://apio19dlp.cnvmp3.online/downloads/download.php?file=/Hindia - Kita ke Sana (Official Lyric Video)_8f23e.mp4'
}
*/
