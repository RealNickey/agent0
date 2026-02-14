"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipForward } from "lucide-react";

// Figma Assets
const imgRectangle172 = "https://www.figma.com/api/mcp/asset/ef382b6c-7098-424f-b7bd-1d02274304fc";
const defaultThumbnail = "https://www.figma.com/api/mcp/asset/0b4b77d8-bdd2-499f-96fe-62fec07a1809"; // Default / Video placeholder
const audioThumbnail = "https://placehold.co/600x600/1e1e1e/FFF.png?text=Audio"; // Fallback for audio

export function MusicComponent({ className }: { className?: string }) {
  const [mediaState, setMediaState] = useState<{
    hasMedia: boolean;
    isPlaying: boolean;
    type: 'video' | 'audio';
    title: string;
  } | null>(null);

  useEffect(() => {
    // Listen for updates from the extension (via content script)
    const handler = (event: MessageEvent) => {
      // Security: ensure message is from same window (relayed by content script)
      if (event.source !== window || !event.data || event.data.type !== 'AGENT0_MEDIA_UPDATE') return;
      
      console.log("MusicComponent received update:", event.data.data);
      setMediaState(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const sendControl = (command: string) => {
    // Send to content script, which relays to background, which relays to active tab
    window.postMessage({ type: 'AGENT0_SEND_MEDIA_CONTROL', command }, '*');
    
    // Optimistic update
    if (command === 'play') setMediaState(s => s ? { ...s, isPlaying: true } : s);
    if (command === 'pause') setMediaState(s => s ? { ...s, isPlaying: false } : s);
  };

  const isPlaying = mediaState?.isPlaying || false;
  const hasMedia = mediaState?.hasMedia || false;
  const isVideo = mediaState?.type === 'video';

  // Determine thumbnail
  const currentThumbnail = hasMedia && !isVideo ? audioThumbnail : defaultThumbnail;

  return (
    <div className={cn("h-[112.615px] relative w-[247.437px]", className)} data-name="Music" data-node-id="460:216">
      <div className="absolute contents inset-0" data-node-id="290:134">
        {/* Background Card */}
        <div className="absolute blur-[1.4px] border-3 border-[#fdefe4] border-solid inset-0 pointer-events-none rounded-[23.792px] shadow-[7px_9px_4.9px_0px_rgba(0,0,0,0.25)]" data-node-id="290:135">
          <div className="absolute inset-0 overflow-hidden rounded-[23.792px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="absolute h-[128.1%] left-[-1.81%] max-w-none top-[-3.63%] w-[103.65%]" src={imgRectangle172} />
          </div>
          <div className="absolute inset-[-3px] rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>

        {/* Play/Pause Button */}
        <div 
          className="absolute inset-[27.53%_49.71%_27.4%_29.78%] cursor-pointer active:scale-95 transition-transform z-10 flex items-center justify-center" 
          onClick={() => sendControl(isPlaying ? 'pause' : 'play')}
          data-name="Play" 
          data-node-id="290:136"
        >
           {isPlaying ? (
             <Pause className="w-8 h-8 text-black/80 fill-current" />
           ) : (
             <Play className="w-8 h-8 text-black/80 fill-current ml-1" />
           )}
        </div>

        {/* Next Button */}
        <div 
            className={cn(
                "absolute inset-[27.53%_73.43%_27.4%_6.06%] flex items-center justify-center z-10 transition-transform", 
                (!hasMedia) ? "opacity-30 cursor-not-allowed" : "cursor-pointer active:scale-95"
            )}
            onClick={() => hasMedia && sendControl('next')}
            data-name="Next" 
            data-node-id="290:140"
        >
             <SkipForward className="w-8 h-8 text-black/80 fill-current" />
        </div>
      </div>

      {/* Media Status / Title */}
      {mediaState?.title && (
        <div className="absolute -top-6 left-0 right-0 text-xs text-center text-gray-500 font-medium truncate px-2">
             {mediaState.title}
        </div>
      )}

      {/* Thumbnail Player */}
      <div className="absolute contents left-[58.2%] right-[8.47%] top-[16px]" data-name="Player" data-node-id="290:146">
        <div className="absolute aspect-[90/90] bg-[rgba(217,217,217,0.1)] border-[#d5edff] border-[1.5px] border-solid left-[58.2%] right-[8.47%] rounded-[15px] shadow-[5px_7px_4px_0px_rgba(0,0,0,0.25)] top-[16px]" data-node-id="290:147">
          <div className="absolute inset-[-1.5px] pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>
        <div className="absolute aspect-[640/640] left-[60.54%] right-[10.82%] rounded-[14px] top-[21.81px]" data-name="image 113" data-node-id="290:148">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            alt="Media Thumbnail" 
            className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[14px] size-full" 
            src={currentThumbnail} 
          />
        </div>
      </div>
    </div>
  );
}
