const dxz = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class PastPapersScraper {
    constructor() {
        this.baseUrl = 'https://pastpapers.wiki';
        this.axiosInstance = dxz.create({
            baseURL: this.baseUrl,
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
    }

    async searchPapers(searchTerm, page = 1) {
        try {
            const url = `/page/${page}/?s=${encodeURIComponent(searchTerm)}`;
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
          
            const papers = [];
            $('.post-item, .search-result-item, article').each((i, elem) => {
                const title = $(elem).find('h2 a, .post-title a, h3 a').first().text().trim();
                const link = $(elem).find('h2 a, .post-title a, h3 a').first().attr('href');
                const image = $(elem).find('img').first().attr('src');
              
                if (title && link) {
                    papers.push({
                        title,
                        url: link,
                        image: image || null,
                        directDownload: null // Will be populated if available
                    });
                }
            });
          
            return papers;
        } catch (error) {
            console.error('Search error:', error.message);
            return [];
        }
    }

    async getPaperDetails(url) {
        try {
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
          
            const details = {
                title: $('h1, .post-title').first().text().trim(),
                description: $('.post-content p').first().text().trim(),
                downloadLinks: [],
                images: []
            };

            $('a[href*=".pdf"], a[href*=".zip"], a[href*="download"], .download-btn, .btn-download')
                .each((i, elem) => {
                    const href = $(elem).attr('href');
                    const text = $(elem).text().trim();
                  
                    if (href && (href.includes('.pdf') || href.includes('.zip') || text.toLowerCase().includes('download'))) {
                        details.downloadLinks.push({
                            text: text || 'Download',
                            url: this.isAbsoluteUrl(href) ? href : new URL(href, this.baseUrl).href,
                            type: href.includes('.pdf') ? 'pdf' : href.includes('.zip') ? 'zip' : 'link'
                        });
                    }
                });

            $('.post-content a').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href && (href.includes('.pdf') || href.includes('.zip') || href.includes('drive.google.com') || href.includes('mega.nz'))) {
                    if (!details.downloadLinks.some(link => link.url === href)) {
                        details.downloadLinks.push({
                            text: $(elem).text().trim() || 'Direct Link',
                            url: this.isAbsoluteUrl(href) ? href : new URL(href, this.baseUrl).href,
                            type: href.includes('.pdf') ? 'pdf' : 'external'
                        });
                    }
                }
            });

            $('img').each((i, elem) => {
                const src = $(elem).attr('src');
                if (src && !src.includes('logo') && !src.includes('avatar')) {
                    details.images.push(this.isAbsoluteUrl(src) ? src : new URL(src, this.baseUrl).href);
                }
            });

            return details;
        } catch (error) {
            console.error('Details error:', error.message);
            return null;
        }
    }

    async downloadFile(url, filename = null) {
        try {
            const response = await dxz({
                method: 'GET',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const contentType = response.headers['content-type'];
            const contentDisposition = response.headers['content-disposition'];
          
            let fileName = filename || 'download';
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            }
          
            if (contentType?.includes('pdf')) fileName += '.pdf';
            else if (contentType?.includes('zip')) fileName += '.zip';

            const filePath = path.join(process.cwd(), 'downloads', fileName);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('Download error:', error.message);
            throw error;
        }
    }

    async getRecentPapers(page = 1) {
        try {
            const url = `/page/${page}/`;
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
          
            const papers = [];
            $('.post-item, article, .search-result-item').each((i, elem) => {
                const title = $(elem).find('h2 a, .entry-title a').first().text().trim();
                const link = $(elem).find('h2 a, .entry-title a').first().attr('href');
              
                if (title && link) {
                    papers.push({
                        title,
                        url: link,
                        image: $(elem).find('img').first().attr('src') || null
                    });
                }
            });
          
            return papers;
        } catch (error) {
            console.error('Recent papers error:', error.message);
            return [];
        }
    }

    isAbsoluteUrl(url) {
        return url.startsWith('http://') || url.startsWith('https://');
    }
}

// Usage example
const scraper = new PastPapersScraper();

// Search and download example
async function main() {
    console.log('🔍 Searching for papers...');
  
    // Search for papers
    const papers = await scraper.searchPapers('mathematics 2023');
    console.log(`Found ${papers.length} papers:`);
  
    for (const paper of papers.slice(0, 3)) { // First 3 papers
        console.log(`\n📄 ${paper.title}`);
        console.log(`🔗 ${paper.url}`);
      
        // Get details
        const details = await scraper.getPaperDetails(paper.url);
        if (details) {
            console.log('📥 Download links:');
            details.downloadLinks.forEach((link, i) => {
                console.log(` ${i+1}. ${link.text} (${link.type})`);
            });
          
            // Download first available PDF
            if (details.downloadLinks[0]) {
                try {
                    console.log(`\n⬇️ Downloading: ${details.downloadLinks[0].url}`);
                    const filePath = await scraper.downloadFile(details.downloadLinks[0].url);
                    console.log(`✅ Saved to: ${filePath}`);
                } catch (error) {
                    console.log('❌ Download failed');
                }
            }
        }
    }
}


module.exports = PastPapersScraper;

if (require.main === module) {
    main().catch(console.error);
}
