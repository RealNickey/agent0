// Background service worker for Agent0 Screenshot Extension

let agent0Url = 'http://localhost:3000';

const CONTEXT_MENU_IDS = {
  SEND_SELECTION: 'agent0-send-selection',
};

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
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      
      // Check if URL is restricted
      const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'];
      const isRestricted = restrictedProtocols.some(protocol => tab.url?.startsWith(protocol));
      
      if (isRestricted) {
        // Show notification that this page can't be captured
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Cannot Capture This Page',
          message: 'Screenshots are not allowed on browser system pages. Please try on a regular webpage.',
          priority: 2
        });
        return;
      }
      
      try {
        // Try to send message to content script
        await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
      } catch (error) {
        // Content script not loaded - inject it manually
        console.log('Content script not found, injecting...');
        try {
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          // Inject content CSS
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          });
          
          // Wait a bit for script to initialize
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
            } catch (retryError) {
              console.error('Failed to start capture after injection:', retryError);
            }
          }, 100);
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Screenshot Capture Failed',
            message: 'Unable to capture this page. Try refreshing or use a different page.',
            priority: 1
          });
        }
      }
    });
  }
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SEND_SELECTION,
      title: 'Send it to Agent0',
      contexts: ['selection'],
    });
  } catch (error) {
    console.error('Failed to create context menu:', error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_IDS.SEND_SELECTION) {
    handleSendSelectedText(info, tab);
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

function toSafeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

async function handleSendSelectedText(info, tab) {
  try {
    const selectedText = toSafeString(info.selectionText).trim();
    if (!selectedText) return;

    const pageUrl = toSafeString(tab?.url);
    const pageTitle = toSafeString(tab?.title) || pageUrl || 'Selection';

    const payload = {
      selectedText,
      pageUrl: pageUrl || null,
      pageTitle: pageTitle || null,
      timestamp: Date.now(),
    };

    // Store last selection (for popup preview)
    await chrome.storage.local.set({
      pendingSelection: payload,
    });

    // Open or focus Agent0
    const tabs = await chrome.tabs.query({ url: `${agent0Url}/*` });

    let targetTab;
    if (tabs.length > 0) {
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
    } else {
      targetTab = await chrome.tabs.create({
        url: `${agent0Url}?context=pending`,
      });
    }

    // Send payload to Agent0 page
    setTimeout(async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: (selectionData) => {
            window.postMessage(
              {
                type: 'AGENT0_CONTEXT_TEXT',
                data: selectionData,
              },
              '*'
            );
          },
          args: [payload],
        });
      } catch (scriptError) {
        console.error('Failed to send selection to page:', scriptError);
      }
    }, 300);
  } catch (error) {
    console.error('Failed to send selected text to Agent0:', error);
  }
}

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
    
    // Send to Agent0 API endpoint (optional - for logging/storage)
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
      
      // Open or focus Agent0 tab with screenshot indicator
      const tabs = await chrome.tabs.query({ url: `${agent0Url}/*` });
      
      let targetTab;
      if (tabs.length > 0) {
        // Focus existing tab
        targetTab = tabs[0];
        await chrome.tabs.update(targetTab.id, { active: true });
      } else {
        // Create new tab with query param to indicate screenshot is coming
        targetTab = await chrome.tabs.create({ 
          url: `${agent0Url}?screenshot=pending` 
        });
      }
      
      // Wait a bit for the page to load, then send screenshot via postMessage
      setTimeout(async () => {
        try {
          // Send screenshot data to the page via executeScript
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: (screenshotData) => {
              window.postMessage({
                type: 'AGENT0_SCREENSHOT',
                data: screenshotData
              }, '*');
            },
            args: [payload]
          });
          console.log('Screenshot data sent to Agent0 page');
        } catch (scriptError) {
          console.error('Failed to send screenshot to page:', scriptError);
        }
      }, 500);
      
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
