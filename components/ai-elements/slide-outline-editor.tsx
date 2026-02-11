"use client";

import { useState, useCallback } from "react";
import {
  PresentationIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  GripVerticalIcon,
  PaletteIcon,
  TypeIcon,
  ImageIcon,
  QuoteIcon,
  ColumnsIcon,
  SplitIcon,
  LayoutIcon,
  StickyNoteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────

type SlideType =
  | "title"
  | "content"
  | "section-divider"
  | "two-column"
  | "image-focus"
  | "quote";

interface SlideDefinition {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  content: string[];
  speakerNotes?: string;
  imageQuery?: string;
  imageUrl?: string;
  quoteText?: string;
  quoteAttribution?: string;
}

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

interface SlideOutline {
  title: string;
  theme: Theme;
  slides: SlideDefinition[];
}

interface SlideOutlineEditorProps {
  toolCallId: string;
  outline: SlideOutline;
  addToolOutput: (params: { toolCallId: string; output: string }) => void;
}

// ── Constants ────────────────────────────────────────────────────

const SLIDE_TYPE_META: Record<
  SlideType,
  { label: string; icon: React.ReactNode; description: string }
> = {
  title: {
    label: "Title",
    icon: <LayoutIcon className="w-4 h-4" />,
    description: "Opening or closing slide",
  },
  content: {
    label: "Content",
    icon: <TypeIcon className="w-4 h-4" />,
    description: "Bullet points with optional image",
  },
  "section-divider": {
    label: "Section Divider",
    icon: <SplitIcon className="w-4 h-4" />,
    description: "Topic transition slide",
  },
  "two-column": {
    label: "Two Column",
    icon: <ColumnsIcon className="w-4 h-4" />,
    description: "Split content layout",
  },
  "image-focus": {
    label: "Image Focus",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "Full-bleed image with text overlay",
  },
  quote: {
    label: "Quote",
    icon: <QuoteIcon className="w-4 h-4" />,
    description: "Stylized quote slide",
  },
};

const FONT_OPTIONS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Palatino",
  "Garamond",
];

// ── Component ────────────────────────────────────────────────────

