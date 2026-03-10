"use client";

import { useCallback, useRef, useState } from "react";

const OVERVIEW_LOCATION_KEY = "agent0-overview-location";
const OVERVIEW_CACHE_KEY = "agent0-overview-cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedOverview {
  audio: string;
  mimeType: string;
  script: string;
  timestamp: number;
  location: string;
}

function loadCache(): CachedOverview | null {
  try {
    const raw = localStorage.getItem(OVERVIEW_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedOverview;
  } catch {
    return null;
  }
}

function saveCache(data: CachedOverview): void {
  try {
    localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or private browsing; silently skip
  }
}

export interface UseVoiceOverviewReturn {
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isCached: boolean;
  canReplay: boolean;
  script: string | null;
  error: string | null;
  location: string;
  currentTime: number;
  duration: number;
  setLocation: (loc: string) => void;
  playOverview: () => Promise<void>;
  pauseOverview: () => void;
  resumeOverview: () => void;
  stopOverview: () => void;
  replayOverview: () => void;
  seekTo: (time: number) => void;
}

export function useVoiceOverview(): UseVoiceOverviewReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [canReplay, setCanReplay] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [location, setLocationState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(OVERVIEW_LOCATION_KEY) ?? "";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  // Keep audio data in memory so replay works after stop without re-fetching
  const cachedAudioDataRef = useRef<{ audio: string; mimeType: string } | null>(null);

  const setLocation = useCallback((loc: string) => {
    setLocationState(loc);
    if (typeof window !== "undefined") localStorage.setItem(OVERVIEW_LOCATION_KEY, loc);
  }, []);

  const makeAudioUrl = useCallback((base64: string, mimeType: string): string => {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  }, []);

  const attachListeners = useCallback((audio: HTMLAudioElement) => {
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.ondurationchange = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      // Keep audioRef and blobUrlRef alive so replayOverview can reuse them
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setError("Audio playback failed.");
    };
  }, []);

  const destroyAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.ondurationchange = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const stopOverview = useCallback(() => {
    destroyAudio();
    // canReplay stays true as long as we still have audio data in memory
    setCanReplay(cachedAudioDataRef.current !== null);
  }, [destroyAudio]);

  const pauseOverview = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, [isPlaying]);

  const resumeOverview = useCallback(() => {
    if (audioRef.current && isPaused) {
      void audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPaused]);

  const replayOverview = useCallback(() => {
    setError(null);

    // Case 1: audio element still loaded (just ended or was paused+stopped)
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Case 2: audio data in memory (after stopOverview)
    const data = cachedAudioDataRef.current;
    if (data) {
      const url = makeAudioUrl(data.audio, data.mimeType);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      attachListeners(audio);
      setIsPlaying(true);
      setIsPaused(false);
      void audio.play();
      return;
    }

    // Case 3: fall back to localStorage cache (survives page refresh)
    const cached = loadCache();
    if (cached && cached.location === location && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      cachedAudioDataRef.current = { audio: cached.audio, mimeType: cached.mimeType };
      setScript(cached.script);
      setIsCached(true);
      const url = makeAudioUrl(cached.audio, cached.mimeType);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      attachListeners(audio);
      setIsPlaying(true);
      setIsPaused(false);
      void audio.play();
    }
  }, [location, makeAudioUrl, attachListeners]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const playOverview = useCallback(async () => {
    if (!location.trim()) return;
    if (isLoading) return;

    destroyAudio();
    setError(null);

    // Check localStorage cache first
    const cached = loadCache();
    if (cached && cached.location === location && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      cachedAudioDataRef.current = { audio: cached.audio, mimeType: cached.mimeType };
      setScript(cached.script);
      setIsCached(true);
      setCanReplay(true);
      const url = makeAudioUrl(cached.audio, cached.mimeType);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      attachListeners(audio);
      setIsPlaying(true);
      await audio.play();
      return;
    }

    // No fresh cache — generate fresh
    setIsCached(false);
    setCanReplay(false);
    setScript(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/voice/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Request failed: ${res.statusText}`);
      }

      const data = await res.json() as { audio: string; mimeType: string; script: string };

      setScript(data.script);

      // Persist to localStorage (valid for 6 h)
      saveCache({ audio: data.audio, mimeType: data.mimeType, script: data.script, timestamp: Date.now(), location });
      // Keep in memory for replay after stop
      cachedAudioDataRef.current = { audio: data.audio, mimeType: data.mimeType };

      const url = makeAudioUrl(data.audio, data.mimeType);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      attachListeners(audio);

      setIsLoading(false);
      setIsPlaying(true);
      setCanReplay(true);
      await audio.play();
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
      setCanReplay(false);
      setError(err instanceof Error ? err.message : "Failed to generate overview.");
    }
  }, [location, isLoading, destroyAudio, makeAudioUrl, attachListeners]);

  return {
    isLoading, isPlaying, isPaused, isCached, canReplay,
    script, error, location, currentTime, duration,
    setLocation, playOverview, pauseOverview, resumeOverview, stopOverview, replayOverview, seekTo,
  };
}
