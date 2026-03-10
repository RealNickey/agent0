"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import Image from "next/image";
import { motion, Variants, useMotionValue, useSpring } from "motion/react";

// ─── Custom Cursor & Magnetism ───────────────────────────────────────────────
const CursorContext = createContext({
  active: null as string | null,
  setActive: (_v: string | null) => {},
});

function CustomCursor() {
  const { active } = useContext(CursorContext);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  
  const cursorX = useSpring(mouseX, { stiffness: 800, damping: 35, mass: 0.2 });
  const cursorY = useSpring(mouseY, { stiffness: 800, damping: 35, mass: 0.2 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [mouseX, mouseY]);

  let label = "";
  if (active === "clock") label = "Current Time";
  else if (active === "weather") label = "Live Weather";
  else if (active === "temp") label = "Temperature";
  else if (active === "gmail") label = "Open Inbox";
  else if (active === "meet") label = "Join Meeting";

  const isActive = active !== null;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-9999 flex items-center justify-center rounded-full shadow-lg"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: "16px",
        translateY: "16px",
      }}
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 0.8,
        backgroundColor: "rgba(15, 23, 42, 0.85)", // slate-900 / 85%
        padding: isActive ? "6px 12px" : "0px",
        border: isActive ? "1px solid rgba(255, 255, 255, 0.2)" : "0px solid rgba(255, 255, 255, 0)",
        backdropFilter: "blur(8px)",
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <span className="text-white/90 text-sm font-medium tracking-tight whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}

