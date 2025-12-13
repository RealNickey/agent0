// Popup script for Agent0 Extension

const captureButton = document.getElementById('capture-button');
const statusDiv = document.getElementById('status');
const screenshotPreview = document.getElementById('screenshot-preview');
const screenshotImage = document.getElementById('screenshot-image');
const clearButton = document.getElementById('clear-screenshot');

const selectionPreview = document.getElementById('selection-preview');
const selectionText = document.getElementById('selection-text');
const clearSelectionButton = document.getElementById('clear-selection');

const POPUP_TTL_MS = 60 * 1000; // short period (privacy-first)
const AUTO_HIDE_MS = 8 * 1000;  // keep visible briefly while popup is open

function hidePreviews() {
  screenshotPreview.classList.remove('visible');
  selectionPreview.classList.remove('visible');
}

function showLastItemOnce() {
  hidePreviews();

  chrome.storage.local.get(['pendingScreenshot', 'pendingSelection'], (result) => {
    const screenshot = result.pendingScreenshot;
    const selection = result.pendingSelection;

    const now = Date.now();

    const screenshotTs = screenshot?.timestamp ?? 0;
    const selectionTs = selection?.timestamp ?? 0;

    // Filter out expired items
    const screenshotValid = screenshot && typeof screenshotTs === 'number' && now - screenshotTs < POPUP_TTL_MS;
    const selectionValid = selection && typeof selectionTs === 'number' && now - selectionTs < POPUP_TTL_MS;

    if (!screenshotValid && !selectionValid) {
      // Cleanup anything stale
      chrome.storage.local.remove(['pendingScreenshot', 'pendingSelection']);
      return;
    }

    // Choose the newest item so only one appears
    const showScreenshot = screenshotValid && (!selectionValid || screenshotTs >= selectionTs);

    if (showScreenshot) {
      screenshotImage.src = screenshot.screenshot;
      screenshotPreview.classList.add('visible');
    } else {
      const trimmed = (selection.selectedText || '').toString().trim();
      selectionText.textContent = trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
      selectionPreview.classList.add('visible');
    }

    // One-time display: clear immediately so it won't appear again
    chrome.storage.local.remove(['pendingScreenshot', 'pendingSelection']);

    // Hide after a short time while popup remains open
    setTimeout(() => {
      hidePreviews();
    }, AUTO_HIDE_MS);
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
showLastItemOnce();

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

