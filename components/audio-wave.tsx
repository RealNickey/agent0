"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useVoiceOverview } from "@/hooks/use-voice-overview";
import { MapPinIcon, XIcon } from "lucide-react";

// ─── Grid config ─────────────────────────────────────────────────────────────
const COLS = 25;
const ROWS = 24;
const DOT = 10; // px per cell (and dot diameter)

// ─── Types ────────────────────────────────────────────────────────────────────
type VisualState = "idle" | "loading" | "playing" | "error";

// ─── Per-state color palettes ─────────────────────────────────────────────────
const PALETTE: Record<VisualState, { on: string; off: string; tint: string }> = {
  idle: {
    on:   "rgba(255,255,255,0.92)",
    off:  "rgba(0,0,0,0.70)",
    tint: "rgba(255,255,255,0)",
  },
  loading: {
    on:   "rgba(99,179,237,0.90)",   // sky-blue
    off:  "rgba(8,18,32,0.75)",
    tint: "rgba(14,60,100,0.22)",
  },
  playing: {
    on:   "rgba(52,211,153,0.95)",   // emerald
    off:  "rgba(4,12,8,0.75)",
    tint: "rgba(10,60,40,0.22)",
  },
  error: {
    on:   "rgba(252,129,74,0.90)",   // orange
    off:  "rgba(20,5,5,0.75)",
    tint: "rgba(60,10,10,0.22)",
  },
};

// ─── Amplitude calculators per state ─────────────────────────────────────────

/** Idle: gentle multi-sine "resting" wave. */
function idleAmp(col: number, t: number): number {
  const x = col / COLS;
  return Math.abs(
    Math.sin(x * Math.PI * 2.2 + t * 1.8) * 0.40 +
    Math.sin(x * Math.PI * 3.5 - t * 1.2) * 0.25 +
    Math.sin(x * Math.PI * 1.3 + t * 0.7) * 0.20 +
    Math.sin(x * Math.PI * 5.0 - t * 2.5) * 0.10
  );
}

/** Loading: fast traveling pulse that sweeps left ↔ right. */
function loadingAmp(col: number, t: number): number {
  const x = col / COLS;
  return Math.abs(
    Math.sin(x * Math.PI * 3.0 + t * 7.0) * 0.55 +
    Math.sin(x * Math.PI * 1.5 - t * 5.0) * 0.22 +
    Math.sin(x * Math.PI * 6.0 + t * 9.0) * 0.10
  );
}

/** Playing: energetic, high-amplitude wave. */
function playingAmp(col: number, t: number): number {
  const x = col / COLS;
  return Math.abs(
    Math.sin(x * Math.PI * 2.2 + t * 3.6) * 0.60 +
    Math.sin(x * Math.PI * 3.5 - t * 2.6) * 0.28 +
    Math.sin(x * Math.PI * 1.3 + t * 1.5) * 0.18 +
    Math.sin(x * Math.PI * 5.0 - t * 5.2) * 0.12
  );
}

