"use client";

import { motion } from "motion/react";
import { FileText, Hash, AlignLeft, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordCountProps {
  totalWords: number;
  totalParagraphs: number;
  totalCharacters?: number;
  averageWordsPerParagraph?: number;
}

export function WordCount({
  totalWords,
  totalParagraphs,
  totalCharacters = 0,
  averageWordsPerParagraph = 0,
}: WordCountProps) {
  const stats = [
    {
      label: "Total Words",
      value: totalWords.toLocaleString(),
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Paragraphs",
      value: totalParagraphs.toLocaleString(),
      icon: AlignLeft,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Characters",
      value: totalCharacters.toLocaleString(),
      icon: Hash,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Avg Words/Paragraph",
      value: averageWordsPerParagraph.toFixed(1),
      icon: BarChart3,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Content Statistics</h3>
          <p className="text-xs text-muted-foreground">AI-generated content analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={cn("p-2 rounded-md", stat.bgColor)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Summary</p>
          <p>
            Total words: <span className="font-semibold text-foreground">{totalWords.toLocaleString()}</span>
          </p>
          <p>
            Total paragraphs: <span className="font-semibold text-foreground">{totalParagraphs.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Utility function to count words and paragraphs from text
export function analyzeContent(text: string): {
  totalWords: number;
  totalParagraphs: number;
  totalCharacters: number;
  averageWordsPerParagraph: number;
} {
  if (!text || text.trim().length === 0) {
    return {
      totalWords: 0,
      totalParagraphs: 0,
      totalCharacters: 0,
      averageWordsPerParagraph: 0,
    };
  }

  const trimmedText = text.trim();
  
  // Count characters (excluding leading/trailing whitespace)
  const totalCharacters = trimmedText.length;

  // Count words - split by whitespace and filter empty strings
  const words = trimmedText.split(/\s+/).filter((word) => word.length > 0);
  const totalWords = words.length;

  // Count paragraphs - split by double newlines or multiple newlines
  // A paragraph is a block of text separated by blank lines
  const paragraphs = trimmedText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const totalParagraphs = Math.max(paragraphs.length, totalWords > 0 ? 1 : 0);

  // Calculate average words per paragraph
  const averageWordsPerParagraph = totalParagraphs > 0 ? totalWords / totalParagraphs : 0;

  return {
    totalWords,
    totalParagraphs,
    totalCharacters,
    averageWordsPerParagraph,
  };
}
