/**
 * Focus Mode Overlay
 * Content script that displays the focus mode UI overlay on web pages
 */

// Import timer engine and strategies (injected via manifest)
// Assuming timer-engine.js and strategies.js are loaded before this script

class FocusOverlay {
  constructor() {
    this.timer = new TimerEngine();
    this.isVisible = false;
    this.isDragging = false;
    this.isMinimized = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentStrategy = null;
    this.currentConfig = {};
    
    this.initializeOverlay();
    this.attachEventListeners();
    this.loadPreferences();
    this.setupMessageListener();
  }

  /**
   * Initialize the overlay HTML structure
   */
  initializeOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'focus-mode-overlay';
    this.overlay.className = 'focus-overlay';
    
    this.overlay.innerHTML = `
      <div class="focus-overlay-header">
        <div class="focus-overlay-drag-handle">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="4" r="1.5"/>
            <circle cx="12" cy="4" r="1.5"/>
            <circle cx="4" cy="8" r="1.5"/>
            <circle cx="12" cy="8" r="1.5"/>
            <circle cx="4" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
          </svg>
        </div>
        <span class="focus-overlay-mode">Focus Mode</span>
        <div class="focus-overlay-actions">
          <button class="focus-overlay-btn focus-overlay-minimize" title="Minimize">−</button>
          <button class="focus-overlay-btn focus-overlay-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="focus-overlay-content">
        <!-- Mode selector -->
        <div class="focus-mode-selector">
          <button class="focus-mode-btn" data-mode="pomodoro">Pomodoro</button>
          <button class="focus-mode-btn" data-mode="flowtime">Flowtime</button>
          <button class="focus-mode-btn" data-mode="countdown">Countdown</button>
        </div>

        <!-- Timer display -->
        <div class="focus-timer-display">
          <div class="focus-timer-time">00:00</div>
          <div class="focus-timer-label">Ready to focus</div>
          <div class="focus-timer-progress">
            <div class="focus-timer-progress-bar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="focus-controls">
          <button class="focus-control-btn focus-start-btn" data-action="start">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Start</span>
          </button>
          <button class="focus-control-btn focus-pause-btn" data-action="pause" style="display: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            <span>Pause</span>
          </button>
          <button class="focus-control-btn focus-stop-btn" data-action="stop" style="display: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            <span>Stop</span>
          </button>
        </div>
      </div>
    `;

    // Inject styles
    this.injectStyles();
    
