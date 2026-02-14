// Background service worker for Agent0 Extension

// Fixed Agent0 URL (popup configuration removed)
const agent0Url = 'http://localhost:3000';

const CONTEXT_MENU_IDS = {
  SEND_SELECTION: 'agent0-send-selection',
};

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
          message: 'Capture is not allowed on browser system pages. Please try on a regular webpage.',
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
            title: 'Capture Failed',
            message: 'Unable to capture this page. Try refreshing or use a different page.',
            priority: 1
          });
        }
      }
    });
  } else if (command === 'summarize-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        handleSummarizePage(tabs[0]);
      }
    });
  }
});

// Handle page summarization
async function handleSummarizePage(tab) {
  console.log('=== Starting page summarization ===');
  console.log('Tab info:', { id: tab.id, url: tab.url, title: tab.title });
  
  try {
    // Check if URL is restricted
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'];
    const isRestricted = restrictedProtocols.some(protocol => tab.url?.startsWith(protocol));
    
    if (isRestricted) {
      console.warn('Cannot summarize restricted page:', tab.url);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Cannot Summarize This Page',
        message: 'Summarization is not available on browser system pages. Please try on a regular webpage.',
        priority: 2
      });
      return;
    }

    console.log('Injecting content script...');
    // Ensure content script is loaded
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('Content script injected successfully');
    } catch (injectError) {
      console.log('Content script already loaded or injection failed:', injectError.message);
    }

    console.log('Requesting page content extraction...');
    // Request page content extraction
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractPageContent'
    });
    
    console.log('Extraction response:', response);
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to extract page content');
    }
    
    const { content } = response;
    
    // Validate content before proceeding
    if (!content || !content.text || content.text.trim().length === 0) {
      throw new Error('No content could be extracted from this page');
    }
    
    console.log(`Extracted ${content.text.length} characters from page: ${content.title}`);
    
    // Create a text file with the content
    const textContent = `Title: ${content.title}\nURL: ${content.url}\n\n${content.text}`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    
    // Verify dataUrl was created successfully
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Failed to create file data URL');
    }
    
    console.log(`Created file with ${dataUrl.length} bytes`);
    
    // Sanitize filename - remove invalid characters and limit length
    const safeTitle = content.title
      .replace(/[<>:"/\\|?*]/g, '')
      .substring(0, 50)
      .trim() || 'page-content';
    
    // Prepare payload with all data
    const payload = {
      pageContent: textContent,
      pageUrl: content.url,
      pageTitle: content.title,
      fileData: dataUrl,
      fileName: `${safeTitle}.txt`,
      timestamp: Date.now()
    };
    
    console.log('Payload prepared:', {
      fileName: payload.fileName,
      pageTitle: payload.pageTitle,
      contentLength: payload.pageContent.length,
      fileDataLength: payload.fileData.length
    });
    
    // Open or focus Agent0 tab
    const tabs = await chrome.tabs.query({ url: `${agent0Url}/*` });
    
    let targetTab;
    let isNewTab = false;
    
    if (tabs.length > 0) {
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
      console.log('Focusing existing Agent0 tab');
    } else {
      targetTab = await chrome.tabs.create({ url: agent0Url });
      isNewTab = true;
      console.log('Created new Agent0 tab');
    }
    
    // Wait for page to load and send data with retry logic
    const sendDataToAgent0 = async (retryCount = 0) => {
      const maxRetries = 5;
      const retryDelay = isNewTab ? 1000 : 300; // Longer wait for new tabs
      
      try {
        console.log(`Attempting to send data (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        
        // Check if tab still exists
        const tabInfo = await chrome.tabs.get(targetTab.id);
        console.log('Tab status:', tabInfo.status);
        
        // Wait for page to be fully loaded
        if (tabInfo.status !== 'complete' && retryCount < maxRetries) {
          console.log(`Page not ready (status: ${tabInfo.status}), retry ${retryCount + 1}/${maxRetries}`);
          setTimeout(() => sendDataToAgent0(retryCount + 1), retryDelay);
          return;
        }
        
        // Inject a script that will verify the listener is ready before sending
        const result = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: (data) => {
            console.log('Injected script running in Agent0 page');
            console.log('Sending AGENT0_SUMMARIZE_PAGE message with data:', {
              fileName: data.fileName,
              pageTitle: data.pageTitle,
              contentLength: data.pageContent?.length,
              fileDataLength: data.fileData?.length
            });
            
            // Store the data globally in case the React component isn't ready yet
            window.__agent0PendingSummarization = data;
            
            // Send the message
            window.postMessage({
              type: 'AGENT0_SUMMARIZE_PAGE',
              data: data
            }, '*');
            
            console.log('Message posted to window and stored globally');
            return { success: true };
          },
          args: [payload]
        });
        
        console.log('Script execution result:', result);
        console.log('Successfully sent page content to Agent0');
        
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Page Sent to Agent0',
          message: `"${content.title}" is ready for summarization`,
          priority: 1
        });
        
      } catch (scriptError) {
        console.error('Failed to send page content:', scriptError);
        
        // Retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => sendDataToAgent0(retryCount + 1), retryDelay);
        } else {
          throw new Error('Failed to send data after multiple retries');
        }
      }
    };
    
    // Start sending with appropriate delay
    setTimeout(() => sendDataToAgent0(), isNewTab ? 1500 : 500);
    
  } catch (error) {
    console.error('Failed to summarize page:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Summarization Failed',
      message: error.message || 'Unable to extract page content. Please try again.',
      priority: 1
    });
  }
}

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
  } else if (request.action === 'MEDIA_STATUS_UPDATE') {
    handleMediaStatusUpdate(request.data, sender.tab.id);
  } else if (request.action === 'RelayMediaControl') {
    handleRelayMediaControl(request.command);
  }
});

let activeMediaTabId = null;

function handleMediaStatusUpdate(data, tabId) {
  // If a tab reports playing, it becomes the active media tab
  if (data.isPlaying) {
    activeMediaTabId = tabId;
  }
  
  // Forward to Agent0 tabs
  // Note: match pattern must be correct for chrome.tabs.query
  chrome.tabs.query({ url: agent0Url + "/*" }, (tabs) => {
    tabs.forEach(t => {
      chrome.tabs.sendMessage(t.id, {
        action: 'AGENT0_MEDIA_UPDATE',
        data: { ...data, tabId }
      }).catch(err => console.log('Failed to forward media update', err));
    });
  });
}

function handleRelayMediaControl(command) {
  if (activeMediaTabId) {
    chrome.tabs.sendMessage(activeMediaTabId, {
      action: 'MEDIA_CONTROL',
      command: command
    }).catch((err) => {
       console.log('Failed to send control to tab', activeMediaTabId, err);
       activeMediaTabId = null;
    });
  }
}


function toSafeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

function sanitizeContextText(text) {
  const raw = toSafeString(text);
  if (!raw.trim()) return '';

  // Strip common email/message metadata lines (helps avoid leaking headers like From/To/Date/Time).
  const headerLine = /^\s*(from|to|cc|bcc|date|sent|time|subject|reply-to)\s*:\s*/i;

  const sanitizedLines = raw
    .split(/\r?\n/)
    .filter((line) => !headerLine.test(line));

  let sanitized = sanitizedLines.join('\n');

  // Redact email addresses (basic, intentionally conservative)
  sanitized = sanitized.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '[redacted-email]'
  );

  // Collapse excessive whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();
  return sanitized;
}

async function handleSendSelectedText(info, tab) {
  try {
    const selectedText = sanitizeContextText(info.selectionText);
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
      selectedText: selectedText ? sanitizeContextText(selectedText) : null,
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
