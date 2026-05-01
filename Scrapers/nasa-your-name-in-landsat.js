const { createCanvas, loadImage } = require('canvas');

const nasaLandsatScraper = async (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Please provide a valid text input.');
    }

    const queryClean = text.toLowerCase().replace(/[^a-z\s-]/g, '');
    if (queryClean.replace(/[\s-]/g, '').length === 0) {
        throw new Error('Please provide a valid name using letters A-Z.');
    }

    const baseUrl = 'https://science.nasa.gov/specials/your-name-in-landsat/images/';
    const gap = 8;
    const lineGap = 20;

    const words = queryClean.split(/[\s-]+/).filter(w => w !== '');
    const allImages = [];
    const lineHeights = [];
    const lineWidths = [];

    for (const word of words) {
        const lineImages = [];
        let maxHeight = 0;
        let totalWidth = 0;

        for (const letter of word) {
            const num = Math.floor(Math.random() * 4) + 1;
            const url = `${baseUrl}${letter}_${num}.jpg`;

            try {
                const img = await loadImage(url);
                lineImages.push({ img, width: img.width, height: img.height });
                if (img.height > maxHeight) maxHeight = img.height;
                totalWidth += img.width + gap;
            } catch (e) {
                lineImages.push({ img: null, width: 200, height: 200, letter });
                maxHeight = Math.max(maxHeight, 200);
                totalWidth += 200 + gap;
            }
        }

        allImages.push(lineImages);
        lineHeights.push(maxHeight);
        lineWidths.push(totalWidth - gap);
    }

    const maxWidth = Math.max(...lineWidths);
    const totalHeight = lineHeights.reduce((a, b) => a + b, 0) + (words.length - 1) * lineGap;

    const canvas = createCanvas(maxWidth, totalHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgb(10, 15, 42)';
    ctx.fillRect(0, 0, maxWidth, totalHeight);

    let currentY = 0;
    allImages.forEach((line, index) => {
        const lineTotalWidth = lineWidths[index];
        const startX = (maxWidth - lineTotalWidth) / 2;
        let currentX = startX;
        const currentLineHeight = lineHeights[index];

        for (const item of line) {
            const yOffset = (currentLineHeight - item.height) / 2;

            if (item.img) {
                ctx.drawImage(item.img, currentX, currentY + yOffset, item.width, item.height);
            } else {
                ctx.fillStyle = 'rgb(60, 60, 80)';
                ctx.fillRect(currentX, currentY, item.width, currentLineHeight);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 40px Sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(item.letter.toUpperCase(), currentX + item.width / 2, currentY + currentLineHeight / 2 + 15);
            }

            currentX += item.width + gap;
        }

        currentY += currentLineHeight + lineGap;
    });

    return canvas.toBuffer('image/jpeg');
};

module.exports = nasaLandsatScraper;

nasaLandsatScraper('danupa')
    .then((buffer) => {
        require('fs').writeFileSync('nasa.jpg', buffer);
        console.log('Image saved to nasa.jpg');
    })
    .catch(console.error);
