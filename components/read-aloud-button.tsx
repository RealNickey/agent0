"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Volume2, Pause, Square, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpeechState = "idle" | "playing" | "paused";

interface ReadAloudButtonProps {
  text: string;
  className?: string;
}

export function ReadAloudButton({ text, className }: ReadAloudButtonProps) {
  const [state, setState] = useState<SpeechState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    
    return () => {
      // Cleanup: stop speech when component unmounts
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Clean text for speech
  const cleanTextForSpeech = useCallback((rawText: string) => {
    return rawText
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove italic markers
      .replace(/`/g, "") // Remove code markers
      .replace(/#{1,6}\s/g, "") // Remove heading markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to just text
      .replace(/```[\s\S]*?```/g, "code block") // Replace code blocks
      .replace(/\n{2,}/g, ". ") // Replace multiple newlines with pause
      .replace(/\n/g, " ") // Replace single newlines with space
      .trim();
  }, []);

  const speak = useCallback(() => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to get a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => 
        voice.lang.startsWith("en") && 
        (voice.name.includes("Google") || voice.name.includes("Natural") || voice.name.includes("Microsoft"))
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
  }, [isSupported, text, cleanTextForSpeech]);

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

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled
              className={className}
            >
              <VolumeX className="size-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Text-to-speech not supported</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === "idle") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={speak}
              className={className}
            >
              <Volume2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Read aloud</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Playing or Paused state - show control buttons
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={state === "playing" ? pause : resume}
              className="text-primary"
            >
              {state === "playing" ? (
                <Pause className="size-3.5" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{state === "playing" ? "Pause" : "Resume"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={stop}
              className="text-destructive hover:text-destructive"
            >
              <Square className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
