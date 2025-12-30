"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Weather } from "@/components/weather";
import { WordCount, analyzeContent } from "@/components/word-count";
import { useMemo } from "react";
import type { MyUIMessage } from "@/types/chat";
import { getMessageTextContent } from "@/lib/chat-message-utils";

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string | null;
  messages?: MyUIMessage[];
}

export function IntegrationPanel({
  isOpen,
  onClose,
  integrationId,
  messages = [],
}: IntegrationPanelProps) {
  // Mock weather data state
  const weatherData = {
    location: "San Francisco, CA",
    temperature: 72,
    temperatureUnit: "°F",
    apparentTemperature: 70,
    humidity: 45,
    windSpeed: 8,
    windSpeedUnit: "mph",
    weatherCode: 1, // Sunny/Cloudy
    weatherDescription: "Partly Cloudy",
  };

  // Calculate word count stats from AI messages
  const wordCountStats = useMemo(() => {
    // Get all assistant messages and extract their text content
    const aiMessages = messages.filter((msg) => msg.role === "assistant");
    const allText = aiMessages.map((msg) => getMessageTextContent(msg)).join("\n\n");
    return analyzeContent(allText);
  }, [messages]);

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
                {integrationId === "weather" 
                  ? "Weather" 
                  : integrationId === "word-count"
                  ? "Word Count"
                  : "Integration"}
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

              {integrationId === "word-count" && (
                <div className="space-y-4">
                  <WordCount {...wordCountStats} />
                  
                  {messages.filter((m) => m.role === "assistant").length === 0 && (
                    <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
                      <p>No AI-generated content yet. Start a conversation to see word count statistics.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
