"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Video, Loader2, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  htmlLink: string;
  status: string;
}

interface ScheduleEvent {
  title: string;
  time: string;
  active?: boolean;
  isMeeting?: boolean;
  joinUrl?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()
    .replace(" ", "");
}

function getMeetingUrl(event: CalendarEvent): string | undefined {
  const location = event.location || "";
  const description = event.description || "";

  const meetPatterns = [
    /https?:\/\/meet\.google\.com\/[^\s"<>]+/,
    /https?:\/\/[a-z0-9.-]+\.zoom\.us\/[^\s"<>]+/,
    /https?:\/\/teams\.microsoft\.com\/[^\s"<>]+/,
    /https?:\/\/[^\s"<>]+/,
  ];

  for (const pattern of meetPatterns) {
    const match = (location + " " + description).match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

function isCurrentlyActive(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

function toScheduleEvent(event: CalendarEvent): ScheduleEvent {
  const timeStr = `${formatTime(event.start)} – ${formatTime(event.end)}`;
  const joinUrl = getMeetingUrl(event);
  return {
    title: event.summary,
    time: timeStr,
    active: isCurrentlyActive(event.start, event.end),
    isMeeting: !!joinUrl,
    joinUrl,
  };
}

interface TodayScheduleProps {
  className?: string;
}

export function TodaySchedule({ className }: TodayScheduleProps) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "empty" | "ready">("loading");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const params = new URLSearchParams({
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: "10",
        });

        const res = await fetch(`/api/calendar/events?${params}`);

        if (res.status === 401) {
          setStatus("unauthenticated");
          return;
        }

        if (!res.ok) {
          setStatus("empty");
          return;
        }

        const data = await res.json();
        const calEvents: CalendarEvent[] = data.events || [];

        if (calEvents.length === 0) {
          setStatus("empty");
          return;
        }

        setEvents(calEvents.map(toScheduleEvent));
        setStatus("ready");
      } catch {
        setStatus("empty");
      }
    }

    fetchTodayEvents();
  }, []);

  return (
    <div
      className={cn(
        "relative w-[306px] rounded-[28px] overflow-hidden p-5 pb-7",
        className
      )}
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)",
        minHeight: "420px",
      }}
    >
      {/* Header pill */}
      <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm rounded-[12px] px-3 py-2 w-fit mb-7 shadow-sm mx-auto">
        <CalendarDays
          className="w-[18px] h-[18px] shrink-0"
          style={{ color: "#322D31" }}
        />
        <span
          className="font-bold text-[20px] leading-none"
          style={{
            fontFamily: "'Alexandria', sans-serif",
            color: "#322D31",
          }}
        >
          Today&apos;s Schedule
        </span>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: "rgba(255,255,255,0.6)" }}
          />
          <p
            style={{
              fontFamily: "'Alexandria', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Loading schedule…
          </p>
        </div>
      )}

      {/* Not connected state */}
      {status === "unauthenticated" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
          <CalendarX
            className="w-7 h-7"
            style={{ color: "rgba(255,255,255,0.4)" }}
          />
          <p
            style={{
              fontFamily: "'Alexandria', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5,
            }}
          >
            Connect Google Calendar to see your schedule
          </p>
        </div>
      )}

      {/* Empty state */}
      {status === "empty" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <CalendarDays
            className="w-7 h-7"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
          <p
            style={{
              fontFamily: "'Alexandria', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            No events today
          </p>
        </div>
      )}

      {/* Timeline + Events */}
      {status === "ready" && (
        <div className="flex items-stretch gap-4 pl-1">
          {/* Vertical dashed timeline */}
          <div
            className="flex flex-col items-center"
            style={{ width: "20px", minWidth: "20px" }}
          >
            {events.map((event, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ flex: 1, minHeight: "68px" }}
              >
                {/* Ring marker */}
                <div className="relative flex items-center justify-center mt-[10px] shrink-0">
                  <div
                    className="w-[14px] h-[14px] rounded-full border-[2px]"
                    style={{
                      borderColor: event.active
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.4)",
                      backgroundColor: event.active
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                  {event.active && (
                    <div
                      className="absolute w-[6px] h-[6px] rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                    />
                  )}
                </div>

                {/* Dashed connector */}
                {i < events.length - 1 && (
                  <div
                    className="flex-1 mt-1"
                    style={{
                      width: "1px",
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 4px, transparent 4px, transparent 8px)",
                      minHeight: "16px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Event cards */}
          <div className="flex flex-col gap-[7px] flex-1">
            {events.map((event, i) => (
              <div
                key={i}
                className="rounded-[12px] px-3 py-[10px] transition-all duration-200"
                style={{
                  background:
                    hoveredIndex === i
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                  border: `1px solid ${hoveredIndex === i ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`,
                  boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-white font-normal leading-tight"
                    style={{
                      fontFamily: "'Alexandria', sans-serif",
                      fontSize: "15px",
                    }}
                  >
                    {event.title}
                  </p>

                  {/* Join button – visible on hover for meetings */}
                  {event.isMeeting && (
                    <a
                      href={event.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 flex items-center gap-1 rounded-[8px] px-2 py-1 transition-all duration-200"
                      style={{
                        background:
                          hoveredIndex === i
                            ? "rgba(255,255,255,0.2)"
                            : "transparent",
                        border: `1px solid ${hoveredIndex === i ? "rgba(255,255,255,0.35)" : "transparent"}`,
                        opacity: hoveredIndex === i ? 1 : 0,
                        pointerEvents: hoveredIndex === i ? "auto" : "none",
                        transform:
                          hoveredIndex === i
                            ? "translateY(0)"
                            : "translateY(2px)",
                      }}
                    >
                      <Video
                        className="w-[11px] h-[11px]"
                        style={{ color: "rgba(255,255,255,0.9)" }}
                      />
                      <span
                        style={{
                          fontFamily: "'Alexandria', sans-serif",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.9)",
                          fontWeight: 500,
                          lineHeight: 1,
                        }}
                      >
                        Join
                      </span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-[6px] mt-[5px]">
                  <div
                    className="rounded-full shrink-0"
                    style={{
                      width: "2px",
                      height: "13px",
                      backgroundColor: event.active
                        ? "#ef5536"
                        : "rgba(255,255,255,0.45)",
                    }}
                  />
                  <p
                    style={{
                      fontFamily: "'Alexandria', sans-serif",
                      fontSize: "10px",
                      color: "#fdefe4",
                      lineHeight: 1,
                    }}
                  >
                    {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
