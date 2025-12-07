"use client";

import { useState, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// Components
import { ChatHeader } from "@/components/chat-header";
import { PromptInputArea } from "@/components/prompt-input-area";
import { MessageList } from "@/components/ai-elements/message-list";
import { AttachmentsPreview, FileAttachment } from "@/components/ai-elements/attachments-preview";
import { FeatureBadgesRow, FeatureBadge } from "@/components/ai-elements/feature-badges-row";
import { ChatEmptyState } from "@/components/ai-elements/chat-empty-state";
import { SuggestionsGrid } from "@/components/ai-elements/chat-suggestions-grid";
import { Model } from "@/components/ai-elements/model-selector-control";
import { TableOfContents } from "@/components/table-of-contents";

// Gemini models with their capabilities
const models: Model[] = [
  // Gemini 2.5 Series
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", series: "2.5", supportsThinking: true },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", series: "2.5", supportsThinking: true },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google", series: "2.5", supportsThinking: true },
  // Gemini 2.0 Series
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", series: "2.0", supportsThinking: false },
];

const defaultSuggestions = [
  "Search for latest AI news",
  "Calculate the 50th Fibonacci number",
  "Explain this URL: https://vercel.com",
  "Summarize a PDF document",
];

const STORAGE_KEYS = {
  MODEL: "agent0-selected-model",
  MESSAGES: "agent0-chat-messages",
};

export function ChatUI() {
  const [selectedModel, setSelectedModel] = useState<Model>(models[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    messages,
    sendMessage,
    status,
    regenerate,
    setMessages,
  } = useChat({
    id: "gemini-chat",
    onFinish: () => {
      setAttachments([]);
    },
  });

  // Load state from local storage on mount
  useEffect(() => {
    const savedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
    if (savedModelId) {
      const model = models.find((m) => m.id === savedModelId);
      if (model) setSelectedModel(model);
    }

    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    setIsLoaded(true);
  }, [setMessages]);

  // Save model to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel.id);
    }
  }, [selectedModel, isLoaded]);

  // Save messages to local storage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filePromises = Array.from(files).map((file) => {
      return new Promise<FileAttachment>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            url: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newAttachments) => {
      setAttachments((prev) => [...prev, ...newAttachments]);
    });

    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (value: { text: string; files: any[] }) => {
    if (!value.text.trim() && value.files.length === 0) return;

    // Build message content parts
    const parts: any[] = [{ type: "text", text: value.text }];

    // Add file attachments as file parts
    for (const att of attachments) {
      parts.push({
        type: "file",
        data: att.url,
        mediaType: att.type,
      });
    }

    sendMessage(
      {
        role: "user",
        parts,
      },
      {
        body: {
          model: selectedModel.id,
          enableSearch,
          enableUrlContext: true,
          enableCodeExecution: true,
        },
      }
    );

    setInputValue("");
    setAttachments([]);
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    if (suggestion.includes("Search")) setEnableSearch(true);
  }, []);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) return null;

  const isStarted = messages.length > 0;
  
  const featureBadges: FeatureBadge[] = [
    { label: "Google Search", enabled: enableSearch, color: "blue" },
    { label: "URL Context", enabled: true, color: "green" },
    { label: "Code Execution", enabled: true, color: "purple" },
  ];

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground bg-grid">
      {/* Header */}
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        isModelOpen={isModelOpen}
        onModelOpenChange={setIsModelOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <TableOfContents messages={messages} />
        
        {/* Conversation Area */}
        <div className={cn("flex-1 overflow-hidden relative", !isStarted && "hidden")}>
          <MessageList messages={messages} isLoading={isLoading} onRegenerate={regenerate} />
        </div>

        {/* Input Area Container */}
        <motion.div
          className={cn(
            "w-full px-4",
            isStarted
              ? "border-t bg-background/80 backdrop-blur-sm pb-6 pt-4"
              : "flex-1 flex flex-col items-center justify-center pb-20"
          )}
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {/* Empty State */}
            {!isStarted && <ChatEmptyState />}

            {/* Attachments Preview */}
            <AttachmentsPreview attachments={attachments} onRemove={removeAttachment} />

            {/* Prompt Input */}
            <motion.div layout className="w-full">
              <PromptInputArea
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                enableSearch={enableSearch}
                onToggleSearch={() => setEnableSearch(!enableSearch)}
                onFilesSelected={handleFileSelect}
              />
            </motion.div>

            {/* Feature Indicators - only show when chat hasn't started */}
            {!isStarted && <FeatureBadgesRow badges={featureBadges} />}

            {/* Suggestions Grid - only show when chat hasn't started */}
            {!isStarted && (
              <SuggestionsGrid
                suggestions={defaultSuggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
