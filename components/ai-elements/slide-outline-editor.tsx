
"use client";

import { useState } from "react";
import { SlideOutline, SlideDefinition } from "@/types/slides";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Check,
  X,
  Presentation,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideOutlineEditorProps {
  toolCallId: string;
  outline: SlideOutline;
  addToolOutput: (args: { toolCallId: string; output: any }) => void;
}

export function SlideOutlineEditor({
  toolCallId,
  outline: initialOutline,
  addToolOutput,
}: SlideOutlineEditorProps) {
  const [outline, setOutline] = useState<SlideOutline>(initialOutline);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleUpdateSlide = (index: number, updates: Partial<SlideDefinition>) => {
    const newSlides = [...outline.slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setOutline({ ...outline, slides: newSlides });
  };

  const handleAddSlide = () => {
    const newSlide: SlideDefinition = {
      id: `slide-${Date.now()}`,
      type: "content",
      title: "New Slide",
      content: ["Add bullet points here"],
    };
    setOutline({ ...outline, slides: [...outline.slides, newSlide] });
  };

  const handleRemoveSlide = (index: number) => {
    const newSlides = [...outline.slides];
    newSlides.splice(index, 1);
    setOutline({ ...outline, slides: newSlides });
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newSlides = [...outline.slides];
      [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
      setOutline({ ...outline, slides: newSlides });
    } else if (direction === "down" && index < outline.slides.length - 1) {
      const newSlides = [...outline.slides];
      [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
      setOutline({ ...outline, slides: newSlides });
    }
  };

  const handleSubmit = (rejected: boolean = false) => {
    setIsSubmitted(true);
    if (rejected) {
      addToolOutput({
        toolCallId,
        output: JSON.stringify({ rejected: true, reason: "User rejected the outline." }),
      });
    } else {
      addToolOutput({
        toolCallId,
        output: JSON.stringify(outline), // Pass the edited outline back
      });
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-3xl mx-auto border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-center p-6 text-primary font-medium">
          <Check className="w-5 h-5 mr-2" />
          Outline submitted for presentation creation.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Presentation className="w-5 h-5 text-primary" />
          </div>
          <CardTitle>Review Presentation Outline</CardTitle>
        </div>
        <div className="space-y-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Presentation Title</Label>
            <Input
              id="title"
              value={outline.title}
              onChange={(e) => setOutline({ ...outline, title: e.target.value })}
              className="text-lg font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Palette className="w-4 h-4" />
             <span>Theme:</span>
             <div
               className="w-4 h-4 rounded-full border shadow-sm"
               style={{ backgroundColor: outline.theme.primaryColor }}
               title="Primary Color"
             />
             <div
               className="w-4 h-4 rounded-full border shadow-sm"
               style={{ backgroundColor: outline.theme.secondaryColor }}
               title="Secondary Color"
             />
             <span className="ml-2 font-mono text-xs">{outline.theme.fontFamily}</span>
             {/* Simple theme editor could go here */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 bg-muted/30 max-h-[600px] overflow-y-auto">
        <div className="p-6 space-y-4">
          {outline.slides.map((slide, index) => (
            <motion.div
              key={slide.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-card border rounded-xl shadow-sm p-4 hover:border-primary/30 transition-colors"
            >
              {/* Slide Header & Controls */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex flex-col items-center gap-1 mt-1 text-muted-foreground/50">
                  <span className="text-xs font-mono font-medium w-5 text-center">{index + 1}</span>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveSlide(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveSlide(index, "down")}
                      disabled={index === outline.slides.length - 1}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex gap-3">
                    <Input
                      value={slide.title}
                      onChange={(e) => handleUpdateSlide(index, { title: e.target.value })}
                      placeholder="Slide Title"
                      className="font-medium"
                    />
                    <Select
                      value={slide.type}
                      onValueChange={(val: any) => handleUpdateSlide(index, { type: val })}
                    >
                      <SelectTrigger className="w-[140px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Title Slide</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="section-divider">Divider</SelectItem>
                        <SelectItem value="two-column">Two Column</SelectItem>
                        <SelectItem value="image-focus">Image Focus</SelectItem>
                        <SelectItem value="quote">Quote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {slide.type !== "section-divider" && slide.type !== "quote" && (
                    <Textarea
                      value={slide.content?.join("\n")}
                      onChange={(e) => handleUpdateSlide(index, { content: e.target.value.split("\n") })}
                      placeholder="Bullet points (one per line)"
                      className="min-h-[80px] text-sm resize-y"
                    />
                  )}

                  {slide.type === "quote" && (
                    <>
                      <Textarea
                        value={slide.quoteText || ""}
                        onChange={(e) => handleUpdateSlide(index, { quoteText: e.target.value })}
                        placeholder="Quote text..."
                        className="min-h-[60px] text-sm italic"
                      />
                      <Input
                         value={slide.quoteAttribution || ""}
                         onChange={(e) => handleUpdateSlide(index, { quoteAttribution: e.target.value })}
                         placeholder="- Attribution"
                         className="text-sm w-1/2"
                      />
                    </>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                     <Input
                       value={slide.speakerNotes || ""}
                       onChange={(e) => handleUpdateSlide(index, { speakerNotes: e.target.value })}
                       placeholder="Speaker notes..."
                       className="text-xs text-muted-foreground bg-muted/20 border-transparent focus:border-input"
                     />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                     <Input
                       value={slide.imageQuery || ""}
                       onChange={(e) => handleUpdateSlide(index, { imageQuery: e.target.value })}
                       placeholder="Image search query (optional)..."
                       className="text-xs text-muted-foreground bg-muted/20 border-transparent focus:border-input"
                     />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveSlide(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed text-muted-foreground hover:text-foreground"
            onClick={handleAddSlide}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>
      </CardContent>

      <div className="p-4 bg-background border-t flex justify-end gap-3 sticky bottom-0 z-10">
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          className="text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <X className="w-4 h-4 mr-2" />
          Reject / Start Over
        </Button>
        <Button onClick={() => handleSubmit(false)}>
          <Check className="w-4 h-4 mr-2" />
          Confirm & Create Presentation
        </Button>
      </div>
    </Card>
  );
}
