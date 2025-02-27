/**
 * YouTube News Feed Frontend
 * 
 * This script handles the frontend functionality of the YouTube News Feed application.
 * It loads the enhanced YouTube news videos data and displays it in a social media feed style.
 */

// DOM Elements
const feedElement = document.getElementById('feed');
const categoriesList = document.getElementById('categories-list');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const modal = document.getElementById('video-modal');
const closeModal = document.querySelector('.close-modal');
const videoFrame = document.getElementById('video-frame');
const modalTitle = document.getElementById('modal-title');
const modalChannel = document.getElementById('modal-channel');
const modalViews = document.getElementById('modal-views');
const modalLikes = document.getElementById('modal-likes');
const modalComments = document.getElementById('modal-comments');
const modalDescription = document.getElementById('modal-description');
const modalCaptions = document.getElementById('modal-captions');

// State variables
let newsData = {};
let displayedVideos = [];
let currentCategory = 'all';
let searchQuery = '';
let autoRotateInterval;
const AUTO_ROTATE_INTERVAL = 30000; // 30 seconds

// Fetch the news data from the API
async function fetchNewsData() {
    try {
        const response = await fetch('/api/videos');
        if (!response.ok) {
            throw new Error('Failed to fetch news data');
        }
        
        newsData = await response.json();
        
        // Initialize the feed
        initializeCategories();
        displayFeed();
        startAutoRotate();
        
    } catch (error) {
        console.error('Error:', error);
        feedElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load news feed. Please try again later.</p>
            </div>
        `;
    }
}

// Initialize the categories list
function initializeCategories() {
    // Get all categories from the data
    const categories = Object.keys(newsData);
    
    // Add category buttons
    categories.forEach(category => {
        if (newsData[category].length > 0) {
            const categoryBtn = document.createElement('button');
            categoryBtn.className = 'category-btn';
            categoryBtn.textContent = category;
            categoryBtn.dataset.category = category;
            categoryBtn.addEventListener('click', () => {
                setActiveCategory(category);
                displayFeed();
            });
            
            categoriesList.appendChild(categoryBtn);
        }
    });
}

// Set the active category
function setActiveCategory(category) {
    currentCategory = category;
    
    // Update UI
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.category-btn[data-category="${category === 'all' ? 'all' : category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Display the feed based on the current category and search query
function displayFeed() {
    // Clear the feed
    feedElement.innerHTML = '';
    displayedVideos = [];
    
    // Get videos based on category and search
    let videos = [];
    
    if (currentCategory === 'all') {
        // Get all videos from all categories
        Object.values(newsData).forEach(categoryVideos => {
            videos = videos.concat(categoryVideos);
        });
    } else {
        // Get videos from the selected category
        videos = newsData[currentCategory] || [];
    }
    
    // Apply search filter if there's a search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        videos = videos.filter(video => 
            video.title.toLowerCase().includes(query) || 
            video.channel.toLowerCase().includes(query) || 
            (video.description && video.description.toLowerCase().includes(query))
        );
    }
    
    // Shuffle the videos for random display
    shuffleArray(videos);
    
    // Display videos
    if (videos.length === 0) {
        feedElement.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No videos found. Try a different category or search term.</p>
            </div>
        `;
        return;
    }
    
    // Display the first 10 videos (or less if there are fewer)
    const videosToDisplay = videos.slice(0, 10);
    displayedVideos = videosToDisplay;
    
    videosToDisplay.forEach(video => {
        createNewsCard(video);
    });
}