    // Append to body
    document.body.appendChild(this.overlay);
  }

  /**
   * Inject CSS styles for the overlay
   */
  injectStyles() {
    if (document.getElementById('focus-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'focus-overlay-styles';
    style.textContent = `
      .focus-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 999999;
        display: none;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .focus-overlay.visible {
        display: block;
        animation: focusSlideIn 0.3s ease;
      }

      .focus-overlay.minimized .focus-overlay-content {
        display: none;
      }

      .focus-overlay.minimized {
        width: 200px;
      }

      @keyframes focusSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .focus-overlay-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        cursor: move;
        user-select: none;
      }

      .focus-overlay-drag-handle {
        margin-right: 8px;
        opacity: 0.6;
        display: flex;
        align-items: center;
      }

      .focus-overlay-mode {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
      }

      .focus-overlay-actions {
        display: flex;
        gap: 4px;
      }

      .focus-overlay-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 6px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .focus-overlay-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .focus-overlay-content {
        padding: 20px;
      }

      .focus-mode-selector {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }

      .focus-mode-btn {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid transparent;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .focus-mode-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .focus-mode-btn.active {
        background: rgba(255, 255, 255, 0.3);
        border-color: white;
      }

      .focus-timer-display {
        text-align: center;
        margin-bottom: 20px;
      }

      .focus-timer-time {
        font-size: 48px;
        font-weight: 700;
        letter-spacing: -1px;
        margin-bottom: 8px;
        font-variant-numeric: tabular-nums;
      }

      .focus-timer-label {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 16px;
      }

      .focus-timer-progress {
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
      }

      .focus-timer-progress-bar {
        height: 100%;
        background: white;
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .focus-controls {
        display: flex;
        gap: 12px;
      }

      .focus-control-btn {
        flex: 1;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 10px;
        color: #667eea;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .focus-control-btn:hover {
        background: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .focus-control-btn:active {
        transform: translateY(0);
      }

      .focus-control-btn svg {
        width: 16px;
        height: 16px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Timer events
    this.timer.addListener((event, state) => {
      this.handleTimerEvent(event, state);
    });

    // Header drag functionality
    const header = this.overlay.querySelector('.focus-overlay-header');
    header.addEventListener('mousedown', (e) => this.startDragging(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDragging());

    // Minimize button
    this.overlay.querySelector('.focus-overlay-minimize').addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Close button
    this.overlay.querySelector('.focus-overlay-close').addEventListener('click', () => {
      this.hide();
    });

    // Mode selector buttons
    this.overlay.querySelectorAll('.focus-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectMode(btn.dataset.mode);
      });
    });

    // Control buttons
    this.overlay.querySelector('[data-action="start"]').addEventListener('click', () => {
      this.startSession();
    });

    this.overlay.querySelector('[data-action="pause"]').addEventListener('click', () => {
      this.pauseSession();
    });

    this.overlay.querySelector('[data-action="stop"]').addEventListener('click', () => {
      this.stopSession();
    });
  }

  /**
   * Setup message listener for commands from background script
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'toggleFocusMode':
          this.toggle();
          sendResponse({ success: true });
          break;
        case 'showFocusMode':
          this.show();
          sendResponse({ success: true });
          break;
        case 'hideFocusMode':
          this.hide();
          sendResponse({ success: true });
          break;
        case 'getFocusStatus':
          sendResponse({ 
            visible: this.isVisible,
            state: this.timer.getState()
          });
          break;
      }
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Load user preferences from storage
   */
  async loadPreferences() {
    try {
      const preferences = await FocusStorage.getPreferences();
      const lastMode = await FocusStorage.getLastMode();
      
      // Set overlay position
      if (preferences.overlayPosition) {
        this.overlay.style.left = `${preferences.overlayPosition.x}px`;
        this.overlay.style.top = `${preferences.overlayPosition.y}px`;
        this.overlay.style.right = 'auto';
      }

      // Set minimized state
      if (preferences.overlayMinimized) {
        this.overlay.classList.add('minimized');
        this.isMinimized = true;
      }

      // Select last mode
      this.selectMode(lastMode);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  /**
   * Save overlay position to preferences
   */
  async savePosition() {
    try {
      const rect = this.overlay.getBoundingClientRect();
      await FocusStorage.updatePreference('overlayPosition', {
        x: rect.left,
        y: rect.top,
      });
    } catch (error) {
      console.error('Error saving position:', error);
    }
  }

  /**
   * Select a focus mode strategy
   */
  selectMode(mode) {
    // Update active button
    this.overlay.querySelectorAll('.focus-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Get strategy
    this.currentStrategy = getStrategy(mode);
    
    // Update header label
    this.overlay.querySelector('.focus-overlay-mode').textContent = 
      this.currentStrategy.displayName;

    // Save to storage
    FocusStorage.setLastMode(mode);
  }

  /**
   * Start a focus session
   */
  async startSession() {
    if (this.timer.getState().status === 'paused') {
      this.timer.resume();
      return;
    }

    // Get configuration based on current strategy
    let duration;
    let config = {};

    if (this.currentStrategy.name === 'pomodoro') {
      config = await FocusStorage.getPomodoroConfig();
      duration = this.currentStrategy.getInitialDuration(config);
    } else if (this.currentStrategy.name === 'flowtime') {
      config = await FocusStorage.getFlowtimeConfig();
      duration = this.currentStrategy.getInitialDuration(config);
    } else if (this.currentStrategy.name === 'countdown') {
      config = await FocusStorage.getCountdownConfig();
      const lastDuration = await FocusStorage.getLastCountdownDuration();
      duration = lastDuration;
    }

    this.currentConfig = config;

    // Start timer
    this.timer.start(duration, this.currentStrategy.name, {
      cycle: 1,
      isBreak: false,
    });

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'focusSessionStarted',
      mode: this.currentStrategy.name,
      duration: duration,
    });
  }

  /**
   * Pause the current session
   */
  pauseSession() {
    this.timer.pause();
  }

  /**
   * Stop the current session
   */
  stopSession() {
    this.timer.stop();

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'focusSessionStopped',
    });
  }

  /**
   * Handle timer events
   */
  handleTimerEvent(event, state) {
    // Update display
    this.updateDisplay(state);

    // Handle specific events
    switch (event) {
      case 'start':
      case 'resume':
        this.updateControls('running');
        break;
      case 'pause':
        this.updateControls('paused');
        break;
      case 'stop':
        this.updateControls('idle');
        break;
      case 'complete':
        this.handleSessionComplete(state);
        break;
    }
  }

  /**
   * Update the timer display
   */
  updateDisplay(state) {
    const timeDisplay = this.overlay.querySelector('.focus-timer-time');
    const labelDisplay = this.overlay.querySelector('.focus-timer-label');
    const progressBar = this.overlay.querySelector('.focus-timer-progress-bar');

    // Update time
    if (state.mode === 'flowtime') {
      timeDisplay.textContent = TimerEngine.formatTime(state.elapsedTime);
      labelDisplay.textContent = 'In the flow...';
    } else {
      timeDisplay.textContent = TimerEngine.formatTime(state.remainingTime);
      labelDisplay.textContent = state.status === 'running' ? 'Stay focused!' : 
                                  state.status === 'paused' ? 'Paused' : 
                                  'Ready to focus';
    }

    // Update progress bar
    progressBar.style.width = `${state.progress}%`;
  }

  /**
   * Update control buttons visibility
   */
  updateControls(status) {
    const startBtn = this.overlay.querySelector('.focus-start-btn');
    const pauseBtn = this.overlay.querySelector('.focus-pause-btn');
    const stopBtn = this.overlay.querySelector('.focus-stop-btn');

    if (status === 'running') {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      stopBtn.style.display = 'flex';
    } else if (status === 'paused') {
      startBtn.style.display = 'flex';
      startBtn.querySelector('span').textContent = 'Resume';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
    } else {
      startBtn.style.display = 'flex';
      startBtn.querySelector('span').textContent = 'Start';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'none';
    }
  }

  /**
   * Handle session completion
   */
  handleSessionComplete(state) {
    this.updateControls('idle');

    // Save session to history
    FocusStorage.addSessionToHistory({
      mode: state.mode,
      duration: state.totalDuration,
      completedAt: Date.now(),
    });

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'focusSessionCompleted',
      mode: state.mode,
      duration: state.totalDuration,
    });
  }

  /**
   * Start dragging the overlay
   */
  startDragging(e) {
    if (e.target.closest('.focus-overlay-actions')) return;
    
    this.isDragging = true;
    const rect = this.overlay.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.overlay.style.cursor = 'grabbing';
  }

  /**
   * Drag the overlay
   */
  drag(e) {
    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    this.overlay.style.left = `${x}px`;
    this.overlay.style.top = `${y}px`;
    this.overlay.style.right = 'auto';
  }

  /**
   * Stop dragging the overlay
   */
  stopDragging() {
    if (this.isDragging) {
      this.isDragging = false;
      this.overlay.style.cursor = '';
      this.savePosition();
    }
  }

  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.overlay.classList.toggle('minimized', this.isMinimized);
    FocusStorage.updatePreference('overlayMinimized', this.isMinimized);
  }

  /**
   * Show the overlay
   */
  show() {
    this.isVisible = true;
    this.overlay.classList.add('visible');
  }

  /**
   * Hide the overlay
   */
  hide() {
    this.isVisible = false;
    this.overlay.classList.remove('visible');
  }

  /**
   * Toggle overlay visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize the overlay when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.focusOverlay = new FocusOverlay();
  });
} else {
  window.focusOverlay = new FocusOverlay();
}