export function SlideOutlineEditor({
  toolCallId,
  outline: initialOutline,
  addToolOutput,
}: SlideOutlineEditorProps) {
  const [outline, setOutline] = useState<SlideOutline>({
    title: initialOutline.title || "",
    theme: initialOutline.theme || {
      primaryColor: "#1A73E8",
      secondaryColor: "#34A853",
      accentColor: "#FBBC04",
      fontFamily: "Arial",
    },
    slides: initialOutline.slides || [],
  });

  const [status, setStatus] = useState<"editing" | "confirmed" | "rejected">("editing");
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(
    new Set(outline.slides.map((s) => s.id))
  );
  const [showTheme, setShowTheme] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    setStatus("confirmed");
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

  const updateTheme = (field: keyof Theme, value: string) => {
    setOutline((prev) => ({
      ...prev,
      theme: { ...prev.theme, [field]: value },
    }));
  };

  const updateSlide = (id: string, field: keyof SlideDefinition, value: any) => {
    setOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addSlide = () => {
    const newId = `slide-${Date.now()}`;
    setOutline((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: newId,
          type: "content" as SlideType,
          title: "",
          content: [],
          imageQuery: "",
        },
      ],
    }));
    setExpandedSlides((prev) => new Set([...prev, newId]));
  };

  const removeSlide = (id: string) => {
    setOutline((prev) => ({
      ...prev,
      slides: prev.slides.filter((s) => s.id !== id),
    }));
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= outline.slides.length) return;
    setOutline((prev) => {
      const slides = [...prev.slides];
      [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
      return { ...prev, slides };
    });
  };

  const toggleSlide = (id: string) => {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateBulletPoint = (slideId: string, bulletIndex: number, value: string) => {
    setOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => {
        if (s.id !== slideId) return s;
        const content = [...s.content];
        content[bulletIndex] = value;
        return { ...s, content };
      }),
    }));
  };

  const addBulletPoint = (slideId: string) => {
    setOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId ? { ...s, content: [...s.content, ""] } : s
      ),
    }));
  };

  const removeBulletPoint = (slideId: string, bulletIndex: number) => {
    setOutline((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => {
        if (s.id !== slideId) return s;
        return { ...s, content: s.content.filter((_, i) => i !== bulletIndex) };
      }),
    }));
  };

  // ── Confirmed / Rejected states ──────────────────────────────

  if (status === "confirmed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
            >
              <CheckIcon className="w-5 h-5" />
            </motion.div>
            <div>
              <h3 className="font-semibold text-base text-green-700 dark:text-green-400">
                Outline Confirmed
              </h3>
              <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">
                {outline.title} — {outline.slides.length} slides. Searching for images...
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
            <span>Outline cancelled. Try describing what you&apos;d like changed.</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Editing state ────────────────────────────────────────────

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
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-teal-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-teal-500/10 bg-gradient-to-br from-teal-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
              <PresentationIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Review Presentation Outline</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Edit slides, reorder, and customize before generating
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Presentation Title */}
          <div className="space-y-2">
            <Label htmlFor="pres-title">Presentation Title</Label>
            <Input
              id="pres-title"
              value={outline.title}
              onChange={(e) =>
                setOutline((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter presentation title"
              className="bg-background/50 text-lg font-semibold"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setShowTheme(!showTheme)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <PaletteIcon className="w-4 h-4" />
            <span>Theme Settings</span>
            {showTheme ? (
              <ChevronUpIcon className="w-3 h-3" />
            ) : (
              <ChevronDownIcon className="w-3 h-3" />
            )}
          </button>

          {/* Theme Editor */}
          <AnimatePresence>
            {showTheme && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-border/50 bg-background/30 p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={outline.theme.primaryColor}
                          onChange={(e) => updateTheme("primaryColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={outline.theme.primaryColor}
                          onChange={(e) => updateTheme("primaryColor", e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Secondary</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={outline.theme.secondaryColor}
                          onChange={(e) => updateTheme("secondaryColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={outline.theme.secondaryColor}
                          onChange={(e) => updateTheme("secondaryColor", e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Accent</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={outline.theme.accentColor}
                          onChange={(e) => updateTheme("accentColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={outline.theme.accentColor}
                          onChange={(e) => updateTheme("accentColor", e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={outline.theme.fontFamily}
                      onValueChange={(v) => updateTheme("fontFamily", v)}
                    >
                      <SelectTrigger className="h-8 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font} value={font}>
                            <span style={{ fontFamily: font }}>{font}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Theme Preview */}
                  <div className="flex gap-2 h-6">
                    <div
                      className="flex-1 rounded"
                      style={{ backgroundColor: outline.theme.primaryColor }}
                    />
                    <div
                      className="flex-1 rounded"
                      style={{ backgroundColor: outline.theme.secondaryColor }}
                    />
                    <div
                      className="flex-1 rounded"
                      style={{ backgroundColor: outline.theme.accentColor }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Slides ({outline.slides.length})</Label>
              <Button variant="outline" size="sm" onClick={addSlide} className="gap-1">
                <PlusIcon className="w-3 h-3" />
                Add Slide
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {outline.slides.map((slide, index) => {
                const isExpanded = expandedSlides.has(slide.id);
                const typeMeta = SLIDE_TYPE_META[slide.type];

                return (
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    layout
                    className="rounded-lg border border-border/50 bg-background/30 overflow-hidden"
                  >
                    {/* Slide Header (always visible) */}
                    <div
                      className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSlide(slide.id)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(index, "up");
                          }}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUpIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(index, "down");
                          }}
                          disabled={index === outline.slides.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {typeMeta.icon}
                      </div>

                      <span className="flex-1 text-sm font-medium truncate">
                        {slide.title || "(Untitled slide)"}
                      </span>

                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {typeMeta.label}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlide(slide.id);
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Slide Body (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border/30"
                        >
                          <div className="p-3 space-y-3">
                            {/* Slide Type */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={slide.type}
                                  onValueChange={(v) =>
                                    updateSlide(slide.id, "type", v as SlideType)
                                  }
                                >
                                  <SelectTrigger className="h-8 bg-background/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(
                                      Object.entries(SLIDE_TYPE_META) as [
                                        SlideType,
                                        (typeof SLIDE_TYPE_META)[SlideType],
                                      ][]
                                    ).map(([type, meta]) => (
                                      <SelectItem key={type} value={type}>
                                        <div className="flex items-center gap-2">
                                          {meta.icon}
                                          <span>{meta.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-1">
                              <Label className="text-xs">Title</Label>
                              <Input
                                value={slide.title}
                                onChange={(e) =>
                                  updateSlide(slide.id, "title", e.target.value)
                                }
                                placeholder="Slide title"
                                className="bg-background/50"
                              />
                            </div>

                            {/* Subtitle */}
                            {(slide.type === "title" ||
                              slide.type === "section-divider" ||
                              slide.type === "image-focus") && (
                              <div className="space-y-1">
                                <Label className="text-xs">Subtitle</Label>
                                <Input
                                  value={slide.subtitle || ""}
                                  onChange={(e) =>
                                    updateSlide(slide.id, "subtitle", e.target.value)
                                  }
                                  placeholder="Optional subtitle"
                                  className="bg-background/50"
                                />
                              </div>
                            )}

                            {/* Bullet Points */}
                            {(slide.type === "content" ||
                              slide.type === "two-column") && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">
                                    Content ({slide.content.length} items)
                                  </Label>
                                  <button
                                    onClick={() => addBulletPoint(slide.id)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    + Add point
                                  </button>
                                </div>
                                <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                                  {slide.content.map((bullet, bi) => (
                                    <div key={bi} className="flex items-center gap-1.5">
                                      <span className="text-muted-foreground text-xs">•</span>
                                      <Input
                                        value={bullet}
                                        onChange={(e) =>
                                          updateBulletPoint(slide.id, bi, e.target.value)
                                        }
                                        placeholder="Bullet point"
                                        className="h-7 text-sm bg-background/50"
                                      />
                                      <button
                                        onClick={() => removeBulletPoint(slide.id, bi)}
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <XIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quote fields */}
                            {slide.type === "quote" && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">Quote Text</Label>
                                  <Textarea
                                    value={slide.quoteText || ""}
                                    onChange={(e) =>
                                      updateSlide(slide.id, "quoteText", e.target.value)
                                    }
                                    placeholder="Enter the quote"
                                    className="bg-background/50 min-h-[60px]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Attribution</Label>
                                  <Input
                                    value={slide.quoteAttribution || ""}
                                    onChange={(e) =>
                                      updateSlide(
                                        slide.id,
                                        "quoteAttribution",
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., Albert Einstein"
                                    className="bg-background/50"
                                  />
                                </div>
                              </>
                            )}

                            {/* Image Query */}
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1.5">
                                <ImageIcon className="w-3 h-3" />
                                Image Search Query
                              </Label>
                              <Input
                                value={slide.imageQuery || ""}
                                onChange={(e) =>
                                  updateSlide(slide.id, "imageQuery", e.target.value)
                                }
                                placeholder="e.g., melting glacier aerial view"
                                className="bg-background/50"
                              />
                            </div>

                            {/* Speaker Notes */}
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1.5">
                                <StickyNoteIcon className="w-3 h-3" />
                                Speaker Notes
                              </Label>
                              <Textarea
                                value={slide.speakerNotes || ""}
                                onChange={(e) =>
                                  updateSlide(slide.id, "speakerNotes", e.target.value)
                                }
                                placeholder="Notes for the presenter..."
                                className="bg-background/50 min-h-[50px] text-sm"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-teal-500/10 p-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={handleReject}>
            <XIcon className="w-4 h-4 mr-1" />
            Start Over
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <CheckIcon className="w-4 h-4 mr-1" />
            Confirm Outline
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
