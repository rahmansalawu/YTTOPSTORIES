# YouTube News Video Processor

A Node.js application that scrapes, processes, and enhances YouTube news videos with captions, maintaining category organization throughout the pipeline.

## Features

- **Video Scraping**: Fetches news videos from YouTube's news feed using Puppeteer
- **Category Processing**: Processes videos by category, maintaining the hierarchical structure
- **Caption Enhancement**: Fetches and cleans captions for each video
- **Caching System**: Tracks processed videos to minimize API calls
- **Rate Limiting**: Implements delays between API calls to respect YouTube's limits
- **Structured Output**: 
  - `youtube_news_videos.json`: Raw scraped video data
  - `enhanced_youtube_news_videos.json`: Enhanced video data with details and captions
  - `cleaned_captions.json`: Cleaned captions organized by category

## Prerequisites

- Node.js (v14 or higher)
- YouTube Data API key
- Puppeteer for web scraping

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file with your YouTube API key:
```
YOUTUBE_API_KEY=your_api_key_here
```

## Usage

Run the complete pipeline:
```bash
node index.js
```

This will:
1. Scrape news videos from YouTube
2. Enhance videos with additional details and captions
3. Clean and organize captions by category

## Output Structure

### cleaned_captions.json
```javascript
{
  "Category1": {
    "VideoTitle1": "cleaned caption text",
    "VideoTitle2": "cleaned caption text"
  },
  "Category2": {
    "VideoTitle3": "cleaned caption text"
  }
}
```

### enhanced_youtube_news_videos.json
Contains detailed video information including:
- Title
- Description
- View count
- Like count
- Raw captions
- Category

## Cache Management

The system maintains a cache of processed videos in `processed_videos.json` to:
- Prevent duplicate processing
- Minimize API calls
- Track processing timestamps

## Rate Limiting

- 2-second delay between video processing
- Maximum 5 videos per category
- Skips videos without captions

## Error Handling

- Logs errors without interrupting the pipeline
- Skips videos with disabled or unavailable captions
- Maintains processing even if individual video enhancement fails

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
