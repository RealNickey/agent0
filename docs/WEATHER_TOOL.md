# Weather Tool with Generative UI

## Overview

This implementation adds a weather tool to the Agent0 chat application that demonstrates **Generative UI** - the ability for the LLM to generate not just text, but rich, interactive UI components.

## Features

### Weather Tool (`lib/weather-tool.ts`)

The weather tool integrates with the Open-Meteo API (free, no API key required) to fetch real-time weather data:

- **Geocoding**: Converts location names to coordinates
- **Weather Data**: Fetches current temperature, humidity, wind speed, precipitation, and weather conditions
- **Weather Codes**: Maps WMO weather codes to human-readable descriptions

#### Usage

The AI assistant can call this tool when users ask about weather:

```
User: "What's the weather in Tokyo?"
AI: [Calls weather tool] -> [Displays WeatherCard component]
```

### Generative UI Component (`components/ai-elements/weather-card.tsx`)

The `WeatherCard` component is a beautiful, responsive weather display that replaces traditional JSON output:

#### Features

- **Dynamic Gradients**: Background colors adapt to weather conditions (sunny, cloudy, rainy, snowy)
- **Weather Icons**: Context-aware icons from lucide-react
- **Comprehensive Data**: Temperature, feels-like, humidity, wind speed/direction, precipitation
- **Visual Hierarchy**: Large temperature display with supporting details
- **Error Handling**: Graceful error states for failed API calls

#### Visual Design

- Gradient header with weather icon
- Large temperature display (60px font)
- Grid layout for weather metrics
- Icon-based data presentation
- Timestamp footer

## Integration

### API Route (`app/api/chat/route.ts`)

The weather tool is registered alongside Google's native tools:

```typescript
if (enableWeather) {
  tools.weather = weatherTool;
}
```

### Message Rendering (`components/ai-elements/message-list.tsx`)

Special rendering logic detects weather tool invocations and renders the WeatherCard:

```typescript
if (toolInvocation.toolName === "weather" && toolInvocation.state === "result") {
  return <WeatherCard data={toolInvocation.result} />;
}
```

Other tools continue to use the default collapsible Tool component.

### Feature Badge

A cyan "Weather" badge appears in the feature badges row to indicate the capability is enabled.

## Technical Details

### API Integration

- **Geocoding API**: `https://geocoding-api.open-meteo.com/v1/search`
- **Weather API**: `https://api.open-meteo.com/v1/forecast`
- **No Authentication Required**: Open-Meteo provides free access

### Weather Codes

The implementation maps WMO weather codes (0-99) to descriptions:

- `0`: Clear sky
- `1-3`: Partly cloudy to overcast
- `45-48`: Fog
- `51-67`: Drizzle and rain
- `71-86`: Snow
- `95-99`: Thunderstorms

### TypeScript Types

The `WeatherData` type defines the structure:

```typescript
type WeatherData = {
  location: string;
  coordinates?: { latitude: number; longitude: number };
  timezone?: string;
  current: {
    time: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    precipitation: number;
    weather_code: number;
    weather_description: string;
    wind_speed: number;
    wind_direction: number;
  };
  units: {
    temperature: string;
    wind_speed: string;
    precipitation: string;
    humidity: string;
  };
  error?: string;
};
```

## Example Queries

Users can ask questions like:

- "What's the weather in London?"
- "Show me the current weather in San Francisco"
- "How's the temperature in Tokyo right now?"
- "Is it raining in Seattle?"

## Benefits of Generative UI

### Before (Traditional JSON Output)
```json
{
  "location": "San Francisco, US",
  "temperature": 18.5,
  "humidity": 72,
  ...
}
```

### After (Generative UI)
A beautiful, colorful card with:
- Visual weather representation
- Easy-to-read temperature
- Intuitive icons for metrics
- Context-aware color scheme

This creates a more engaging, AI-native experience where the model can choose to present information in the most appropriate format for the user's needs.

## Future Enhancements

Potential improvements:

1. **Forecast Data**: 5-day or 7-day forecasts
2. **Multiple Locations**: Compare weather across cities
3. **Weather Alerts**: Severe weather warnings
4. **Historical Data**: Weather trends and comparisons
5. **Interactive Elements**: Click to see hourly breakdown
6. **Animations**: Animated weather conditions (rain, snow, etc.)
7. **Dark/Light Mode**: Adapt gradients for theme
8. **Units Toggle**: Celsius/Fahrenheit, km/h/mph switching

## Testing

To test the weather tool:

1. Start the development server: `npm run dev`
2. Ask about weather in any major city
3. Observe the WeatherCard component rendering
4. Try various weather conditions (sunny, rainy, snowy locations)
5. Test error handling with invalid locations

## Dependencies

- `ai`: Vercel AI SDK for tool definition
- `zod`: Schema validation for tool parameters
- `lucide-react`: Weather and metric icons
- `@/components/ui/card`: shadcn/ui Card component
- Open-Meteo API: Weather data provider
