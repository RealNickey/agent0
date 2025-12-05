"use client";

import { motion } from "motion/react";

export type SuggestionsGridProps = {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
};

export function SuggestionsGrid({ suggestions, onSuggestionClick }: SuggestionsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full"
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick(suggestion)}
          className="flex items-center justify-start px-4 py-3 text-sm text-left border rounded-xl hover:bg-accent/50 transition-colors bg-background/50 backdrop-blur-sm"
        >
          {suggestion}
        </button>
      ))}
    </motion.div>
  );
}
