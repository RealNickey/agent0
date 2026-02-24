// Content script for Agent0 Screenshot Extension
// Prevent multiple initialization
if (typeof window.__agent0ExtensionLoaded === 'undefined') {
  window.__agent0ExtensionLoaded = true;

let isCapturing = false;
let selectionOverlay = null;
let canvas = null;
let startPoint = null;
let currentRect = null;

// Register Agent0 app tabs with the background service worker so it can
// push media state updates reliably via chrome.tabs.sendMessage.
try {
  if (window.location.origin === 'http://localhost:3000') {
    chrome.runtime.sendMessage({ action: 'agent0_register' });
  }
} catch (_) {}

// ─── Media Detection & Control ────────────────────────────────────────────
let _mediaDetectionInterval = null;
let _lastReportedState = null;

function findActiveMedia() {
  // Find all <video> and <audio> elements on the page
  const elements = [...document.querySelectorAll('video, audio')];
  // Prefer a playing element; fall back to the first one found
  return elements.find(el => !el.paused) || elements[0] || null;
}

function getMediaTitle() {
  // YouTube
  const ytTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title.ytd-video-primary-info-renderer');
  if (ytTitle) return ytTitle.textContent.trim();

  // YouTube Music
  const ytMusicTitle = document.querySelector('yt-formatted-string.title.style-scope.ytmusic-player-bar');
  if (ytMusicTitle) return ytMusicTitle.textContent.trim();

  // Spotify Web Player
  const spotTitle = document.querySelector('[data-testid="context-item-info-title"] a, .now-playing .track-info__name a');
  if (spotTitle) return spotTitle.textContent.trim();

  // Generic HTML5 Media Session (some sites set this)
  if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.title) {
    return navigator.mediaSession.metadata.title;
  }

  // Generic: document title as last resort
  return document.title || 'Unknown';
}

function getMediaArtwork() {
  // YouTube thumbnail
  const ytMeta = document.querySelector('meta[property="og:image"]');
  if (ytMeta && ytMeta.content) return ytMeta.content;

  // YouTube Music thumbnail
  const ytMusicImg = document.querySelector('img.image.style-scope.ytmusic-player-bar');
  if (ytMusicImg && ytMusicImg.src) return ytMusicImg.src;

  // Spotify album art
  const spotImg = document.querySelector('[data-testid="CoverSlotCollapsed__Container"] img, .now-playing .cover-art img');
  if (spotImg && spotImg.src) return spotImg.src;

  // Media Session artwork
  if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artwork && navigator.mediaSession.metadata.artwork.length) {
    return navigator.mediaSession.metadata.artwork[navigator.mediaSession.metadata.artwork.length - 1].src;
  }

  return null;
}

function getSpotifyArtwork() {
  const img = document.querySelector(
    '[data-testid="CoverSlotCollapsed__Container"] img, ' +
    '[data-testid="CoverSlotExpanded__Container"] img, ' +
    '.now-playing .cover-art img, ' +
    'img.cover-art-image'
  );
  return img ? img.src : null;
}

function getSpotifyTitle() {
  const el = document.querySelector(
    '[data-testid="context-item-info-title"] a, ' +
    '[data-testid="now-playing-widget"] a[data-testid="context-item-link"], ' +
    '.now-playing .track-info__name a'
  );
  return el ? el.textContent.trim() : null;
}

function reportMediaState() {
  const el = findActiveMedia();
  if (!el) {
    // No media element found — clear if we previously reported
    if (_lastReportedState !== null) {
      _lastReportedState = null;
      try {
        chrome.runtime.sendMessage({ action: 'agent0_media_state', state: null });
      } catch (_) {}
    }
    return;
  }

  const hostname = window.location.hostname;
  const isSpotify = hostname === 'open.spotify.com';

  const title = isSpotify ? (getSpotifyTitle() || getMediaTitle()) : getMediaTitle();
  const artwork = isSpotify ? (getSpotifyArtwork() || getMediaArtwork()) : getMediaArtwork();

  const state = {
    playing: !el.paused,
    currentTime: el.currentTime || 0,
    duration: el.duration && isFinite(el.duration) ? el.duration : 0,
    title,
    artwork,
    tabId: null // filled by background script
  };

  // Only send if something changed (reduce noise) — include playing state to catch toggles
  const stateKey = `${state.playing}|${Math.floor(state.currentTime)}|${state.title}`;
  if (_lastReportedState === stateKey) return;
  _lastReportedState = stateKey;

  try {
    chrome.runtime.sendMessage({ action: 'agent0_media_state', state });
  } catch (_) {}
}

