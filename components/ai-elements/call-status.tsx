"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, Loader2, CheckCircle2, XCircle, Voicemail } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallStatusProps {
  roomName: string;
  phoneNumber: string;
  task: string;
  initialStatus?: string;
}

type CallState = "calling" | "in_progress" | "completed" | "failed" | "voicemail" | "ended";

export function CallStatus({
  roomName,
  phoneNumber,
  task,
  initialStatus = "calling",
}: CallStatusProps) {
  const [status, setStatus] = useState<CallState>(initialStatus as CallState);
  const [summary, setSummary] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string> | null>(null);
  const [polling, setPolling] = useState(true);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/call?action=status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();

      if (data.status === "completed") {
        setStatus("completed");
        setSummary(data.metadata?.summary || data.summary || "Task completed");
        setDetails(data.metadata?.details || data.details || null);
        setPolling(false);
      } else if (data.status === "failed" || data.status === "call_failed") {
        setStatus("failed");
        setSummary(data.metadata?.summary || data.summary || "Call failed");
        setPolling(false);
      } else if (data.status === "voicemail") {
        setStatus("voicemail");
        setSummary(data.metadata?.summary || "Reached voicemail");
        setPolling(false);
      } else if (data.status === "ended") {
        setStatus("ended");
        setPolling(false);
      } else if (data.status === "in_progress") {
        setStatus("in_progress");
      }
    } catch {
      // Network error, keep polling
    }
  }, [roomName]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [polling, pollStatus]);

  const statusConfig: Record<
    CallState,
    { icon: React.ReactNode; label: string; color: string; bgColor: string }
  > = {
    calling: {
      icon: <Phone className="h-4 w-4 animate-pulse" />,
      label: "Dialing...",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    in_progress: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: "Call in progress",
      color: "text-green-400",
      bgColor: "bg-green-500/10 border-green-500/20",
    },
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Call completed",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    failed: {
      icon: <XCircle className="h-4 w-4" />,
      label: "Call failed",
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
    },
    voicemail: {
      icon: <Voicemail className="h-4 w-4" />,
      label: "Reached voicemail",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    },
    ended: {
      icon: <PhoneOff className="h-4 w-4" />,
      label: "Call ended",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50 border-border",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 space-y-3 max-w-sm",
        config.bgColor
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-2", config.color)}>
          {config.icon}
          <span className="text-sm font-medium">{config.label}</span>
        </div>
      </div>

      {/* Phone number & task */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground font-mono">{phoneNumber}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{task}</p>
      </div>

      {/* Result summary */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-border/50 pt-3 space-y-2"
          >
            <p className="text-sm text-foreground">{summary}</p>
            {details && Object.keys(details).length > 0 && (
              <div className="space-y-1">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground capitalize min-w-[80px]">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse indicator for active calls */}
      {(status === "calling" || status === "in_progress") && (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-muted-foreground">
            {status === "calling" ? "Connecting..." : "Agent is on the call"}
          </span>
        </div>
      )}
    </motion.div>
  );
}
