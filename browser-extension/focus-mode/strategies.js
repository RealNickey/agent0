/**
 * Focus Mode Strategies
 * Define different focus mode strategies with their configurations
 */

/**
 * Pomodoro Strategy
 * Work in 25-minute intervals with short breaks, and longer breaks every 4 cycles
 */
const PomodoroStrategy = {
  name: 'pomodoro',
  displayName: 'Pomodoro',
  description: 'Classic 25-minute work sessions with breaks',
  
  // Default configuration
  config: {
    workDuration: 25 * 60, // 25 minutes in seconds
    shortBreakDuration: 5 * 60, // 5 minutes
    longBreakDuration: 15 * 60, // 15 minutes
    cyclesBeforeLongBreak: 4,
  },

  /**
   * Get initial work duration
   * @param {object} config - Custom configuration
   * @returns {number} Duration in seconds
   */
  getInitialDuration(config = {}) {
    const mergedConfig = { ...this.config, ...config };
    return mergedConfig.workDuration;
  },

  /**
   * Should automatically start break after work session
   */
  shouldAutoStartBreak: false,

  /**
   * Should automatically start next session after break
   */
  shouldAutoStartNextSession: false,

  /**
   * Get break duration based on cycle count
   * @param {number} cycle - Current cycle number (1-indexed)
   * @param {object} config - Custom configuration
   * @returns {number} Break duration in seconds
   */
  getBreakDuration(cycle, config = {}) {
    const mergedConfig = { ...this.config, ...config };
    
    // Every Nth cycle gets a long break
    if (cycle % mergedConfig.cyclesBeforeLongBreak === 0) {
      return mergedConfig.longBreakDuration;
    }
    
    return mergedConfig.shortBreakDuration;
  },

  /**
   * Get break type
   * @param {number} cycle - Current cycle number (1-indexed)
   * @param {object} config - Custom configuration
   * @returns {string} 'short' or 'long'
   */
  getBreakType(cycle, config = {}) {
    const mergedConfig = { ...this.config, ...config };
    return cycle % mergedConfig.cyclesBeforeLongBreak === 0 ? 'long' : 'short';
  },
};

/**
 * Flowtime Strategy
 * No fixed duration - work until you naturally want to take a break
 * Break duration is based on how long you worked (ratio-based)
 */
const FlowtimeStrategy = {
  name: 'flowtime',
  displayName: 'Flowtime',
  description: 'Work without time limits, take breaks based on flow',
  
  // Default configuration
  config: {
    breakRatio: 0.2, // 20% of work time as break (e.g., 50min work = 10min break)
    minBreakDuration: 5 * 60, // Minimum 5 minutes
    maxBreakDuration: 20 * 60, // Maximum 20 minutes
  },

  /**
   * Get initial work duration (flowtime has no preset duration)
   * @returns {number} 0 for unlimited
   */
  getInitialDuration() {
    return 0; // No time limit
  },

  /**
   * Should automatically start break after work session
   */
  shouldAutoStartBreak: false,

  /**
   * Should automatically start next session after break
   */
  shouldAutoStartNextSession: false,

  /**
   * Calculate break duration based on work duration
   * @param {number} cycle - Current cycle number (not used for flowtime)
   * @param {object} config - Custom configuration
   * @param {number} workDuration - How long the user worked (in seconds)
   * @returns {number} Break duration in seconds
   */
  getBreakDuration(cycle, config = {}, workDuration = 0) {
    const mergedConfig = { ...this.config, ...config };
    
    // Calculate break as a ratio of work time
    let breakDuration = workDuration * mergedConfig.breakRatio;
    
    // Apply min/max constraints
    breakDuration = Math.max(mergedConfig.minBreakDuration, breakDuration);
    breakDuration = Math.min(mergedConfig.maxBreakDuration, breakDuration);
    
    return Math.round(breakDuration);
  },

  /**
   * Get suggested break duration message
   * @param {number} workDuration - How long the user worked (in seconds)
   * @param {object} config - Custom configuration
   * @returns {string} Message
   */
  getBreakSuggestion(workDuration, config = {}) {
    const breakDuration = this.getBreakDuration(0, config, workDuration);
    const minutes = Math.round(breakDuration / 60);
    return `Based on your ${Math.round(workDuration / 60)} minute session, we suggest a ${minutes} minute break.`;
  },
};

/**
 * Countdown Strategy
 * Simple countdown timer - set any duration you want
 */
const CountdownStrategy = {
  name: 'countdown',
  displayName: 'Countdown',
  description: 'Simple countdown timer with custom duration',
  
  // Default configuration
  config: {
    defaultDuration: 30 * 60, // 30 minutes default
    minDuration: 1 * 60, // 1 minute minimum
    maxDuration: 180 * 60, // 3 hours maximum
  },

  /**
   * Get initial work duration
   * @param {object} config - Custom configuration
   * @returns {number} Duration in seconds
   */
  getInitialDuration(config = {}) {
    const mergedConfig = { ...this.config, ...config };
    const duration = config.customDuration || mergedConfig.defaultDuration;
    
    // Validate duration is within bounds
    return Math.min(
      Math.max(duration, mergedConfig.minDuration),
      mergedConfig.maxDuration
    );
  },

  /**
   * Should automatically start break after work session
   */
  shouldAutoStartBreak: false,

  /**
   * Should automatically start next session after break
   */
  shouldAutoStartNextSession: false,

  /**
   * Get break duration (countdown doesn't enforce breaks)
   * @param {number} cycle - Current cycle number
   * @param {object} config - Custom configuration
   * @returns {number} Break duration in seconds (optional)
   */
  getBreakDuration(cycle, config = {}) {
    // Return a suggested break of 5 minutes, but not enforced
    return 5 * 60;
  },

  /**
   * Validate custom duration
   * @param {number} duration - Duration in seconds
   * @param {object} config - Custom configuration
   * @returns {boolean} Is valid
   */
  isValidDuration(duration, config = {}) {
    const mergedConfig = { ...this.config, ...config };
    return duration >= mergedConfig.minDuration && duration <= mergedConfig.maxDuration;
  },
};

/**
 * Get strategy by name
 * @param {string} name - Strategy name
 * @returns {object} Strategy object
 */
function getStrategy(name) {
  const strategies = {
    pomodoro: PomodoroStrategy,
    flowtime: FlowtimeStrategy,
    countdown: CountdownStrategy,
  };

  return strategies[name] || PomodoroStrategy; // Default to Pomodoro
}

/**
 * Get all available strategies
 * @returns {Array} Array of strategy objects
 */
function getAllStrategies() {
  return [PomodoroStrategy, FlowtimeStrategy, CountdownStrategy];
}

/**
 * Common duration presets (in seconds)
 */
const DurationPresets = {
  pomodoro: [
    { label: '25 min', value: 25 * 60 },
    { label: '50 min', value: 50 * 60 },
  ],
  countdown: [
    { label: '15 min', value: 15 * 60 },
    { label: '30 min', value: 30 * 60 },
    { label: '45 min', value: 45 * 60 },
    { label: '60 min', value: 60 * 60 },
    { label: '90 min', value: 90 * 60 },
  ],
  breaks: [
    { label: '5 min', value: 5 * 60 },
    { label: '10 min', value: 10 * 60 },
    { label: '15 min', value: 15 * 60 },
  ],
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PomodoroStrategy,
    FlowtimeStrategy,
    CountdownStrategy,
    getStrategy,
    getAllStrategies,
    DurationPresets,
  };
}
