"use client";

import { useRef, useEffect, useState } from "react";
import { 
  PaperclipIcon, 
  ArrowUpIcon, 
  CalendarIcon, 
  FileTextIcon, 
  NetworkIcon, 
  FileStackIcon, 
  CloudSunIcon,
  MailIcon,
  ListTodoIcon,
  GithubIcon,
  ImageIcon,
  FilmIcon,
  PresentationIcon,
  SearchIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { fetchInstalledTools, type InstalledTool } from "@/lib/tool-utils";

// Start of Selection
import { AttachmentsPreview, type FileAttachment } from "@/components/ai-elements/attachments-preview";

export type PromptInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { text: string; files: any[] }) => void;
  isLoading: boolean;
  enableSearch?: boolean; // Kept for interface compatibility but unused in UI
  onToggleSearch?: () => void; // Kept for interface compatibility
  enableThinking?: boolean; // Kept for interface compatibility
  onToggleThinking?: () => void; // Kept for interface compatibility
  thinkingSupported?: boolean;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: FileAttachment[];
  onRemoveAttachment: (index: number) => void;
  mentionedTools?: string[];
  onToolMentionsChange?: (tools: string[]) => void;
  addedIntegrations?: string[];
  onRefreshTools?: () => void;
  onOpenChat?: () => void; // Replaced onUpArrow
};

