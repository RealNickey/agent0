"use client";

import { useRef, useEffect } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputButton,
  PromptInputSpeechButton,
} from "@/components/ai-elements/prompt-input";
import { PaperclipIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PromptInput
      onSubmit={onSubmit}
      className="bg-transparent border-none shadow-none"
      inputGroupClassName="!bg-transparent !border-none !shadow-none !ring-0 !ring-offset-0 !overflow-visible p-0"
    >
      <ButtonGroup className="w-full bg-background border border-input rounded-3xl shadow-sm items-end transition-all duration-200 ease-in-out">
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
          className="rounded-l-3xl rounded-r-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0"
        >
          <PaperclipIcon className="size-4" />
        </PromptInputButton>

        <ButtonGroupSeparator className="h-6 mb-2 self-end!" />

        {/* Google Search Toggle */}
        <PromptInputButton
          tooltip={enableSearch ? "Disable Google Search" : "Enable Google Search"}
          onClick={onToggleSearch}
          className={cn("rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0", enableSearch && "bg-primary/10 text-primary")}
        >
          <SearchIcon className="size-4" />
        </PromptInputButton>

        <ButtonGroupSeparator className="h-6 mb-2 self-end!" />

        <PromptInputSpeechButton className="rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0" />

        <PromptInputTextarea
          ref={textareaRef}
          autoFocus
          className="min-h-10 max-h-[200px] py-2.5 px-3 text-base sm:text-sm resize-none border-none shadow-none focus-visible:ring-0 transition-all duration-200"
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

        <PromptInputSubmit
          className="rounded-r-3xl rounded-l-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0"
          status={isLoading ? "streaming" : "ready"}
        />
      </ButtonGroup>
    </PromptInput>
  );
}
