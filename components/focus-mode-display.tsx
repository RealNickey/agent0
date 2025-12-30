"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Timer, Play, Pause, Square, Clock } from "lucide-react";

type FocusModeResult = {
  success: boolean;
  message: string;
  action: string;
  mode: string | null;
  duration: number | null;
  taskName: string | null;
};

export function FocusMode(result: FocusModeResult) {
  // Send command to extension when component mounts
  useEffect(() => {
    if (result.success && result.action === 'start') {
      console.log('[FocusMode] Sending command to extension:', {
        action: result.action,
        mode: result.mode,
        duration: result.duration,
        taskName: result.taskName,
      });
      
      // Send command to extension via postMessage
      window.postMessage(
        {
          type: 'AGENT0_FOCUS_COMMAND',
          command: {
            action: result.action,
            mode: result.mode,
            duration: result.duration,
            taskName: result.taskName,
          },
        },
        window.location.origin
      );
      
      console.log('[FocusMode] Command sent successfully');
    }
  }, [result]);

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <Square className="h-5 w-5" />
          <span className="font-medium">Focus Mode Error</span>
        </div>
        <p className="mt-2 text-sm text-red-300">{result.message}</p>
      </div>
    );
  }

  const getIcon = () => {
    switch (result.action) {
      case 'start':
        return <Play className="h-5 w-5" />;
      case 'pause':
        return <Pause className="h-5 w-5" />;
      case 'stop':
        return <Square className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getModeEmoji = () => {
    switch (result.mode) {
      case 'pomodoro':
        return '🍅';
      case 'flowtime':
        return '🌊';
      case 'countdown':
        return '⏱️';
      default:
        return '🎯';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getModeEmoji()}</span>
            <h3 className="font-semibold text-foreground">
              {result.action === 'start' ? 'Focus Session Started' : 'Focus Mode'}
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
          
          {result.taskName && (
            <div className="mt-3 rounded-md bg-background/50 p-2">
              <p className="text-xs text-muted-foreground">Task</p>
              <p className="text-sm font-medium text-foreground">{result.taskName}</p>
            </div>
          )}
          
          {result.action === 'start' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>
                {result.mode === 'pomodoro' && 'Press Ctrl+Shift+F to view timer overlay'}
                {result.mode === 'flowtime' && 'Work as long as you need, then take a break'}
                {result.mode === 'countdown' && `${result.duration} minute focus session`}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function FocusModeLoading({ action }: { action?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-purple-500/20" />
        <div className="flex-1">
          <div className="h-5 w-32 animate-pulse rounded bg-purple-500/20" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-purple-500/10" />
        </div>
      </div>
    </motion.div>
  );
}