// Create a news card for a video
function createNewsCard(video) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    // Format the date
    const publishDate = video.publishedAt ? new Date(video.publishedAt) : new Date();
    const formattedDate = formatDate(publishDate);
    
    // Get the first letter of the channel name for the icon
    const channelInitial = video.channel ? video.channel.charAt(0).toUpperCase() : 'Y';
    
    // Create the card HTML
    card.innerHTML = `
        <div class="news-card-header">
            <div class="channel-icon">${channelInitial}</div>
            <div>
                <div class="news-card-channel">${video.channel || 'Unknown Channel'}</div>
                <div class="news-card-time">${formattedDate}</div>
            </div>
        </div>
        <h3 class="news-card-title">${video.title || 'Untitled Video'}</h3>
        <img src="${video.thumbnail || 'https://via.placeholder.com/480x360?text=No+Thumbnail'}" alt="${video.title}" class="news-card-thumbnail">
        <p class="news-card-description">${video.description || 'No description available.'}</p>
        <div class="news-card-stats">
            <span><i class="fas fa-eye"></i> ${formatNumber(video.views)}</span>
            <span><i class="fas fa-thumbs-up"></i> ${formatNumber(video.likes)}</span>
            <span><i class="fas fa-comment"></i> ${formatNumber(video.comments)}</span>
        </div>
    `;
    
    // Add click event to open the video
    const thumbnail = card.querySelector('.news-card-thumbnail');
    const title = card.querySelector('.news-card-title');
    
    thumbnail.addEventListener('click', () => openVideoModal(video));
    title.addEventListener('click', () => openVideoModal(video));
    
    // Add the card to the feed
    feedElement.appendChild(card);
}

// Open the video modal
function openVideoModal(video) {
    // Extract video ID from URL
    const videoId = extractVideoId(video.url);
    
    // Set the iframe src
    videoFrame.src = `https://www.youtube.com/embed/${videoId}`;
    
    // Set modal content
    modalTitle.textContent = video.title || 'Untitled Video';
    modalChannel.textContent = video.channel || 'Unknown Channel';
    modalViews.innerHTML = `<i class="fas fa-eye"></i> ${formatNumber(video.views)}`;
    modalLikes.innerHTML = `<i class="fas fa-thumbs-up"></i> ${formatNumber(video.likes)}`;
    modalComments.innerHTML = `<i class="fas fa-comment"></i> ${formatNumber(video.comments)}`;
    modalDescription.textContent = video.description || 'No description available.';
    modalCaptions.textContent = video.captions || 'No captions available.';
    
    // Show the modal
    modal.style.display = 'block';
    
    // Pause auto-rotate while modal is open
    clearInterval(autoRotateInterval);
}

// Close the video modal
function closeVideoModal() {
    modal.style.display = 'none';
    videoFrame.src = '';
    
    // Resume auto-rotate
    startAutoRotate();
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    if (!url) return '';
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : '';
}

// Format number for display (e.g., 1000 -> 1K)
function formatNumber(num) {
    if (!num) return '0';
    
    num = parseInt(num, 10);
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format date for display
function formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start auto-rotate of news items
function startAutoRotate() {
    clearInterval(autoRotateInterval);
    
    autoRotateInterval = setInterval(() => {
        // Get all videos for the current category
        let allVideos = [];
        
        if (currentCategory === 'all') {
            Object.values(newsData).forEach(categoryVideos => {
                allVideos = allVideos.concat(categoryVideos);
            });
        } else {
            allVideos = newsData[currentCategory] || [];
        }
        
        // Apply search filter if there's a search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            allVideos = allVideos.filter(video => 
                video.title.toLowerCase().includes(query) || 
                video.channel.toLowerCase().includes(query) || 
                (video.description && video.description.toLowerCase().includes(query))
            );
        }
        
        if (allVideos.length === 0) return;
        
        // Filter out videos that are already displayed
        const displayedVideoUrls = displayedVideos.map(v => v.url);
        let newVideos = allVideos.filter(v => !displayedVideoUrls.includes(v.url));
        
        // If all videos are already displayed, reshuffle all videos
        if (newVideos.length === 0) {
            newVideos = [...allVideos];
            shuffleArray(newVideos);
        } else {
            shuffleArray(newVideos);
        }
        
        // Get a random video to add
        const newVideo = newVideos[0];
        
        // Remove the oldest video card
        if (feedElement.children.length >= 10) {
            feedElement.removeChild(feedElement.firstChild);
        }
        
        // Add the new video card
        createNewsCard(newVideo);
        
        // Update displayed videos
        displayedVideos = [...displayedVideos.slice(1), newVideo];
        
        // Scroll to the new card with smooth animation
        const newCard = feedElement.lastChild;
        newCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, AUTO_ROTATE_INTERVAL);
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    searchQuery = searchInput.value.trim();
    displayFeed();
});

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        searchQuery = searchInput.value.trim();
        displayFeed();
    }
});

closeModal.addEventListener('click', closeVideoModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeVideoModal();
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', fetchNewsData);
