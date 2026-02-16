"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Placeholder images from Figma
const DEFAULT_BG = "https://www.figma.com/api/mcp/asset/ef382b6c-7098-424f-b7bd-1d02274304fc";
const DEFAULT_THUMBNAIL = "https://www.figma.com/api/mcp/asset/0b4b77d8-bdd2-499f-96fe-62fec07a1809";

export function MusicComponent({ className }: { className?: string }) {
  const [mediaState, setMediaState] = useState<{
    hasMedia: boolean;
    isPlaying: boolean;
    type: 'video' | 'audio';
    title: string;
    artist?: string;
    thumbnail?: string;
    progress?: number; // 0-100
  } | null>(null);

  useEffect(() => {
    // Listen for updates from the extension (via content script)
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'AGENT0_MEDIA_UPDATE') return;
      setMediaState(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const sendControl = (command: string) => {
    window.postMessage({ type: 'AGENT0_SEND_MEDIA_CONTROL', command }, '*');
    if (command === 'play') setMediaState(s => s ? { ...s, isPlaying: true } : s);
    if (command === 'pause') setMediaState(s => s ? { ...s, isPlaying: false } : s);
  };

  const isPlaying = mediaState?.isPlaying || false;
  const artUrl = mediaState?.thumbnail || DEFAULT_THUMBNAIL;
  const bgUrl = mediaState?.thumbnail || DEFAULT_BG;
  const progress = mediaState?.progress || 65; // Default 65 for visual match if not provided

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative w-[280px] h-[120px] rounded-[32px] overflow-hidden select-none",
        "shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      {/* 1. Sharp Background Image (The "other removed image") */}
      <div className="absolute inset-0 z-0">
        <img 
          src={DEFAULT_BG} 
          alt="" 
          className="absolute h-[128%] w-[104%] left-[-2%] top-[-4%] max-w-none object-cover opacity-100" 
        />
        {/* Subtle overlay to help buttons pop */}
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
      </div>

      {/* 2. Dynamic Blur Overlay (Layered on top of sharp bg) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-[25px] scale-125 opacity-30 dark:opacity-20"
          style={{ backgroundImage: `url(${bgUrl})` }} 
        />
        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent dark:from-black/20 dark:to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full h-full p-4 flex items-center justify-between gap-4">
        
        {/* Controls Group: Next on Left, Play in Middle (to match layout in design image) */}
        <div className="flex items-center gap-3 pl-1">
          {/* Next Button with Progress Ring (Leftmost in design) */}
          <div className="relative group">
            {/* SVG Progress Ring */}
            <svg className="absolute -inset-1 w-14 h-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-black/10"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-black/80"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress / 100 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => sendControl('next')}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center relative",
                "bg-white/20 backdrop-blur-md border border-white/20 shadow-sm",
                "text-black/80 transition-colors"
              )}
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </motion.button>
          </div>

          {/* Play/Pause Button (Middle in design) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendControl(isPlaying ? 'pause' : 'play')}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-white/30 backdrop-blur-xl border border-white/20",
              "shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.4)]",
              "text-black/80 transition-colors"
            )}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Pause className="w-7 h-7 fill-current" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Play className="w-7 h-7 fill-current ml-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Album Art Container (Right side) */}
        <motion.div 
          className="relative w-[90px] h-[90px] mr-1"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Glass background for art frame */}
          <div className="absolute -inset-1 rounded-4xl bg-white/20 backdrop-blur-sm border border-white/30" />
          
          {/* Main Art */}
          <div className={cn(
            "relative w-full h-full rounded-4xl overflow-hidden shadow-xl",
            "border-2 border-black/10"
          )}>
            <motion.img 
              key={artUrl}
              src={artUrl}
              alt="Album Art"
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Equalizer (Bottom Right of art) */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-2 right-2 flex gap-0.5 items-end h-3 z-20"
              >
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] bg-white rounded-full shadow-sm"
                    animate={{ height: [4, 12, 6, 10, 4] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Media Info (Overlay bottom) */}
      {mediaState?.title && (
         <div className="absolute bottom-2 left-6 pointer-events-none group-hover:opacity-100 transition-opacity">
            <div className="text-[10px] font-bold text-black/70 truncate drop-shadow-sm">
              {mediaState.title}
            </div>
         </div>
      )}
    </motion.div>
  );
}
