// Popup script for Agent0 Extension

const captureButton = document.getElementById('capture-button');
const statusDiv = document.getElementById('status');
const screenshotPreview = document.getElementById('screenshot-preview');
const screenshotImage = document.getElementById('screenshot-image');
const clearButton = document.getElementById('clear-screenshot');

const selectionPreview = document.getElementById('selection-preview');
const selectionText = document.getElementById('selection-text');
const clearSelectionButton = document.getElementById('clear-selection');

// Load and display last screenshot if available
function loadLastScreenshot() {
  chrome.storage.local.get(['pendingScreenshot'], (result) => {
    if (result.pendingScreenshot) {
      const data = result.pendingScreenshot;
      
      // Check if screenshot is still recent (within 5 minutes)
      const isRecent = Date.now() - data.timestamp < 5 * 60 * 1000;
      
      if (isRecent) {
        screenshotImage.src = data.screenshot;
        
        screenshotPreview.classList.add('visible');
      } else {
        // Clear old screenshot
        chrome.storage.local.remove(['pendingScreenshot']);
      }
    }
  });
}

// Load and display last selection if available
function loadLastSelection() {
  chrome.storage.local.get(['pendingSelection'], (result) => {
    if (result.pendingSelection) {
      const data = result.pendingSelection;

      const isRecent = Date.now() - data.timestamp < 5 * 60 * 1000;
      if (isRecent) {
        const trimmed = (data.selectedText || '').toString().trim();
        // Keep popup compact
        selectionText.textContent = trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
        selectionPreview.classList.add('visible');
      } else {
        chrome.storage.local.remove(['pendingSelection']);
      }
    }
  });
}

// Clear screenshot
clearButton.addEventListener('click', () => {
  chrome.storage.local.remove(['pendingScreenshot'], () => {
    screenshotPreview.classList.remove('visible');
    showStatus('Cleared', 'success');
    setTimeout(() => hideStatus(), 2000);
  });
});

// Clear selection
clearSelectionButton.addEventListener('click', () => {
  chrome.storage.local.remove(['pendingSelection'], () => {
    selectionPreview.classList.remove('visible');
    showStatus('Selection cleared', 'success');
    setTimeout(() => hideStatus(), 2000);
  });
});

// Load screenshot on popup open
loadLastScreenshot();
loadLastSelection();

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

