"use client";

import { cn } from "@/lib/utils";
import { Calendar, Clock, MapPin, Video, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  location?: string;
  isVideoCall?: boolean;
};

export type CalendarWidgetProps = {
  events: CalendarEvent[];
  onAddEvent?: () => void;
  className?: string;
};

export function CalendarWidget({
  events,
  onAddEvent,
  className,
}: CalendarWidgetProps) {
  const now = new Date();
  const currentHour = now.getHours();

  const isEventPast = (time: string) => {
    const eventHour = parseInt(time.split(":")[0], 10);
    const isPM = time.toLowerCase().includes("pm");
    const isAM = time.toLowerCase().includes("am");
    
    // Convert 12-hour format to 24-hour format
    let adjustedHour = eventHour;
    if (isPM && eventHour !== 12) {
      adjustedHour = eventHour + 12;
    } else if (isAM && eventHour === 12) {
      adjustedHour = 0; // 12 AM is midnight (0 hours)
    }
    
    return adjustedHour < currentHour;
  };

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Today&apos;s Schedule</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAddEvent}
          className="gap-1"
        >
          <Plus className="size-3" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[280px]">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events scheduled for today
          </p>
        ) : (
          events.map((event) => {
            const isPast = isEventPast(event.time);
            return (
              <div
                key={event.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg border bg-background transition-colors hover:bg-accent/30",
                  isPast && "opacity-50"
                )}
              >
                <div className="flex flex-col items-center pt-0.5">
                  <div className={cn(
                    "size-2 rounded-full",
                    isPast ? "bg-muted-foreground" : "bg-primary"
                  )} />
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">
                    {event.title}
                  </span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {event.time}
                      {event.endTime && ` - ${event.endTime}`}
                    </span>
                    {event.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />
                        {event.location}
                      </span>
                    )}
                    {event.isVideoCall && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Video className="size-3" />
                        Video call
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