function startMediaDetection() {
  if (_mediaDetectionInterval) return;

  // Skip media detection on the Agent0 app itself — it has no real media elements
  const isAgent0Page = window.location.origin === 'http://localhost:3000';
  if (isAgent0Page) return;

  _mediaDetectionInterval = setInterval(() => {
    try {
      reportMediaState();
    } catch (err) {
      // Extension context invalidated (e.g. after reload) — stop polling
      if (String(err).includes('Extension context invalidated')) {
        clearInterval(_mediaDetectionInterval);
        _mediaDetectionInterval = null;
      }
    }
  }, 1000);
  reportMediaState();
}

function handleMediaCommand(command) {
  const hostname = window.location.hostname;
  const isYouTube = hostname === 'www.youtube.com' || hostname === 'youtube.com';
  const isYouTubeMusic = hostname === 'music.youtube.com';
  const isSpotify = hostname === 'open.spotify.com';

  switch (command) {
    case 'play': {
      if (isSpotify) {
        const btn = document.querySelector('[data-testid="control-button-playpause"]');
        if (btn) { btn.click(); break; }
      }
      const el = findActiveMedia();
      if (el) el.play().catch(() => {});
      break;
    }
    case 'pause': {
      if (isSpotify) {
        const btn = document.querySelector('[data-testid="control-button-playpause"]');
        if (btn) { btn.click(); break; }
      }
      const el = findActiveMedia();
      if (el) el.pause();
      break;
    }
    case 'togglePlay': {
      if (isSpotify) {
        const btn = document.querySelector('[data-testid="control-button-playpause"]');
        if (btn) { btn.click(); break; }
      }
      const el = findActiveMedia();
      if (!el) break;
      if (el.paused) el.play().catch(() => {}); else el.pause();
      break;
    }
    case 'next': {
      // YouTube next button
      if (isYouTube) {
        const ytNext = document.querySelector('.ytp-next-button');
        if (ytNext) { ytNext.click(); break; }
      }
      // YouTube Music — click the next track button (not skip forward)
      if (isYouTubeMusic) {
        const ytmNext = document.querySelector('tp-yt-paper-icon-button.next-button, ytmusic-player-bar #next-button');
        if (ytmNext) { ytmNext.click(); break; }
      }
      // Spotify next button
      if (isSpotify) {
        const spotNext = document.querySelector('[data-testid="control-button-skip-forward"]');
        if (spotNext) { spotNext.click(); break; }
      }
      // Generic: skip forward 10s
      const elNext = findActiveMedia();
      if (elNext) elNext.currentTime = Math.min(elNext.currentTime + 10, elNext.duration || elNext.currentTime);
      break;
    }
    case 'previous': {
      // YouTube prev button
      if (isYouTube) {
        const ytPrev = document.querySelector('.ytp-prev-button');
        if (ytPrev) { ytPrev.click(); break; }
      }
      // YouTube Music — click the previous track button
      if (isYouTubeMusic) {
        const ytmPrev = document.querySelector('tp-yt-paper-icon-button.previous-button, ytmusic-player-bar #previous-button');
        if (ytmPrev) { ytmPrev.click(); break; }
      }
      // Spotify prev button
      if (isSpotify) {
        const spotPrev = document.querySelector('[data-testid="control-button-skip-back"]');
        if (spotPrev) { spotPrev.click(); break; }
      }
      const elPrev = findActiveMedia();
      if (elPrev) elPrev.currentTime = Math.max(elPrev.currentTime - 10, 0);
      break;
    }
  }
}

// Start scanning immediately
startMediaDetection();

// Listen for AGENT0_MEDIA_COMMAND postMessages from the Agent0 React app.
// postMessage uses structuredClone and works reliably across the page/content-script
// isolation barrier (unlike CustomEvent.detail which can be null in the isolated world).
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.type !== 'AGENT0_MEDIA_COMMAND') return;
  const command = e.data.command;
  if (!command) return;
  try {
    chrome.runtime.sendMessage({ action: 'agent0_media_command', command });
  } catch (_) {
    // Extension context invalidated
  }
});

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
  } else if (request.action === 'agent0_media_command') {
    // Handle media control commands from Agent0
    handleMediaCommand(request.command);
    sendResponse({ success: true });
  } else if (request.action === 'agent0_media_state_to_app') {
    // Forward media state from background → content script → page (React hook)
    try {
      window.postMessage({ type: 'AGENT0_MEDIA_STATE', state: request.state ?? null }, '*');
    } catch (_) {}
    sendResponse({ success: true });
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

} // End of initialization check
