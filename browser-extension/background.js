// Background service worker for Agent0 Extension

// Fixed Agent0 URL (popup configuration removed)
const agent0Url = 'http://localhost:3000';

const CONTEXT_MENU_IDS = {
  SEND_SELECTION: 'agent0-send-selection',
};

/**
 * Send focus mode updates to Agent0 web app
 */
function sendFocusUpdateToAgent0(data) {
  chrome.tabs.query({ url: `${agent0Url}/*` }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'injectFocusUpdate',
        data: data
      }).catch(error => {
        console.log('Could not send focus update to Agent0:', error);
      });
    }
  });
}

// Listen for keyboard shortcuts
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
  } else if (command === 'toggle-focus-mode') {
    handleToggleFocusMode();
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
  } else if (request.action === 'startFocusSession') {
    handleStartFocusSession(request, sendResponse);
    return true;
  } else if (request.action === 'pauseFocusSession') {
    handlePauseFocusSession(request, sendResponse);
    return true;
  } else if (request.action === 'stopFocusSession') {
    handleStopFocusSession(request, sendResponse);
    return true;
  } else if (request.action === 'getFocusStatus') {
    handleGetFocusStatus(request, sendResponse);
    return true;
  } else if (request.action === 'focusSessionStarted') {
    handleFocusSessionStarted(request, sendResponse);
    return true;
  } else if (request.action === 'focusSessionCompleted') {
    handleFocusSessionCompleted(request, sendResponse);
    return true;
  } else if (request.action === 'focusSessionStopped') {
    handleFocusSessionStopped(request, sendResponse);
    return true;
  } else if (request.action === 'startFocusFromChat') {
    handleStartFocusFromChat(request, sendResponse);
    return true;
  }
});

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

// ==================== Focus Mode Handlers ====================

/**
 * Toggle focus mode overlay
 */
async function handleToggleFocusMode() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab?.id) return;
    
    // Check if URL is restricted
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'];
    const isRestricted = restrictedProtocols.some(protocol => tab.url?.startsWith(protocol));
    
    if (isRestricted) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Focus Mode Unavailable',
        message: 'Focus mode cannot be used on browser system pages.',
        priority: 1
      });
      return;
    }
    
    // Send message to content script to toggle overlay
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleFocusMode' });
    } catch (error) {
      console.error('Failed to toggle focus mode:', error);
    }
  } catch (error) {
    console.error('Error toggling focus mode:', error);
  }
}

/**
 * Start a focus session
 */
