"use client";

import { useRef, useEffect, useState } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputButton,
} from "@/components/ai-elements/prompt-input";
import { BrainIcon, CalendarIcon, CloudSunIcon, FileTextIcon, PaperclipIcon, SearchIcon, NetworkIcon, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

import { SpeechInput } from "@/components/ai-elements/speech-input";
import { fetchInstalledTools, parseToolMentions, type InstalledTool } from "@/lib/tool-utils";
import { Badge } from "@/components/ui/badge";

export type PromptInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { text: string; files: any[] }) => void;
  isLoading: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  enableThinking: boolean;
  onToggleThinking: () => void;
  thinkingSupported?: boolean;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mentionedTools?: string[];
  onToolMentionsChange?: (tools: string[]) => void;
  addedIntegrations?: string[];
};

export function PromptInputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  enableSearch,
  onToggleSearch,
  enableThinking,
  onToggleThinking,
  thinkingSupported = true,
  onFilesSelected,
  mentionedTools = [],
  onToolMentionsChange,
  addedIntegrations = [],
}: PromptInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [availableTools, setAvailableTools] = useState<InstalledTool[]>([]);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);
  const [toolQuery, setToolQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load available tools on mount and when integrations change
  useEffect(() => {
    fetchInstalledTools()
      .then((tools) => {
        // Filter tools to only show installed ones based on addedIntegrations
        const installedTools = tools.filter(tool => 
          addedIntegrations.includes(tool.id)
        );
        setAvailableTools(installedTools);
      })
      .catch((err) => console.error("Failed to load tools:", err));
  }, [addedIntegrations]);

  // Parse tool mentions whenever value changes
  // useEffect(() => {
  //   const mentions = parseToolMentions(value);
  //   if (JSON.stringify(mentions) !== JSON.stringify(mentionedTools)) {
  //     onToolMentionsChange?.(mentions);
  //   }
  // }, [value, mentionedTools, onToolMentionsChange]);

  // Detect @ typing for tool suggestions
  useEffect(() => {
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const afterAt = value.slice(lastAtIndex + 1);
      const hasSpace = afterAt.includes(" ");
      
      if (!hasSpace) {
        setToolQuery(afterAt.toLowerCase());
        setShowToolSuggestions(true);
      } else {
        setShowToolSuggestions(false);
      }
    } else {
      setShowToolSuggestions(false);
    }
  }, [value]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [toolQuery]);

  const handleToolSelect = (toolName: string) => {
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const beforeAt = value.slice(0, lastAtIndex);
      const afterAt = value.slice(lastAtIndex + 1);
      const nextSpace = afterAt.indexOf(" ");
      const afterMention = nextSpace >= 0 ? afterAt.slice(nextSpace) : "";
      
      // Remove the @mention from text and add to mentionedTools
      const newValue = `${beforeAt}${afterMention}`;
      onChange(newValue);
      
      // Add tool to mentionedTools if not already present
      if (!mentionedTools.includes(toolName)) {
        onToolMentionsChange?.([...mentionedTools, toolName]);
      }
      
      setShowToolSuggestions(false);
      textareaRef.current?.focus();
    }
  };

  const filteredTools = availableTools.filter(
    (tool) =>
      toolQuery === "" ||
      tool.name.toLowerCase().includes(toolQuery) ||
      tool.id.toLowerCase().includes(toolQuery)
  );

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
    <div className="relative w-full">
      {/* Tool mention badges removed from top */}

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
            tooltip={
              mentionedTools.length > 0
                ? "Built-in tools disabled when using @tools"
                : enableSearch
                  ? "Disable Google Search"
                  : "Enable Google Search"
            }
            onClick={onToggleSearch}
            disabled={mentionedTools.length > 0}
            className={cn(
              "rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0",
              enableSearch && mentionedTools.length === 0 && "bg-primary/10 text-primary",
              mentionedTools.length > 0 && "opacity-50 cursor-not-allowed"
            )}
          >
            <SearchIcon className="size-4" />
          </PromptInputButton>

          <ButtonGroupSeparator className="h-6 mb-2 self-end!" />

          {/* Thinking Toggle */}
          <PromptInputButton
            tooltip={
              !thinkingSupported
                ? "Thinking is not supported by this model"
                : enableThinking
                  ? "Disable Thinking"
                  : "Enable Thinking"
            }
            onClick={onToggleThinking}
            disabled={!thinkingSupported}
            className={cn(
              "rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0",
              enableThinking && thinkingSupported && "bg-primary/10 text-primary"
            )}
          >
            <BrainIcon className="size-4" />
          </PromptInputButton>

          <ButtonGroupSeparator className="h-6 mb-2 self-end!" />

          <SpeechInput
            className="rounded-none border-none shadow-none h-10 w-10 p-0 flex items-center justify-center shrink-0"
            onTranscriptionChange={(transcript) => {
              const currentValue = textareaRef.current?.value ?? value;
              const trimmedTranscript = transcript.trim();
              if (!trimmedTranscript) {
                return;
              }
              const needsSpace = currentValue.length > 0 && !currentValue.endsWith(" ");
              const nextValue = `${currentValue}${needsSpace ? " " : ""}${trimmedTranscript}`;
              onChange(nextValue);
              textareaRef.current?.focus();
            }}
          />

          {/* Tool Pills inside input */}
          {mentionedTools.length > 0 && (
            <div className="flex items-center gap-1 pl-2 py-2.5 select-none">
              {mentionedTools.map((tool) => {
                const toolLower = tool.toLowerCase();
                const ToolIcon = toolLower === "calendar" 
                  ? CalendarIcon 
                  : toolLower === "forms" || toolLower === "survey"
                  ? FileTextIcon
                  : toolLower === "mermaid"
                  ? NetworkIcon
                  : toolLower === "image" || toolLower === "imagine" || toolLower === "flux"
                  ? ImageIcon
                  : CloudSunIcon;
                return (
                  <Badge 
                    key={tool} 
                    variant="secondary" 
                    className="text-xs h-6 px-2 gap-1 cursor-default whitespace-nowrap"
                  >
                    <ToolIcon className="size-3" />
                    @{tool}
                  </Badge>
                );
              })}
            </div>
          )}

          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            className="min-h-10 max-h-[200px] py-2.5 px-3 text-base sm:text-sm resize-none border-none shadow-none focus-visible:ring-0 transition-all duration-200"
            placeholder={mentionedTools.length > 0 ? "Send a message..." : "Send a message... (type @ to mention tools)"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // If tool suggestions are open, handle navigation and selection
              if (showToolSuggestions && filteredTools.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev + 1) % filteredTools.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  handleToolSelect(filteredTools[selectedIndex].name);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setShowToolSuggestions(false);
                  return;
                }
              }

              // Handle Backspace to remove tools
              if (e.key === "Backspace" && value === "" && mentionedTools.length > 0) {
                e.preventDefault();
                const newTools = [...mentionedTools];
                newTools.pop();
                onToolMentionsChange?.(newTools);
                return;
              }
              // Otherwise, Enter submits the message
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

      {/* Tool suggestions dropdown */}
      {showToolSuggestions && filteredTools.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-md z-50">
          <div className="rounded-lg border border-border bg-popover shadow-lg">
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Available Tools
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                {filteredTools.map((tool, index) => {
                  const toolLower = tool.id.toLowerCase();
                  const ToolIcon = toolLower === "calendar" 
                    ? CalendarIcon 
                    : toolLower === "forms" || toolLower === "survey"
                    ? FileTextIcon
                    : toolLower === "mermaid"
                    ? NetworkIcon
                    : toolLower === "image" || toolLower === "imagine" || toolLower === "flux"
                    ? ImageIcon
                    : CloudSunIcon;
                  return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.name)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-start gap-2 px-2 py-2 rounded-md text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      index === selectedIndex && "bg-accent text-accent-foreground"
                    )}
                  >
                    <ToolIcon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm">@{tool.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {tool.description}
                      </span>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
