const ytdl = require('ytdl-lite');

const ytmp4VideoQualities = ['360', '480', '720', '1080', 'best'];

function ytmp4ExtractId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function ytmp4Download(yturl, quality = 'best') {
  const videoId = ytmp4ExtractId(yturl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const q = String(quality).toLowerCase();
  if (!ytmp4VideoQualities.includes(q) && q !== 'best') {
    throw new Error(`Invalid video quality. Supported: ${ytmp4VideoQualities.join(', ')}`);
  }

  let result;

  if (q === 'best') {
    result = await ytdl.ytmp4(yturl, 'best');
  } else {
    result = await ytdl.ytmp4(yturl, q);
  }

  return {
    title: result.title,
    download: result.url   
  };
}

// ==================== Usage Examples ====================

// Best quality MP4
ytmp4Download('https://youtu.be/vjJG4CzNLtw?si=6zd9j_fKrGdLxjjd', '480')
  .then(console.log)
  .catch(console.error);
