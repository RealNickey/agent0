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
  } else if (request.action === 'MEDIA_CONTROL') {
    handleMediaControl(request.command);
    sendResponse({ success: true });
  } else if (request.action === 'REQUEST_STATE_REFRESH') {
    // Force an immediate state report back to background → Agent0
    lastMediaState = null; // Reset so the next poll sees a change
    const state = scanForMedia();
    if (state) {
      chrome.runtime.sendMessage({
        action: 'MEDIA_STATUS_UPDATE',
        data: state
      }).catch(() => {});
    }
    sendResponse({ success: true });
  } else if (request.action === 'AGENT0_MEDIA_UPDATE') {
    window.postMessage({ type: 'AGENT0_MEDIA_UPDATE', data: request.data }, '*');
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

} // End of initialization check

// --- Media Control Logic ---

if (typeof window.__agent0MediaControlLoaded === 'undefined') {
  window.__agent0MediaControlLoaded = true;

let mediaMonitorInterval = null;
let lastMediaState = null;

const MEDIA_SITE_SELECTORS = {
  youtube: {
    playPause: [
      '.ytp-play-button',
      'button[aria-keyshortcuts="k"]'
    ],
    next: [
      '.ytp-next-button',
      'a.ytp-next-button',
      'button[aria-keyshortcuts="SHIFT+n"]'
    ],
    prev: [
      '.ytp-prev-button',
      'a.ytp-prev-button',
      'button[aria-keyshortcuts="SHIFT+p"]'
    ],
  },
  ytmusic: {
    playPause: [
      'ytmusic-player-bar #play-pause-button',
      'tp-yt-paper-icon-button#play-pause-button',
      'button#play-pause-button',
      '.play-pause-button'
    ],
    next: [
      'ytmusic-player-bar .next-button',
      'tp-yt-paper-icon-button.next-button',
      'button.next-button',
      '#right-controls .next-button'
    ],
    prev: [
      'ytmusic-player-bar .previous-button',
      'tp-yt-paper-icon-button.previous-button',
      'button.previous-button',
      '#left-controls .previous-button'
    ],
  },
  spotify: {
    playPause: [
      '[data-testid="control-button-playpause"]',
      'button[aria-label="Play"]',
      'button[aria-label="Pause"]'
    ],
    next: [
      '[data-testid="control-button-skip-forward"]',
      'button[aria-label="Next"]'
    ],
    prev: [
      '[data-testid="control-button-skip-back"]',
      'button[aria-label="Previous"]'
    ],
  },
  soundcloud: {
    playPause: ['.playControl'],
    next: ['.skipControl__next'],
    prev: ['.skipControl__previous'],
  },
  generic: {
    playPause: [
      '[aria-label*="Play" i]',
      '[aria-label*="Pause" i]',
      '[title*="Play" i]',
      '[title*="Pause" i]'
    ],
    next: [
      '[aria-label*="Next" i]',
      '[title*="Next" i]',
      '.next-button',
      '.skip-forward'
    ],
    prev: [
      '[aria-label*="Previous" i]',
      '[title*="Previous" i]',
      '.prev-button',
      '.skip-back'
    ],
  },
};

function isElementVisible(el) {
  if (!(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function getTextFromElement(el) {
  if (!(el instanceof Element)) return '';
  return [
    el.getAttribute('aria-label'),
    el.getAttribute('title'),
    el.textContent
  ].filter(Boolean).join(' ').trim().toLowerCase();
}

function safeClick(el) {
  if (!(el instanceof Element)) return false;

  try {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    if (typeof el.click === 'function') {
      el.click();
    }
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  } catch {
    return false;
  }
}

function getCandidateMediaElements() {
  return Array.from(document.querySelectorAll('video, audio'));
}

function getPreferredMediaTarget() {
  const allMedia = getCandidateMediaElements();
  if (allMedia.length === 0) return null;

  const playingMedia = allMedia.find((media) => !media.paused && !media.ended);
  if (playingMedia) return playingMedia;

  const readyMedia = allMedia.find((media) => media.readyState >= 2 && !media.ended);
  return readyMedia || allMedia[0] || null;
}

function getSelectorGroup(site, action) {
  const siteSelectors = MEDIA_SITE_SELECTORS[site] || MEDIA_SITE_SELECTORS.generic;
  if (action === 'play' || action === 'pause') {
    return siteSelectors.playPause || [];
  }
  return siteSelectors[action] || [];
}

function findSiteButton(action, site) {
  const selectors = getSelectorGroup(site, action);

  for (const selector of selectors) {
    const matches = Array.from(document.querySelectorAll(selector));
    const visibleMatch = matches.find(isElementVisible);
    if (visibleMatch) {
      return visibleMatch;
    }
  }

  return null;
}

function matchesRequestedTransportState(button, command, fallbackMedia) {
  if (!(button instanceof Element)) return false;
  if (command !== 'play' && command !== 'pause') return true;

  const buttonText = getTextFromElement(button);
  if (!buttonText) {
    return fallbackMedia ? (command === 'play' ? fallbackMedia.paused : !fallbackMedia.paused) : true;
  }

  if (command === 'play') {
    return buttonText.includes('play') || buttonText.includes('resume');
  }

  return buttonText.includes('pause');
}

function forceStateRefresh() {
  lastMediaState = null;
  const state = scanForMedia();
  chrome.runtime.sendMessage({
    action: 'MEDIA_STATUS_UPDATE',
    data: state
  }).catch(() => {});
}

/**
 * Detect the site type for smarter control.
 */
function detectSiteType() {
  const host = window.location.hostname;
  if (host.includes('youtube.com') && !host.includes('music.youtube')) return 'youtube';
  if (host.includes('music.youtube.com')) return 'ytmusic';
  if (host.includes('spotify.com')) return 'spotify';
  if (host.includes('soundcloud.com')) return 'soundcloud';
  if (host.includes('netflix.com')) return 'netflix';
  if (host.includes('music.apple.com')) return 'applemusic';
  return 'generic';
}

/**
 * Try to get a meaningful track title from the page.
 * Different sites expose it differently.
 */
function getMediaTitle() {
  const site = detectSiteType();

  if (site === 'youtube') {
    const selectors = [
      'ytd-watch-metadata h1 yt-formatted-string',
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.title yt-formatted-string',
      'h1.title'
    ];
    for (const selector of selectors) {
      const title = document.querySelector(selector);
      if (title?.textContent?.trim()) return title.textContent.trim();
    }
  }

  if (site === 'ytmusic') {
    const selectors = [
      'ytmusic-player-bar .title',
      '.content-info-wrapper .title',
      '.middle-controls .title',
      'ytmusic-player-bar [slot="title"]'
    ];
    for (const selector of selectors) {
      const title = document.querySelector(selector);
      if (title?.textContent?.trim()) return title.textContent.trim();
    }
  }

  if (site === 'spotify') {
    // Spotify Web Player: track title
    const title = document.querySelector('[data-testid="context-item-info-title"] a, .track-info__name a, [data-testid="nowplaying-track-link"]');
    if (title?.textContent?.trim()) return title.textContent.trim();
  }

  if (site === 'soundcloud') {
    const title = document.querySelector('.playbackSoundBadge__titleLink');
    if (title?.textContent?.trim()) return title.textContent.trim();
  }

  // Fallback: use <title> tag but truncate the site suffix
  const pageTitle = document.title;
  // Remove common site suffixes: "Song - YouTube", "Spotify – Song"
  return pageTitle
    .replace(/\s*[-–—|]\s*(YouTube|Spotify|SoundCloud|Netflix|Apple Music).*$/i, '')
    .trim() || pageTitle;
}

function scanForMedia() {
  const mediaToReport = getPreferredMediaTarget();

  if (!mediaToReport) return null;

  return {
    hasMedia: true,
    isPlaying: !mediaToReport.paused,
    type: mediaToReport.tagName.toLowerCase(), // 'video' or 'audio'
    title: getMediaTitle(),
    site: detectSiteType(),
    src: mediaToReport.currentSrc || mediaToReport.src,
    pageUrl: window.location.href,
    duration: isFinite(mediaToReport.duration) ? mediaToReport.duration : 0,
    currentTime: isFinite(mediaToReport.currentTime) ? mediaToReport.currentTime : 0
  };
}

function startMediaMonitoring() {
  if (mediaMonitorInterval) return;

  // Poll for media status changes
  mediaMonitorInterval = setInterval(() => {
    const state = scanForMedia();
    
    // Simple diff to avoid flooding messages
    const stateStr = JSON.stringify(state);
    if (stateStr !== JSON.stringify(lastMediaState)) {
      lastMediaState = state;
      // Always send, even null (so Agent0 knows media stopped)
      chrome.runtime.sendMessage({
        action: 'MEDIA_STATUS_UPDATE',
        data: state
      }).catch(() => {
         // Ignore errors (e.g. extension context invalidated)
      });
    }
  }, 1000);

  // Reset cached state on play/pause so next poll detects the change
  document.addEventListener('play', () => { lastMediaState = null; }, true);
  document.addEventListener('pause', () => { lastMediaState = null; }, true);
  document.addEventListener('ended', () => { forceStateRefresh(); }, true);
  window.addEventListener('yt-navigate-finish', forceStateRefresh);
  window.addEventListener('popstate', forceStateRefresh);
  window.addEventListener('hashchange', forceStateRefresh);
}

/**
 * Handle play/pause/next/prev commands from Agent0.
 * Uses site-specific selectors for Next/Prev when available,
 * falls back to generic HTML5 media controls.
 */
function handleMediaControl(command) {
  const site = detectSiteType();
  const target = getPreferredMediaTarget();

  const controlButton = findSiteButton(command, site);
  if (controlButton && matchesRequestedTransportState(controlButton, command, target)) {
    if (safeClick(controlButton)) {
      setTimeout(forceStateRefresh, 150);
      return;
    }
  }

  if (command === 'play') {
    if (target) {
      target.play().catch(() => {});
    }
    setTimeout(forceStateRefresh, 150);
    return;
  }

  if (command === 'pause') {
    if (target && !target.paused) {
      target.pause();
    }
    setTimeout(forceStateRefresh, 150);
    return;
  }

  if (command === 'next') {
    if (target) {
      // Generic fallback: seek forward 10s
      target.currentTime = Math.min(target.currentTime + 10, target.duration || Infinity);
    }
    setTimeout(forceStateRefresh, 150);
    return;
  }

  if (command === 'prev') {
    if (target) {
      target.currentTime = Math.max(target.currentTime - 10, 0);
    }
    setTimeout(forceStateRefresh, 150);
    return;
  }
}

// Start monitoring as soon as content script loads
startMediaMonitoring();

// Listen for messages from the web page (only on localhost/Agent0)
if (window.location.origin.includes('localhost')) {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data?.type === 'AGENT0_SEND_MEDIA_CONTROL') {
      // Relay from /mc page → background → media tab
      chrome.runtime.sendMessage({
        action: 'RelayMediaControl',
        command: event.data.command
      }).catch(() => {});
    }

    if (event.data?.type === 'AGENT0_REQUEST_MEDIA_STATE') {
      // Page is asking for current remote media state
      chrome.runtime.sendMessage({
        action: 'GET_MEDIA_STATE'
      }, (response) => {
        window.postMessage({
          type: 'AGENT0_MEDIA_UPDATE',
          data: response?.data || null
        }, '*');
      });
    }
  });
}

} // End media control initialization guard

