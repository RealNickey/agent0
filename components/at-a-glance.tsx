"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Dummy data – replace with real API calls when ready
// ---------------------------------------------------------------------------
const DUMMY_DATA = {
  location: "San Francisco, CA",
  weatherCondition: "Partly Cloudy",
  emailCount: 12,
  meetingCount: 3,
};

// ---------------------------------------------------------------------------
// Analog Clock
// ---------------------------------------------------------------------------
function AnalogClock() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;

      ctx.clearRect(0, 0, size, size);

      // Clock face
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      const hr = now.getHours() % 12;

      const toRad = (angle: number) => (angle - Math.PI / 2);

      const drawHand = (angle: number, length: number, width: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
      };

      // Hour hand
      const hrAngle = toRad(((hr + min / 60) / 12) * Math.PI * 2);
      drawHand(hrAngle, r * 0.5, 2.5, "rgba(255,255,255,0.95)");

      // Minute hand
      const minAngle = toRad(((min + sec / 60) / 60) * Math.PI * 2);
      drawHand(minAngle, r * 0.7, 2, "rgba(255,255,255,0.95)");

      // Second hand
      const secAngle = toRad((sec / 60) * Math.PI * 2);
      drawHand(secAngle, r * 0.75, 1, "rgba(252,165,165,0.95)");

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
    };

    draw();
    const id = setInterval(draw, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={44}
      height={44}
      className="inline-block align-middle"
      style={{ verticalAlign: "middle" }}
    />
  );
}

// ---------------------------------------------------------------------------
// SVG Placeholder (rounded-square container)
// ---------------------------------------------------------------------------
function IconPlaceholder({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg align-middle"
      style={{
        width: 40,
        height: 40,
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.25)",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
      title={label}
    >
      {children ?? (
        <span className="text-[10px] font-semibold text-white/60 leading-none">
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

// Gmail placeholder SVG
function GmailIcon() {
  return (
    <IconPlaceholder label="Gmail">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M2 6l10 7L22 6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8"/>
      </svg>
    </IconPlaceholder>
  );
}

// Teams placeholder SVG
function TeamsIcon() {
  return (
    <IconPlaceholder label="Teams">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="9" cy="8" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8"/>
        <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="17" cy="9" r="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
        <path d="M20 20c0-2.761-1.343-5-3-5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </IconPlaceholder>
  );
}

// Weather placeholder SVG
function WeatherIcon() {
  return (
    <IconPlaceholder label="Weather">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="12" cy="10" r="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8"/>
        <path d="M6 18c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 4V2M20 12h2M12 20v2M4 12H2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </IconPlaceholder>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getTimeString() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Framer-motion variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const lineVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

// ---------------------------------------------------------------------------
// Shared typography helpers
// ---------------------------------------------------------------------------
const muted = "text-white/60";
const vivid = "text-white font-bold";

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function AtAGlance() {
  const [timeString, setTimeString] = useState(getTimeString);
  const [dayName, setDayName] = useState(getDayName);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeString(getTimeString());
      setDayName(getDayName());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { location, weatherCondition, emailCount, meetingCount } = DUMMY_DATA;

  const textBase =
    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.15] tracking-tight";

  return (
    <motion.div
      className="flex flex-col gap-2 select-none"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Line 1: Happy [Day]! */}
      <motion.div
        variants={lineVariants}
        className={`${textBase} flex items-center gap-3`}
      >
        <span className={muted}>Happy</span>
        <span className={vivid}>{dayName}!</span>
      </motion.div>

      {/* Line 2: It's [Clock] [Time] and [WeatherIcon] [Condition] */}
      <motion.div
        variants={lineVariants}
        className={`${textBase} flex items-center gap-3 flex-wrap`}
      >
        <span className={muted}>It&apos;s</span>
        <AnalogClock />
        <span className={vivid}>{timeString}</span>
        <span className={muted}>and</span>
        <WeatherIcon />
        <span className={vivid}>{weatherCondition}</span>
      </motion.div>

      {/* Line 3: in [Location] */}
      <motion.div
        variants={lineVariants}
        className={`${textBase} flex items-center gap-3`}
      >
        <span className={muted}>in</span>
        <span className={vivid}>{location}</span>
      </motion.div>

      {/* Line 4: You got [GmailIcon] [Count] emails and have */}
      <motion.div
        variants={lineVariants}
        className={`${textBase} flex items-center gap-3 flex-wrap`}
      >
        <span className={muted}>You got</span>
        <GmailIcon />
        <span className={vivid}>{emailCount}</span>
        <span className={muted}>emails and have</span>
      </motion.div>

      {/* Line 5: [TeamsIcon] [Count] meetings today */}
      <motion.div
        variants={lineVariants}
        className={`${textBase} flex items-center gap-3`}
      >
        <TeamsIcon />
        <span className={vivid}>{meetingCount}</span>
        <span className={muted}>meetings today</span>
      </motion.div>
    </motion.div>
  );
}