export function PromptInputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  onFilesSelected,
  attachments = [],
  onRemoveAttachment = () => {},
  mentionedTools = [],
  onToolMentionsChange,
  addedIntegrations = [],
  onOpenChat,
}: PromptInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [availableTools, setAvailableTools] = useState<InstalledTool[]>([]);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);
  const [toolQuery, setToolQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Tool colors map
  const TOOL_COLORS: Record<string, string> = {
    calendar: "bg-orange-500/20 text-orange-600",
    weather: "bg-sky-500/20 text-sky-600",
    forms: "bg-purple-500/20 text-purple-600",
    survey: "bg-purple-500/20 text-purple-600",
    mermaid: "bg-pink-500/20 text-pink-600",
    pdf: "bg-red-500/20 text-red-600",
    gmail: "bg-blue-500/20 text-blue-600",
    tasks: "bg-indigo-500/20 text-indigo-600",
    image: "bg-violet-500/20 text-violet-600",
    movie: "bg-amber-500/20 text-amber-600",
    default: "bg-neutral-500/20 text-neutral-800", // Default to black-ish/dark neutral as requested
  };

  // Load available tools
  useEffect(() => {
    fetchInstalledTools()
      .then((tools) => {
        const installedTools = tools.filter(tool => 
          addedIntegrations.includes(tool.id)
        );
        setAvailableTools(installedTools);
      })
      .catch((err) => console.error("Failed to load tools:", err));
  }, [addedIntegrations]);

  // Handle auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Max height in px
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
    // Sync scroll initially and on resize
    if (renderRef.current && textareaRef.current) {
        renderRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value]);

  const renderRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && renderRef.current) {
        renderRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle global "/" focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If pressing "/" and not already in an input/textarea
      if (e.key === "/" && 
          document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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
      
      // Preserve the position and location: Keep it in the text, formatted as @toolname
      const newValue = `${beforeAt}@${toolName} ${afterMention}`;
      const nextCursorPos = `${beforeAt}@${toolName} `.length;
      onChange(newValue);
      
      if (!mentionedTools.includes(toolName)) {
        onToolMentionsChange?.([...mentionedTools, toolName]);
      }
      
      setShowToolSuggestions(false);

      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      });
    }
  };

  const filteredTools = availableTools.filter(
    (tool) =>
      toolQuery === "" ||
      tool.name.toLowerCase().includes(toolQuery) ||
      tool.id.toLowerCase().includes(toolQuery)
  );

  const handleSubmit = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSubmit({ text: value, files: [] });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tool suggestions navigation
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

    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Handle Backspace to remove entire @tool
    if (e.key === "Backspace" && textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const textBeforeCursor = value.slice(0, selectionStart);
        // Regex matches @ followed by word chars, then an optional space
        const match = textBeforeCursor.match(/@[\w-]+\s?$/);
        
        if (match) {
          e.preventDefault();
          const matchRange = match[0];
          const toolName = matchRange.trim().slice(1);
          
          const newSelectionPos = selectionStart - matchRange.length;
          const newValue = value.slice(0, newSelectionPos) + value.slice(selectionStart);
          
          onChange(newValue);

          // Update mentionedTools if the deleted tool is no longer in the text
          const isStillMentioned = newValue.split(/\s+/).some(word => word === `@${toolName}`);
          if (!isStillMentioned && mentionedTools.includes(toolName)) {
            onToolMentionsChange?.(mentionedTools.filter(t => t !== toolName));
          }

          // Sync cursor position after state update
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(newSelectionPos, newSelectionPos);
            }
          }, 0);
          return;
        }
      }
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 space-y-3">
      {/* File Attachments Preview */}
      <AnimatePresence mode="popLayout">
        {attachments.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="w-full"
          >
           <AttachmentsPreview attachments={attachments} onRemove={onRemoveAttachment} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Container - Liquid Glass Style */}
      <motion.div
        layout
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        className={cn(
          "relative flex items-end gap-2 p-2 rounded-4xl", 
          "bg-white/10 backdrop-blur-3xl border border-white/40 shadow-[4px_9px_4.5px_0_rgba(0,0,0,0.25)]",
          isFocused ? "shadow-[4px_9px_12px_0_rgba(0,0,0,0.3)] bg-white/20" : "hover:bg-white/15"
        )}
      >
        <div className="flex items-center gap-1.5 pb-1 pl-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFilesSelected}
            accept="image/*,application/pdf,.txt,.md,.json,.csv"
            multiple
            className="hidden"
          />
            <motion.button
              whileHover={{ backgroundColor: "rgba(140, 167, 188, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center justify-center size-[52px] rounded-full bg-black/10 backdrop-blur-xl text-white transition-all duration-300 border border-black/10 shadow-[0_4px_10px_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.5)]"
              title="Attach files"
            >
              <PaperclipIcon className="size-6" />
            </motion.button>
            
            <SpeechInput
              className="flex items-center justify-center size-[52px] rounded-full bg-black/10 backdrop-blur-xl text-white border border-black/10 shadow-[0_4px_10px_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.5)] [&_svg]:size-6"
              onTranscriptionChange={(transcript) => {
              const currentValue = textareaRef.current?.value ?? value;
              const trimmedTranscript = transcript.trim();
              if (!trimmedTranscript) return;
              const needsSpace = currentValue.length > 0 && !currentValue.endsWith(" ");
              const nextValue = `${currentValue}${needsSpace ? " " : ""}${trimmedTranscript}`;
              onChange(nextValue);
              textareaRef.current?.focus();
            }}
          />
        </div>


        {/* Text Input Area */}
        <div className="flex-1 min-w-0 relative flex flex-col justify-center py-3">
            <div className="relative w-full overflow-hidden grid place-items-start">
                {/* Visual Renderer (Behind) */}
                <div 
                    ref={renderRef}
                    aria-hidden="true"
                    className="absolute top-0 left-0 w-full h-full text-[20px] px-3 py-1 font-medium whitespace-pre-wrap wrap-break-word pointer-events-none custom-scrollbar font-sans"
                    style={{ 
                        lineHeight: "1.5",
                        color: "var(--foreground)", // Dark text color for visibility
                        fontFamily: "inherit",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none"
                    }}
                >
                    {/* Render with default text color, but highlight pills */}
                    {value.split(/(@[\w-]+)/g).map((part, index) => {
                        if (part.startsWith("@")) {
                             const toolName = part.substring(1).toLowerCase();
                             // Find color key that matches part of the tool name or use default
                             const colorKey = Object.keys(TOOL_COLORS).find(k => toolName.includes(k)) || "default";
                             const colorClass = TOOL_COLORS[colorKey];
                         
                             return (
                                <span 
                                    key={index} 
                                    className={cn(
                                  "inline rounded-[0.35rem] font-semibold box-decoration-clone",
                                        colorClass
                                    )}
                                >
                                    {part}
                                </span>
                             );
                        }
                        return <span key={index}>{part}</span>;
                    })}
                     {/* Add a trailing space if value ends with newline to prevent jump */}
                     {value.endsWith("\n") && <br />}
                </div>

                {/* Actual Input (Foreground) */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={mentionedTools.length > 0 ? "Send a message..." : "What would you like to ask me?"}
                    className="relative w-full bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-[20px] px-3 py-1 max-h-[200px] overflow-y-auto placeholder:text-foreground/50 text-foreground font-medium font-sans"
                    style={{ 
                        minHeight: "34px", 
                        lineHeight: "1.5",
                        msOverflowStyle: "none", 
                        scrollbarWidth: "none", 
                        transition: "height 0.15s ease-out",
                        color: "transparent", 
                        caretColor: "var(--foreground)", // Visible cursor
                        fontFamily: "inherit", 
                    }}
                    rows={1}
                />
            </div>

            {/* Hide Webkit scrollbar via global style or specific class if Tailwind supports it. Using style tag for scoped override */}
            <style jsx>{`
                textarea::-webkit-scrollbar, div.custom-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>

        {/* Right Action (Send) */}
        <div className="pb-1 pr-1">
            <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(37, 99, 235, 0.9)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isLoading || (!value.trim() && attachments.length === 0)}
                className={cn(
                    "flex items-center justify-center size-[52px] rounded-full transition-all duration-500",
                    isLoading 
                        ? "bg-slate-400/50 cursor-not-allowed" 
                        : value.trim() || attachments.length > 0
                            ? "bg-blue-600 text-white shadow-[0_8px_32px_0_rgba(37,99,235,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] border border-blue-500/50 hover:bg-blue-700"
                            : "bg-blue-600/20 text-blue-600/40 border border-blue-600/20"
                )}
            >
                <ArrowUpIcon className="size-6" />
            </motion.button>
        </div>


        {/* Tool suggestions dropdown */}
        <AnimatePresence>
            {showToolSuggestions && filteredTools.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                className="absolute bottom-full left-0 mb-4 w-full z-50 px-4"
            >
                <div 
                    className="bg-black/75 backdrop-blur-3xl border border-white/10 shadow-[4px_9px_4.5px_0_rgba(0,0,0,0.5)] rounded-4xl overflow-hidden p-2"
                >
                <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Available Tools
                </div>
                <div 
                    className="max-h-[400px] overflow-y-auto space-y-1"
                    style={{ 
                        scrollbarWidth: "none", 
                        msOverflowStyle: "none" 
                    }}
                >
                    {/* Hide Webkit scrollbar locally */}
                     <style jsx>{`
                        div::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {filteredTools.map((tool, index) => {
                    const toolLower = tool.id.toLowerCase();
                    const ToolIcon = toolLower === "calendar" 
                        ? CalendarIcon 
                        : toolLower === "forms" || toolLower === "survey"
                        ? FileTextIcon
                        : toolLower === "mermaid"
                        ? NetworkIcon
                        : toolLower === "pdf"
                        ? FileStackIcon
                        : toolLower === "gmail"
                        ? MailIcon
                        : toolLower === "tasks"
                        ? ListTodoIcon
                        : toolLower === "github"
                        ? GithubIcon
                        : toolLower === "image"
                        ? ImageIcon
                        : toolLower === "movie"
                        ? FilmIcon
                        : toolLower === "slides"
                        ? PresentationIcon
                        : toolLower === "research"
                        ? SearchIcon
                        : CloudSunIcon;
                    
                    return (
                        <button
                        key={tool.id}
                        onClick={() => handleToolSelect(tool.name)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                            index === selectedIndex 
                            ? "bg-white/15 text-white" 
                            : "hover:bg-white/10 text-white/80"
                        )}
                        >
                        <div className={cn(
                            "flex items-center justify-center size-8 rounded-lg",
                            index === selectedIndex ? "bg-white/15" : "bg-white/10"
                        )}>
                            <ToolIcon className="size-4 text-white/80" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium text-sm text-white">@{tool.name}</span>
                            <span className="text-xs text-white/40 line-clamp-1">{tool.description}</span>
                        </div>
                        </button>
                    );
                    })}
                </div>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
