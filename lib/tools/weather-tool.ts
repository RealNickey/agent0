import { z } from "zod";
import type { ToolExtension } from "@/lib/tool-registry";

/**
 * Weather Tool (Generative UI Pattern)
 * Fetches current weather information for a given location
 * Uses Open-Meteo API (free, no API key required)
 * Returns data matching the Weather component props
 */
export const weatherTool: ToolExtension = {
  id: "displayWeather",
  name: "Weather",
  description: "Display the weather for a location",
  icon: "🌤️",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async (params: { location: string }) => {
    try {
      // First, geocode the location using Open-Meteo's geocoding API
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.location)}&count=1&language=en&format=json`
      );
      
      if (!geoResponse.ok) {
        throw new Error("Failed to geocode location");
      }
      
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`Location "${params.location}" not found`);
      }
      
      const { latitude, longitude, name, country } = geoData.results[0];
      
      // Fetch weather data from Open-Meteo
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      );
      
      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather data");
      }
      
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      
      // Map weather codes to simple descriptions matching Vercel example
      const weatherDescriptions: Record<number, string> = {
        0: "Sunny", // Clear sky
        1: "Sunny", // Mainly clear
        2: "Cloudy", // Partly cloudy
        3: "Cloudy", // Overcast
        45: "Foggy",
        48: "Foggy",
        51: "Rainy",
        53: "Rainy",
        55: "Rainy",
        61: "Rainy",
        63: "Rainy",
        65: "Rainy",
        71: "Snowy",
        73: "Snowy",
        75: "Snowy",
        77: "Snowy",
        80: "Rainy",
        81: "Rainy",
        82: "Rainy",
        85: "Snowy",
        86: "Snowy",
        95: "Stormy",
        96: "Stormy",
        99: "Stormy",
      };
      
      // Return data matching Weather component props exactly
      return {
        weather: weatherDescriptions[current.weather_code] || "Unknown",
        temperature: Math.round(current.temperature_2m),
        location: `${name}, ${country}`,
      };
    } catch (error) {
      console.error("Weather tool error:", error);
      return {
        error: true,
        message: error instanceof Error ? error.message : "Failed to fetch weather",
      };
    }
  },
};
