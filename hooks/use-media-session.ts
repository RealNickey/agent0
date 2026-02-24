"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface MediaState {
  playing: boolean;
  currentTime: number;
  duration: number;
  title: string;
  artwork: string | null;
  tabId: number | null;
}

/**
 * Hook that bridges the Agent0 browser extension media detection
 * with the Web Media Session API and exposes controls + state.
 *
 * The extension's content script scans every tab for <video>/<audio>,
 * reports state via the background service worker which posts
 * `AGENT0_MEDIA_STATE` messages to the Agent0 window.
 *
 * Commands (`play`, `pause`, `next`, etc.) are posted back via
 * `AGENT0_MEDIA_COMMAND` and relayed by the extension to the
 * active media tab.
 */
export function useMediaSession() {
  const [mediaState, setMediaState] = useState<MediaState | null>(null);
  const [connected, setConnected] = useState(false);
  const lastStateRef = useRef<MediaState | null>(null);

  // Listen for AGENT0_MEDIA_STATE messages from the extension
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "AGENT0_MEDIA_STATE") return;
      const state: MediaState | null = event.data.state ?? null;
      lastStateRef.current = state;
      setMediaState(state);
      setConnected(true);

      // Update the Web Media Session API so the OS-level media controls work
      if (state && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: state.title || "Unknown",
          artist: "Agent0 Remote",
          artwork: state.artwork
            ? [{ src: state.artwork, sizes: "512x512", type: "image/png" }]
            : [],
        });
        navigator.mediaSession.playbackState = state.playing
          ? "playing"
          : "paused";
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Register Media Session API action handlers (OS media keys)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const actions: [MediaSessionAction, () => void][] = [
      ["play", () => sendCommand("play")],
      ["pause", () => sendCommand("pause")],
      ["nexttrack", () => sendCommand("next")],
      ["previoustrack", () => sendCommand("previous")],
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (_) {
        // Some browsers don't support all actions
      }
    }

    return () => {
      for (const [action] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send a media command to the extension via postMessage.
  // The content script on this page listens for 'AGENT0_MEDIA_COMMAND' messages
  // and relays them to the background service worker via chrome.runtime.sendMessage.
  const sendCommand = useCallback((command: string) => {
    window.postMessage({ type: "AGENT0_MEDIA_COMMAND", command }, "*");
  }, []);

  const togglePlay = useCallback(() => {
    sendCommand("togglePlay");
  }, [sendCommand]);

  const play = useCallback(() => sendCommand("play"), [sendCommand]);
  const pause = useCallback(() => sendCommand("pause"), [sendCommand]);
  const next = useCallback(() => sendCommand("next"), [sendCommand]);
  const previous = useCallback(() => sendCommand("previous"), [sendCommand]);

  return {
    mediaState,
    connected,
    togglePlay,
    play,
    pause,
    next,
    previous,
    sendCommand,
  };
}
