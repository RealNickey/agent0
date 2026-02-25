"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

// --- Dummy data ---
const DUMMY_DATA = {
  location: "San Francisco, CA",
  weather: "Sunny",
  emailCount: 12,
  meetingCount: 3,
};

// --- Helpers ---
function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getTimeString(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// --- Analog Clock ---
function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className="inline-block align-middle"
      aria-label="Analog clock"
    >
      {/* Face */}
      <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" />
      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = (deg - 90) * (Math.PI / 180);
        const x1 = 16 + 12 * Math.cos(rad);
        const y1 = 16 + 12 * Math.sin(rad);
        const x2 = 16 + 14 * Math.cos(rad);
        const y2 = 16 + 14 * Math.sin(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="16"
        y1="16"
        x2={16 + 7 * Math.cos(((hourDeg - 90) * Math.PI) / 180)}
        y2={16 + 7 * Math.sin(((hourDeg - 90) * Math.PI) / 180)}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="16"
        y1="16"
        x2={16 + 10 * Math.cos(((minuteDeg - 90) * Math.PI) / 180)}
        y2={16 + 10 * Math.sin(((minuteDeg - 90) * Math.PI) / 180)}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1="16"
        y1="16"
        x2={16 + 11 * Math.cos(((secondDeg - 90) * Math.PI) / 180)}
        y2={16 + 11 * Math.sin(((secondDeg - 90) * Math.PI) / 180)}
        stroke="rgba(255,180,100,0.9)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="16" cy="16" r="1.5" fill="white" />
    </svg>
  );
}

// --- Icon Placeholders ---
function IconPlaceholder({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center align-middle rounded-lg bg-white/20 border border-white/30 text-white/80 text-xs font-semibold"
      style={{ width: 36, height: 36, minWidth: 36 }}
      title={label}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

// --- Animation variants ---
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.1,
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

// --- Typography helpers ---
const muted = "text-white/60 font-medium";
const vibrant = "text-white font-bold";

// --- Main Component ---
export function AtAGlance() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const day = getDayName();
  const timeStr = getTimeString(time);

  return (
    <motion.div
      className="flex flex-col gap-3 select-none"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}
    >
      {/* Line 1: Happy [Day]! */}
      <motion.div
        variants={lineVariants}
        className="flex items-baseline gap-2 text-5xl sm:text-6xl lg:text-7xl leading-tight"
      >
        <span className={muted}>Happy</span>
        <span className={vibrant}>{day}!</span>
      </motion.div>

      {/* Line 2: It's [Clock] [Time] and [Weather Icon] [Condition] */}
      <motion.div
        variants={lineVariants}
        className="flex items-center gap-2 text-4xl sm:text-5xl lg:text-6xl leading-tight flex-wrap"
      >
        <span className={muted}>It&apos;s</span>
        <AnalogClock />
        <span className={vibrant}>{timeStr}</span>
        <span className={muted}>and</span>
        <IconPlaceholder label="Weather" />
        <span className={vibrant}>{DUMMY_DATA.weather}</span>
      </motion.div>

      {/* Line 3: in [Location] */}
      <motion.div
        variants={lineVariants}
        className="flex items-baseline gap-2 text-4xl sm:text-5xl lg:text-6xl leading-tight"
      >
        <span className={muted}>in</span>
        <span className={vibrant}>{DUMMY_DATA.location}</span>
      </motion.div>

      {/* Line 4: You got [Gmail Icon] [Count] emails and have */}
      <motion.div
        variants={lineVariants}
        className="flex items-center gap-2 text-3xl sm:text-4xl lg:text-5xl leading-tight flex-wrap"
      >
        <span className={muted}>You got</span>
        <IconPlaceholder label="Gmail" />
        <span className={vibrant}>{DUMMY_DATA.emailCount}</span>
        <span className={muted}>emails and have</span>
      </motion.div>

      {/* Line 5: [Teams Icon] [Count] meetings today */}
      <motion.div
        variants={lineVariants}
        className="flex items-center gap-2 text-3xl sm:text-4xl lg:text-5xl leading-tight"
      >
        <IconPlaceholder label="Teams" />
        <span className={vibrant}>{DUMMY_DATA.meetingCount}</span>
        <span className={muted}>meetings today</span>
      </motion.div>
    </motion.div>
  );
}
