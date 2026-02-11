"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SlideType = "title" | "content" | "section-divider" | "two-column" | "image-focus" | "quote";

interface SlideOutlineEditorProps {
  toolCallId: string;
  input: any;
  addToolOutput?: (arg: { toolCallId: string; output: string }) => void;
}

export function SlideOutlineEditor({ toolCallId, input, addToolOutput }: SlideOutlineEditorProps) {
  const [outline, setOutline] = useState<any>(input);

  const slides = useMemo(() => outline?.slides || [], [outline]);

  const updateSlide = (idx: number, patch: any) => {
    setOutline((prev: any) => ({
      ...prev,
      slides: prev.slides.map((s: any, i: number) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <Card className="p-4 space-y-4 w-full">
      <h3 className="text-sm font-semibold">Review Slide Outline</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={outline?.title || ""}
          onChange={(e) => setOutline((prev: any) => ({ ...prev, title: e.target.value }))}
          placeholder="Presentation title"
        />
        <Input
          value={outline?.theme?.fontFamily || "Aptos"}
          onChange={(e) => setOutline((prev: any) => ({ ...prev, theme: { ...prev.theme, fontFamily: e.target.value } }))}
          placeholder="Font family"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="color" value={outline?.theme?.primaryColor || "#2563eb"} onChange={(e) => setOutline((prev: any) => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))} />
        <Input type="color" value={outline?.theme?.secondaryColor || "#0f172a"} onChange={(e) => setOutline((prev: any) => ({ ...prev, theme: { ...prev.theme, secondaryColor: e.target.value } }))} />
        <Input type="color" value={outline?.theme?.accentColor || "#f59e0b"} onChange={(e) => setOutline((prev: any) => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } }))} />
      </div>

      <div className="space-y-3">
        {slides.map((slide: any, index: number) => (
          <motion.div key={slide.id || index} layout className="border rounded-lg p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={slide.title || ""} onChange={(e) => updateSlide(index, { title: e.target.value })} placeholder="Slide title" />
              <Select value={slide.type || "content"} onValueChange={(value: SlideType) => updateSlide(index, { type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">title</SelectItem>
                  <SelectItem value="content">content</SelectItem>
                  <SelectItem value="section-divider">section-divider</SelectItem>
                  <SelectItem value="two-column">two-column</SelectItem>
                  <SelectItem value="image-focus">image-focus</SelectItem>
                  <SelectItem value="quote">quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={(slide.content || []).join("\n")}
              onChange={(e) => updateSlide(index, { content: e.target.value.split("\n").filter(Boolean) })}
              placeholder="One bullet per line"
              rows={4}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => addToolOutput?.({ toolCallId, output: JSON.stringify({ rejected: true, reason: "User requested a rewrite" }) })}
        >
          Reject / Start Over
        </Button>
        <Button onClick={() => addToolOutput?.({ toolCallId, output: JSON.stringify(outline) })}>Confirm Outline</Button>
      </div>
    </Card>
  );
}
