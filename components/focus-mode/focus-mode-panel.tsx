"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Timer,
  Play,
  Pause,
  Square,
  RotateCcw,
  Coffee,
  Target,
  Clock,
  Zap,
  Trophy,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Pomodoro technique constants based on research
const POMODORO_CONFIG = {
  workDuration: 25 * 60, // 25 minutes
  shortBreakDuration: 5 * 60, // 5 minutes
  longBreakDuration: 15 * 60, // 15-30 minutes (using 15)
  cyclesBeforeLongBreak: 4, // Every 4 pomodoros
};

const FLOWTIME_CONFIG = {
  breakRatio: 0.2, // 20% of work time as break
  minBreakDuration: 5 * 60,
  maxBreakDuration: 20 * 60,
};

export interface FocusSession {
  active: boolean;
  mode: "pomodoro" | "flowtime" | "countdown";
  duration: number; // in seconds
  taskName?: string;
  startedAt: number;
  isBreak?: boolean;
  cycle?: number; // For pomodoro
  completedPomodoros?: number;
}

interface FocusModeControlProps {
  mode: "pomodoro" | "flowtime" | "countdown";
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

function FocusModeControl({
  mode,
  icon,
  title,
  description,
  selected,
  onSelect,
}: FocusModeControlProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all text-left w-full",
        selected
          ? "border-purple-500 bg-purple-500/10"
          : "border-border hover:border-purple-500/50"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-md",
          selected ? "bg-purple-500/20 text-purple-400" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4 className={cn("font-medium text-sm", selected && "text-purple-400")}>
          {title}
        </h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {selected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
    </motion.button>
  );
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface FocusModePanelContentProps {
  session: FocusSession | null;
  onStartSession: (mode: string, duration?: number, taskName?: string) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onStopSession: () => void;
  extensionConnected: boolean;
}

export function FocusModePanelContent({
  session,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  extensionConnected,
}: FocusModePanelContentProps) {
  const [selectedMode, setSelectedMode] = useState<"pomodoro" | "flowtime" | "countdown">(
    "pomodoro"
  );
  const [countdownMinutes, setCountdownMinutes] = useState(25);
  const [taskName, setTaskName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // Update elapsed time for active sessions
  useEffect(() => {
    if (session?.active && session.startedAt) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [session?.active, session?.startedAt]);

  // Load completed pomodoros from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("agent0-completed-pomodoros");
    if (saved) {
      const data = JSON.parse(saved);
      // Reset if it's a new day
      const today = new Date().toDateString();
      if (data.date === today) {
        setCompletedPomodoros(data.count);
      }
    }
  }, []);

  // Save completed pomodoros to localStorage
  const incrementPomodoros = useCallback(() => {
    const newCount = completedPomodoros + 1;
    setCompletedPomodoros(newCount);
    localStorage.setItem(
      "agent0-completed-pomodoros",
      JSON.stringify({
        date: new Date().toDateString(),
        count: newCount,
      })
    );
  }, [completedPomodoros]);

  const handleStart = () => {
    let duration: number | undefined;
    if (selectedMode === "pomodoro") {
      duration = POMODORO_CONFIG.workDuration;
    } else if (selectedMode === "countdown") {
      duration = countdownMinutes * 60;
    }
    onStartSession(selectedMode, duration ? duration / 60 : undefined, taskName || undefined);
  };

  const getRemainingTime = () => {
    if (!session) return 0;
    if (session.mode === "flowtime") return elapsedTime; // Show elapsed for flowtime
    const remaining = session.duration - elapsedTime;
    return Math.max(0, remaining);
  };

  const getProgress = () => {
    if (!session || session.mode === "flowtime") return 0;
    return Math.min(100, (elapsedTime / session.duration) * 100);
  };

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case "pomodoro":
        return "🍅";
      case "flowtime":
        return "🌊";
      case "countdown":
        return "⏱️";
      default:
        return "🎯";
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "pomodoro":
        return "text-red-400";
      case "flowtime":
        return "text-blue-400";
      case "countdown":
        return "text-amber-400";
      default:
        return "text-purple-400";
    }
  };

