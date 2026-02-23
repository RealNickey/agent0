// Content script for Agent0 Screenshot Extension
// Prevent multiple initialization
if (typeof window.__agent0ExtensionLoaded === 'undefined') {
  window.__agent0ExtensionLoaded = true;

let isCapturing = false;
let selectionOverlay = null;
let canvas = null;
let startPoint = null;
let currentRect = null;

// Extract main content from the page for summarization
function extractPageContent() {
  console.log('=== Extracting page content ===');
  console.log('Page URL:', window.location.href);
  console.log('Page title:', document.title);
  
  // Try common article selectors first
  const articleSelectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    'main'
  ];
  
  let mainContent = null;
  for (const selector of articleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element;
      console.log('Found content using selector:', selector);
      break;
    }
  }
  
  // Fallback to body if no article found
  if (!mainContent) {
    mainContent = document.body;
    console.log('Using document.body as fallback');
  }
  
  // Clone and clean the content
  const clone = mainContent.cloneNode(true);
  
  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', '.ad', '.advertisement', '.social-share',
    '.comments', '.related-posts', '[role="navigation"]',
    'iframe', 'noscript', '.sidebar', '.menu', '.popup'
  ];
  
  let removedCount = 0;
  unwantedSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    removedCount += elements.length;
    elements.forEach(el => el.remove());
  });
  
  console.log(`Removed ${removedCount} unwanted elements`);
  
  // Extract text with basic formatting
  const extractedText = clone.innerText.trim();
  console.log(`Extracted ${extractedText.length} characters of text`);
  
  const result = {
    text: extractedText,
    title: document.title,
    url: window.location.href
  };
  
  console.log('Content extraction complete:', {
    textLength: result.text.length,
    title: result.title,
    url: result.url
  });
  
  return result;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);
  
  if (request.action === 'startCapture') {
    startScreenshotCapture();
    sendResponse({ success: true });
  } else if (request.action === 'extractPageContent') {
    try {
      console.log('Processing extractPageContent request...');
      
      // Show a visual indicator that extraction is happening
      showToastNotification('Extracting page content...', 'info');
      
      const content = extractPageContent();
      console.log('Sending extraction response:', {
        success: true,
        textLength: content.text.length,
        title: content.title
      });
      
      // Show success message
      showToastNotification(`Extracted ${content.text.length} characters. Opening Agent0...`, 'success');
      
      sendResponse({ success: true, content });
    } catch (error) {
      console.error('Content extraction failed:', error);
      showToastNotification('Failed to extract content: ' + error.message, 'error');
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function startScreenshotCapture() {
  if (isCapturing) return;
  
  isCapturing = true;
  createSelectionOverlay();
  attachEventListeners();
}

function createSelectionOverlay() {
  // Create overlay container
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = 'agent0-screenshot-overlay';
  selectionOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    background: rgba(0, 0, 0, 0.3);
  `;
  
  // Create canvas for drawing selection
  canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Create instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483648;
  `;
  instructions.textContent = 'Drag to select area • ESC to cancel • Click to capture full screen';
  
  selectionOverlay.appendChild(canvas);
  selectionOverlay.appendChild(instructions);
  document.body.appendChild(selectionOverlay);
}

function attachEventListeners() {
  selectionOverlay.addEventListener('mousedown', handleMouseDown);
  selectionOverlay.addEventListener('mousemove', handleMouseMove);
  selectionOverlay.addEventListener('mouseup', handleMouseUp);
  selectionOverlay.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeyDown);
}

function removeEventListeners() {
  if (selectionOverlay) {
    selectionOverlay.removeEventListener('mousedown', handleMouseDown);
    selectionOverlay.removeEventListener('mousemove', handleMouseMove);
    selectionOverlay.removeEventListener('mouseup', handleMouseUp);
    selectionOverlay.removeEventListener('click', handleClick);
  }
  document.removeEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e) {
  if (e.button !== 0) return; // Only left click
  
  startPoint = { x: e.clientX, y: e.clientY };
  currentRect = null;
  e.stopPropagation();
}

function handleMouseMove(e) {
  if (!startPoint) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const x = Math.min(startPoint.x, e.clientX);
  const y = Math.min(startPoint.y, e.clientY);
  const width = Math.abs(e.clientX - startPoint.x);
  const height = Math.abs(e.clientY - startPoint.y);
  
  currentRect = { x, y, width, height };
  
  // Draw selection rectangle
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Fill with semi-transparent blue
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.fillRect(x, y, width, height);
  
  // Draw dimensions
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y - 24, 80, 20);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + 4, y - 10);
}

function handleMouseUp(e) {
  if (!startPoint) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
    captureArea(currentRect);
  }
  
  startPoint = null;
}

function handleClick(e) {
  // If no drag occurred, capture full screen
  if (!startPoint && !currentRect) {
    e.preventDefault();
    e.stopPropagation();
    captureFullScreen();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    cancelCapture();
  }
}

