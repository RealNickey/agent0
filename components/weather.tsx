"use client";

import { cn } from "@/lib/utils";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
} from "lucide-react";

interface WeatherProps {
  location: string;
  temperature: number;
  temperatureUnit: string;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windSpeedUnit: string;
  weatherCode: number;
  weatherDescription: string;
  error?: boolean;
  message?: string;
}

function getWeatherIcon(code: number) {
  // WMO Weather interpretation codes
  if (code === 0) return <Sun className="h-12 w-12 text-yellow-400" />;
  if (code >= 1 && code <= 3) return <Cloud className="h-12 w-12 text-gray-400" />;
  if (code >= 45 && code <= 48) return <CloudFog className="h-12 w-12 text-gray-500" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className="h-12 w-12 text-blue-300" />;
  if (code >= 61 && code <= 67) return <CloudRain className="h-12 w-12 text-blue-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="h-12 w-12 text-blue-200" />;
  if (code >= 80 && code <= 82) return <CloudRain className="h-12 w-12 text-blue-600" />;
  if (code >= 85 && code <= 86) return <CloudSnow className="h-12 w-12 text-blue-100" />;
  if (code >= 95 && code <= 99) return <CloudLightning className="h-12 w-12 text-purple-500" />;
  return <Sun className="h-12 w-12 text-yellow-400" />;
}

export function Weather({
  location,
  temperature,
  temperatureUnit,
  apparentTemperature,
  humidity,
  windSpeed,
  windSpeedUnit,
  weatherCode,
  weatherDescription,
  error,
  message,
}: WeatherProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 my-2">
        <p className="text-red-600 dark:text-red-400 text-sm">{message || "Could not fetch weather"}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-blue-50 to-sky-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm hover:shadow-md transition-shadow"
    )}>
      {/* Header with location */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          {location}
        </h3>
      </div>

      {/* Main weather display */}
      <div className="flex items-center justify-between gap-4">
        {/* Icon and condition */}
        <div className="flex flex-col items-center gap-1">
          {getWeatherIcon(weatherCode)}
          <span className="text-xs text-slate-600 dark:text-slate-400 text-center">
            {weatherDescription}
          </span>
        </div>

        {/* Temperature */}
        <div className="flex flex-col items-end">
          <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">
            {Math.round(temperature)}{temperatureUnit}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Feels like {Math.round(apparentTemperature)}{temperatureUnit}
          </span>
        </div>
      </div>

      {/* Additional info */}
      <div className="flex items-center justify-around mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {humidity}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {windSpeed} {windSpeedUnit}
          </span>
        </div>
      </div>
    </div>
  );
}

// Loading state component
export function WeatherLoading({ location }: { location?: string }) {
  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-blue-50 to-sky-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 animate-pulse"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {location ? `Getting weather for ${location}...` : "Getting weather..."}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}