function MagneticWrap({ children, id }: { children: React.ReactNode; id?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 20, mass: 0.5 });
  const { setActive } = useContext(CursorContext);
  
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouse = (e: React.MouseEvent<HTMLSpanElement>) => {
    const { clientX, clientY } = e;
    if (ref.current) {
      const { height, width, left, top } = ref.current.getBoundingClientRect();
      const middleX = clientX - (left + width / 2);
      const middleY = clientY - (top + height / 2);
      x.set(middleX * 0.3);
      y.set(middleY * 0.3);
    }
  };

  const reset = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
    setActive(null);
  };

  const handleMouseEnter = () => {
    scale.set(1.08); // Slight scale up
    if (id) setActive(id);
  };

  return (
    <motion.span
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onMouseEnter={handleMouseEnter}
      style={{ x: springX, y: springY, scale, display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}

// ─── Analog Clock ────────────────────────────────────────────────────────────
// Round to 3 decimal places to prevent floating-point serialization mismatches
// between SSR and client hydration.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function AnalogClock({ time }: { time: Date | null }) {
  const size = 78;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Liquid glass container with clock face color matching the image
  const wrap: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: "50%",
    // Light grayish-blue background from image
    background: "rgba(176, 196, 222, 0.9)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    border: "2.5px solid rgba(255, 255, 255, 0.6)",
    boxShadow:
      "inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.15)",
    flexShrink: 0,
    verticalAlign: "middle",
    overflow: "hidden",
  };

  // Pre-compute position for numbers (12, 3, 6, 9)
  const numbers = [
    { label: "12", angle: 0 },
    { label: "3", angle: 90 },
    { label: "6", angle: 180 },
    { label: "9", angle: 270 },
  ].map(({ label, angle }) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    // Position numbers slightly inset
    const tr = r - 11;
    return {
      label,
      x: r3(cx + tr * Math.cos(rad)),
      y: r3(cy + tr * Math.sin(rad) + 5), // +5 for vertical centering approximation
    };
  });

  // Pre-compute dots for other hours
  const dots = [1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
    const angle = hour * 30;
    const rad = ((angle - 90) * Math.PI) / 180;
    const tr = r - 11;
    return {
      key: hour,
      cx: r3(cx + tr * Math.cos(rad)),
      cy: r3(cy + tr * Math.sin(rad)),
    };
  });

  // Render static face if time is null
  if (!time) {
    return (
      <span style={wrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
          {/* Glass sheen highlight top */}
          <path d={`M ${cx - r * 0.7} ${cy - r * 0.7} Q ${cx} ${cy - r * 0.95} ${cx + r * 0.7} ${cy - r * 0.7}`} stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none" opacity="0.8" />
          
          {/* Hourly Red Dots */}
          {dots.map((d) => (
            <circle key={d.key} cx={d.cx} cy={d.cy} r="1.8" fill="#e55039" />
          ))}

          {/* Major Numbers */}
          {numbers.map(({ label, x, y }) => (
            <text key={label} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="900" fill="#1e272e" style={{ fontFamily: 'Arial, sans-serif' }}>{label}</text>
          ))}
          
          {/* Hands placeholder */}
           <line x1={cx} y1={cy} x2={cx + 12} y2={cy + 12} stroke="#2f3542" strokeWidth="3.5" strokeLinecap="round" />
           <circle cx={cx} cy={cy} r="3" fill="#2f3542" />
        </svg>
      </span>
    );
  }

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  // No seconds hand in the design reference

  const minuteDeg = minutes * 6;
  const hourDeg = hours * 30 + minutes * 0.5;

  const handX = (deg: number, len: number) =>
    r3(cx + len * Math.cos(((deg - 90) * Math.PI) / 180));
  const handY = (deg: number, len: number) =>
    r3(cy + len * Math.sin(((deg - 90) * Math.PI) / 180));

  return (
    <span style={wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        {/* Glass sheen highlight top-left */}
        <ellipse cx={cx} cy={cy * 0.5} rx={r * 0.6} ry={r * 0.25} fill="rgba(255,255,255,0.25)" transform={`rotate(-15 ${cx} ${cy * 0.5})`} />

        {/* Hourly Red Dots */}
        {dots.map((d) => (
          <circle key={d.key} cx={d.cx} cy={d.cy} r="2" fill="#eb4d4b" />
        ))}

        {/* Major Numbers */}
        {numbers.map(({ label, x, y }) => (
          <text key={label} x={x} y={y} textAnchor="middle" fontSize="12" fontWeight="800" fill="#130f40" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>{label}</text>
        ))}

        {/* Hour hand - Thick, Dark, Rounded */}
        <line
          x1={cx}
          y1={cy}
          x2={handX(hourDeg, r - 17)}
          y2={handY(hourDeg, r - 17)}
          stroke="#2f3542"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Minute hand - Thinner, Longer, Dark, Rounded */}
        <line
          x1={cx}
          y1={cy}
          x2={handX(minuteDeg, r - 9)}
          y2={handY(minuteDeg, r - 9)}
          stroke="#2f3542"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Centre dot */}
        <circle cx={cx} cy={cy} r="3" fill="#2f3542" />
      </svg>
    </span>
  );
}

