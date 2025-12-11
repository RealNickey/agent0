import { tool } from "ai";
import { z } from "zod";

// Weather tool that fetches weather data using Open-Meteo API (free, no API key required)
export const weatherTool = tool({
  description:
    "Get current weather information for a specific location. Provides temperature, weather conditions, wind speed, and other meteorological data.",
  parameters: z.object({
    location: z
      .string()
      .describe("The city name or location to get weather for (e.g., 'San Francisco', 'London', 'Tokyo')"),
  }),
  // TODO: AI SDK v5 tool() has complex type inference that requires explicit typing
  // The execute function is correctly typed but TypeScript struggles with the inference
  // @ts-expect-error - TypeScript cannot infer execute return type from tool definition
  execute: async (args: { location: string }) => {
    const { location } = args;
    try {
      // First, geocode the location to get coordinates
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        return {
          error: `Failed to geocode location: ${location}`,
          location,
        };
      }

      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        return {
          error: `Location not found: ${location}`,
          location,
        };
      }

      const place = geocodeData.results[0];
      const { latitude, longitude, name, country, timezone } = place;

      // Get current weather data
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=${encodeURIComponent(timezone)}`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        return {
          error: "Failed to fetch weather data",
          location,
        };
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

      const weatherCode = current.weather_code;
      const weatherDescription = weatherDescriptions[weatherCode] || "Unknown";

      return {
        location: `${name}, ${country}`,
        coordinates: { latitude, longitude },
        timezone,
        current: {
          time: current.time,
          temperature: current.temperature_2m,
          feels_like: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation,
          weather_code: weatherCode,
          weather_description: weatherDescription,
          wind_speed: current.wind_speed_10m,
          wind_direction: current.wind_direction_10m,
        },
        units: {
          temperature: "°C",
          wind_speed: "km/h",
          precipitation: "mm",
          humidity: "%",
        },
      };
    } catch (error) {
      return {
        error: `Failed to fetch weather data: ${error instanceof Error ? error.message : "Unknown error"}`,
        location,
      };
    }
  },
});
