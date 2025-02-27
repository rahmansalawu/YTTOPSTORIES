const fs = require('fs');
const path = require('path');

/**
 * Cleans a caption string by removing unwanted characters or patterns.
 * @param {string} caption - The caption text to clean.
 * @returns {string} - The cleaned caption.
 */
function cleanCaption(caption) {
    // Example cleaning: remove HTML entities and extra spaces
    return caption.replace(/&amp;#39;/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Extracts and cleans captions from the JSON file.
 * @param {string} inputPath - Path to the input JSON file.
 * @param {string} outputPath - Path to save the cleaned captions JSON.
 */
async function extractAndCleanCaptions(inputPath, outputPath) {
    try {
        const data = JSON.parse(await fs.promises.readFile(inputPath, 'utf8'));
        const cleanedCaptions = {};

        // Maintain category structure
        for (const category in data) {
            cleanedCaptions[category] = {};
            
            // Process videos in each category
            data[category].forEach(video => {
                if (video.captions) {
                    cleanedCaptions[category][video.title] = cleanCaption(video.captions);
                }
            });

            // Remove empty categories
            if (Object.keys(cleanedCaptions[category]).length === 0) {
                delete cleanedCaptions[category];
            }
        }

        await fs.promises.writeFile(outputPath, JSON.stringify(cleanedCaptions, null, 2));
        console.log(`Cleaned captions saved to: ${outputPath}`);
    } catch (error) {
        console.error('Error processing captions:', error.message);
    }
}

// Example usage
extractAndCleanCaptions(
    path.join(__dirname, 'enhanced_youtube_news_videos.json'),
    path.join(__dirname, 'cleaned_captions.json')
);

module.exports = { cleanCaption, extractAndCleanCaptions };