async function captureArea(rect) {
  try {
    // First capture the visible tab
    const response = await chrome.runtime.sendMessage({ 
      action: 'captureVisibleTab' 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Capture failed');
    }
    
    // Create temporary image to crop
    const img = new Image();
    img.src = response.dataUrl;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // Calculate device pixel ratio for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Create canvas for cropping
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = rect.width * dpr;
    cropCanvas.height = rect.height * dpr;
    
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(
      img,
      rect.x * dpr,
      rect.y * dpr,
      rect.width * dpr,
      rect.height * dpr,
      0,
      0,
      rect.width * dpr,
      rect.height * dpr
    );
    
    const croppedDataUrl = cropCanvas.toDataURL('image/png');
    await sendToAgent0(croppedDataUrl);
    
  } catch (error) {
    console.error('Capture failed:', error);
    showToastNotification('Failed to capture: ' + error.message, 'error');
  } finally {
    cleanup();
  }
}

async function captureFullScreen() {
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'captureVisibleTab' 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Capture failed');
    }
    
    await sendToAgent0(response.dataUrl);
    
  } catch (error) {
    console.error('Capture failed:', error);
    showToastNotification('Failed to capture: ' + error.message, 'error');
  } finally {
    cleanup();
  }
}

async function sendToAgent0(screenshotDataUrl) {
  const selectedText = window.getSelection().toString().trim();
  
  const data = {
    screenshot: screenshotDataUrl,
    pageUrl: window.location.href,
    pageTitle: document.title,
    selectedText: selectedText || null,
  };
  
  await chrome.runtime.sendMessage({
    action: 'sendToAgent0',
    ...data
  });
}

function cancelCapture() {
  cleanup();
}

function cleanup() {
  removeEventListeners();
  
  if (selectionOverlay && selectionOverlay.parentNode) {
    selectionOverlay.parentNode.removeChild(selectionOverlay);
  }
  
  selectionOverlay = null;
  canvas = null;
  startPoint = null;
  currentRect = null;
  isCapturing = false;
}

// Toast notification for user-friendly error display
function showToastNotification(message, type = 'info') {
  // Remove any existing toast
  const existingToast = document.getElementById('agent0-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Add animation style only once (check if it already exists)
  if (!document.getElementById('agent0-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'agent0-toast-styles';
    style.textContent = `
      @keyframes agent0-toast-fade-in {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  const toast = document.createElement('div');
  toast.id = 'agent0-toast';
  
  // Different colors for different types
  let bgColor, textColor, borderColor;
  if (type === 'error') {
    bgColor = '#fee2e2';
    textColor = '#991b1b';
    borderColor = '#fecaca';
  } else if (type === 'success') {
    bgColor = '#d1fae5';
    textColor = '#065f46';
    borderColor = '#a7f3d0';
  } else {
    bgColor = '#dbeafe';
    textColor = '#1e40af';
    borderColor = '#bfdbfe';
  }
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    animation: agent0-toast-fade-in 0.3s ease-out;
    background: ${bgColor};
    color: ${textColor};
    border: 1px solid ${borderColor};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// --- Media Control Logic ---
let activeMediaElement = null;

function getMediaMetadata() {
  let title = document.title;
  let artwork = '';
  let artist = window.location.hostname;

  if (navigator.mediaSession && navigator.mediaSession.metadata) {
    const meta = navigator.mediaSession.metadata;
    if (meta.title) title = meta.title;
    if (meta.artist) artist = meta.artist;
    if (meta.artwork && meta.artwork.length > 0) {
      artwork = meta.artwork[meta.artwork.length - 1].src;
    }
  }

  // Fallback for YouTube
  if (window.location.hostname.includes('youtube.com')) {
    const ytTitle = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
    if (ytTitle) title = ytTitle.innerText;
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId) artwork = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  return { title, artist, artwork };
}

function updateMediaState(element, isPlaying) {
  activeMediaElement = element;
  const isVideo = element.tagName.toLowerCase() === 'video';
  const metadata = getMediaMetadata();
  
  // Check if there's a next track available
  let hasNext = false;
  if (window.location.hostname.includes('youtube.com')) {
    hasNext = !!document.querySelector('.ytp-next-button');
  } else if (navigator.mediaSession && navigator.mediaSession.nextTrack) {
    hasNext = true;
  } else {
    // Generic fallback: assume audio might not have next, video might
    hasNext = isVideo;
  }
  
  chrome.runtime.sendMessage({
    action: 'MEDIA_STATE_UPDATE',
    state: {
      isPlaying,
      isVideo,
      title: metadata.title,
      artist: metadata.artist,
      artwork: metadata.artwork,
      hasNext
    }
  });
}

document.addEventListener('play', (e) => {
  if (e.target && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) {
    updateMediaState(e.target, true);
  }
}, true);

document.addEventListener('pause', (e) => {
  if (e.target && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) {
    updateMediaState(e.target, false);
  }
}, true);

// Check for already playing media on load
setTimeout(() => {
  const mediaElements = document.querySelectorAll('video, audio');
  for (const el of mediaElements) {
    if (!el.paused && !el.ended) {
      updateMediaState(el, true);
      break;
    }
  }
}, 1000);

// Listen for commands from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'MEDIA_COMMAND') {
    if (activeMediaElement) {
      if (request.command === 'play') activeMediaElement.play();
      else if (request.command === 'pause') activeMediaElement.pause();
      else if (request.command === 'next') {
        const nextBtn = document.querySelector('.ytp-next-button, [aria-label="Next"], [aria-label="Next track"], [title="Next"], .next-button');
        if (nextBtn) nextBtn.click();
      }
    }
  }
});

// --- Bridge for localhost:3000 ---
if (window.location.href.includes('localhost:3000')) {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'AGENT0_MEDIA_COMMAND') {
      chrome.runtime.sendMessage({
        action: 'FORWARD_MEDIA_COMMAND',
        command: event.data.command
      });
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'UPDATE_WEB_APP_MEDIA_STATE') {
      window.postMessage({
        type: 'AGENT0_MEDIA_STATE',
        state: request.state
      }, '*');
    }
  });
}

} // End of initialization check
