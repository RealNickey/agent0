"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { TreePine, Volume2, VolumeX, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type DashboardHeaderProps = {
  onRefresh?: () => void;
  isAudioPlaying?: boolean;
  onToggleAudio?: () => void;
};

export function DashboardHeader({
  onRefresh,
  isAudioPlaying = false,
  onToggleAudio,
}: DashboardHeaderProps) {
  // Use static values initially to avoid hydration mismatch
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    // Update immediately
    updateTime();

    // Then update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 lg:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
          <TreePine className="size-4" />
        </div>
        <span className="font-semibold text-sm">Agent0</span>
      </Link>

      <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
        <span>{dateStr}</span>
        <span className="font-mono">{timeStr}</span>
      </div>

      <div className="flex items-center gap-2">
        {onToggleAudio && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleAudio}
            className={cn(isAudioPlaying && "text-primary")}
          >
            {isAudioPlaying ? (
              <Volume2 className="size-4" />
            ) : (
              <VolumeX className="size-4" />
            )}
          </Button>
        )}

        {onRefresh && (
          <Button variant="ghost" size="icon-sm" onClick={onRefresh}>
            <RefreshCw className="size-4" />
          </Button>
        )}

        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
