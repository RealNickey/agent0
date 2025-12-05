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
import { AttachmentsPreview, FileAttachment } from "@/components/ai-elements/attachments-preview";
import { PaperclipIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type PromptInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { text: string; files: any[] }) => void;
  isLoading: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments?: FileAttachment[];
  onRemoveAttachment?: (index: number) => void;
};

export function PromptInputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  enableSearch,
  onToggleSearch,
  onFilesSelected,
  attachments = [],
  onRemoveAttachment,
}: PromptInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <PromptInput
      onSubmit={onSubmit}
      className="rounded-2xl border shadow-sm bg-background focus-within:ring-1 focus-within:ring-ring transition-all"
    >
      {/* Attachments Preview - Inside the input container */}
      {attachments.length > 0 && onRemoveAttachment && (
        <div className="px-3 pt-3">
          <AttachmentsPreview 
            attachments={attachments} 
            onRemove={onRemoveAttachment} 
          />
        </div>
      )}
      
      <PromptInputTextarea
        className={cn(
          "min-h-[50px] max-h-[200px] text-base sm:text-sm resize-none border-none focus-visible:ring-0 shadow-none",
          attachments.length > 0 ? "pt-3" : "py-4"
        )}
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
            <Globe className="size-4" />
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
