# YouTube News Scraper

A Node.js application that intelligently scrapes YouTube's news feed, organizing videos by their subject matter categories. It captures how YouTube groups related news videos under major event topics of the day.

## Features

- **Smart Category Detection**: 
  - Automatically identifies major news topics/events
  - Groups related videos under their respective categories
  - Adapts to YouTube's dynamic daily news organization

- **Robust Data Collection**:
  - Extracts video titles, channel names, and URLs
  - Removes duplicate entries
  - Handles dynamic content loading through scrolling
  - Validates all collected data

- **Error Handling & Reliability**:
  - Graceful retry mechanism (max 3 attempts)
  - Proper cleanup of resources
  - Validation at multiple stages
  - Clear error reporting

- **Flexible Configuration**:
  - Switch between general news and business news
  - Configurable timeouts and retry settings
  - Adjustable scroll behavior
  - Browser settings customization

## Output Structure

The scraper saves data in JSON format with this structure:
```javascript
{
  "Major Event Topic 1": [
    {
      "url": "https://www.youtube.com/watch?v=...",
      "title": "Video Title",
      "channel": "Channel Name"
    },
    // More videos about this topic...
  ],
  "Major Event Topic 2": [
    // Videos about another topic...
  ]
}
```

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository or download the source code
2. Install the dependencies:
   ```bash
   npm install
   ```

## Configuration

The script uses a configuration object that can be modified in `index.js`:

```javascript
const CONFIG = {
    urls: {
        general: 'https://www.youtube.com/feed/news_destination',
        business: 'https://www.youtube.com/feed/news_destination/business'
    },
    retry: {
        maxAttempts: 3,
        delayMs: 5000
    },
    // ... other settings
};
```

## Usage

Run the script with:
```bash
node index.js
```

The script will:
1. Launch a browser and navigate to YouTube's news feed
2. Identify major news topics/categories
3. Collect videos for each category
4. Save the results in `youtube_news_videos.json`

## Error Handling

The script includes several safety features:
- Retries on network failures (max 3 attempts)
- Validates data before saving
- Cleans up resources (browser) even if errors occur
- Provides detailed error messages

## Limitations

- Depends on YouTube's page structure (may need updates if YouTube changes)
- Requires stable internet connection
- May be affected by YouTube's rate limiting
- Browser automation might be detected by YouTube

## Contributing

Feel free to submit issues and enhancement requests!
