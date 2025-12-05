"use client";

import { useRef } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputButton,
  PromptInputTools,
  PromptInputSpeechButton,
} from "@/components/ai-elements/prompt-input";
import { PaperclipIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PromptInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { text: string; files: any[] }) => void;
  isLoading: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function PromptInputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  enableSearch,
  onToggleSearch,
  onFilesSelected,
}: PromptInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <PromptInput
      onSubmit={onSubmit}
      className="rounded-2xl border shadow-sm bg-background focus-within:ring-1 focus-within:ring-ring transition-all"
    >
      <PromptInputTextarea
        className="min-h-[50px] max-h-[200px] py-4 text-base sm:text-sm resize-none border-none focus-visible:ring-0 shadow-none"
        placeholder="Send a message..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit({ text: value, files: [] });
          }
        }}
      />
      <PromptInputFooter className="px-3 pb-3 pt-0 border-none">
        <PromptInputTools>
          {/* File Attachment */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFilesSelected}
            accept="image/*,application/pdf,.txt,.md,.json,.csv"
            multiple
            className="hidden"
          />
          <PromptInputButton
            tooltip="Attach file (images, PDF, text)"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="size-4" />
          </PromptInputButton>

          {/* Google Search Toggle */}
          <PromptInputButton
            tooltip={enableSearch ? "Disable Google Search" : "Enable Google Search"}
            onClick={onToggleSearch}
            className={cn(enableSearch && "bg-primary/10 text-primary")}
          >
            <SearchIcon className="size-4" />
          </PromptInputButton>

          <PromptInputSpeechButton />
        </PromptInputTools>
        <PromptInputSubmit
          className="rounded-full"
          status={isLoading ? "streaming" : "ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
