import { NextRequest, NextResponse } from 'next/server';

/**
 * Focus Mode API Endpoint
 * Handles focus mode commands from the AI agent
 */

export async function POST(req: NextRequest) {
  try {
    const { action, mode, duration, taskName } = await req.json();

    // Validate action
    const validActions = ['start', 'pause', 'resume', 'stop', 'status'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Validate mode for start action
    if (action === 'start') {
      const validModes = ['pomodoro', 'flowtime', 'countdown'];
      if (!mode || !validModes.includes(mode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing mode for start action' },
          { status: 400 }
        );
      }

      // Validate duration for countdown mode
      if (mode === 'countdown' && (!duration || duration < 1 || duration > 180)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Countdown mode requires duration between 1 and 180 minutes' 
          },
          { status: 400 }
        );
      }
    }

    // Generate response message
    let message = '';
    switch (action) {
      case 'start':
        if (mode === 'pomodoro') {
          message = `Starting Pomodoro focus session (25 minutes work, 5 minutes break)${taskName ? ` for: ${taskName}` : ''}`;
        } else if (mode === 'flowtime') {
          message = `Starting Flowtime session (work until you're ready for a break)${taskName ? ` for: ${taskName}` : ''}`;
        } else if (mode === 'countdown') {
          message = `Starting ${duration}-minute focus session${taskName ? ` for: ${taskName}` : ''}`;
        }
        break;
      case 'pause':
        message = 'Pausing your focus session. Take a quick break!';
        break;
      case 'resume':
        message = 'Resuming your focus session. Let\'s get back to work!';
        break;
      case 'stop':
        message = 'Stopping your focus session. Great effort!';
        break;
      case 'status':
        message = 'Checking your current focus session status...';
        break;
    }

    // Return command for the client to execute
    return NextResponse.json({
      success: true,
      message,
      command: {
        action,
        mode: mode || null,
        duration: duration || null,
        taskName: taskName || null,
      },
    });
  } catch (error) {
    console.error('Focus mode API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process focus mode command',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current focus session status
 */
export async function GET() {
  try {
    // This is a simple endpoint that returns instructions
    // The actual status comes from the browser extension via postMessage
    return NextResponse.json({
      success: true,
      message: 'Use POST to send focus mode commands',
      availableActions: ['start', 'pause', 'resume', 'stop', 'status'],
      availableModes: ['pomodoro', 'flowtime', 'countdown'],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get focus mode info' },
      { status: 500 }
    );
  }
}
