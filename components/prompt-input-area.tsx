"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputButton,
  PromptInputSpeechButton,
} from "@/components/ai-elements/prompt-input";
import { MentionMenu } from "@/components/ai-elements/mention-menu";
import { PaperclipIcon, SearchIcon, WrenchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import type { SerializableToolExtension } from "@/lib/tool-registry";

export type PromptInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { text: string; files: any[]; selectedTools?: SerializableToolExtension[] }) => void;
  isLoading: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  availableTools?: SerializableToolExtension[];
  selectedTools?: SerializableToolExtension[];
  onToolSelect?: (tool: SerializableToolExtension) => void;
  onToolRemove?: (toolId: string) => void;
};

export function PromptInputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  enableSearch,
  onToggleSearch,
  onFilesSelected,
  availableTools = [],
  selectedTools = [],
  onToolSelect,
  onToolRemove,
}: PromptInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Mention menu state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);

  // Handle input change with @-mention detection
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const beforeCursor = newValue.substring(0, cursorPos);
    
    // Check for @ mention pattern
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionMenu(true);
      setMentionRange({
        start: cursorPos - mentionMatch[0].length,
        end: cursorPos,
      });
    } else {
      setShowMentionMenu(false);
      setMentionRange(null);
    }
  }, [onChange]);

  // Handle tool selection from mention menu
  const handleToolSelect = useCallback((tool: SerializableToolExtension) => {
    if (!mentionRange) return;
    
    // Replace @mention with the tool badge text
    const beforeMention = value.substring(0, mentionRange.start);
    const afterMention = value.substring(mentionRange.end);
    const newValue = `${beforeMention}@${tool.name} ${afterMention}`;
    
    onChange(newValue);
    setShowMentionMenu(false);
    setMentionRange(null);
    
    // Add tool to selected tools
    onToolSelect?.(tool);
    
    // Focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [mentionRange, value, onChange, onToolSelect]);

  // Close mention menu
  const handleCloseMentionMenu = useCallback(() => {
    setShowMentionMenu(false);
    setMentionRange(null);
  }, []);

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
    <div className="relative">
      {/* Mention Menu */}
      <MentionMenu
        query={mentionQuery}
        tools={availableTools}
        onSelect={handleToolSelect}
        onClose={handleCloseMentionMenu}
        visible={showMentionMenu}
      />
      
      {/* Selected Tools Badges */}
      {selectedTools.length > 0 && (
        <div className="space-y-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            {selectedTools.map((tool) => (
              <span
                key={tool.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {tool.icon && <span>{tool.icon}</span>}
                {tool.name}
                <button
                  type="button"
                  onClick={() => onToolRemove?.(tool.id)}
                  className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${tool.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
            ℹ️ Custom tools are active. Google's built-in tools (Search, URL Context, Code Execution) are temporarily disabled.
          </div>
        </div>
      )}
      
      <PromptInput
        onSubmit={(data) => onSubmit({ ...data, selectedTools })}
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
            aria-label="Attach files"
            title="Attach files"
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
          
          {/* Tools indicator */}
          {selectedTools.length > 0 && (
            <>
              <PromptInputButton
                tooltip={`${selectedTools.length} tool(s) selected`}
                className="rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0 bg-primary/10 text-primary"
              >
                <WrenchIcon className="size-4" />
              </PromptInputButton>
              <ButtonGroupSeparator className="h-6 mb-2 self-end!" />
            </>
          )}

          <PromptInputSpeechButton className="rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0" />

          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            className="min-h-10 max-h-[200px] py-2.5 px-3 text-base sm:text-sm resize-none border-none shadow-none focus-visible:ring-0 transition-all duration-200"
            placeholder="Send a message... (type @ for tools)"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              // Don't submit if mention menu is open
              if (showMentionMenu) {
                if (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape") {
                  return; // Let MentionMenu handle these keys
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit({ text: value, files: [], selectedTools });
              }
            }}
          />

          <PromptInputSubmit
            className="rounded-r-3xl rounded-l-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0"
            status={isLoading ? "streaming" : "ready"}
          />
        </ButtonGroup>
      </PromptInput>
    </div>
  );
}
