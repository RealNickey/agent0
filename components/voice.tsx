"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MicIcon, SquareIcon, Radio, MapPinIcon, XIcon, Volume2Icon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { useTTS } from "@/hooks/use-tts";
import { useVoiceOverview } from "@/hooks/use-voice-overview";
import { getMessageTextContent } from "@/lib/chat-message-utils";
import { StripLargeDataChatTransport } from "@/lib/chat-transport";
import type { MyUIMessage } from "@/types/chat";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  addEventListener(type: "result", listener: (ev: Event) => void): void;
  addEventListener(type: "error", listener: (ev: Event) => void): void;
  addEventListener(type: "end", listener: (ev: Event) => void): void;
  removeEventListener(type: "result", listener: (ev: Event) => void): void;
  removeEventListener(type: "error", listener: (ev: Event) => void): void;
  removeEventListener(type: "end", listener: (ev: Event) => void): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function getSpeechRecognitionConstructor() {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function Voice({ className }: { className?: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  // Whether we're showing the location setup prompt for the overview
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const wasRecordingRef = useRef<boolean>(false);

  // Overview animation refs
  const overviewRafRef    = useRef<number | null>(null);
  const overviewTimeRef   = useRef<number>(0);
  const overviewLoadingRef = useRef(false);
  const overviewPlayingRef = useRef(false);

  const { isSpeaking, speak, stop: stopTTS } = useTTS();
  const {
    isLoading: overviewLoading,
    isPlaying: overviewPlaying,
    isPaused: overviewPaused,
    isCached: overviewCached,
    canReplay: overviewCanReplay,
    script: overviewScript,
    error: overviewError,
    location,
    currentTime: overviewCurrentTime,
    duration: overviewDuration,
    setLocation,
    playOverview,
    pauseOverview,
    resumeOverview,
    stopOverview,
    replayOverview,
    seekTo: overviewSeekTo,
  } = useVoiceOverview();
  // Keep refs in sync so animation callbacks can read them without stale closures
  overviewLoadingRef.current = overviewLoading;
  overviewPlayingRef.current = overviewPlaying;

  const { messages, sendMessage, status } = useChat<MyUIMessage>({
    transport: new StripLargeDataChatTransport({ api: "/api/chat" }),
    experimental_throttle: 50,
    onFinish: ({ message }) => {
      const text = getMessageTextContent(message);
      if (text.trim()) {
        speak(text);
      }
    },
  });

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantText = lastAssistantMessage ? getMessageTextContent(lastAssistantMessage) : "";

  const canUseMic = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined"
    );
  }, []);

  const stopAll = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;

      // Close in background; ignore errors
      void ctx.close().catch(() => undefined);
    }

    setIsRecording(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;

    if (!canvas || !wrapper || !analyser || !data) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;
    const nextCanvasWidth = Math.floor(width * dpr);
    const nextCanvasHeight = Math.floor(height * dpr);

    if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
      canvas.width = nextCanvasWidth;
      canvas.height = nextCanvasHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(wrapper);
    const bg = styles.backgroundColor;
    const dot = styles.color;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    analyser.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);

    // Dotted waveform rendering
    const centerY = height / 2;
    const dotRadius = 2;
    const dotStepX = 8;
    const dotStepY = 8;

    const cols = Math.max(8, Math.floor(width / dotStepX));
    const maxDots = Math.max(1, Math.floor((height / 2 - dotRadius) / dotStepY));

    ctx.fillStyle = dot;

    for (let col = 0; col < cols; col += 1) {
      const x = Math.floor((col + 0.5) * dotStepX);
      const sampleIndex = Math.floor((col / cols) * (data.length - 1));
      const normalized = (data[sampleIndex]! - 128) / 128;
      const amplitude = Math.abs(normalized);

      const level = clamp(Math.round(amplitude * maxDots), 0, maxDots);

      // Baseline dot
      ctx.beginPath();
      ctx.arc(x, centerY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = 1; j <= level; j += 1) {
        const yUp = centerY - j * dotStepY;
        const yDown = centerY + j * dotStepY;

        ctx.beginPath();
        ctx.arc(x, yUp, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, yDown, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // ── Overview wave: synthesized animation for loading / playing states ────────
  const drawOverviewWave = useCallback(() => {
    const canvas  = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect   = wrapper.getBoundingClientRect();
    const width  = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr    = typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;

    const nextW = Math.floor(width * dpr);
    const nextH = Math.floor(height * dpr);
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width        = nextW;
      canvas.height       = nextH;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const loading = overviewLoadingRef.current;
    // Dark background matching state color
    ctx.fillStyle = loading ? "rgb(6, 14, 32)" : "rgb(4, 12, 8)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = loading
      ? "rgba(99, 179, 237, 0.90)"   // sky-blue for loading
      : "rgba(52, 211, 153, 0.95)";  // emerald for playing

    const t       = overviewTimeRef.current;
    const centerY = height / 2;
    const dotR    = 2;
    const stepX   = 8;
    const stepY   = 8;
    const cols    = Math.max(8, Math.floor(width / stepX));
    const maxDots = Math.max(1, Math.floor((height / 2 - dotR) / stepY));

    for (let col = 0; col < cols; col++) {
      const x     = Math.floor((col + 0.5) * stepX);
      const xNorm = col / cols;
      const amp   = loading
        ? Math.abs(
            Math.sin(xNorm * Math.PI * 3.0 + t * 7.0) * 0.52 +
            Math.sin(xNorm * Math.PI * 1.5 - t * 5.0) * 0.25
          )
        : Math.abs(
            Math.sin(xNorm * Math.PI * 2.2 + t * 3.6) * 0.58 +
            Math.sin(xNorm * Math.PI * 3.5 - t * 2.6) * 0.26
          );

      const level = clamp(Math.round(amp * maxDots), 0, maxDots);

      ctx.beginPath();
      ctx.arc(x, centerY, dotR, 0, Math.PI * 2);
      ctx.fill();

      for (let j = 1; j <= level; j++) {
        ctx.beginPath();
        ctx.arc(x, centerY - j * stepY, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, centerY + j * stepY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  const start = useCallback(async () => {
    setErrorText(null);

    if (!canUseMic) {
      setErrorText("Microphone APIs are not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.fftSize);

      // Start speech recognition (optional)
      if (isSpeechRecognitionSupported()) {
        const Ctor = getSpeechRecognitionConstructor();
        if (Ctor) {
          const recognition = new Ctor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          finalTranscriptRef.current = "";

          const handleResult = (event: Event) => {
            const speechEvent = event as SpeechRecognitionEvent;
            let interim = "";
            let hasFinal = false;

            for (
              let i = speechEvent.resultIndex;
              i < speechEvent.results.length;
              i += 1
            ) {
              const result = speechEvent.results[i];
              const text = result[0]?.transcript ?? "";
              if (!text) continue;

              if (result.isFinal) {
                const needsSpace = finalTranscriptRef.current.length > 0;
                finalTranscriptRef.current += (needsSpace ? " " : "") + text;
                hasFinal = true;
              } else {
                interim += text;
              }
            }

            const combined = `${finalTranscriptRef.current}${interim ? ` ${interim}` : ""}`.trim();
            setTranscript(combined);

            // When a final transcript is ready, send it to the AI and stop recording
            if (hasFinal && finalTranscriptRef.current.trim()) {
              const textToSend = finalTranscriptRef.current.trim();
              finalTranscriptRef.current = "";
              setTranscript("");
              stopAll();
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: textToSend }],
              });
            }
          };

          const handleError = (event: Event) => {
            const err = event as SpeechRecognitionErrorEvent;
            // Don’t hard-fail recording; just surface the info.
            setErrorText(`Speech recognition error: ${err.error}`);
          };

          const handleEnd = () => {
            // If the user is still recording, don’t auto-restart; just stop updating transcript.
          };

          recognition.addEventListener("result", handleResult);
          recognition.addEventListener("error", handleError);
          recognition.addEventListener("end", handleEnd);

          recognitionRef.current = recognition;

          try {
            recognition.start();
          } catch {
            // ignore: recognition may fail depending on permissions
          }
        }
      }

      setIsRecording(true);
      rafRef.current = requestAnimationFrame(draw);
    } catch (error) {
      stopAll();
      const message =
        error instanceof Error ? error.message : "Failed to access microphone.";
      setErrorText(message);
    }
  }, [canUseMic, draw, stopAll]);

  const toggle = useCallback(() => {
    if (isRecording) {
      stopAll();
    } else {
      void start();
    }
  }, [isRecording, start, stopAll]);

  // Auto-stop mic when TTS starts speaking; auto-resume when TTS finishes
  useEffect(() => {
    if (isSpeaking) {
      if (isRecording) {
        wasRecordingRef.current = true;
        stopAll();
      }
    } else {
      if (wasRecordingRef.current) {
        wasRecordingRef.current = false;
        void start();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  useEffect(() => {
    return () => {
      stopAll();
      stopTTS();
      stopOverview();
      if (overviewRafRef.current != null) cancelAnimationFrame(overviewRafRef.current);
    };
  }, [stopAll, stopTTS, stopOverview]);

  // ── Overview animation loop ────────────────────────────────────────────────
  useEffect(() => {
    if (!overviewLoading && !overviewPlaying) {
      if (overviewRafRef.current != null) {
        cancelAnimationFrame(overviewRafRef.current);
        overviewRafRef.current = null;
      }
      return;
    }

    overviewTimeRef.current = 0;
    let lastTime = performance.now();
    const loop = (now: number) => {
      overviewTimeRef.current += (now - lastTime) / 1000;
      lastTime = now;
      drawOverviewWave();
      overviewRafRef.current = requestAnimationFrame(loop);
    };
    overviewRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (overviewRafRef.current != null) {
        cancelAnimationFrame(overviewRafRef.current);
        overviewRafRef.current = null;
      }
    };
  }, [overviewLoading, overviewPlaying, drawOverviewWave]);

  // Handler: play overview — prompt for location on first use
  const handlePlayOverview = useCallback(() => {
    if (!location.trim()) {
      setLocationInput("");
      setShowLocationPrompt(true);
    } else {
      void playOverview();
    }
  }, [location, playOverview]);

  // Handler: canvas click — toggles recording or overview play/pause
  const handleCanvasClick = useCallback(() => {
    if (isRecording)      { stopAll();        return; }
    if (overviewLoading)  { return; }
    if (overviewPlaying)  { pauseOverview();  return; }
    if (overviewPaused)   { resumeOverview(); return; }
    handlePlayOverview();
  }, [isRecording, overviewLoading, overviewPlaying, overviewPaused, stopAll, pauseOverview, resumeOverview, handlePlayOverview]);

  const handleLocationSubmit = useCallback(() => {
    const trimmed = locationInput.trim();
    if (!trimmed) return;
    setLocation(trimmed);
    setShowLocationPrompt(false);
    void playOverview();
  }, [locationInput, setLocation, playOverview]);

  return (
    <div className={cn("mx-auto w-full max-w-3xl px-4 py-10", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Voice</h1>
            <p className="text-sm text-muted-foreground">
              Play your daily briefing or use the mic to talk to the assistant.
            </p>
          </div>
          {location && (
            <button
              type="button"
              onClick={() => { setLocationInput(location); setShowLocationPrompt(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <MapPinIcon className="size-3" />
              {location}
            </button>
          )}
        </div>

        {/* Location prompt modal */}
        {showLocationPrompt && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPinIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Set your location for weather</span>
              </div>
              <button type="button" onClick={() => setShowLocationPrompt(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLocationSubmit(); }}
                placeholder="e.g. San Francisco, London, Tokyo"
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <Button type="button" size="sm" onClick={handleLocationSubmit} disabled={!locationInput.trim()}>
                Set
              </Button>
            </div>
          </div>
        )}

        {/* Waveform canvas */}
        <motion.div
          ref={wrapperRef}
          className={cn(
            "group relative overflow-hidden rounded-2xl cursor-pointer",
            "bg-foreground text-background",
            "border border-border"
          )}
          style={{ height: 180 }}
          onClick={handleCanvasClick}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <canvas ref={canvasRef} className="block" />

          {/* Animated state tint overlay */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              backgroundColor: overviewLoading
                ? "rgba(14,60,100,0.30)"
                : overviewPlaying
                  ? "rgba(10,60,40,0.30)"
                  : "rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {/* Hover hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="rounded-full bg-black/50 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/80 border border-white/10">
              {isRecording
                ? "Tap to stop recording"
                : overviewLoading
                  ? "Generating briefing…"
                  : overviewPlaying
                    ? "Tap to pause"
                    : overviewPaused
                      ? "Tap to resume"
                      : "Tap for daily briefing"}
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Overview controls */}
            {overviewLoading ? (
              <Button type="button" disabled className="gap-2">
                <div className="size-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                Generating…
              </Button>
            ) : overviewPlaying ? (
              <>
                <Button type="button" onClick={pauseOverview} variant="default" className="gap-2">
                  <PauseIcon className="size-4" /> Pause
                </Button>
                <Button type="button" onClick={stopOverview} variant="outline" size="icon" title="Stop">
                  <SquareIcon className="size-4" />
                </Button>
              </>
            ) : overviewPaused ? (
              <>
                <Button type="button" onClick={resumeOverview} variant="default" className="gap-2">
                  <PlayIcon className="size-4" /> Resume
                </Button>
                <Button type="button" onClick={stopOverview} variant="outline" size="icon" title="Stop">
                  <SquareIcon className="size-4" />
                </Button>
              </>
            ) : overviewCanReplay ? (
              <>
                <Button type="button" onClick={replayOverview} variant="default" className="gap-2">
                  <RotateCcwIcon className="size-4" /> Replay
                </Button>
                <Button type="button" onClick={handlePlayOverview} variant="outline" className="gap-2" title="Regenerate new briefing">
                  <Radio className="size-4" /> Regenerate
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handlePlayOverview} variant="default" className="gap-2">
                <Radio className="size-4" /> Play Overview
              </Button>
            )}

            {/* Mic button */}
            <Button
              onClick={toggle}
              type="button"
              variant="outline"
              disabled={overviewLoading || overviewPlaying || overviewPaused}
              className="gap-2"
            >
              {isRecording ? (
                <><SquareIcon className="size-4" /> Stop</>
              ) : (
                <><MicIcon className="size-4" /> Record</>
              )}
            </Button>

            {!canUseMic && (
              <span className="text-sm text-muted-foreground">
                Microphone not available in this environment.
              </span>
            )}
          </div>

          {/* Progress bar */}
          {(overviewPlaying || overviewPaused || (overviewCanReplay && overviewDuration > 0)) && overviewDuration > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0 text-right">
                {`${Math.floor(overviewCurrentTime / 60)}:${String(Math.floor(overviewCurrentTime % 60)).padStart(2, "0")}`}
              </span>
              <input
                type="range"
                min={0}
                max={overviewDuration}
                step={0.1}
                value={overviewCurrentTime}
                onChange={(e) => overviewSeekTo(Number(e.target.value))}
                className="flex-1 h-1 accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">
                {`${Math.floor(overviewDuration / 60)}:${String(Math.floor(overviewDuration % 60)).padStart(2, "0")}`}
              </span>
            </div>
          )}
        </div>

        {/* Errors */}
        {(errorText || overviewError) && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            {overviewError ?? errorText}
          </div>
        )}

        {/* Overview script */}
        {(overviewPlaying || overviewPaused || overviewCanReplay || overviewScript) && (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2Icon className="size-4 text-muted-foreground" />
                Daily Briefing
              </div>
              <div className="flex items-center gap-2">
                {overviewCached && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    cached
                  </span>
                )}
                {overviewPlaying && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    Playing
                  </span>
                )}
                {overviewPaused && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-yellow-500" />
                    Paused
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
              {overviewScript}
            </div>
          </div>
        )}

        {/* Voice transcript */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm font-medium mb-2">You</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words min-h-12">
            {transcript || "(no transcript yet)"}
          </div>
        </div>

        {/* Assistant reply */}
        {(lastAssistantText || status === "streaming" || status === "submitted") && (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Assistant</div>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopTTS}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Stop speaking
                </button>
              )}
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words min-h-12">
              {status === "submitted" && !lastAssistantText
                ? "Thinking…"
                : lastAssistantText || ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
