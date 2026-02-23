"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, SkipForward } from "lucide-react";

const imgRectangle172 = "https://www.figma.com/api/mcp/asset/8c754a08-3bfb-4981-9201-02735160afc9";
const imgImage113 = "https://www.figma.com/api/mcp/asset/956d6a9b-7fac-4360-90ae-f220acffab06";

export function MusicWidget({ className }: { className?: string }) {
  const [mediaState, setMediaState] = useState({
    isPlaying: false,
    title: 'No media playing',
    artist: '',
    artwork: '',
    isVideo: false,
    hasNext: false
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AGENT0_MEDIA_STATE') {
        setMediaState(event.data.state);
        
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: event.data.state.title || 'Unknown Title',
            artist: event.data.state.artist || 'Unknown Artist',
            artwork: event.data.state.artwork ? [{ src: event.data.state.artwork, sizes: '512x512', type: 'image/jpeg' }] : []
          });
          navigator.mediaSession.playbackState = event.data.state.isPlaying ? 'playing' : 'paused';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => sendCommand('play'));
      navigator.mediaSession.setActionHandler('pause', () => sendCommand('pause'));
      navigator.mediaSession.setActionHandler('nexttrack', () => sendCommand('next'));
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, []);

  const sendCommand = (command: string) => {
    window.postMessage({ type: 'AGENT0_MEDIA_COMMAND', command }, '*');
    if (command === 'play') setMediaState(s => ({ ...s, isPlaying: true }));
    if (command === 'pause') setMediaState(s => ({ ...s, isPlaying: false }));
  };

  const displayImg = mediaState.artwork || (mediaState.isVideo ? imgImage113 : imgRectangle172);

  return (
    <div className={className || "h-[112.615px] relative w-[247.437px]"} data-name="Music" data-node-id="460:216">
      <div className="absolute inset-0" data-node-id="290:134">
        <div className="absolute blur-[1.4px] border-3 border-[#fdefe4] border-solid inset-0 pointer-events-none rounded-[23.792px] shadow-[7px_9px_4.9px_0px_rgba(0,0,0,0.25)]" data-node-id="290:135">
          <div className="absolute inset-0 overflow-hidden rounded-[23.792px]">
            <img alt="" className="absolute h-[128.1%] left-[-1.81%] max-w-none top-[-3.63%] w-[103.65%] object-cover" src={imgRectangle172} />
          </div>
          <div className="absolute inset-[-3px] rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>
        
        {/* Play/Pause Button */}
        <button 
          onClick={() => sendCommand(mediaState.isPlaying ? 'pause' : 'play')}
          className="absolute top-[27.53%] left-[29.78%] w-[20.51%] h-[45.07%] flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors cursor-pointer z-10" 
          data-name="PlayPause"
        >
           {mediaState.isPlaying ? (
             <Pause className="w-8 h-8 text-white fill-white" />
           ) : (
             <Play className="w-8 h-8 text-white fill-white ml-1" />
           )}
        </button>

        {/* Next Button */}
        <button 
          onClick={() => sendCommand('next')}
          disabled={!mediaState.hasNext}
          className={`absolute top-[27.53%] left-[6.06%] w-[20.51%] h-[45.07%] flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm transition-colors z-10 ${mediaState.hasNext ? 'hover:bg-white/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          data-name="Next"
        >
            <SkipForward className="w-6 h-6 text-white fill-white" />
        </button>
      </div>

      {/* Album Art / Thumbnail */}
      <div className="absolute left-[58.2%] top-[16px] w-[82px] h-[82px]" data-name="Player" data-node-id="290:146">
        <div className="absolute inset-0 bg-[rgba(217,217,217,0.1)] border-[#d5edff] border-[1.5px] border-solid rounded-[15px] shadow-[5px_7px_4px_0px_rgba(0,0,0,0.25)]" data-node-id="290:147">
          <div className="absolute inset-[-1.5px] pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>
        <div className="absolute text-center w-[58px] h-[58px] left-[12px] top-[12px] rounded-[14px] overflow-hidden" data-name="image 113" data-node-id="290:148">
          <img alt="Media Thumbnail" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[14px] size-full" src={displayImg} />
        </div>
      </div>
      
      {/* Title Overlay (Optional, but good for UX) */}
      <div className="absolute bottom-2 left-4 right-[45%] text-xs text-white font-medium truncate drop-shadow-md z-10 pointer-events-none">
        {mediaState.title}
      </div>
    </div>
  );
}
