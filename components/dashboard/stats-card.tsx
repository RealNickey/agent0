"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl border bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && (
          <span
            className={cn(
              "text-xs",
              trend.isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% from yesterday
          </span>
        )}
      </div>
    </div>
  );
}
