const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs'); 

function dxzExtractThumbnail($, element) {
    const context = $(element).closest('li, div, article, .cb-lst-itm, .cb-nws-itm, .cb-nws-lst-itm, section');
   
    const dxzCricbuzzSelectors = [
        '.cb-nws-thumb img',
        '.cb-lst-itm-thumb img',
        '.cb-nws-itm-thumb img',
        '.cb-thumb img',
        '[class*="thumb"] img',
        '[class*="image"] img',
        '.large-preview img',
        '.preview-image img',
        '.cb-nws-intr img',
        '.cb-nws-feat img'
    ];

    for (const selector of dxzCricbuzzSelectors) {
        const imgEl = context.find(selector).first();
        if (imgEl.length) {
            let src = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-original');
            if (src) {
                src = src.includes('http') ? src : `https:${src}`;
                if (src.includes('cricbuzz') || src.includes('static.cricbuzz') || src.match(/\.(jpg|jpeg|png|webp)$/i)) {
                    return src;
                }
            }
        }
    }
    
    const bgElements = context.find('[style*="background-image"], [class*="bg-image"], .thumb-bg');
    for (let i = 0; i < bgElements.length; i++) {
        const style = bgElements.eq(i).attr('style') || '';
        const bgMatch = style.match(/background-image:\s*url\(["']?([^"')]+)["']?/i);
        if (bgMatch) {
            let src = bgMatch[1];
            src = src.includes('http') ? src : `https:${src}`;
            if (src.includes('cricbuzz') || src.match(/\.(jpg|jpeg|png|webp)$/i)) {
                return src;
            }
        }
    }
   
    const allImgs = context.find('img').addBack('img');
    for (let i = 0; i < Math.min(5, allImgs.length); i++) {
        let src = allImgs.eq(i).attr('src') ||
                  allImgs.eq(i).attr('data-src') ||
                  allImgs.eq(i).attr('data-original') ||
                  allImgs.eq(i).attr('data-lazy-src');
       
        if (src && src !== '/images/no_image.png') {
            src = src.includes('http') ? src : `https:${src}`;
            if (src.includes('cricbuzz') || src.includes('static.cricbuzz') || src.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                return src;
            }
        }
    }
    
    const parentContainer = context.closest('.cb-nws-lst, .cb-lst, .cb-nws-feat, section, main');
    if (parentContainer.length) {
        const parentImgs = parentContainer.find('img').not(context.find('img'));
        for (let i = 0; i < Math.min(3, parentImgs.length); i++) {
            let src = parentImgs.eq(i).attr('src') || parentImgs.eq(i).attr('data-src');
            if (src && src.includes('cricbuzz')) {
                src = src.includes('http') ? src : `https:${src}`;
                return src;
            }
        }
    }
    return '';
}

function dxzExtractTime($, element) {
    const timePatterns = [
        /(\d+)(min|minute|mins?) ago|(\d+)(h|hr|hour|hours?) ago|(\d+)(d|day|days?) ago/i,
        /(\d{1,2}:\d{2})(?:\s*(am|pm))?/i,
        /ago|just now|minutes?|hours?|days?/i,
        /\d+\s*(min|hr|d)/i
    ];
    const timeSelectors = [
        'time', '.time', '.cb-time', '.cb-nws-time', '.cb-lst-itm-time',
        '.publish-time', '.posted-time', '.date-time',
        '[class*="time"]', '[class*="ago"]', '[class*="date"]',
        '[datetime]', '.published', '.updated'
    ];
    const context = $(element).closest('li, div, article, .cb-lst-itm, .cb-nws-itm, .cb-nws-lst-itm');
   
    const allSelectors = context.find('*').addBack('*');
    for (const selector of timeSelectors) {
        const timeEl = allSelectors.filter(selector).first();
        if (timeEl.length) {
            const text = timeEl.text().trim();
            const attrTime = timeEl.attr('datetime') || timeEl.attr('title');
            if (attrTime && attrTime !== text) return attrTime.trim();
            for (const pattern of timePatterns) {
                if (pattern.test(text)) return text;
            }
        }
    }
    const broaderContext = context.closest('.cb-nws-lst, .cb-lst, section, main').length
        ? context.closest('.cb-nws-lst, .cb-lst, section, main')
        : context;
   
    const allText = broaderContext.text();
    for (const pattern of timePatterns) {
        const match = allText.match(pattern);
        if (match) return match[0];
    }
    return 'Recent';
}

function dxzExtractTournament(title, link, contextText) {
    const tournamentPatterns = [
        /(T20 World Cup|IPL|World Cup|Champions Trophy|Champions League|Ashes|Border-Gavaskar|WTC|World Test Championship)[\s,]*(\d{4})?/i,
        /(IPL|T20|ODI|Test)\s+(\d{4})/i,
        /IPL\s+\d+/i,
        /(World\s+Cup|T20\s+World\s+Cup)/i
    ];
    for (const pattern of tournamentPatterns) {
        const match = title.match(pattern);
        if (match) return match[0];
    }
    for (const pattern of tournamentPatterns) {
        const match = link.match(pattern);
        if (match) return match[0];
    }
    const contextLower = contextText.toLowerCase();
    if (contextLower.includes('ipl') || contextLower.includes('world cup') ||
        contextLower.includes('t20') || contextLower.includes('champions trophy')) {
        return 'Major Tournament';
    }
    return '';
}

function dxzExtractCategory(context) {
    const allText = context.text().toLowerCase();
   
    const directCategories = {
        'match report': 'Match Report',
        'match reports': 'Match Report',
        'report': 'Match Report',
        'match preview': 'Preview',
        'preview': 'Preview',
        'match analysis': 'Analysis',
        'analysis': 'Analysis',
        'feature': 'Feature',
        'features': 'Feature',
        'interview': 'Interview',
        'live blog': 'Live Blog',
        'live updates': 'Live Blog'
    };
    for (const [key, value] of Object.entries(directCategories)) {
        if (allText.includes(key)) return value;
    }
    if (allText.includes('live') || allText.includes('ongoing') || allText.includes('today')) {
        return 'Live Updates';
    }
    if (allText.includes('preview') || allText.includes('build-up')) {
        return 'Preview';
    }
    if (allText.includes('report') || allText.includes('result')) {
        return 'Match Report';
    }
    if (allText.includes('analysis') || allText.includes('review')) {
        return 'Analysis';
    }
    if (allText.includes('interview') || allText.includes('exclusive')) {
        return 'Interview';
    }
    return 'News';
}

function dxzExtractStructuredNews($, element) {
    const dxzNewsItem = {
        category: '',
        tournament: '',
        title: '',
        subtitle: '',
        time: '',
        thumbnail: '',
        link: ''
    };
    let linkEl = $(element).find('a[href*="/cricket-news"], a[href*="/news/"], a[href*="/story/"]').first();
    if (!linkEl.length) {
        linkEl = $(element).find('a[href*="/cricket/"][href*="/news"]').first();
    }
    if (!linkEl.length) {
        linkEl = $(element).find('a').first();
    }
    if (!linkEl.length) {
        linkEl = $(element).filter('a');
    }
    dxzNewsItem.link = linkEl.attr('href') || '';
    dxzNewsItem.title = (linkEl.text() || $(element).text()).replace(/\s+/g, ' ').trim();
    if (!dxzNewsItem.title || dxzNewsItem.title.length < 10) return dxzNewsItem;
    const context = $(element).closest('li, div, article, .cb-lst-itm, .cb-nws-itm, .cb-nws-lst-itm');
    const allContextText = context.text().toLowerCase();
    dxzNewsItem.tournament = dxzExtractTournament(dxzNewsItem.title, dxzNewsItem.link, allContextText);
    dxzNewsItem.category = dxzExtractCategory(context.length ? context : $(element));
    dxzNewsItem.thumbnail = dxzExtractThumbnail($, element);
    
    context.find('p, .description, .summary, span, small, div:not([class*="time"])').each((i, el) => {
        if (dxzNewsItem.subtitle) return false;
        let text = $(el).text().trim();
        text = text.replace(/\s+/g, ' ').trim();
       
        if (text && text !== dxzNewsItem.title &&
            text.length > 20 && text.length < 300 &&
            !text.match(/\d+m ago|\d+h ago|\d+d ago/i) &&
            !text.match(/ago|just now/i)) {
            dxzNewsItem.subtitle = text;
        }
    });
    dxzNewsItem.time = dxzExtractTime($, element);
    return dxzNewsItem;
}

async function dxzScrapeCricbuzzNewsEnhanced() {
    try {
        console.log('🌐 Fetching Cricbuzz main page with FIXED thumbnails...');
        const response = await axios.get('https://www.cricbuzz.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"'
            },
            timeout: 20000
        });
        const $ = cheerio.load(response.data);
        const dxzNews = [];
        let processed = 0;
        let thumbnailsFound = 0;

        const selectors = [
            '.cb-nws-lst li',
            '.cb-lst-itm',
            '.cb-nws-itm',
            'a[href*="/cricket-news/"]',
            'a[href*="/news/"]',
            'a[href*="/story/"]',
            '[class*="nws"] li, [class*="nws"] div',
            '[class*="news"] li, [class*="news"] div',
            '.cb-feat-rgt-itms li',
            '.cb-nws-feat li',
            '.cb-nws-lst-itm'
        ];
        selectors.forEach((selector, selectorIndex) => {
            const elements = $(selector);
            console.log(`📋 Selector ${selectorIndex + 1}: ${selector} -> ${elements.length} elements`);
           
            elements.each((index, element) => {
                processed++;
                const newsItem = dxzExtractStructuredNews($, $(element));
               
                if (newsItem.title && newsItem.title.length > 15 &&
                    newsItem.link && newsItem.link.includes('/') &&
                    !dxzNews.some(n => n.title === newsItem.title && n.link === newsItem.link)) {
                   
                    const fullLink = newsItem.link.startsWith('http') ? newsItem.link : `https://www.cricbuzz.com${newsItem.link}`;
                    const item = {
                        ...newsItem,
                        link: fullLink,
                        source: 'main-page'
                    };
                   
                    if (newsItem.thumbnail) thumbnailsFound++;
                    dxzNews.push(item);
                }
            });
        });
        console.log(`✅ Processed ${processed} elements, found ${dxzNews.length} valid news items`);
        console.log(`🖼️ Thumbnails found: ${thumbnailsFound}/${dxzNews.length} (${Math.round(thumbnailsFound/dxzNews.length*100)}%)`);
        return dxzNews.slice(0, 25);
    } catch (error) {
        console.error('❌ Enhanced scraper error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
        return [];
    }
}