// ─── Icon Placeholders ───────────────────────────────────────────────────────
function IconBox({
  children,
  size = 68,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 16,
        background: "rgba(255,255,255,0.25)",
        backdropFilter: "blur(8px)",
        border: "1.5px solid rgba(255,255,255,0.35)",
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}

// Gmail icon using the actual SVG asset
function GmailPlaceholder({ size = 68 }: { size?: number }) {
  const imgSize = Math.round(size * 0.58);
  return (
    <IconBox size={size}>
      <Image src="/gmail.svg" alt="Gmail" width={imgSize} height={imgSize} style={{ objectFit: "contain" }} />
    </IconBox>
  );
}

// Google Meet icon using the actual SVG asset
function MeetPlaceholder({ size = 68 }: { size?: number }) {
  const imgSize = Math.round(size * 0.6);
  return (
    <IconBox size={size}>
      <Image src="/meet.svg" alt="Google Meet" width={imgSize} height={imgSize} style={{ objectFit: "contain" }} />
    </IconBox>
  );
}

// Microsoft Teams icon placeholder
function TeamsPlaceholder({ size = 68 }: { size?: number }) {
  const imgSize = Math.round(size * 0.6);
  return (
    <IconBox size={size}>
      <Image src="/teams.svg" alt="Microsoft Teams" width={imgSize} height={imgSize} style={{ objectFit: "contain" }} />
    </IconBox>
  );
}

// ─── Weather helpers ─────────────────────────────────────────────────────────
/** Map a WMO weather code + time-of-day to one of the /public/weather/ images. */
function getWeatherImage(code: number, isNight: boolean, hour: number, isWindy: boolean): string {
  if (code >= 95) return "/weather/thunderstorm.png";
  if ((code >= 71 && code <= 77) || code >= 85) return "/weather/snowy.png";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "/weather/rainy.png";
  if (code >= 45 && code <= 48) return "/weather/cloudy.png";
  if (code >= 1 && code <= 3) return isWindy ? "/weather/windy.png" : "/weather/cloudy.png";
  // Code 0 – clear sky
  if (isWindy) return "/weather/windy.png";
  if (isNight) return "/weather/moon.png";
  if (hour >= 5 && hour <= 7) return "/weather/sunrise.png";
  if (hour >= 18 && hour <= 20) return "/weather/sunset.png";
  return "/weather/sunny.png";
}

/** Short human-readable label for a WMO weather code. */
function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzling";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showery";
  if (code <= 86) return "Snowing";
  return "Stormy";
}

// Weather icon using the actual PNG asset
function WeatherPlaceholder({ size = 68, src = "/weather/cloudy.png" }: { size?: number; src?: string }) {
  const radius = "1.05rem";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        background: "rgba(255,255,255,0.20)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1.5px solid rgba(255,255,255,0.35)",
        flexShrink: 0,
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <Image
        src={src}
        alt="Weather"
        width={size}
        height={size}
        style={{ objectFit: "cover", width: "100%", height: "100%" }}
      />
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── Animation Variants ──────────────────────────────────────────────────────
const container: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const lineVariant: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 30,
      mass: 0.8,
      staggerChildren: 0.08,
    },
  },
};

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
    }
  }
};

// ─── Typography helpers ───────────────────────────────────────────────────────
const muted = "text-white/60";
const vivid = "text-white";

// ─── Main Component ──────────────────────────────────────────────────────────
interface LiveWeather {
  temp: number;
  label: string;
  imageSrc: string;
  location: string;
}

