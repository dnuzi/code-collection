const axios = require('axios')
const fs = require('fs')
const { zencf } = require('zencf')

// Spotify downloader / searcher script
// Created by @DanuZz

async function gettoken() {
  const { token } = await zencf.turnstileMin(
    'https://spotidownloader.com/en13',
    '0x4AAAAAAA8QAiFfE5GuBRRS'
  )

  const r = await axios.post(
    'https://api.spotidownloader.com/session',
    { token },
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  )

  return r.data.token
}

async function searchspotify(query, bearer) {
  const r = await axios.post(
    'https://api.spotidownloader.com/search',
    { query },
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        authorization: `Bearer ${bearer}`,
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  )

  return r.data
}

async function dlspotify(id, bearer) {
  const r = await axios.post(
    'https://api.spotidownloader.com/download',
    { id },
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'content-type': 'application/json',
        authorization: `Bearer ${bearer}`,
        origin: 'https://spotidownloader.com',
        referer: 'https://spotidownloader.com/'
      }
    }
  )

  const audio = await axios.get(r.data.link, {
    responseType: 'arraybuffer',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      authorization: `Bearer ${bearer}`,
      origin: 'https://spotidownloader.com',
      referer: 'https://spotidownloader.com/'
    }
  })

  return Buffer.from(audio.data)
}

async function spotify(input) {
  const bearer = await gettoken()

  // Direct Spotify track URL
  if (/spotify\.com\/track\//i.test(input)) {
    const id = input.split('/track/')[1].split('?')[0]
    return await dlspotify(id, bearer)
  }

  // Just the 22-character Spotify ID
  if (/^[a-zA-Z0-9]{22}$/.test(input)) {
    return await dlspotify(input, bearer)
  }

  // Otherwise treat input as search query
  return await searchspotify(input, bearer)
}

// ────────────────────────────────────────────────
// Examples:
// ────────────────────────────────────────────────

/*
// Search example
spotify('night changes one direction')
  .then(console.log)
  .catch(console.error)
*/

/*
// Download example
spotify('https://open.spotify.com/track/5O2P9iiztwhomNh8xkR9lJ')
  .then(b => fs.writeFileSync('output.mp3', b))
  .catch(console.error)
*/

// Created by @DanuZz
