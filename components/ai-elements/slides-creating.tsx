"use client";

import { useState, useEffect } from "react";
import {
  PresentationIcon,
  SparklesIcon,
  ImageIcon,
  FileIcon,
  UploadIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Progress steps for the slides creation flow
const STEPS = [
  { id: "content", label: "Generating slide content", icon: SparklesIcon },
  { id: "images", label: "Searching for images", icon: ImageIcon },
  { id: "building", label: "Building presentation", icon: FileIcon },
  { id: "uploading", label: "Uploading to Google Slides", icon: UploadIcon },
];

interface SlidesCreatingProps {
  title?: string;
  slideCount?: number;
}

/**
 * Animated progress GenUI shown while the presentation is being created.
 * Cycles through steps to give the user visual feedback.
 */
export function SlidesCreating({ title, slideCount }: SlidesCreatingProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Auto-advance steps for visual feedback
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev; // Stay on last step
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (elapsedSeconds === 30 || elapsedSeconds === 60 || elapsedSeconds === 90) {
      console.warn("[slides-ui] Presentation generation is taking longer than expected", {
        elapsedSeconds,
        title,
        slideCount,
      });
    }
  }, [elapsedSeconds, title, slideCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-teal-500/20 bg-linear-to-br from-teal-500/5 via-teal-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-teal-500/10 bg-linear-to-br from-teal-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="p-2 rounded-lg bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20"
            >
              <PresentationIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Creating Presentation</h3>
              {title && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {title}
                  {slideCount ? ` — ${slideCount} slides` : ""}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                Live phase preview — detailed execution logs appear when creation completes.
              </p>
              {elapsedSeconds >= 30 && (
                <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-1">
                  Taking longer than usual ({elapsedSeconds}s). Check server logs for `slides:` / `chat:` debug output.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="p-4 space-y-3">
          {STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = index < activeStep;
            const StepIcon = step.icon;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                {/* Step indicator */}
                <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center"
                    >
                      <StepIcon className="w-4 h-4 text-teal-600" />
                    </motion.div>
                  ) : isActive ? (
                    <div className="relative w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <StepIcon className="w-4 h-4 text-teal-600" />
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-teal-500/40"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                      <StepIcon className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Connecting line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-3 ${
                        isDone ? "bg-teal-500/30" : "bg-muted/20"
                      }`}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-sm transition-colors ${
                    isActive
                      ? "text-foreground font-medium"
                      : isDone
                      ? "text-teal-600/80"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      ...
                    </motion.span>
                  )}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-teal-600 to-teal-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: `${((activeStep + 1) / STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
