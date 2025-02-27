let fetch;

(async () => {
    fetch = (await import('node-fetch')).default;
})();

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const { fetchCaptions } = require('./captionFetcher');

const processedVideosFile = path.join(__dirname, 'processed_videos.json');

dotenv.config();

/**
 * Load JSON data from file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
async function loadJsonFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading JSON file:', error.message);
        throw error;
    }
}

/**
 * Save enhanced data to JSON file
 * @param {Object} data - Data to save
 * @param {string} outputPath - Path to save JSON file
 */
async function saveEnhancedData(data, outputPath = 'enhanced_youtube_news_videos.json') {
    try {
        await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2));
        console.log(`Enhanced data saved to: ${outputPath}`);
    } catch (error) {
        console.error('Error saving enhanced data:', error.message);
        throw error;
    }
}

/**
 * Load or initialize processed videos tracking
 * @returns {Object} Map of processed video IDs
 */
async function loadProcessedVideos() {
    try {
        if (fs.existsSync(processedVideosFile)) {
            return JSON.parse(await fs.promises.readFile(processedVideosFile, 'utf8'));
        }
        return { processedVideos: {} };
    } catch (error) {
        console.warn('Could not load processed videos, starting fresh');
        return { processedVideos: {} };
    }
}

/**
 * Save processed videos tracking
 * @param {Object} processed - Map of processed video IDs
 */
async function saveProcessedVideos(processed) {
    await fs.promises.writeFile(processedVideosFile, JSON.stringify(processed, null, 2));
}

/**
 * Fetch video details using YouTube API v3
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video details
 */
async function fetchVideoDetails(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YouTube API key not found in environment variables');
    }

    const youtube = google.youtube({ version: 'v3', auth: apiKey });

    try {
        const [videoResponse, captionsText] = await Promise.all([
            youtube.videos.list({
                part: 'snippet,statistics,contentDetails',
                id: videoId
            }),
            fetchCaptions(videoId)
        ]);

        if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
            console.warn(`No data found for video ID: ${videoId}`);
            return null;
        }

        const details = videoResponse.data.items[0];
        return {
            ...details,
            captions: captionsText
        };
    } catch (error) {
        console.error(`Failed to fetch details for video ID ${videoId}:`, error.message);
        return null;
    }
}

/**
 * Process a specific category from the news data
 * @param {Object} data - The full news data object
 * @param {number} categoryIndex - Index of the category to process
 * @returns {Promise<Object>} Enhanced data for the selected category
 */
async function processCategory(data, categoryIndex = 0) {
    const categories = Object.keys(data);
    const selectedCategory = categories[categoryIndex];

    if (!selectedCategory) {
        throw new Error(`Invalid category index: ${categoryIndex}. Available categories: ${categories.length}`);
    }

    console.log(`Processing category: ${selectedCategory}`);
    console.log(`Number of videos to process: ${data[selectedCategory].length}`);

    const enhancedData = {};
    enhancedData[selectedCategory] = [];
    let processedCount = 0;

    // Load processed videos tracking
    const processed = await loadProcessedVideos();

    for (const video of data[selectedCategory]) {
        if (processedCount >= 5) break;

        try {
            const videoId = new URL(video.url).searchParams.get('v');
            if (!videoId) {
                console.warn(`Invalid video URL: ${video.url}`);
                continue;
            }

            // Skip if already processed
            if (processed.processedVideos[videoId]) {
                console.log(`Skipping already processed video: ${video.title}`);
                continue;
            }

            console.log(`Fetching details for video: ${video.title}`);
            const details = await fetchVideoDetails(videoId);

            if (details && details.contentDetails.caption === 'true') {
                enhancedData[selectedCategory].push({
                    ...video,
                    views: details.statistics.viewCount,
                    likes: details.statistics.likeCount,
                    comments: details.statistics.commentCount,
                    thumbnail: details.snippet.thumbnails.high.url,
                    duration: details.contentDetails.duration,
                    publishedAt: details.snippet.publishedAt,
                    description: details.snippet.description,
                    hasCaptions: true,
                    language: details.snippet.defaultLanguage || details.snippet.defaultAudioLanguage || 'unknown',
                    captions: details.captions
                });
                
                // Mark as processed
                processed.processedVideos[videoId] = new Date().toISOString();
                await saveProcessedVideos(processed);
                
                processedCount++;
                console.log(`Successfully enhanced video: ${video.title}`);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`Error processing video ${video.title}:`, error.message);
        }
    }

    return enhancedData;
}

// Main execution
const inputFile = 'youtube_news_videos.json';

async function main() {
    try {
        const data = await loadJsonFile(inputFile);
        const categories = Object.keys(data);
        let allEnhancedData = {};

        // Process each category
        for (let i = 0; i < categories.length; i++) {
            console.log(`\nProcessing category ${i + 1} of ${categories.length}`);
            const enhancedData = await processCategory(data, i);
            // Merge the enhanced data
            Object.assign(allEnhancedData, enhancedData);
        }

        await saveEnhancedData(allEnhancedData);
        console.log('Completed processing all categories');
    } catch (error) {
        console.error('Error in main execution:', error.message);
    }
}

main();

module.exports = {
    loadJsonFile,
    fetchVideoDetails,
    processCategory,
    saveEnhancedData,
    loadProcessedVideos,
    saveProcessedVideos
};
