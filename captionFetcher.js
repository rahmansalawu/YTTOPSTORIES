const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Fetch captions for a video using youtube-transcript
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string|null>} Caption text or null if not available
 */
async function fetchCaptions(videoId) {
    try {
        const transcripts = await YoutubeTranscript.fetchTranscript(videoId);
        return transcripts.map(t => t.text).join(' ');
    } catch (error) {
        console.error(`Error fetching captions for video ${videoId}:`, error.message);
        return null;
    }
}

module.exports = { fetchCaptions };