  // If extension not connected, show setup instructions
  if (!extensionConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-400">Extension Required</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Focus Mode requires the Agent0 browser extension to work. The timer
                overlay runs in your browser and persists across tabs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-foreground">Setup Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Open Chrome/Edge extensions page (chrome://extensions)</li>
            <li>Enable &quot;Developer mode&quot;</li>
            <li>Click &quot;Load unpacked&quot; and select the browser-extension folder</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">Ctrl+Shift+F</kbd> to toggle the timer overlay visibility.
          </p>
        </div>
      </div>
    );
  }

  // Active session view
  if (session?.active) {
    const remaining = getRemainingTime();
    const progress = getProgress();
    const isFlowtime = session.mode === "flowtime";

    return (
      <div className="space-y-6">
        {/* Session Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">{getModeEmoji(session.mode)}</span>
            <h3 className={cn("text-lg font-semibold capitalize", getModeColor(session.mode))}>
              {session.isBreak ? "Break Time" : `${session.mode} Session`}
            </h3>
          </div>
          {session.taskName && (
            <p className="text-sm text-muted-foreground">{session.taskName}</p>
          )}
        </div>

        {/* Timer Display */}
        <div className="relative">
          <motion.div
            className="text-center"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <div className="text-5xl font-mono font-bold text-foreground tracking-wider">
              {formatTime(isFlowtime ? elapsedTime : remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFlowtime ? "Time Focused" : "Remaining"}
            </p>
          </motion.div>

          {/* Progress Ring (for non-flowtime) */}
          {!isFlowtime && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatTime(elapsedTime)}</span>
                <span>{formatTime(session.duration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onStopSession}
            className="h-12 w-12 rounded-full"
          >
            <Square className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            onClick={session.active ? onPauseSession : onResumeSession}
            className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700"
          >
            {session.active ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-12 w-12 rounded-full"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Pomodoro Stats */}
        {session.mode === "pomodoro" && (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-muted-foreground">
              {completedPomodoros} pomodoro{completedPomodoros !== 1 ? "s" : ""} completed today
            </span>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Stay focused:</strong> Avoid checking emails or social media until the timer ends.
          </p>
          {session.mode === "pomodoro" && !session.isBreak && (
            <p className="text-xs text-muted-foreground">
              🎯 After this session, you&apos;ll earn a {((completedPomodoros + 1) % 4 === 0) ? "15" : "5"}-minute break.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Mode selection view (no active session)
  return (
    <div className="space-y-6">
      {/* Daily Stats */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">Today&apos;s Progress</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(completedPomodoros, 8) }).map((_, i) => (
            <span key={i} className="text-lg">🍅</span>
          ))}
          {completedPomodoros > 8 && (
            <span className="text-sm text-muted-foreground">+{completedPomodoros - 8}</span>
          )}
          {completedPomodoros === 0 && (
            <span className="text-sm text-muted-foreground">Start your first session!</span>
          )}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Choose Focus Mode</h4>
        <div className="space-y-2">
          <FocusModeControl
            mode="pomodoro"
            icon={<Timer className="w-4 h-4" />}
            title="Pomodoro"
            description="25 min work, 5 min break. Long break every 4 sessions."
            selected={selectedMode === "pomodoro"}
            onSelect={() => setSelectedMode("pomodoro")}
          />
          <FocusModeControl
            mode="flowtime"
            icon={<Zap className="w-4 h-4" />}
            title="Flowtime"
            description="Work until ready for break. Break scales with work time."
            selected={selectedMode === "flowtime"}
            onSelect={() => setSelectedMode("flowtime")}
          />
          <FocusModeControl
            mode="countdown"
            icon={<Clock className="w-4 h-4" />}
            title="Custom Timer"
            description="Set any duration from 1-180 minutes."
            selected={selectedMode === "countdown"}
            onSelect={() => setSelectedMode("countdown")}
          />
        </div>
      </div>

      {/* Countdown Duration (only for countdown mode) */}
      {selectedMode === "countdown" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Duration</label>
          <div className="flex items-center gap-2">
            {[15, 25, 45, 60, 90].map((mins) => (
              <Button
                key={mins}
                variant={countdownMinutes === mins ? "default" : "outline"}
                size="sm"
                onClick={() => setCountdownMinutes(mins)}
                className={countdownMinutes === mins ? "bg-purple-600" : ""}
              >
                {mins}m
              </Button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={180}
            value={countdownMinutes}
            onChange={(e) => setCountdownMinutes(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 min</span>
            <span className="font-medium text-foreground">{countdownMinutes} minutes</span>
            <span>180 min</span>
          </div>
        </div>
      )}

      {/* Task Name (Optional) */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced Options
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-foreground">Task Name (Optional)</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Start Button */}
      <Button
        onClick={handleStart}
        className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
      >
        <Play className="w-5 h-5 mr-2" />
        Start {selectedMode === "pomodoro" ? "Pomodoro" : selectedMode === "flowtime" ? "Flowtime" : `${countdownMinutes}min`} Session
      </Button>

      {/* Tips Section */}
      <div className="space-y-2 pt-2 border-t">
        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tips for Better Focus</h5>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Break complex tasks into smaller chunks (1-4 pomodoros each)</li>
          <li>• Take breaks seriously - step away from screens</li>
          <li>• Write down distracting thoughts to address later</li>
          <li>• Use the 2-minute rule: if it takes less than 2 min, do it now</li>
        </ul>
      </div>
    </div>
  );
}