export function AtAGlance({
  location = "Your City",
  weatherCondition = "Cloudy",
  emailCount = 0,
  meetingCount = 0,
}: {
  location?: string;
  weatherCondition?: string;
  emailCount?: number;
  meetingCount?: number;
}) {
  // Initialize as null so the server and first client render are identical,
  // avoiding the hydration mismatch caused by time-dependent SVG coordinates.
  const [time, setTime] = useState<Date | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);
  const [liveEmailCount, setLiveEmailCount] = useState<number | null>(null);
  const [liveMeetingCount, setLiveMeetingCount] = useState<number | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch live email + meeting counts
  useEffect(() => {
    fetch("/api/glance/summary")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setLiveEmailCount(data.emailCount);
          setLiveMeetingCount(data.meetingCount);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch current location weather from Open-Meteo
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          // Fetch weather first, as it's more reliable and important
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`
          );
          const wData = await weatherRes.json();

          if (wData.error || !wData.current) {
            throw new Error("Weather API error");
          }

          let city = location;
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const gData = await geoRes.json();
            city =
              gData.address?.city ??
              gData.address?.town ??
              gData.address?.village ??
              gData.address?.county ??
              location;
          } catch {
            // Ignore geocoding errors
          }

          const code: number = wData.current.weather_code;
          const isDay: boolean = wData.current.is_day === 1;
          const windSpeed: number = wData.current.wind_speed_10m ?? 0;
          const now = new Date();
          const hour = now.getHours();
          const isWindy = windSpeed > 40 && code <= 3;
          const imageSrc = getWeatherImage(code, !isDay, hour, isWindy);

          setLiveWeather({
            temp: Math.round(wData.current.temperature_2m),
            label: getWeatherLabel(code),
            imageSrc,
            location: city,
          });
        } catch {
          // Network error – fall back to prop values
        }
      },
      () => {
        // Permission denied – fall back to prop values
      }
    );
  }, [location]);

  const day = time ? DAYS[time.getDay()] : "";
  const formattedTime = time ? formatTime(time) : "";

  const displayCondition = liveWeather?.label ?? weatherCondition;
  const weatherImageSrc = liveWeather?.imageSrc ?? "/weather/cloudy.png";

  const lineClass =
    "flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 font-bold leading-tight";
  const textBase =
    "text-3xl sm:text-4xl md:text-6xl lg:text-7xl";

  const [cursorActive, setCursorActive] = useState<string | null>(null);

  return (
    <CursorContext.Provider value={{ active: cursorActive, setActive: setCursorActive }}>
      <CustomCursor />
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-3.5 px-6 text-center select-none"
      >
      {/* Line 1 – Happy [Day]! */}
      <motion.div variants={lineVariant} className={lineClass}>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>Happy</motion.span>
        <motion.span variants={wordVariant} className={`${vivid} ${textBase}`}>{day}!</motion.span>
      </motion.div>

      {/* Line 2 – It's [Clock] [Time] and [WeatherIcon] [Condition] */}
      <motion.div variants={lineVariant} className={lineClass}>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>It&apos;s</motion.span>
        <motion.span variants={wordVariant}><MagneticWrap id="clock"><AnalogClock time={time} /></MagneticWrap></motion.span>
        <motion.span variants={wordVariant} className={`${vivid} ${textBase}`}>{formattedTime}</motion.span>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>and</motion.span>
        <motion.span variants={wordVariant}><MagneticWrap id="weather"><WeatherPlaceholder size={68} src={weatherImageSrc} /></MagneticWrap></motion.span>
        {liveWeather && typeof liveWeather.temp === 'number' && !isNaN(liveWeather.temp) && (
          <MagneticWrap id="temp">
            <motion.span 
              initial={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="relative overflow-hidden inline-flex items-center justify-center px-4.5 py-1.5 rounded-2xl border border-slate-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-linear-to-br from-slate-700/60 to-slate-900/90 backdrop-blur-2xl"
            >
              {/* Grain / Noise overlay */}
              <span className="absolute inset-0 opacity-[0.2] mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></span>
              
              {/* Subtle top inner glow */}
              <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></span>
              
              <span className={`relative z-10 text-transparent bg-clip-text bg-linear-to-b from-white to-slate-400 text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter tabular-nums drop-shadow-md`}>
                {liveWeather.temp}°
              </span>
            </motion.span>
          </MagneticWrap>
        )}
        <motion.span variants={wordVariant} className={`${vivid} ${textBase}`}>{displayCondition}</motion.span>
      </motion.div>

      {/* Line 3 – You got [Gmail] [n] emails and have */}
      <motion.div variants={lineVariant} className={`${lineClass} mt-1.5`}>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>You got</motion.span>
        <motion.span variants={wordVariant}><MagneticWrap id="gmail"><GmailPlaceholder size={68} /></MagneticWrap></motion.span>
        <motion.span variants={wordVariant} className={`${vivid} ${textBase}`}>{liveEmailCount ?? emailCount} emails</motion.span>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>and have</motion.span>
      </motion.div>

      {/* Line 4 – [Meet] [n] meetings today */}
      <motion.div variants={lineVariant} className={lineClass}>
        <motion.span variants={wordVariant}><MagneticWrap id="meet"><MeetPlaceholder size={68} /></MagneticWrap></motion.span>
        <motion.span variants={wordVariant} className={`${vivid} ${textBase}`}>{liveMeetingCount ?? meetingCount} meetings</motion.span>
        <motion.span variants={wordVariant} className={`${muted} ${textBase}`}>today</motion.span>
      </motion.div>
    </motion.div>
    </CursorContext.Provider>
  );
}
