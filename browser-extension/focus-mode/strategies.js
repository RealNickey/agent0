/**
 * Focus Mode Strategies
 * Define different focus mode strategies with their configurations
 * 
 * Based on research from the Pomodoro Technique and productivity studies:
 * - 25-minute work sessions are optimal for most people
 * - After 4 pomodoros, take a longer 15-30 minute break
 * - DeskTime research shows 52/17 works for some, but 25/5 is more universally applicable
 * - Flowtime allows for natural flow states in creative work
 */

/**
 * Pomodoro Strategy
 * Work in 25-minute intervals with short breaks, and longer breaks every 4 cycles
 * Research-backed intervals from Francesco Cirillo's original method
 */
const PomodoroStrategy = {
  name: 'pomodoro',
  displayName: 'Pomodoro',
  description: 'Classic 25-minute work sessions with breaks',
  
  // Default configuration (research-backed values)
  config: {
    workDuration: 25 * 60, // 25 minutes in seconds (optimal for focus)
    shortBreakDuration: 5 * 60, // 5 minutes (enough to reset without losing momentum)
    longBreakDuration: 15 * 60, // 15 minutes (15-30 range, using conservative)
    cyclesBeforeLongBreak: 4, // Every 4th cycle gets a long break
    // Advanced settings based on productivity research
    extendedWorkDuration: 50 * 60, // 50 min option for deep work
    maxDailyPomodoros: 16, // ~8 hour workday with breaks
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
   * Research suggests manual control is better for habit formation
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
    
    // Every Nth cycle gets a long break (based on research, every 4th)
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
  
  /**
   * Get motivational message based on completed pomodoros
   * @param {number} completedCount - Number of completed pomodoros
   * @returns {string} Motivational message
   */
  getMotivationalMessage(completedCount) {
    if (completedCount === 0) return "Let's start your first pomodoro!";
    if (completedCount === 1) return "Great start! Keep the momentum going.";
    if (completedCount < 4) return `${completedCount} down, ${4 - completedCount} to go until a long break!`;
    if (completedCount === 4) return "4 pomodoros complete! You've earned a long break.";
    if (completedCount < 8) return `Impressive! ${completedCount} pomodoros today.`;
    if (completedCount < 12) return `Outstanding focus! ${completedCount} pomodoros.`;
    return `Incredible productivity! ${completedCount} pomodoros today!`;
  },

  /**
   * Get tips for better focus during pomodoro
   * @returns {Array<string>} Array of tips
   */
  getTips() {
    return [
      "If a task takes more than 4 pomodoros, break it into smaller steps",
      "Tasks under 1 pomodoro? Batch them together",
      "Write down distractions to address during breaks",
      "The pomodoro is indivisible - resist checking notifications",
      "Use breaks to step away from screens",
    ];
  },
};

/**
 * Flowtime Strategy
 * No fixed duration - work until you naturally want to take a break
 * Break duration is based on how long you worked (ratio-based)
 * Best for creative work and tasks requiring deep flow states
 */
const FlowtimeStrategy = {
  name: 'flowtime',
  displayName: 'Flowtime',
  description: 'Work without time limits, take breaks based on flow',
  
  // Default configuration (research-informed values)
  config: {
    breakRatio: 0.2, // 20% of work time as break (e.g., 50min work = 10min break)
    minBreakDuration: 5 * 60, // Minimum 5 minutes (always beneficial)
    maxBreakDuration: 20 * 60, // Maximum 20 minutes (avoid losing momentum)
    // Suggested break ranges based on work duration
    breakTiers: [
      { workMin: 0, workMax: 25, breakMin: 5 },
      { workMin: 25, workMax: 50, breakMin: 8 },
      { workMin: 50, workMax: 90, breakMin: 10 },
      { workMin: 90, workMax: 180, breakMin: 15 },
    ],
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
    const workMinutes = Math.round(workDuration / 60);
    const breakMinutes = Math.round(breakDuration / 60);
    return `Based on your ${workMinutes}-minute session, we suggest a ${breakMinutes}-minute break.`;
  },
  
  /**
   * Get tips for flowtime
   * @returns {Array<string>} Array of tips
   */
  getTips() {
    return [
      "Work until you naturally feel your focus waning",
      "Great for creative work, research, and exploration",
      "Don't force breaks - trust your natural rhythm",
      "Step away from screens during breaks for best recovery",
    ];
  },
};

/**
 * Countdown Strategy
 * Simple countdown timer - set any duration you want
 * Good for time-boxed tasks and deadlines
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
    // Popular duration presets based on common use cases
    presets: [
      { label: '15 min', value: 15 * 60, useCase: 'Quick task' },
      { label: '25 min', value: 25 * 60, useCase: 'Standard focus block' },
      { label: '45 min', value: 45 * 60, useCase: 'Meeting length' },
      { label: '60 min', value: 60 * 60, useCase: 'Deep work hour' },
      { label: '90 min', value: 90 * 60, useCase: 'Extended focus' },
    ],
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
   * Get break duration (countdown suggests but doesn't enforce breaks)
   * @param {number} cycle - Current cycle number
   * @param {object} config - Custom configuration
   * @param {number} workDuration - How long the user worked
   * @returns {number} Break duration in seconds (suggested)
   */
  getBreakDuration(cycle, config = {}, workDuration = 0) {
    // Suggest 10-20% of work time as break, min 5 min
    const suggested = Math.max(5 * 60, workDuration * 0.15);
    return Math.min(suggested, 15 * 60); // Cap at 15 min
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
  
  /**
   * Get tips for countdown mode
   * @returns {Array<string>} Array of tips
   */
  getTips() {
    return [
      "Choose a duration that matches your task complexity",
      "Consider time-boxing: set a firm limit and stop when it rings",
      "For meetings, add 5 min buffer for transition",
    ];
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