async function dxzMain() {
    console.log('🚀 Cricbuzz News Scraper 🖼️\n');
   
    const mainNews = await dxzScrapeCricbuzzNewsEnhanced();
   
    if (mainNews.length === 0) {
        console.log('😞 No news found.');
        return;
    }
   
    console.log('\n🏆 TOP NEWS WITH THUMBNAILS:\n');
    mainNews.slice(0, 15).forEach((news, i) => {
        console.log(`${i + 1}. ${news.category ? `【${news.category}】` : '【News】'}`);
        if (news.tournament) console.log(` 🏆 ${news.tournament}`);
        console.log(` 📢 ${news.title}`);
        if (news.subtitle) console.log(` 💬 ${news.subtitle}`);
        console.log(` ⏰ ${news.time}`);
        if (news.thumbnail) {
            console.log(` 🖼️ ${news.thumbnail.substring(0, 60)}${news.thumbnail.length > 60 ? '...' : ''}`);
        } else {
            console.log(` 🖼️ No thumbnail found`);
        }
        console.log(` 🔗 ${news.link.substring(0, 60)}...`);
        console.log('');
    });
   
    fs.writeFileSync('cricbuzz_news_with_thumbnails.json', JSON.stringify(mainNews, null, 2));
    console.log(`💾 Saved ${mainNews.length} items to cricbuzz_news_with_thumbnails.json`);
   
    const thumbs = mainNews.filter(n => n.thumbnail).length;
    console.log(`📊 Thumbnail success rate: ${thumbs}/${mainNews.length} (${Math.round(thumbs/mainNews.length*100)}%)`);
}

dxzMain().catch(console.error);
