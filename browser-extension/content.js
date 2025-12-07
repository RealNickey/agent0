// Content script for Agent0 Screenshot Extension

let isCapturing = false;
let selectionOverlay = null;
let canvas = null;
let startPoint = null;
let currentRect = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapture') {
    startScreenshotCapture();
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
    console.error('Screenshot failed:', error);
    showToastNotification('Failed to capture screenshot: ' + error.message, 'error');
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
    console.error('Screenshot failed:', error);
    showToastNotification('Failed to capture screenshot: ' + error.message, 'error');
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
    ${type === 'error' 
      ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;' 
      : 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'}
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
