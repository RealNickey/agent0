/**
 * Agent0 Focus Mode Bridge
 * Content script that bridges communication between Agent0 web app and focus mode extension
 * This script only runs on the Agent0 page (localhost:3000)
 */

// Listen for messages from the background script (extension → Agent0 page)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectFocusUpdate') {
    // Forward focus mode updates to the Agent0 React app via postMessage
    window.postMessage({
      type: message.data.type,
      data: message.data
    }, window.location.origin);
    
    sendResponse({ success: true });
  }
  return true;
});

// Listen for messages from the Agent0 React app (Agent0 page → extension)
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;
  
  // Handle ping for extension detection
  if (event.data.type === 'AGENT0_PING') {
    window.postMessage({
      type: 'AGENT0_PONG',
      extensionVersion: '1.0.0'
    }, window.location.origin);
    return;
  }
  
  // Handle focus mode commands from the chat UI
  if (event.data.type === 'AGENT0_FOCUS_COMMAND') {
    console.log('[Agent0 Bridge] Received AGENT0_FOCUS_COMMAND:', event.data);
    const command = event.data.command;
    
    try {
      console.log('[Agent0 Bridge] Forwarding to background script:', {
        action: 'startFocusFromChat',
        mode: command.mode,
        duration: command.duration,
        taskName: command.taskName
      });
      
      // Forward command to background script
      const response = await chrome.runtime.sendMessage({
        action: 'startFocusFromChat',
        mode: command.mode,
        duration: command.duration ? command.duration * 60 : 0, // Convert minutes to seconds
        taskName: command.taskName
      });
      
      console.log('[Agent0 Bridge] Response from background:', response);
      
      // Send response back to Agent0 app
      window.postMessage({
        type: 'AGENT0_FOCUS_COMMAND_RESPONSE',
        success: response.success,
        message: response.message || response.error
      }, window.location.origin);
    } catch (error) {
      console.error('[Agent0 Bridge] Failed to send focus command:', error);
      
      // Check if extension context was invalidated
      const isContextInvalidated = error.message?.includes('Extension context invalidated');
      
      if (isContextInvalidated) {
        // Auto-refresh the page after showing alert
        if (confirm('Extension was reloaded. This page needs to refresh to reconnect. Refresh now?')) {
          window.location.reload();
          return;
        }
      }
      
      window.postMessage({
        type: 'AGENT0_FOCUS_COMMAND_RESPONSE',
        success: false,
        message: isContextInvalidated 
          ? 'Extension was reloaded. Please refresh this page (F5).'
          : 'Failed to communicate with extension. Make sure Agent0 extension is installed and enabled.'
      }, window.location.origin);
    }
  }
  
  // Handle focus mode status requests
  if (event.data.type === 'AGENT0_FOCUS_STATUS_REQUEST') {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getFocusStatus'
      });
      
      window.postMessage({
        type: 'AGENT0_FOCUS_STATUS',
        status: response.session
      }, window.location.origin);
    } catch (error) {
      console.error('Failed to get focus status:', error);
      window.postMessage({
        type: 'AGENT0_FOCUS_STATUS',
        status: null,
        error: error.message
      }, window.location.origin);
    }
  }
});

// Send initial status check on page load
setTimeout(() => {
  window.postMessage({
    type: 'AGENT0_FOCUS_STATUS_REQUEST'
  }, window.location.origin);
}, 1000);

console.log('Agent0 Focus Mode Bridge initialized');
