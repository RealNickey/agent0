"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type QuickChatInputProps = {
  onSubmit?: (value: string) => void;
  className?: string;
};

export function QuickChatInput({ onSubmit, className }: QuickChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.trim() && onSubmit) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Ask</h3>
      </div>
      
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask Agent0 anything..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim()}
        >
          <Send className="size-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Press Enter to send
        </span>
        <Link href="/" className="text-xs text-primary hover:underline">
          Open full chat →
        </Link>
      </div>
    </div>
  );
}
