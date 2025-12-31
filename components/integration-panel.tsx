"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Weather } from "@/components/weather";
import { FocusModePanelContent, FocusSession } from "@/components/focus-mode/focus-mode-panel";
import { useEffect, useState, useCallback } from "react";

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string | null;
  focusSession?: FocusSession | null;
  onFocusSessionChange?: (session: FocusSession | null) => void;
}

export function IntegrationPanel({
  isOpen,
  onClose,
  integrationId,
  focusSession,
  onFocusSessionChange,
}: IntegrationPanelProps) {
  // Mock weather data state
  const [weatherData, setWeatherData] = useState({
    location: "San Francisco, CA",
    temperature: 72,
    temperatureUnit: "°F",
    apparentTemperature: 70,
    humidity: 45,
    windSpeed: 8,
    windSpeedUnit: "mph",
    weatherCode: 1, // Sunny/Cloudy
    weatherDescription: "Partly Cloudy",
  });

  // Extension connection state
  const [extensionConnected, setExtensionConnected] = useState(false);

  // Check for extension connection
  useEffect(() => {
    const checkExtension = () => {
      // Send a ping to check if extension is connected
      window.postMessage({ type: "AGENT0_PING" }, window.location.origin);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "AGENT0_PONG") {
        setExtensionConnected(true);
      }
    };

    window.addEventListener("message", handleMessage);
    checkExtension();

    // Re-check periodically
    const interval = setInterval(checkExtension, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, []);

  // Focus mode controls
  const handleStartSession = useCallback(
    (mode: string, duration?: number, taskName?: string) => {
      window.postMessage(
        {
          type: "AGENT0_FOCUS_COMMAND",
          command: {
            action: "start",
            mode,
            duration,
            taskName,
          },
        },
        window.location.origin
      );
    },
    []
  );

  const handlePauseSession = useCallback(() => {
    window.postMessage(
      {
        type: "AGENT0_FOCUS_COMMAND",
        command: { action: "pause" },
      },
      window.location.origin
    );
  }, []);

  const handleResumeSession = useCallback(() => {
    window.postMessage(
      {
        type: "AGENT0_FOCUS_COMMAND",
        command: { action: "resume" },
      },
      window.location.origin
    );
  }, []);

  const handleStopSession = useCallback(() => {
    window.postMessage(
      {
        type: "AGENT0_FOCUS_COMMAND",
        command: { action: "stop" },
      },
      window.location.origin
    );
  }, []);

  const getTitle = () => {
    switch (integrationId) {
      case "weather":
        return "Weather";
      case "focus-mode":
        return "Focus Mode";
      default:
        return "Integration";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-background border-l shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">{getTitle()}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {integrationId === "weather" && (
                <div className="space-y-4">
                  <Weather {...weatherData} />

                  <div className="text-sm text-muted-foreground mt-4">
                    <p>
                      Integration active. Weather data is simulated for demo
                      purposes.
                    </p>
                  </div>
                </div>
              )}

              {integrationId === "focus-mode" && (
                <FocusModePanelContent
                  session={focusSession ?? null}
                  onStartSession={handleStartSession}
                  onPauseSession={handlePauseSession}
                  onResumeSession={handleResumeSession}
                  onStopSession={handleStopSession}
                  extensionConnected={extensionConnected}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
