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
} from "lucide-react";

export type WeatherWidgetProps = {
  temperature: number;
  temperatureUnit: string;
  condition: string;
  weatherCode: number;
  location: string;
  high?: number;
  low?: number;
  className?: string;
};

/**
 * WMO Weather interpretation codes (WW)
 * See: https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
 * 
 * 0: Clear sky
 * 1-3: Mainly clear, partly cloudy, overcast
 * 45-48: Fog and depositing rime fog
 * 51-57: Drizzle (light, moderate, dense)
 * 61-67: Rain (slight, moderate, heavy)
 * 71-77: Snow fall (slight, moderate, heavy)
 * 80-82: Rain showers (slight, moderate, violent)
 * 85-86: Snow showers (slight, heavy)
 * 95-99: Thunderstorm (slight, moderate, with hail)
 */
function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="size-8 text-amber-400" />;
  if (code >= 1 && code <= 3) return <Cloud className="size-8 text-muted-foreground" />;
  if (code >= 45 && code <= 48) return <CloudFog className="size-8 text-muted-foreground" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className="size-8 text-blue-400" />;
  if (code >= 61 && code <= 67) return <CloudRain className="size-8 text-blue-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="size-8 text-blue-200" />;
  if (code >= 80 && code <= 82) return <CloudRain className="size-8 text-blue-600" />;
  if (code >= 85 && code <= 86) return <CloudSnow className="size-8 text-blue-100" />;
  if (code >= 95 && code <= 99) return <CloudLightning className="size-8 text-amber-500" />;
  return <Sun className="size-8 text-amber-400" />;
}

export function WeatherWidget({
  temperature,
  temperatureUnit,
  condition,
  weatherCode,
  location,
  high,
  low,
  className,
}: WeatherWidgetProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border bg-card",
        className
      )}
    >
      {getWeatherIcon(weatherCode)}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {Math.round(temperature)}{temperatureUnit}
          </span>
          {high !== undefined && low !== undefined && (
            <span className="text-xs text-muted-foreground">
              H:{Math.round(high)}° L:{Math.round(low)}°
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground block truncate">
          {condition} in {location}
        </span>
      </div>
    </div>
  );
}
