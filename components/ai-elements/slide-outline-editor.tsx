"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { MyUIMessage } from "@/types/chat";
import type { SlideDefinition, SlideOutline, SlideOutlineOutput, SlideTheme, SlideType } from "@/types/slides";

const DEFAULT_THEME: SlideTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#111827",
  accentColor: "#0ea5e9",
  fontFamily: "Aptos",
};

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  "title": "Title",
  "content": "Content",
  "section-divider": "Section Divider",
  "two-column": "Two Column",
  "image-focus": "Image Focus",
  "quote": "Quote",
};

interface SlideOutlineEditorProps {
  toolCallId: string;
  outline: SlideOutline;
  result: SlideOutlineOutput | null;
  state: string;
  addToolOutput: UseChatHelpers<MyUIMessage>["addToolOutput"];
}

const createSlide = (): SlideDefinition => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slide-${Date.now()}`,
  type: "content",
  title: "New Slide",
  content: [],
});

const normalizeOutline = (outline: SlideOutline): SlideOutline => ({
  title: outline.title || "Untitled Presentation",
  theme: {
    primaryColor: outline.theme?.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: outline.theme?.secondaryColor || DEFAULT_THEME.secondaryColor,
    accentColor: outline.theme?.accentColor || DEFAULT_THEME.accentColor,
    fontFamily: outline.theme?.fontFamily || DEFAULT_THEME.fontFamily,
  },
  slides: outline.slides?.map((slide) => ({
    ...slide,
    content: slide.content || [],
  })) || [],
});

export function SlideOutlineEditor({
  toolCallId,
  outline,
  result,
  state,
  addToolOutput,
}: SlideOutlineEditorProps) {
  const [draft, setDraft] = useState<SlideOutline>(() => normalizeOutline(outline));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Outline needs adjustments.");

  const isReadOnly = state === "result";
  const isRejected = Boolean(result && "rejected" in result && result.rejected);
  const confirmedOutline = useMemo(() => {
    if (result && !("rejected" in result)) {
      return result as SlideOutline;
    }
    return draft;
  }, [result, draft]);

  const updateTheme = (field: keyof SlideTheme, value: string) => {
    setDraft((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value,
      },
    }));
  };

  const updateSlide = (index: number, updates: Partial<SlideDefinition>) => {
    setDraft((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, idx) => (idx === index ? { ...slide, ...updates } : slide)),
    }));
  };

  const moveSlide = (from: number, to: number) => {
    setDraft((prev) => {
      const next = [...prev.slides];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return { ...prev, slides: next };
    });
  };

  const handleConfirm = () => {
    addToolOutput({
      tool: "reviewSlideOutline",
      toolCallId,
      output: draft,
    });
  };

  const handleReject = () => {
    addToolOutput({
      tool: "reviewSlideOutline",
      toolCallId,
      output: { rejected: true, reason: rejectionReason },
    });
  };

  if (isRejected) {
    return (
      <Card className="p-4 border border-amber-500/40 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Outline rejected</span>
        </div>
        {result && "reason" in result && result.reason && (
          <p className="text-xs text-muted-foreground mt-2">{result.reason}</p>
        )}
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl my-4 space-y-4"
    >
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Slide Outline</h3>
            <p className="text-xs text-muted-foreground">
              Review and edit the presentation outline before generating slides.
            </p>
          </div>
          {isReadOnly && (
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <CheckCircle2 className="h-4 w-4" />
              Confirmed
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Presentation Title</Label>
          <Input
            value={confirmedOutline.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            disabled={isReadOnly}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input
              type="color"
              value={confirmedOutline.theme.primaryColor}
              onChange={(e) => updateTheme("primaryColor", e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <Input
              type="color"
              value={confirmedOutline.theme.secondaryColor}
              onChange={(e) => updateTheme("secondaryColor", e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <Input
              type="color"
              value={confirmedOutline.theme.accentColor}
              onChange={(e) => updateTheme("accentColor", e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Input
              value={confirmedOutline.theme.fontFamily}
              onChange={(e) => updateTheme("fontFamily", e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {confirmedOutline.slides.map((slide, index) => (
            <motion.div
              key={slide.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card
                className="p-4 space-y-3"
                draggable={!isReadOnly}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  moveSlide(dragIndex, index);
                  setDragIndex(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Slide {index + 1}</span>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => index > 0 && moveSlide(index, index - 1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => index < draft.slides.length - 1 && moveSlide(index, index + 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            slides: prev.slides.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Slide Type</Label>
                    <Select
                      value={slide.type}
                      onValueChange={(value) => updateSlide(index, { type: value as SlideType })}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select slide type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SLIDE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(index, { title: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Input
                      value={slide.subtitle || ""}
                      onChange={(e) => updateSlide(index, { subtitle: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image Query</Label>
                    <Input
                      value={slide.imageQuery || ""}
                      onChange={(e) => updateSlide(index, { imageQuery: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {(slide.type === "content" || slide.type === "two-column") && (
                  <div className="space-y-2">
                    <Label>Bullet Points (one per line)</Label>
                    <Textarea
                      value={(slide.content || []).join("\n")}
                      onChange={(e) =>
                        updateSlide(index, {
                          content: e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                )}

                {slide.type === "quote" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Quote Text</Label>
                      <Textarea
                        value={slide.quoteText || ""}
                        onChange={(e) => updateSlide(index, { quoteText: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Attribution</Label>
                      <Input
                        value={slide.quoteAttribution || ""}
                        onChange={(e) => updateSlide(index, { quoteAttribution: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Speaker Notes</Label>
                  <Textarea
                    value={slide.speakerNotes || ""}
                    onChange={(e) => updateSlide(index, { speakerNotes: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!isReadOnly && (
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setDraft((prev) => ({ ...prev, slides: [...prev.slides, createSlide()] }))}
          >
            <Plus className="h-4 w-4" />
            Add Slide
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex-1">
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection"
              />
            </div>
            <Button variant="secondary" onClick={handleReject} className="sm:min-w-[140px]">
              Reject / Start Over
            </Button>
            <Button onClick={handleConfirm} className="sm:min-w-[140px]">
              Confirm Outline
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
