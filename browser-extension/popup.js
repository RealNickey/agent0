// Popup script for Agent0 Screenshot Extension

const urlInput = document.getElementById('agent0-url');
const saveButton = document.getElementById('save-button');
const captureButton = document.getElementById('capture-button');
const statusDiv = document.getElementById('status');
const screenshotPreview = document.getElementById('screenshot-preview');
const screenshotImage = document.getElementById('screenshot-image');
const screenshotTitle = document.getElementById('screenshot-title');
const screenshotUrl = document.getElementById('screenshot-url');
const screenshotTime = document.getElementById('screenshot-time');
const clearButton = document.getElementById('clear-screenshot');

// Load saved settings
chrome.storage.sync.get(['agent0Url'], (result) => {
  if (result.agent0Url) {
    urlInput.value = result.agent0Url;
  }
});

// Load and display last screenshot if available
function loadLastScreenshot() {
  chrome.storage.local.get(['pendingScreenshot'], (result) => {
    if (result.pendingScreenshot) {
      const data = result.pendingScreenshot;
      
      // Check if screenshot is still recent (within 5 minutes)
      const isRecent = Date.now() - data.timestamp < 5 * 60 * 1000;
      
      if (isRecent) {
        screenshotImage.src = data.screenshot;
        screenshotTitle.textContent = data.pageTitle || 'Untitled';
        screenshotUrl.textContent = data.pageUrl || '';
        
        const timeAgo = getTimeAgo(data.timestamp);
        screenshotTime.textContent = timeAgo;
        
        screenshotPreview.classList.add('visible');
      } else {
        // Clear old screenshot
        chrome.storage.local.remove(['pendingScreenshot']);
      }
    }
  });
}

// Format timestamp as "X seconds/minutes ago"
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
}

// Clear screenshot
clearButton.addEventListener('click', () => {
  chrome.storage.local.remove(['pendingScreenshot'], () => {
    screenshotPreview.classList.remove('visible');
    showStatus('Screenshot cleared', 'success');
    setTimeout(() => hideStatus(), 2000);
  });
});

// Load screenshot on popup open
loadLastScreenshot();

// Save settings
saveButton.addEventListener('click', () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showStatus('Please enter a valid URL', 'error');
    return;
  }
  
  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      showStatus('URL must start with http:// or https://', 'error');
      return;
    }
  } catch (e) {
    showStatus('Please enter a valid URL (e.g., http://localhost:3000)', 'error');
    return;
  }
  
  // Remove trailing slash
  const cleanUrl = url.replace(/\/$/, '');
  
  chrome.storage.sync.set({ agent0Url: cleanUrl }, () => {
    showStatus('Settings saved successfully!', 'success');
    setTimeout(() => hideStatus(), 2000);
  });
});

// Capture screenshot
captureButton.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startCapture' });
      window.close(); // Close popup
    }
  });
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Hide status message
function hideStatus() {
  statusDiv.className = 'status';
}

// Enter key to save
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveButton.click();
  }
});