async function handleStartFocusSession(request, sendResponse) {
  try {
    const { mode, duration, config } = request;
    
    // Store current session state
    await chrome.storage.local.set({
      currentFocusSession: {
        mode,
        duration,
        config,
        startedAt: Date.now(),
        status: 'running'
      }
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error starting focus session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Pause a focus session
 */
async function handlePauseFocusSession(request, sendResponse) {
  try {
    const data = await chrome.storage.local.get('currentFocusSession');
    
    if (data.currentFocusSession) {
      data.currentFocusSession.status = 'paused';
      data.currentFocusSession.pausedAt = Date.now();
      
      await chrome.storage.local.set({
        currentFocusSession: data.currentFocusSession
      });
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error pausing focus session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Stop a focus session
 */
async function handleStopFocusSession(request, sendResponse) {
  try {
    await chrome.storage.local.remove('currentFocusSession');
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error stopping focus session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get focus session status
 */
async function handleGetFocusStatus(request, sendResponse) {
  try {
    const data = await chrome.storage.local.get('currentFocusSession');
    sendResponse({ 
      success: true, 
      session: data.currentFocusSession || null 
    });
  } catch (error) {
    console.error('Error getting focus status:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle focus session started notification
 */
async function handleFocusSessionStarted(request, sendResponse) {
  try {
    const { mode, duration, taskName } = request;
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Focus Session Started',
      message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} session started${duration > 0 ? ` for ${Math.round(duration / 60)} minutes` : ''}`,
      priority: 1
    });
    
    // Send update to Agent0 web app
    sendFocusUpdateToAgent0({
      type: 'AGENT0_FOCUS_STARTED',
      mode: mode,
      duration: duration,
      taskName: taskName || null,
      startedAt: Date.now()
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling focus session started:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle focus session completed notification
 */
async function handleFocusSessionCompleted(request, sendResponse) {
  try {
    const { mode, duration } = request;
    
    // Show notification with sound
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Focus Session Completed! 🎉',
      message: `Great work! You completed a ${Math.round(duration / 60)} minute ${mode} session.`,
      priority: 2,
      requireInteraction: true
    });
    
    // Clear current session
    await chrome.storage.local.remove('currentFocusSession');
    
    // Send update to Agent0 web app
    sendFocusUpdateToAgent0({
      type: 'AGENT0_FOCUS_COMPLETE',
      mode: mode,
      duration: duration,
      completed: true,
      completedAt: Date.now()
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling focus session completed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle focus session stopped notification
 */
async function handleFocusSessionStopped(request, sendResponse) {
  try {
    // Clear current session
    await chrome.storage.local.remove('currentFocusSession');
    
    // Send update to Agent0 web app
    sendFocusUpdateToAgent0({
      type: 'AGENT0_FOCUS_STOPPED',
      stoppedAt: Date.now()
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling focus session stopped:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle start focus session from chat UI
 */
async function handleStartFocusFromChat(request, sendResponse) {
  console.log('[Background] handleStartFocusFromChat called:', request);
  const { mode, duration, taskName } = request;
  
  try {
    // Find the active tab to send the command to
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      console.error('[Background] No active tab found');
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }
    
    const tab = tabs[0];
    console.log('[Background] Active tab:', tab.id, tab.url);
    
    // Check if URL is restricted
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'];
    const isRestricted = restrictedProtocols.some(protocol => tab.url?.startsWith(protocol));
    
    if (isRestricted) {
      console.error('[Background] Tab URL is restricted:', tab.url);
      sendResponse({ 
        success: false, 
        error: 'Focus mode cannot be started on browser system pages' 
      });
      return;
    }
    
    // Helper to send message to tab with error handling
    const sendMessageToTab = (tabId, message) => {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    };
    
    // Helper to inject focus mode scripts
    const injectFocusModeScripts = async (tabId) => {
      console.log('[Background] Injecting focus mode scripts...');
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          'focus-mode/timer-engine.js',
          'focus-mode/strategies.js', 
          'focus-mode/storage.js',
          'focus-mode/focus-overlay.js'
        ]
      });
      // Wait for scripts to initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[Background] Focus mode scripts injected');
    };
    
    // Try to send message, inject scripts if needed
    const sendFocusCommand = async (retryAfterInject = false) => {
      try {
        console.log('[Background] Sending startFocusSession to tab...');
        await sendMessageToTab(tab.id, {
          action: 'startFocusSession',
          mode: mode,
          duration: duration,
          taskName: taskName
        });
        
        // Show the overlay
        await sendMessageToTab(tab.id, {
          action: 'showFocusMode'
        });
        
        console.log('[Background] Focus session started successfully');
        return { success: true };
      } catch (error) {
        console.error('[Background] sendFocusCommand error:', error.message);
        if (!retryAfterInject && error.message?.includes('Receiving end does not exist')) {
          // Scripts not loaded, inject them
          await injectFocusModeScripts(tab.id);
          return sendFocusCommand(true); // Retry once
        }
        throw error;
      }
    };
    
    try {
      const result = await sendFocusCommand();
      sendResponse({ 
        success: true, 
        message: `Focus session started: ${mode}` 
      });
    } catch (tabError) {
      console.error('[Background] Failed to send focus command to tab:', tabError);
      sendResponse({ 
        success: false, 
        error: 'Could not start focus mode. Try refreshing the page.' 
      });
    }
  } catch (error) {
    console.error('[Background] Error handling start focus from chat:', error);
    sendResponse({ success: false, error: error.message || 'Unknown error' });
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
