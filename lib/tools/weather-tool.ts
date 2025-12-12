import { z } from "zod";
import type { ToolExtension } from "@/lib/tool-registry";

/**
 * Weather Tool
 * Fetches current weather information for a given location
 * Uses Open-Meteo API (free, no API key required)
 */
export const weatherTool: ToolExtension = {
  id: "weather",
  name: "Weather",
  description: "Use this tool to get real-time weather information for any location worldwide. Returns current temperature, weather conditions, humidity, wind speed, and feels-like temperature. Call this whenever a user asks about weather, temperature, or current conditions in a city or location.",
  icon: "🌤️",
  parameters: z.object({
    location: z.string().describe("The city name or location to get weather for (e.g., 'London', 'New York', 'Tokyo', 'Paris, France')"),
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
        return {
          error: true,
          message: `Location "${params.location}" not found`,
        };
      }
      
      const { latitude, longitude, name, country } = geoData.results[0];
      
      // Fetch weather data from Open-Meteo
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
      );
      
      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather data");
      }
      
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      
      // Map weather codes to descriptions
      const weatherDescriptions: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
      };
      
      return {
        location: `${name}, ${country}`,
        coordinates: { latitude, longitude },
        temperature: {
          current: current.temperature_2m,
          feelsLike: current.apparent_temperature,
          unit: "°C",
        },
        humidity: current.relative_humidity_2m,
        windSpeed: {
          value: current.wind_speed_10m,
          unit: "km/h",
        },
        description: weatherDescriptions[current.weather_code] || "Unknown",
        weatherCode: current.weather_code,
        timestamp: current.time,
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
