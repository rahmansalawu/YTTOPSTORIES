/**
 * YouTube News Scraper
 * 
 * This script automates the process of scraping video information from YouTube's news feed,
 * organizing videos by their subject matter categories. It identifies how YouTube groups
 * related news videos under major event topics of the day.
 * 
 * Features:
 * - Smart category detection based on YouTube's news grouping
 * - Duplicate removal within categories
 * - Retry logic for reliability
 * - Proper resource cleanup
 * 
 * @module youtube-news-scraper
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Configuration settings for the scraper
 * @constant {Object}
 */
const CONFIG = {
    urls: {
        general: 'https://www.youtube.com/feed/news_destination',
        business: 'https://www.youtube.com/feed/news_destination/business'
    },
    browser: {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    },
    timeouts: {
        navigation: 60000,    // Page navigation timeout
        content: 5000,       // Wait for content to load
        scroll: 2000         // Wait between scrolls
    },
    viewport: {
        width: 1920,
        height: 1080
    },
    scrollIterations: 3,     // Number of times to scroll for more content
    retry: {
        maxAttempts: 3,      // Maximum number of retry attempts
        delayMs: 5000        // Delay between retries in milliseconds
    }
};

/**
 * Sleep/delay utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches and categorizes video information from a YouTube news page
 * 
 * This function:
 * 1. Launches a browser and navigates to the specified URL
 * 2. Scrolls to load more content
 * 3. Identifies news categories/topics
 * 4. Groups videos under their respective categories
 * 5. Removes duplicates within each category
 * 
 * @param {string} url - The YouTube URL to scrape
 * @returns {Promise<Object>} Object containing categorized video information
 * @throws {Error} If all retry attempts fail
 * 
 * @example
 * const videoData = await fetchYoutubeLinks(CONFIG.urls.general);
 * // Returns:
 * // {
 * //   "Major Event 1": [
 * //     { url: "...", title: "...", channel: "..." },
 * //     ...
 * //   ],
 * //   "Major Event 2": [ ... ]
 * // }
 */
async function fetchYoutubeLinks(url) {
    let attempt = 1;
    let lastError = null;

    while (attempt <= CONFIG.retry.maxAttempts) {
        let browser = null;
        try {
            if (attempt > 1) {
                console.log(`Retry attempt ${attempt}/${CONFIG.retry.maxAttempts} after ${CONFIG.retry.delayMs}ms delay...`);
                await sleep(CONFIG.retry.delayMs);
            }

            browser = await puppeteer.launch(CONFIG.browser);
            console.log('Browser launched');
            
            const page = await browser.newPage();
            await page.setViewport(CONFIG.viewport);
            console.log('Navigating to:', url);
            
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: CONFIG.timeouts.navigation
                });
            } catch (navigationError) {
                throw new Error(`Failed to load page: ${navigationError.message}`);
            }

            console.log('Initial page load complete, waiting for content...');

            try {
                await page.waitForSelector('#content', { timeout: CONFIG.timeouts.navigation });
                console.log('Main content container found');
            } catch (error) {
                console.log('Warning: Timeout waiting for #content, but continuing...');
            }

            await page.waitForTimeout(CONFIG.timeouts.content);
            
            console.log('Scrolling to load more content...');
            
            for (let i = 0; i < CONFIG.scrollIterations; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight * 2);
                });
                await page.waitForTimeout(CONFIG.timeouts.scroll);
            }

            await page.waitForTimeout(CONFIG.timeouts.scroll);

            const videoInfo = await page.evaluate(() => {
                const newsCategories = {};
                const sections = document.querySelectorAll('ytd-rich-section-renderer');
                
                if (sections.length === 0) {
                    throw new Error('No news sections found on the page');
                }
                
                sections.forEach(section => {
                    const sectionTitle = section.querySelector('#title-text')?.textContent?.trim();
                    if (!sectionTitle) return;
                    
                    if (!newsCategories[sectionTitle]) {
                        newsCategories[sectionTitle] = [];
                    }
                    
                    const seenUrls = new Set();
                    const videos = section.querySelectorAll('a#thumbnail[href*="watch"]');
                    
                    videos.forEach(anchor => {
                        if (seenUrls.has(anchor.href)) return;
                        
                        const container = anchor.closest('ytd-rich-item-renderer, ytd-video-renderer');
                        if (!container) return;
                        
                        const title = container.querySelector('#video-title')?.textContent?.trim() || '';
                        const channelName = container.querySelector('#channel-name a, #text > a')?.textContent?.trim() || '';
                        
                        if (anchor.href && title) {
                            seenUrls.add(anchor.href);
                            newsCategories[sectionTitle].push({
                                url: anchor.href,
                                title: title,
                                channel: channelName
                            });
                        }
                    });
                });

                if (Object.keys(newsCategories).length === 0) {
                    throw new Error('No videos found in any category');
                }

                return newsCategories;
            });

            console.log(`Found ${Object.keys(videoInfo).length} news categories`);
            await browser.close();
            return videoInfo;

        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error.message);
            
            if (browser) {
                try {
                    await browser.close();
                    console.log('Browser closed after error');
                } catch (closeError) {
                    console.error('Error closing browser:', closeError.message);
                }
            }

            if (attempt === CONFIG.retry.maxAttempts) {
                throw new Error(`All ${CONFIG.retry.maxAttempts} attempts failed. Last error: ${lastError.message}`);
            }
            
            attempt++;
        }
    }
}

