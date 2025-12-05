"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type FeatureBadge = {
  label: string;
  enabled: boolean;
  color: "blue" | "green" | "purple";
};

export type FeatureBadgesRowProps = {
  badges: FeatureBadge[];
};

export function FeatureBadgesRow({ badges }: FeatureBadgesRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap gap-2 justify-center"
    >
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            "text-xs px-2 py-1 rounded-full flex items-center gap-1",
            badge.color === "blue" && "bg-blue-500/10 text-blue-600",
            badge.color === "green" && "bg-green-500/10 text-green-600",
            badge.color === "purple" && "bg-purple-500/10 text-purple-600",
            !badge.enabled && "opacity-50"
          )}
        >
          {badge.label}
        </span>
      ))}
    </motion.div>
  );
}
