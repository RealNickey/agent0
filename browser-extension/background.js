// Background service worker for Agent0 Screenshot Extension

let agent0Url = 'http://localhost:3000';

// Load saved URL from storage
chrome.storage.sync.get(['agent0Url'], (result) => {
  if (result.agent0Url) {
    agent0Url = result.agent0Url;
  }
});

// Listen for URL changes from popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.agent0Url) {
    agent0Url = changes.agent0Url.newValue;
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startCapture' });
      }
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    handleCaptureVisibleTab(request, sender, sendResponse);
    return true; // Keep channel open for async response
  } else if (request.action === 'sendToAgent0') {
    handleSendToAgent0(request, sendResponse);
    return true;
  }
});

async function handleCaptureVisibleTab(request, sender, sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Capture failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSendToAgent0(request, sendResponse) {
  try {
    const { screenshot, pageUrl, pageTitle, selectedText } = request;
    
    // Prepare data for API
    const payload = {
      screenshot,
      pageUrl,
      pageTitle,
      selectedText,
      timestamp: Date.now()
    };
    
    // Store screenshot data temporarily (for popup preview)
    await chrome.storage.local.set({
      pendingScreenshot: payload
    });
    
    // Send to Agent0 API endpoint
    const apiUrl = `${agent0Url}/api/screenshot`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Screenshot sent to API successfully:', result);
      
      // Open or focus Agent0 tab
      const tabs = await chrome.tabs.query({ url: `${agent0Url}/*` });
      
      if (tabs.length > 0) {
        // Focus existing tab
        await chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        // Create new tab
        await chrome.tabs.create({ url: agent0Url });
      }
      
      sendResponse({ success: true, data: result });
    } catch (apiError) {
      console.error('API request failed:', apiError);
      sendResponse({ success: false, error: apiError.message });
    }
  } catch (error) {
    console.error('Failed to send to Agent0:', error);
    sendResponse({ success: false, error: error.message });
  }
}
