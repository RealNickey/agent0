"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface AnalogClockProps {
  size?: number;
}

export function AnalogClock({ size = 60 }: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate rotation angles
  const secondAngle = (seconds * 6) - 90; // 6 degrees per second, offset by 90 to start at top
  const minuteAngle = (minutes * 6 + seconds * 0.1) - 90; // 6 degrees per minute
  const hourAngle = (hours * 30 + minutes * 0.5) - 90; // 30 degrees per hour

  const center = size / 2;
  const radius = size / 2 - 4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="inline-block">
      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="rgba(255, 255, 255, 0.2)"
        stroke="white"
        strokeWidth="2"
      />

      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = center + (radius - 8) * Math.cos(angle);
        const y1 = center + (radius - 8) * Math.sin(angle);
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);

        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {/* Hour hand */}
      <motion.line
        x1={center}
        y1={center}
        x2={center + (radius * 0.5) * Math.cos(hourAngle * Math.PI / 180)}
        y2={center + (radius * 0.5) * Math.sin(hourAngle * Math.PI / 180)}
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        animate={{
          x2: center + (radius * 0.5) * Math.cos(hourAngle * Math.PI / 180),
          y2: center + (radius * 0.5) * Math.sin(hourAngle * Math.PI / 180),
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />

      {/* Minute hand */}
      <motion.line
        x1={center}
        y1={center}
        x2={center + (radius * 0.7) * Math.cos(minuteAngle * Math.PI / 180)}
        y2={center + (radius * 0.7) * Math.sin(minuteAngle * Math.PI / 180)}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{
          x2: center + (radius * 0.7) * Math.cos(minuteAngle * Math.PI / 180),
          y2: center + (radius * 0.7) * Math.sin(minuteAngle * Math.PI / 180),
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />

      {/* Second hand */}
      <motion.line
        x1={center}
        y1={center}
        x2={center + (radius * 0.8) * Math.cos(secondAngle * Math.PI / 180)}
        y2={center + (radius * 0.8) * Math.sin(secondAngle * Math.PI / 180)}
        stroke="rgba(255, 255, 255, 0.8)"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          x2: center + (radius * 0.8) * Math.cos(secondAngle * Math.PI / 180),
          y2: center + (radius * 0.8) * Math.sin(secondAngle * Math.PI / 180),
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />

      {/* Center dot */}
      <circle cx={center} cy={center} r="3" fill="white" />
    </svg>
  );
}
