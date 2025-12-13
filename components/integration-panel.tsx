"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Weather } from "@/components/weather";
import { useEffect, useState } from "react";

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string | null;
}

export function IntegrationPanel({
  isOpen,
  onClose,
  integrationId,
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
              <h2 className="font-semibold text-lg">
                {integrationId === "weather" ? "Weather" : "Integration"}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {integrationId === "weather" && (
                <div className="space-y-4">
                  <Weather {...weatherData} />
                  
                  <div className="text-sm text-muted-foreground mt-4">
                    <p>Integration active. Weather data is simulated for demo purposes.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
