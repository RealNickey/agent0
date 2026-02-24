"use client";

import React from "react";

// ─── Figma assets (unchanged) ─────────────────────────────────────────────
const imgRectangle172 =
  "https://www.figma.com/api/mcp/asset/ce54cfaf-da91-4e4c-9319-7e9c3426cdcb";
const imgImage113 =
  "https://www.figma.com/api/mcp/asset/7b09573c-52de-4fe1-bf11-47eaa6060028";
const imgPlay =
  "https://www.figma.com/api/mcp/asset/08942ec8-806f-45d6-9e21-9cfb2026c2a8";
const imgPlay1 =
  "https://www.figma.com/api/mcp/asset/adc9e871-3b1c-4307-a457-7305a6cd5335";

// ─── Types ────────────────────────────────────────────────────────────────
export interface MusicComponentProps {
  className?: string;
  /** Is the remote media currently playing? */
  isPlaying?: boolean;
  /** 0-1 normalised progress of the current track */
  progress?: number;
  /** Currently-playing track title (shown as marquee) */
  title?: string;
  /** Album art URL from the remote tab */
  artwork?: string | null;
  /** Called when the user clicks the play/pause button */
  onTogglePlay?: () => void;
  /** Called when the user clicks the next button */
  onNext?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function MusicComponent({
  className,
  isPlaying = false,
  progress = 0,
  title,
  artwork,
  onTogglePlay,
  onNext,
}: MusicComponentProps) {
  // Clamp progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));

  // SVG circular progress maths  (fits around the Next button area)
  const circleRadius = 18;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - p * circumference;

  return (
    <div
      className={className || "h-[112.615px] relative w-[247.437px]"}
      data-name="Music"
      data-node-id="460:216"
    >
      {/* ── Background / card (unchanged layout) ── */}
      <div className="absolute contents inset-0" data-node-id="290:134">
        <div
          className="absolute blur-[1.4px] border-3 border-[#fdefe4] border-solid inset-0 pointer-events-none rounded-[23.792px] shadow-[7px_9px_4.9px_0px_rgba(0,0,0,0.25)]"
          data-node-id="290:135"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[23.792px]">
            <img
              alt=""
              className="absolute h-[128.1%] left-[-1.81%] max-w-none top-[-3.63%] w-[103.65%]"
              src={imgRectangle172}
            />
          </div>
          <div className="absolute inset-[-3px] rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>

        {/* ── Play / Pause button (unchanged position) ── */}
        <div
          className="absolute inset-[27.53%_49.71%_27.4%_29.78%] cursor-pointer hover:opacity-80 transition-opacity"
          data-name="Play"
          data-node-id="290:136"
          onClick={onTogglePlay}
          role="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onTogglePlay?.();
          }}
        >
          <div className="absolute inset-[0_-15.76%_-15.76%_0]">
            <img
              alt="Play"
              className="block max-w-none size-full"
              src={imgPlay}
              style={isPlaying ? { filter: "brightness(1.3)" } : undefined}
            />
          </div>
        </div>

        {/* ── Next button with circular progress ring ── */}
        <div
          className="absolute inset-[27.53%_73.43%_27.4%_6.06%] cursor-pointer hover:opacity-80 transition-opacity"
          data-name="Next"
          data-node-id="290:140"
          onClick={onNext}
          role="button"
          aria-label="Next"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onNext?.();
          }}
        >
          <div className="absolute inset-[0_-15.76%_-15.76%_0]">
            <img
              alt="Next"
              className="block max-w-none size-full"
              src={imgPlay1}
            />
          </div>

          {/* SVG circular progress overlay — absolutely positioned over the button */}
          {p > 0 && (
            <svg
              className="absolute inset-0 size-full pointer-events-none"
              viewBox="0 0 44 44"
              style={{ transform: "rotate(-90deg)" }}
            >
              {/* Track (faint ring) */}
              <circle
                cx="22"
                cy="22"
                r={circleRadius}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
              />
              {/* Progress arc */}
              <circle
                cx="22"
                cy="22"
                r={circleRadius}
                fill="none"
                stroke="#d5edff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
          )}
        </div>
      </div>

      {/* ── Album art container (unchanged layout) ── */}
      <div
        className="absolute contents left-[58.2%] right-[8.47%] top-[16px]"
        data-name="Player"
        data-node-id="290:146"
      >
        <div
          className="absolute aspect-[90/90] bg-[rgba(217,217,217,0.1)] border-[#d5edff] border-[1.5px] border-solid left-[58.2%] right-[8.47%] rounded-[15px] shadow-[5px_7px_4px_0px_rgba(0,0,0,0.25)] top-[16px]"
          data-node-id="290:147"
        >
          <div className="absolute inset-[-1.5px] pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
        </div>
        <div
          className="absolute aspect-[640/640] left-[60.54%] right-[10.82%] rounded-[14px] top-[21.81px]"
          data-name="image 113"
          data-node-id="290:148"
        >
          <img
            alt="Album Art"
            className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[14px] size-full"
            src={artwork || imgImage113}
          />
        </div>
      </div>

      {/* ── Title Marquee (overlaid at the bottom, non-intrusive) ── */}
      {title && (
        <div
          className="absolute bottom-[2px] left-[4%] right-[34%] overflow-hidden pointer-events-none"
          style={{ height: "16px" }}
        >
          <div
            className="whitespace-nowrap text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            style={{
              animation: "agent0-marquee 10s linear infinite",
            }}
          >
            {title}
          </div>
          <style>{`
            @keyframes agent0-marquee {
              0%   { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
