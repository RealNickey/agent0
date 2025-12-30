import { z } from 'zod';

/**
 * Focus Mode Tool for AI Agent
 * Allows the AI to control focus sessions through conversation
 */

export const focusModeTool = {
  description: `Start, pause, resume, stop, or check the status of a focus session. 
  
Three modes available:
- pomodoro: 25-minute work sessions with 5-minute breaks (classic technique)
- flowtime: Work without time limits, take breaks when you feel ready
- countdown: Custom duration timer (specify minutes, 1-180 range)

Use this tool when the user wants to:
- Start a focus/work session
- Set a timer for concentration
- Use Pomodoro technique
- Take a timed break
- Check if they're currently in a focus session`,

  parameters: z.object({
    action: z
      .enum(['start', 'pause', 'resume', 'stop', 'status'])
      .describe(
        'Action to perform: start (begin new session), pause (pause current), resume (continue paused), stop (end current), status (check current session)'
      ),
    mode: z
      .enum(['pomodoro', 'flowtime', 'countdown'])
      .optional()
      .describe('Focus mode type (required for start action): pomodoro, flowtime, or countdown'),
    duration: z
      .number()
      .min(1)
      .max(180)
      .optional()
      .describe('Duration in minutes (required for countdown mode, 1-180 minutes)'),
    taskName: z
      .string()
      .optional()
      .describe('Optional: Name or description of the task to focus on'),
  }),

  execute: async ({ action, mode, duration, taskName }: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'status';
    mode?: 'pomodoro' | 'flowtime' | 'countdown';
    duration?: number;
    taskName?: string;
  }) => {
    try {
      // Call the API endpoint
      const response = await fetch('/api/focus-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, mode, duration, taskName }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.error || 'Failed to execute focus mode command',
        };
      }

      const result = await response.json();

      // The client-side will pick up this command and execute it via the extension
      // We need to trigger the command execution on the client side
      if (typeof window !== 'undefined' && result.command) {
        // Send command to extension via postMessage
        window.postMessage(
          {
            type: 'AGENT0_FOCUS_COMMAND',
            command: result.command,
          },
          window.location.origin
        );
      }

      return {
        success: true,
        message: result.message,
        action: action,
        mode: mode,
        duration: duration,
      };
    } catch (error) {
      console.error('Focus mode tool error:', error);
      return {
        success: false,
        message: 'Failed to communicate with focus mode system. Make sure the Agent0 browser extension is installed.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

export default focusModeTool;