function getAmp(state: VisualState, col: number, t: number): number {
  if (state === "loading") return loadingAmp(col, t);
  if (state === "playing") return playingAmp(col, t);
  return idleAmp(col, t);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AudioWave({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const timeRef   = useRef<number>(0);
  const stateRef  = useRef<VisualState>("idle");
  const [isReady, setIsReady] = useState(false);

  // Voice overview hook
  const { isLoading, isPlaying, error, location, setLocation, playOverview, stopOverview } =
    useVoiceOverview();

  // Location prompt state (local to this widget)
  const [showPrompt, setShowPrompt]       = useState(false);
  const [locationInput, setLocationInput] = useState("");

  // Derive & expose visual state to the draw loop via ref (avoids stale closure)
  const visualState: VisualState = error ? "error" : isLoading ? "loading" : isPlaying ? "playing" : "idle";
  stateRef.current = visualState;

  // ── Canvas draw ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state   = stateRef.current;
    const palette = PALETTE[state];
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const centerY      = h / 2;
    const maxAmplitude = (ROWS / 2) * DOT * 0.88;
    const t            = timeRef.current;
    const offsetX      = (w - COLS * DOT) / 2 + DOT / 2;
    const offsetY      = (h - ROWS * DOT) / 2 + DOT / 2;

    for (let col = 0; col < COLS; col++) {
      const amp = getAmp(state, col, t) * maxAmplitude;
      for (let row = 0; row < ROWS; row++) {
        const cx            = offsetX + col * DOT + DOT / 2;
        const cy            = offsetY + row * DOT + DOT / 2;
        const distFromCenter = Math.abs(cy - centerY);
        ctx.beginPath();
        ctx.arc(cx, cy, DOT / 2, 0, Math.PI * 2);
        ctx.fillStyle = distFromCenter <= amp ? palette.on : palette.off;
        ctx.fill();
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr        = window.devicePixelRatio || 1;
    const containerW = COLS * DOT;
    const containerH = ROWS * DOT;
    canvas.width  = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width  = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    setIsReady(true);

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── Interaction ─────────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (showPrompt) return;
    if (isLoading) return;
    if (isPlaying) { stopOverview(); return; }
    if (!location.trim()) {
      setLocationInput("");
      setShowPrompt(true);
    } else {
      void playOverview();
    }
  }, [showPrompt, isLoading, isPlaying, location, playOverview, stopOverview]);

  const handleSubmit = useCallback(() => {
    const trimmed = locationInput.trim();
    if (!trimmed) return;
    setLocation(trimmed);
    setShowPrompt(false);
    void playOverview();
  }, [locationInput, setLocation, playOverview]);

  // ── Labels ──────────────────────────────────────────────────────────────────
  const pillLabel =
    isLoading ? "Generating briefing…"    :
    isPlaying ? "Playing · tap to stop"   :
    error     ? "Error · tap to retry"    : null;

  return (
    <motion.div
      className={cn(
        "group relative w-[306px] h-72 mx-auto flex items-center justify-center",
        "select-none rounded-[28px] overflow-hidden p-4 cursor-pointer",
        className
      )}
      style={{
        background:          "rgba(255,255,255,0.12)",
        backdropFilter:      "blur(40px) saturate(1.6)",
        WebkitBackdropFilter:"blur(40px) saturate(1.6)",
        border:              "1px solid rgba(255,255,255,0.25)",
        boxShadow:           "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)",
      }}
      onClick={handleClick}
      whileHover={{ scale: showPrompt ? 1 : 1.025 }}
      whileTap={  { scale: showPrompt ? 1 : 0.970 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      {/* ─── Animated state tint overlay ────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        animate={{ backgroundColor: PALETTE[visualState].tint }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      />

      {/* ─── Canvas ────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative w-full h-full rounded-[20px] flex items-center justify-center overflow-hidden"
        animate={{ opacity: showPrompt ? 0.25 : 1 }}
        transition={{ duration: 0.35 }}
      >
        <canvas
          ref={canvasRef}
          className={cn("transition-opacity duration-500", isReady ? "opacity-100" : "opacity-0")}
        />
      </motion.div>

      {/* ─── Playing / loading pill ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {pillLabel && !showPrompt && (
          <motion.div
            key={visualState}
            initial={{ opacity: 0, y: 10, scale: 0.88 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={   { opacity: 0, y: 10, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-medium text-white/90 border border-white/10 shadow-md">
              {isLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="size-2.5 rounded-full border border-white/25 border-t-white flex-shrink-0"
                />
              )}
              {isPlaying && (
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  className="size-2 rounded-full bg-emerald-400 flex-shrink-0"
                />
              )}
              {pillLabel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Idle hover hint (CSS group-hover so it doesn't conflict) ─────── */}
      {!pillLabel && !showPrompt && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="rounded-full bg-black/45 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-medium text-white/75 border border-white/10">
            Tap for daily briefing
          </div>
        </div>
      )}

      {/* ─── Location prompt overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, scale: 0.90 }}
            animate={{ opacity: 1, scale: 1    }}
            exit={   { opacity: 0, scale: 0.90 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[28px] bg-black/72 backdrop-blur-xl px-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <motion.button
              type="button"
              onClick={() => setShowPrompt(false)}
              whileHover={{ scale: 1.15 }}
              whileTap={{  scale: 0.90 }}
              className="absolute top-4 right-4 text-white/45 hover:text-white/90 transition-colors"
            >
              <XIcon className="size-4" />
            </motion.button>

            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y:  0, opacity: 1 }}
              transition={{ delay: 0.06 }}
              className="flex items-center gap-2 text-white/80"
            >
              <MapPinIcon className="size-4 flex-shrink-0" />
              <span className="text-sm font-medium">Your city for weather</span>
            </motion.div>

            <motion.input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setShowPrompt(false);
              }}
              placeholder="e.g. San Francisco"
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:ring-1 focus:ring-white/35 text-center"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.10 }}
            />

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!locationInput.trim()}
              className="w-full rounded-xl bg-white/18 hover:bg-white/28 disabled:opacity-35 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.14 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{   scale: 0.97 }}
            >
              Start Briefing
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}