"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type SpeechState = "idle" | "playing" | "paused";

export function useTextToSpeech() {
  const [state, setState] = useState<SpeechState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef<string>("");

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean the text - remove markdown formatting for better speech
    const cleanText = text
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove italic markers
      .replace(/`/g, "") // Remove code markers
      .replace(/#{1,6}\s/g, "") // Remove heading markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to just text
      .replace(/```[\s\S]*?```/g, "code block") // Replace code blocks
      .replace(/\n{2,}/g, ". ") // Replace multiple newlines with pause
      .replace(/\n/g, " ") // Replace single newlines with space
      .trim();

    textRef.current = cleanText;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a good quality voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => 
        voice.lang.startsWith("en") && 
        (voice.name.includes("Google") || voice.name.includes("Natural") || voice.name.includes("Premium"))
    ) || voices.find((voice) => voice.lang.startsWith("en"));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setState("playing");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");
    utterance.onpause = () => setState("paused");
    utterance.onresume = () => setState("playing");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setState("paused");
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setState("playing");
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setState("idle");
  }, [isSupported]);

  const toggle = useCallback((text: string) => {
    if (state === "idle") {
      speak(text);
    } else if (state === "playing") {
      pause();
    } else if (state === "paused") {
      resume();
    }
  }, [state, speak, pause, resume]);

  return {
    state,
    isSupported,
    speak,
    pause,
    resume,
    stop,
    toggle,
  };
}
