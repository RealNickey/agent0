"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const weatherCondition = "Cloudy";
const locationName = "Canggu";
const emailCount = 27;
const meetingCount = 3;

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 0.61, 0.36, 1], staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } },
};

function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function AnalogClock({ date }: { date: Date }) {
  const { hourDeg, minuteDeg, secondDeg } = useMemo(() => {
    const seconds = date.getSeconds();
    const minutes = date.getMinutes() + seconds / 60;
    const hours = (date.getHours() % 12) + minutes / 60;
    return {
      hourDeg: hours * 30,
      minuteDeg: minutes * 6,
      secondDeg: seconds * 6,
    };
  }, [date]);

  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 align-middle">
      <span className="absolute inset-0 rounded-full border border-white/40 bg-white/8 backdrop-blur-[1px]" />
      <span
        className="absolute left-1/2 top-1/2 h-[22%] w-[2px] origin-bottom rounded-full bg-white"
        style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[30%] w-[2px] origin-bottom rounded-full bg-white"
        style={{ transform: `translate(-50%, -100%) rotate(${minuteDeg}deg)` }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[36%] w-[1px] origin-bottom rounded-full bg-white/80"
        style={{ transform: `translate(-50%, -100%) rotate(${secondDeg}deg)` }}
      />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
    </span>
  );
}

function IconPlaceholder({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/35 bg-white/12 text-xs font-semibold uppercase tracking-wide text-white align-middle">
      {label}
    </span>
  );
}

export default function GlancePage() {
  const now = useNow();
  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center px-6 py-10 text-white"
      style={{ backgroundImage: "url('/at-a-glance.jpg')" }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3 text-[clamp(28px,5vw,48px)] font-semibold leading-tight"
        style={{ textShadow: "0 8px 28px rgba(0,0,0,0.35)", fontFamily: "var(--font-geist-sans)" }}
      >
        <motion.div variants={itemVariants} className="flex items-baseline gap-3">
          <span className="text-white/60">Happy</span>
          <span>{day}!</span>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-baseline gap-3">
          <span className="text-white/60">It&apos;s</span>
          <AnalogClock date={now} />
          <span>{time}</span>
          <span className="text-white/60">and</span>
          <IconPlaceholder label="WX" />
          <span>{weatherCondition}</span>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-baseline gap-3">
          <span className="text-white/60">in</span>
          <span>{locationName}</span>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-baseline gap-3">
          <span className="text-white/60">You got</span>
          <IconPlaceholder label="GM" />
          <span>{emailCount}</span>
          <span>emails</span>
          <span className="text-white/60">and have</span>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-baseline gap-3">
          <IconPlaceholder label="TM" />
          <span>{meetingCount}</span>
          <span>meetings</span>
          <span className="text-white/60">today</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
