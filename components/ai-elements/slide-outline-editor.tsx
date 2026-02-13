"use client";

import { useState, useCallback, useEffect } from "react";
import {
  PresentationIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import {
  PREMADE_THEMES,
  type ThemeName,
  type SimpleOutline,
} from "@/types/slides";

// ── Types ────────────────────────────────────────────────────────

interface SlideOutlineEditorProps {
  toolCallId: string;
  outline: SimpleOutline;
  addToolOutput: (params: { toolCallId: string; output: string }) => void;
}

// ── Theme Card ───────────────────────────────────────────────────

function ThemeCard({
  themeKey,
  selected,
  onSelect,
}: {
  themeKey: ThemeName;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = PREMADE_THEMES[themeKey];
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border p-2.5 transition-all cursor-pointer text-left",
        selected
          ? "border-teal-500 ring-2 ring-teal-500/30 bg-teal-500/5"
          : "border-border/50 hover:border-border bg-background/30 hover:bg-muted/20"
      )}
    >
      <div className="flex gap-1.5 h-4 rounded overflow-hidden">
        <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.primaryColor }} />
        <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.secondaryColor }} />
        <div className="flex-1 rounded-sm" style={{ backgroundColor: theme.accentColor }} />
      </div>
      <span className="text-xs font-medium">{theme.name}</span>
      <span className="text-[10px] text-muted-foreground">{theme.description}</span>
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────

export function SlideOutlineEditor({
  toolCallId,
  outline: initialOutline,
  addToolOutput,
}: SlideOutlineEditorProps) {
  const [outline, setOutline] = useState<SimpleOutline>(() => ({
    title: initialOutline?.title || "",
    themeName: initialOutline?.themeName || "modern-blue",
    slides: (initialOutline?.slides || []).map((s, i) => ({
      id: s?.id || `slide-${i}`,
      title: s?.title || "",
    })),
  }));

  const [status, setStatus] = useState<"editing" | "confirmed" | "rejected">("editing");
  const [confirmedElapsedSeconds, setConfirmedElapsedSeconds] = useState(0);

  const isPlaceholderOutline = useCallback((candidate: SimpleOutline) => {
    const title = candidate.title?.trim() || "";
    const hasValidTitle =
      title.length > 0 &&
      !/^presentation\s+title$/i.test(title) &&
      !/^new\s+presentation$/i.test(title);

    const hasValidSlides =
      Array.isArray(candidate.slides) &&
      candidate.slides.length > 0 &&
      candidate.slides.every((slide, index) => {
        const slideTitle = slide.title?.trim() || "";
        if (!slideTitle) return false;
        if (/^slide\s*\d+\s*title$/i.test(slideTitle)) return false;
        if (/^slide\s*title$/i.test(slideTitle)) return false;
        if (/^untitled$/i.test(slideTitle)) return false;
        if (candidate.slides.length === 1 && index === 0 && /^slide\s*1$/i.test(slideTitle)) return false;
        return true;
      });

    return !(hasValidTitle && hasValidSlides);
  }, []);

  useEffect(() => {
    if (status !== "editing") return;
    if (!isPlaceholderOutline(outline)) return;

    setStatus("rejected");
    addToolOutput({
      toolCallId,
      output: JSON.stringify({
        rejected: true,
        reason:
          "Outline was incomplete or placeholder-based. Regenerate a complete outline with inferred title and slide headings from the user request.",
      }),
    });
  }, [status, outline, isPlaceholderOutline, addToolOutput, toolCallId]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    setStatus("confirmed");
    setConfirmedElapsedSeconds(0);
    addToolOutput({
      toolCallId,
      output: JSON.stringify(outline),
    });
  }, [toolCallId, outline, addToolOutput]);

  const handleReject = useCallback(() => {
    setStatus("rejected");
    addToolOutput({
      toolCallId,
      output: JSON.stringify({ rejected: true, reason: "User cancelled the outline." }),
    });
  }, [toolCallId, addToolOutput]);

  useEffect(() => {
    if (status !== "confirmed") return;

    const timer = setInterval(() => {
      setConfirmedElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "confirmed") return;
    if (confirmedElapsedSeconds === 20 || confirmedElapsedSeconds === 40 || confirmedElapsedSeconds === 60) {
      console.warn("[slides-ui] Waiting for createPresentation tool call after outline approval", {
        toolCallId,
        elapsedSeconds: confirmedElapsedSeconds,
        title: outline.title,
        slideCount: outline.slides.length,
      });
    }
  }, [status, confirmedElapsedSeconds, toolCallId, outline.title, outline.slides.length]);

  // ── Confirmed State ──────────────────────────────────────────

  if (status === "confirmed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-teal-500/20 bg-linear-to-br from-teal-500/5 via-teal-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
              <Loader2Icon className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-teal-700 dark:text-teal-300">
                Outline Approved
              </h3>
              <p className="text-xs text-teal-700/70 dark:text-teal-300/70 mt-0.5">
                {outline.title} — {outline.slides.length} slides. Generating presentation from approved outline...
              </p>
              {confirmedElapsedSeconds >= 20 && (
                <p className="text-[11px] text-amber-600/90 dark:text-amber-300/90 mt-1">
                  Still waiting after {confirmedElapsedSeconds}s. If this persists, check server logs for `chat:` step traces.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Rejected State ───────────────────────────────────────────

  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-muted bg-muted/5 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XIcon className="w-5 h-5" />
            <span>Regenerating outline from your prompt...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Editing State ────────────────────────────────────────────

  const isValid =
    outline.title.trim().length > 0 &&
    outline.slides.length > 0 &&
    outline.slides.every((s) => s.title.trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-2xl my-4 not-prose"
    >
      <div className="rounded-xl border border-teal-500/20 bg-linear-to-br from-teal-500/5 via-teal-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-teal-500/10 bg-linear-to-br from-teal-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
              <PresentationIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Presentation Outline</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the AI-generated outline, then approve
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Presentation Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Title
            </label>
            <div className="rounded-md border border-border/50 bg-background/50 px-3 py-2.5 text-base font-semibold">
              {outline.title}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PREMADE_THEMES) as ThemeName[]).map((key) => (
                <ThemeCard
                  key={key}
                  themeKey={key}
                  selected={outline.themeName === key}
                  onSelect={() =>
                    setOutline((prev) => ({ ...prev, themeName: key }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Slide Headings */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Slides ({outline.slides.length})
            </label>

            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {outline.slides.map((slide, index) => (
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    layout
                    className="flex items-center gap-1.5"
                  >
                    {/* Slide number */}
                    <span className="text-xs font-medium text-muted-foreground w-5 text-right shrink-0">
                      {index + 1}.
                    </span>

                    <div className="rounded-md border border-border/50 bg-background/50 px-3 py-1.5 text-sm flex-1">
                      {slide.title}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-teal-500/10 p-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            AI will generate content for each slide
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReject}>
              <XIcon className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!isValid}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
