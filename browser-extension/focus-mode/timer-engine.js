/**
 * Timer Engine
 * Core timer logic for focus mode sessions
 */

class TimerEngine {
  constructor() {
    this.state = {
      status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
      startTime: null,
      pausedTime: null,
      elapsedTime: 0,
      totalDuration: 0, // in seconds
      mode: null, // 'pomodoro' | 'flowtime' | 'countdown'
      cycle: 0, // for pomodoro cycles
      isBreak: false,
    };

    this.intervalId = null;
    this.listeners = new Set();
    this.updateInterval = 100; // ms
  }

  /**
   * Start a new timer session
   * @param {number} duration - Duration in seconds
   * @param {string} mode - Timer mode
   * @param {object} options - Additional options
   */
  start(duration, mode, options = {}) {
    if (this.state.status === 'running') {
      this.stop();
    }

    this.state = {
      status: 'running',
      startTime: Date.now(),
      pausedTime: null,
      elapsedTime: 0,
      totalDuration: duration,
      mode: mode,
      cycle: options.cycle || 0,
      isBreak: options.isBreak || false,
    };

    this.startInterval();
    this.notifyListeners('start');
  }

  /**
   * Resume a paused timer
   */
  resume() {
    if (this.state.status !== 'paused') {
      return;
    }

    const pauseDuration = Date.now() - this.state.pausedTime;
    this.state.startTime += pauseDuration;
    this.state.status = 'running';
    this.state.pausedTime = null;

    this.startInterval();
    this.notifyListeners('resume');
  }

  /**
   * Pause the running timer
   */
  pause() {
    if (this.state.status !== 'running') {
      return;
    }

    this.state.status = 'paused';
    this.state.pausedTime = Date.now();
    this.state.elapsedTime = this.calculateElapsedTime();

    this.stopInterval();
    this.notifyListeners('pause');
  }

  /**
   * Stop the timer completely
   */
  stop() {
    const wasRunning = this.state.status !== 'idle';

    this.state = {
      status: 'idle',
      startTime: null,
      pausedTime: null,
      elapsedTime: 0,
      totalDuration: 0,
      mode: null,
      cycle: 0,
      isBreak: false,
    };

    this.stopInterval();

    if (wasRunning) {
      this.notifyListeners('stop');
    }
  }

  /**
   * Start the update interval
   */
  startInterval() {
    this.stopInterval(); // Clear any existing interval
    this.intervalId = setInterval(() => {
      this.update();
    }, this.updateInterval);
  }

  /**
   * Stop the update interval
   */
  stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update timer state
   */
  update() {
    if (this.state.status !== 'running') {
      return;
    }

    this.state.elapsedTime = this.calculateElapsedTime();

    // Check if timer has completed
    if (this.state.mode !== 'flowtime' && this.state.elapsedTime >= this.state.totalDuration) {
      this.complete();
      return;
    }

    this.notifyListeners('tick');
  }

  /**
   * Complete the timer
   */
  complete() {
    this.state.status = 'completed';
    this.state.elapsedTime = this.state.totalDuration;
    this.stopInterval();
    this.notifyListeners('complete');
  }

  /**
   * Calculate elapsed time in seconds
   */
  calculateElapsedTime() {
    if (this.state.status === 'idle') {
      return 0;
    }

    if (this.state.status === 'paused') {
      return this.state.elapsedTime;
    }

    const elapsed = (Date.now() - this.state.startTime) / 1000;
    return elapsed;
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime() {
    if (this.state.mode === 'flowtime') {
      return 0; // Flowtime has no end time
    }

    const remaining = this.state.totalDuration - this.state.elapsedTime;
    return Math.max(0, remaining);
  }

  /**
   * Get progress as a percentage (0-100)
   */
  getProgress() {
    if (this.state.totalDuration === 0) {
      return 0;
    }

    const progress = (this.state.elapsedTime / this.state.totalDuration) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...this.state,
      elapsedTime: this.calculateElapsedTime(),
      remainingTime: this.getRemainingTime(),
      progress: this.getProgress(),
    };
  }

  /**
   * Add an event listener
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event type
   */
  notifyListeners(event) {
    const state = this.getState();
    this.listeners.forEach((callback) => {
      try {
        callback(event, state);
      } catch (error) {
        console.error('Error in timer listener:', error);
      }
    });
  }

  /**
   * Format time as MM:SS or HH:MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimerEngine;
}
