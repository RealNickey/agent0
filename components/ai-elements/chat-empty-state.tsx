"use client";

import { motion } from "motion/react";

export type ChatEmptyStateProps = {
  title?: string;
  subtitle?: string;
};

export function ChatEmptyState({
  title = "How can I help you today?",
  subtitle = "Powered by Google Gemini • Search, Code Execution, URL Context & More",
}: ChatEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-2"
    >
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}
