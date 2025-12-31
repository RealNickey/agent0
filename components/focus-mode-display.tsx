"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Timer, Play, Pause, Square, Clock, ExternalLink, Keyboard, Trophy, Coffee, AlertCircle } from "lucide-react";

type FocusModeResult = {
  success: boolean;
  message: string;
  action: string;
  mode: string | null;
  duration: number | null;
  taskName: string | null;
};

// Pomodoro technique configuration based on research
const POMODORO_CONFIG = {
  workDuration: 25, // minutes
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
};

function getStoredPomodoros(): { count: number; date: string } {
  if (typeof window === "undefined") return { count: 0, date: "" };
  try {
    const stored = localStorage.getItem("agent0-completed-pomodoros");
    if (stored) {
      const data = JSON.parse(stored);
      const today = new Date().toDateString();
      if (data.date === today) {
        return data;
      }
    }
  } catch (e) {
    console.error("Error reading pomodoro data:", e);
  }
  return { count: 0, date: new Date().toDateString() };
}

export function FocusMode(result: FocusModeResult) {
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // Load completed pomodoros
  useEffect(() => {
    const data = getStoredPomodoros();
    setCompletedPomodoros(data.count);
  }, []);

  // Send command to extension when component mounts
  useEffect(() => {
    if (result.success && result.action === 'start' && !isSent) {
      // Listen for response from extension
      const handleResponse = (event: MessageEvent) => {
        if (event.data.type === 'AGENT0_FOCUS_COMMAND_RESPONSE') {
          if (event.data.success) {
            setIsSent(true);
            setError(null);
          } else {
            setError(event.data.message);
          }
        }
      };
      
      window.addEventListener('message', handleResponse);
      
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
      
      return () => window.removeEventListener('message', handleResponse);
    }
  }, [result, isSent]);

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

  const getModeInfo = () => {
    switch (result.mode) {
      case 'pomodoro':
        return { 
          emoji: '🍅', 
          name: 'Pomodoro', 
          desc: `${POMODORO_CONFIG.workDuration} min work, ${POMODORO_CONFIG.shortBreakDuration} min break`,
          tips: [
            'Stay focused until the timer ends',
            'Write down distracting thoughts for later',
            `After ${POMODORO_CONFIG.cyclesBeforeLongBreak} pomodoros, take a ${POMODORO_CONFIG.longBreakDuration} min break`,
          ],
        };
      case 'flowtime':
        return { 
          emoji: '🌊', 
          name: 'Flowtime', 
          desc: 'Work until ready for break',
          tips: [
            'Work until you naturally feel ready for a break',
            'Break duration scales with work time (20% ratio)',
            'Great for creative or exploratory tasks',
          ],
        };
      case 'countdown':
        return { 
          emoji: '⏱️', 
          name: 'Countdown', 
          desc: `${result.duration} minute session`,
          tips: [
            'Perfect for time-boxed tasks',
            'Break complex tasks into smaller chunks',
            'Consider what you can accomplish in this time',
          ],
        };
      default:
        return { emoji: '🎯', name: 'Focus', desc: 'Focus session', tips: [] };
    }
  };

  const modeInfo = getModeInfo();

  // Calculate expected break after this session
  const getBreakInfo = () => {
    if (result.mode !== 'pomodoro') return null;
    const nextPomodoroCount = completedPomodoros + 1;
    const isLongBreak = nextPomodoroCount % POMODORO_CONFIG.cyclesBeforeLongBreak === 0;
    return {
      duration: isLongBreak ? POMODORO_CONFIG.longBreakDuration : POMODORO_CONFIG.shortBreakDuration,
      type: isLongBreak ? 'long' : 'short',
    };
  };

  const breakInfo = getBreakInfo();

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
            <span className="text-2xl">{modeInfo.emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground">
                {result.action === 'start' ? 'Focus Session Started' : 'Focus Mode'}
              </h3>
              <p className="text-xs text-muted-foreground">{modeInfo.name} • {modeInfo.desc}</p>
            </div>
          </div>
          
          {error && (
            <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 p-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <div>
                  <p className="text-xs text-red-400">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try refreshing the page or check if the Agent0 extension is installed.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {result.taskName && (
            <div className="mt-3 rounded-md bg-background/50 p-2">
              <p className="text-xs text-muted-foreground">Task</p>
              <p className="text-sm font-medium text-foreground">{result.taskName}</p>
            </div>
          )}

          {/* Pomodoro stats */}
          {result.mode === 'pomodoro' && result.action === 'start' && (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Trophy className="h-3.5 w-3.5" />
                <span>{completedPomodoros} completed today</span>
              </div>
              {breakInfo && (
                <div className="flex items-center gap-1.5 text-xs text-blue-400">
                  <Coffee className="h-3.5 w-3.5" />
                  <span>{breakInfo.duration}min {breakInfo.type} break next</span>
                </div>
              )}
            </div>
          )}
          
          {result.action === 'start' && !error && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" />
                <span>Press <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">Ctrl+Shift+F</kbd> to toggle overlay</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-purple-400">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Timer is running on all browser tabs</span>
              </div>
            </div>
          )}

          {/* Tips section */}
          {result.action === 'start' && modeInfo.tips.length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-500/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 Tips for {modeInfo.name}</p>
              <ul className="space-y-1">
                {modeInfo.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {tip}</li>
                ))}
              </ul>
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
