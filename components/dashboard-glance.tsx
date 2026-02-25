"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AnalogClock } from "@/components/analog-clock";

export function DashboardGlance() {
  const [currentDay, setCurrentDay] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  // Dummy data - will be replaced with real data later
  const weatherCondition = "Sunny";
  const location = "San Francisco";
  const emailCount = 12;
  const meetingsCount = 3;

  useEffect(() => {
    setMounted(true);

    const updateDateTime = () => {
      const now = new Date();

      // Get day of week
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setCurrentDay(days[now.getDay()]);

      // Get time in 12-hour format
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const timeString = `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
      setCurrentTime(timeString);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1,
      }}
      className="text-center"
    >
      {/* Line 1: Happy [Current Day]! */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4"
      >
        <span className="text-white/60">Happy </span>
        <span className="text-white">{currentDay}</span>
        <span className="text-white">!</span>
      </motion.div>

      {/* Line 2: It's [Clock] [Time] and [Weather Icon] [Condition] */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 flex items-center justify-center gap-3"
      >
        <span className="text-white/60">It&apos;s</span>
        <div className="inline-flex items-center">
          <AnalogClock size={60} />
        </div>
        <span className="text-white">{currentTime}</span>
        <span className="text-white/60">and</span>
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-lg">
          <span className="text-2xl">☀️</span>
        </div>
        <span className="text-white">{weatherCondition}</span>
      </motion.div>

      {/* Line 3: in [Location] */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
      >
        <span className="text-white/60">in </span>
        <span className="text-white">{location}</span>
      </motion.div>

      {/* Line 4: You got [Gmail Icon] [Count] emails and have */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 flex items-center justify-center gap-3"
      >
        <span className="text-white/60">You got</span>
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-lg">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white">
            <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 10L16 18L28 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-white">{emailCount}</span>
        <span className="text-white/60">emails and have</span>
      </motion.div>

      {/* Line 5: [Teams Icon] [Count] meetings today */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold flex items-center justify-center gap-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-lg">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white">
            <rect x="6" y="10" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="17" r="2" fill="currentColor"/>
            <circle cx="20" cy="17" r="2" fill="currentColor"/>
            <path d="M10 6L16 10L22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-white">{meetingsCount}</span>
        <span className="text-white/60">meetings</span>
        <span className="text-white/60">today</span>
      </motion.div>
    </motion.div>
  );
}
