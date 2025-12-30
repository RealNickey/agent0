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

// Focus Mode Tool
export const focusModeTool = tool({
  description: `Control a real, interactive focus/work timer overlay in the user's browser.

**IMPORTANT**: Use this tool (NOT code execution) when the user wants to:
- Start a focus session, work session, or concentration timer
- Use Pomodoro technique (25min work + 5min break cycles)
- Set a countdown timer for work/study
- Start a Flowtime session (work until naturally ready for break)
- Track focused work time
- Need help staying focused or avoiding distractions

Three modes available:
- pomodoro: Classic 25-minute work sessions with automatic 5-minute breaks
- flowtime: Work without time limits, break duration adapts to work time
- countdown: Custom duration timer (1-180 minutes)

This creates an actual draggable timer overlay (press Ctrl+Shift+F to view) with notifications when sessions complete. Much better than code-based timers!`,
  inputSchema: z.object({
    action: z
      .enum(['start', 'pause', 'resume', 'stop', 'status'])
      .describe('Action: start (new session), pause, resume, stop, or status'),
    mode: z
      .enum(['pomodoro', 'flowtime', 'countdown'])
      .optional()
      .describe('Focus mode (required for start): pomodoro, flowtime, or countdown'),
    duration: z
      .number()
      .min(1)
      .max(180)
      .optional()
      .describe('Duration in minutes (required for countdown mode only, 1-180)'),
    taskName: z
      .string()
      .optional()
      .describe('Optional task name/description'),
  }),
  execute: async ({ action, mode, duration, taskName }) => {
    // Validate parameters
    if (action === 'start') {
      if (!mode) {
        return {
          success: false,
          message: 'Mode is required for start action. Choose: pomodoro, flowtime, or countdown',
        };
      }
      
      if (mode === 'countdown' && !duration) {
        return {
          success: false,
          message: 'Duration (in minutes) is required for countdown mode',
        };
      }
      
      if (mode === 'countdown' && duration && (duration < 1 || duration > 180)) {
        return {
          success: false,
          message: 'Duration must be between 1 and 180 minutes',
        };
      }
    }
    
    // Generate user-friendly message
    let message = '';
    switch (action) {
      case 'start':
        if (mode === 'pomodoro') {
          message = `Starting Pomodoro focus session (25 minutes work, 5 minutes break)${taskName ? ` for: ${taskName}` : ''}`;
        } else if (mode === 'flowtime') {
          message = `Starting Flowtime session (work until you're ready for a break)${taskName ? ` for: ${taskName}` : ''}`;
        } else if (mode === 'countdown') {
          message = `Starting ${duration}-minute focus session${taskName ? ` for: ${taskName}` : ''}`;
        }
        break;
      case 'pause':
        message = 'Pausing your focus session';
        break;
      case 'resume':
        message = 'Resuming your focus session';
        break;
      case 'stop':
        message = 'Stopping your focus session';
        break;
      case 'status':
        message = 'Checking focus session status';
        break;
    }
    
    // Return the command data - client will handle execution via tool-call rendering
    return {
      success: true,
      message,
      action,
      mode: mode || null,
      duration: duration || null,
      taskName: taskName || null,
    };
  },
});

export const tools = {
  displayWeather: weatherTool,
  focusMode: focusModeTool,
};
