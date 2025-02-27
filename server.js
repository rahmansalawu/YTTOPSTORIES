/**
 * YouTube News Feed Server
 * 
 * This server serves a web interface that displays the enhanced YouTube news videos
 * in a social media feed style.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get the enhanced YouTube news videos
app.get('/api/videos', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'enhanced_youtube_news_videos.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading enhanced_youtube_news_videos.json:', error);
    res.status(500).json({ error: 'Failed to load video data' });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
