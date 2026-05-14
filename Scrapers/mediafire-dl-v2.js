const pka = require('axios')
const hukpn = require('cheerio')

const mediafireDlUtto = async (url) => {
  try {
    const dnuzUtto = await pka.get(url)
    const $ = hukpn.load(dnuzUtto.data)

    const ApiUkoMuda = []

    const link = $('a#downloadButton').attr('href')

    if (!link) {
      throw new Error('Download link not found')
    }

    const size = $('a#downloadButton')
      .text()
      .replace('Download', '')
      .replace('(', '')
      .replace(')', '')
      .trim()

    const kadanawa = link.split('/')

    const UbalaSiya = kadanawa[5]

    let mime = UbalaSiya.split('.')
    mime = mime[mime.length - 1]

    ApiUkoMuda.push({
      UbalaSiya,
      mime,
      size,
      link
    })

    return ApiUkoMuda

  } catch (err) {
    console.log('Error:', err.message)
  }
}

// ================= TEST CODE =================

const test = async () => {

  const url = 'https://www.mediafire.com/file/lva294beolblhua/DarkBot_%2528share%2529.zip/file'

  const result = await mediafireDlUtto(url)

  console.log(result)
}

test()

module.exports = {
  mediafireDlUtto
}
