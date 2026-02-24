"use client";

import MusicComponent from "@/components/music-component";
import { useMediaSession } from "@/hooks/use-media-session";

export default function VideoPage() {
  const { mediaState, connected, togglePlay, next } = useMediaSession();

  const progress =
    mediaState && mediaState.duration > 0
      ? mediaState.currentTime / mediaState.duration
      : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <h1 className="text-2xl font-bold mb-8">Video &amp; Music Player</h1>
      <div className="grid gap-8">
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Music Component</h2>
          <MusicComponent
            isPlaying={mediaState?.playing ?? false}
            progress={progress}
            title={mediaState?.title ?? undefined}
            artwork={mediaState?.artwork ?? undefined}
            onTogglePlay={togglePlay}
            onNext={next}
          />
          {!connected && (
            <p className="text-xs text-muted-foreground mt-2">
              Waiting for Agent0 browser extension&hellip; Play media in another
              tab to connect.
            </p>
          )}
          {connected && !mediaState && (
            <p className="text-xs text-muted-foreground mt-2">
              No media detected. Play a video or song in another tab.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
