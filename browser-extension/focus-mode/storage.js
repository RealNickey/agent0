/**
 * Focus Mode Storage
 * Handle persistence of focus mode settings and state using chrome.storage.local
 */

const STORAGE_KEYS = {
  LAST_MODE: 'focus_lastMode',
  LAST_COUNTDOWN_DURATION: 'focus_lastCountdownDuration',
  POMODORO_CONFIG: 'focus_pomodoroConfig',
  FLOWTIME_CONFIG: 'focus_flowtimeConfig',
  COUNTDOWN_CONFIG: 'focus_countdownConfig',
  CURRENT_SESSION: 'focus_currentSession',
  SESSION_HISTORY: 'focus_sessionHistory',
  PREFERENCES: 'focus_preferences',
};

const DEFAULT_VALUES = {
  lastMode: 'pomodoro',
  lastCountdownDuration: 30 * 60, // 30 minutes
  pomodoroConfig: {
    workDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    cyclesBeforeLongBreak: 4,
  },
  flowtimeConfig: {
    breakRatio: 0.2,
    minBreakDuration: 5 * 60,
    maxBreakDuration: 20 * 60,
  },
  countdownConfig: {
    defaultDuration: 30 * 60,
    minDuration: 1 * 60,
    maxDuration: 180 * 60,
  },
  preferences: {
    soundEnabled: true,
    notificationsEnabled: true,
    autoStartBreak: false,
    autoStartNextSession: false,
    overlayPosition: { x: 20, y: 20 },
    overlayMinimized: false,
  },
};

/**
 * Storage Manager for Focus Mode
 */
class FocusStorage {
  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Stored value or default
   */
  static async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage get error:', chrome.runtime.lastError);
          resolve(defaultValue);
        } else {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        }
      });
    });
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage set error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get multiple values from storage
   * @param {Array<string>} keys - Array of storage keys
   * @returns {Promise<object>} Object with key-value pairs
   */
  static async getMultiple(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage getMultiple error:', chrome.runtime.lastError);
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set multiple values in storage
   * @param {object} items - Object with key-value pairs
   * @returns {Promise<void>}
   */
  static async setMultiple(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage setMultiple error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          console.error('Storage remove error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Clear all focus mode storage
   * @returns {Promise<void>}
   */
  static async clear() {
    const keys = Object.values(STORAGE_KEYS);
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage clear error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  // ==================== Specific Getters and Setters ====================

  /**
   * Get the last selected mode
   * @returns {Promise<string>} Mode name
   */
  static async getLastMode() {
    return this.get(STORAGE_KEYS.LAST_MODE, DEFAULT_VALUES.lastMode);
  }

  /**
   * Set the last selected mode
   * @param {string} mode - Mode name
   */
  static async setLastMode(mode) {
    return this.set(STORAGE_KEYS.LAST_MODE, mode);
  }

  /**
   * Get the last countdown duration
   * @returns {Promise<number>} Duration in seconds
   */
  static async getLastCountdownDuration() {
    return this.get(STORAGE_KEYS.LAST_COUNTDOWN_DURATION, DEFAULT_VALUES.lastCountdownDuration);
  }

  /**
   * Set the last countdown duration
   * @param {number} duration - Duration in seconds
   */
  static async setLastCountdownDuration(duration) {
    return this.set(STORAGE_KEYS.LAST_COUNTDOWN_DURATION, duration);
  }

  /**
   * Get Pomodoro configuration
   * @returns {Promise<object>} Pomodoro config
   */
  static async getPomodoroConfig() {
    return this.get(STORAGE_KEYS.POMODORO_CONFIG, DEFAULT_VALUES.pomodoroConfig);
  }

  /**
   * Set Pomodoro configuration
   * @param {object} config - Pomodoro config
   */
  static async setPomodoroConfig(config) {
    return this.set(STORAGE_KEYS.POMODORO_CONFIG, config);
  }

  /**
   * Get Flowtime configuration
   * @returns {Promise<object>} Flowtime config
   */
  static async getFlowtimeConfig() {
    return this.get(STORAGE_KEYS.FLOWTIME_CONFIG, DEFAULT_VALUES.flowtimeConfig);
  }

  /**
   * Set Flowtime configuration
   * @param {object} config - Flowtime config
   */
  static async setFlowtimeConfig(config) {
    return this.set(STORAGE_KEYS.FLOWTIME_CONFIG, config);
  }

  /**
   * Get Countdown configuration
   * @returns {Promise<object>} Countdown config
   */
  static async getCountdownConfig() {
    return this.get(STORAGE_KEYS.COUNTDOWN_CONFIG, DEFAULT_VALUES.countdownConfig);
  }

  /**
   * Set Countdown configuration
   * @param {object} config - Countdown config
   */
  static async setCountdownConfig(config) {
    return this.set(STORAGE_KEYS.COUNTDOWN_CONFIG, config);
  }

  /**
   * Get current session state (for recovery after restart)
   * @returns {Promise<object|null>} Session state or null
   */
  static async getCurrentSession() {
    return this.get(STORAGE_KEYS.CURRENT_SESSION, null);
  }

  /**
   * Set current session state
   * @param {object|null} session - Session state or null to clear
   */
  static async setCurrentSession(session) {
    if (session === null) {
      return this.remove(STORAGE_KEYS.CURRENT_SESSION);
    }
    return this.set(STORAGE_KEYS.CURRENT_SESSION, session);
  }

  /**
   * Get user preferences
   * @returns {Promise<object>} Preferences
   */
  static async getPreferences() {
    return this.get(STORAGE_KEYS.PREFERENCES, DEFAULT_VALUES.preferences);
  }

  /**
   * Set user preferences
   * @param {object} preferences - Preferences
   */
  static async setPreferences(preferences) {
    return this.set(STORAGE_KEYS.PREFERENCES, preferences);
  }

  /**
   * Update a single preference
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   */
  static async updatePreference(key, value) {
    const preferences = await this.getPreferences();
    preferences[key] = value;
    return this.setPreferences(preferences);
  }

  /**
   * Get session history
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of completed sessions
   */
  static async getSessionHistory(limit = 50) {
    const history = await this.get(STORAGE_KEYS.SESSION_HISTORY, []);
    return history.slice(0, limit);
  }

  /**
   * Add a completed session to history
   * @param {object} session - Completed session data
   */
  static async addSessionToHistory(session) {
    const history = await this.get(STORAGE_KEYS.SESSION_HISTORY, []);
    
    // Add session with timestamp
    history.unshift({
      ...session,
      completedAt: Date.now(),
    });

    // Keep only last 100 sessions
    const trimmedHistory = history.slice(0, 100);
    
    return this.set(STORAGE_KEYS.SESSION_HISTORY, trimmedHistory);
  }

  /**
   * Get all focus mode data (for backup/export)
   * @returns {Promise<object>} All focus mode data
   */
  static async getAllData() {
    const keys = Object.values(STORAGE_KEYS);
    return this.getMultiple(keys);
  }

  /**
   * Import all focus mode data (for restore)
   * @param {object} data - Data to import
   */
  static async importData(data) {
    return this.setMultiple(data);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FocusStorage, STORAGE_KEYS, DEFAULT_VALUES };
}
