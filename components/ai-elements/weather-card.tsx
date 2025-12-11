"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CloudIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudDrizzleIcon,
  CloudFogIcon,
  SunIcon,
  CloudSunIcon,
  ZapIcon,
  WindIcon,
  ThermometerIcon,
  DropletIcon,
  MapPinIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

export type WeatherData = {
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

export type WeatherCardProps = ComponentProps<typeof Card> & {
  data: WeatherData;
};

// Helper to get weather icon based on weather code
const getWeatherIcon = (code: number, className?: string) => {
  const iconClass = cn("size-16", className);
  
  if (code === 0) return <SunIcon className={iconClass} />;
  if (code >= 1 && code <= 3) return <CloudSunIcon className={iconClass} />;
  if (code >= 45 && code <= 48) return <CloudFogIcon className={iconClass} />;
  if (code >= 51 && code <= 55) return <CloudDrizzleIcon className={iconClass} />;
  if (code >= 61 && code <= 67) return <CloudRainIcon className={iconClass} />;
  if (code >= 71 && code <= 77) return <CloudSnowIcon className={iconClass} />;
  if (code >= 80 && code <= 82) return <CloudRainIcon className={iconClass} />;
  if (code >= 85 && code <= 86) return <CloudSnowIcon className={iconClass} />;
  if (code >= 95 && code <= 99) return <ZapIcon className={iconClass} />;
  
  return <CloudIcon className={iconClass} />;
};

// Helper to get background gradient based on weather
const getWeatherGradient = (code: number): string => {
  if (code === 0) return "from-blue-400 to-blue-600"; // Clear sky
  if (code >= 1 && code <= 2) return "from-blue-300 to-blue-500"; // Partly cloudy
  if (code === 3) return "from-gray-400 to-gray-600"; // Overcast
  if (code >= 45 && code <= 48) return "from-gray-300 to-gray-500"; // Fog
  if (code >= 51 && code <= 67) return "from-slate-400 to-slate-600"; // Rain
  if (code >= 71 && code <= 86) return "from-blue-200 to-blue-400"; // Snow
  if (code >= 95 && code <= 99) return "from-purple-500 to-purple-700"; // Thunderstorm
  
  return "from-sky-400 to-sky-600"; // Default
};

// Helper to get wind direction
const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

export function WeatherCard({ data, className, ...props }: WeatherCardProps) {
  if (data.error) {
    return (
      <Card
        className={cn(
          "not-prose w-full max-w-md overflow-hidden border-destructive/50 bg-destructive/10",
          className
        )}
        {...props}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <CloudIcon className="size-8" />
            <div>
              <h3 className="font-semibold text-lg">Weather Unavailable</h3>
              <p className="text-sm">{data.error}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const { current, units, location } = data;
  const gradient = getWeatherGradient(current.weather_code);

  return (
    <Card
      className={cn(
        "not-prose w-full max-w-md overflow-hidden border-none shadow-lg",
        className
      )}
      {...props}
    >
      {/* Header with gradient background */}
      <div className={cn("bg-gradient-to-br p-6 text-white", gradient)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPinIcon className="size-4" />
              <h3 className="font-semibold text-lg">{location}</h3>
            </div>
            <p className="text-white/90 text-sm capitalize">
              {current.weather_description}
            </p>
          </div>
          <div className="ml-4">
            {getWeatherIcon(current.weather_code, "size-20 drop-shadow-lg")}
          </div>
        </div>

        {/* Main temperature display */}
        <div className="mt-6">
          <div className="flex items-baseline gap-1">
            <span className="text-6xl font-bold tracking-tight">
              {Math.round(current.temperature)}
            </span>
            <span className="text-3xl font-light">{units.temperature}</span>
          </div>
          <p className="text-white/80 text-sm mt-1">
            Feels like {Math.round(current.feels_like)}{units.temperature}
          </p>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-2 gap-4 p-6 bg-muted/30">
        {/* Wind */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <WindIcon className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wind</p>
            <p className="font-semibold text-sm">
              {Math.round(current.wind_speed)} {units.wind_speed}
            </p>
            <p className="text-xs text-muted-foreground">
              {getWindDirection(current.wind_direction)}
            </p>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
            <DropletIcon className="size-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Humidity</p>
            <p className="font-semibold text-sm">
              {current.humidity}{units.humidity}
            </p>
          </div>
        </div>

        {/* Precipitation */}
        {current.precipitation > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-cyan-500/10">
              <CloudRainIcon className="size-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precipitation</p>
              <p className="font-semibold text-sm">
                {current.precipitation} {units.precipitation}
              </p>
            </div>
          </div>
        )}

        {/* Temperature detail */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10">
            <ThermometerIcon className="size-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Temperature</p>
            <p className="font-semibold text-sm">
              {current.temperature.toFixed(1)}{units.temperature}
            </p>
          </div>
        </div>
      </div>

      {/* Footer with timestamp */}
      <div className="border-t bg-muted/20 px-6 py-3">
        <p className="text-center text-xs text-muted-foreground">
          Updated: {new Date(current.time).toLocaleString()}
        </p>
      </div>
    </Card>
  );
}