/**
 * Saves the scraped data to a JSON file with validation
 * 
 * This function:
 * 1. Validates input data structure
 * 2. Ensures proper JSON format
 * 3. Creates directory if needed
 * 4. Verifies the saved file
 * 
 * @param {Object} data - Categorized video data to save
 * @param {string} filename - Output filename (must end with .json)
 * @throws {Error} If data is invalid or file operations fail
 * 
 * @example
 * saveToJSON({
 *   "Category": [
 *     { url: "...", title: "...", channel: "..." }
 *   ]
 * }, "output.json");
 */
function saveToJSON(data, filename) {
    try {
        // Validate input data
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }

        if (Object.keys(data).length === 0) {
            throw new Error('Data object is empty');
        }

        // Validate filename
        if (!filename || typeof filename !== 'string') {
            throw new Error('Filename must be a non-empty string');
        }

        if (!filename.toLowerCase().endsWith('.json')) {
            throw new Error('Filename must have .json extension');
        }

        // Validate data structure
        for (const [category, videos] of Object.entries(data)) {
            if (typeof category !== 'string' || category.trim().length === 0) {
                throw new Error('Invalid category name found');
            }

            if (!Array.isArray(videos)) {
                throw new Error(`Videos for category "${category}" must be an array`);
            }

            videos.forEach((video, index) => {
                if (!video.url || !video.title) {
                    throw new Error(`Invalid video data in category "${category}" at index ${index}`);
                }

                if (!video.url.startsWith('https://www.youtube.com/watch?v=')) {
                    throw new Error(`Invalid YouTube URL in category "${category}" at index ${index}`);
                }
            });
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Convert to JSON with pretty printing
        const jsonContent = JSON.stringify(data, null, 2);

        // Write to file
        fs.writeFileSync(filename, jsonContent, 'utf-8');
        console.log(`Data saved to ${filename}`);

        // Verify the file was written correctly
        try {
            const savedContent = fs.readFileSync(filename, 'utf-8');
            JSON.parse(savedContent); // Will throw if invalid JSON
        } catch (error) {
            throw new Error('Failed to verify saved JSON file');
        }

    } catch (error) {
        throw new Error(`Failed to save JSON file: ${error.message}`);
    }
}

// Configuration
const outputFile = path.join(__dirname, 'youtube_news_videos.json');

// Main execution
(async () => {
    try {
        // You can easily switch between news types
        const videoData = await fetchYoutubeLinks(CONFIG.urls.general); // or CONFIG.urls.business
        saveToJSON(videoData, outputFile);
        console.log('Process completed successfully');
    } catch (error) {
        console.error('Failed to fetch videos:', error.message);
        process.exit(1); // Exit with error code
    }
})();
