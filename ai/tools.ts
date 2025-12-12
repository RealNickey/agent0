import { tool } from "ai";
import { z } from "zod";

// Weather code mappings from Open-Meteo
const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
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

export function getWeatherDescription(code: number): string {
  return weatherCodeDescriptions[code] || "Unknown";
}

export const weatherTool = tool({
  description: "Get current weather for a location using Open-Meteo API",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    // Step 1: Geocoding - Get coordinates for location
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding API failed: ${geocodeResponse.statusText}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      return {
        error: true,
        message: `Location "${location}" not found`,
        location,
      };
    }
    
    const { latitude, longitude, name, country, admin1 } = geocodeData.results[0];
    const displayLocation = [name, admin1, country].filter(Boolean).join(", ");
    
    // Step 2: Weather - Get current weather for coordinates
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed: ${weatherResponse.statusText}`);
    }
    
    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    
    return {
      error: false,
      location: displayLocation,
      coordinates: { lat: latitude, lon: longitude },
      temperature: current.temperature_2m,
      temperatureUnit: weatherData.current_units.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windSpeedUnit: weatherData.current_units.wind_speed_10m,
      weatherCode: current.weather_code,
      weatherDescription: getWeatherDescription(current.weather_code),
    };
  },
});

export const tools = {
  displayWeather: weatherTool,
};
