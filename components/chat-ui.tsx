"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { MyUIMessage } from "@/types/chat";

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
  THINKING: "agent0-enable-thinking",
};

export function ChatUI() {
  const [selectedModel, setSelectedModel] = useState<Model>(models[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableThinking, setEnableThinking] = useState(true);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  // File input ref for native FileList handling
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat<MyUIMessage>({
    id: "gemini-chat",
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    experimental_throttle: 50, // Throttle UI updates for better performance
    onFinish: () => {
      setAttachments([]);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const savedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (savedModelId) {
        const model = models.find((m) => m.id === savedModelId);
        if (model) setSelectedModel(model);
      }

      const savedThinking = localStorage.getItem(STORAGE_KEYS.THINKING);
      if (savedThinking != null) {
        setEnableThinking(savedThinking === "true");
      }

      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch (e) {
          console.error("Failed to parse saved messages", e);
          localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        }
      }
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
    setIsLoaded(true);
  }, [setMessages]);

  // Save model to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel.id);
      } catch (e) {
        // Handle quota exceeded or other localStorage errors
        console.error("Failed to save model to localStorage", e);
      }
    }
  }, [selectedModel, isLoaded]);

  // Save thinking preference to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.THINKING, String(enableThinking));
      } catch (e) {
        console.error("Failed to save thinking to localStorage", e);
      }
    }
  }, [enableThinking, isLoaded]);

  // If model doesn't support thinking, force thinking off
  useEffect(() => {
    if (!selectedModel.supportsThinking && enableThinking) {
      setEnableThinking(false);
    }
  }, [selectedModel, enableThinking]);

  // Save messages to local storage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        const serialized = JSON.stringify(messages);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, serialized);
      } catch (e) {
        // Handle quota exceeded - try to clear old messages
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded, clearing old messages");
          try {
            localStorage.removeItem(STORAGE_KEYS.MESSAGES);
          } catch {
            // Ignore errors when clearing
          }
        } else {
          console.error("Failed to save messages to localStorage", e);
        }
      }
    }
  }, [messages, isLoaded]);

  // Listen for extension messages (screenshot + text context)
  useEffect(() => {
    const setControlledTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
      const proto = window.HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      const setter = descriptor?.set;
      if (setter) {
        setter.call(textarea, value);
      } else {
        textarea.value = value;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const handleExtensionMessage = (event: MessageEvent) => {
      // Only accept same-origin messages
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AGENT0_SCREENSHOT') {
        const { screenshot, pageUrl, pageTitle, selectedText } = event.data.data;
        
        const filename = `${pageTitle || 'Screenshot'}.png`;
        const screenshotAttachment: FileAttachment = {
          name: filename,
          type: 'image/png',
          size: screenshot.length,
          url: screenshot,
        };
        
        setAttachments((prev) => [...prev, screenshotAttachment]);
        
        if (selectedText) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle}]\n${selectedText}\n\n${prev}`;
            return context;
          });
        } else if (pageUrl) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle || pageUrl}]\n\n${prev}`;
            return context;
          });
        }
        
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Screenshot received and attached:', {
          pageTitle,
          pageUrl,
          hasSelectedText: !!selectedText
        });
      } else if (event.data?.type === 'AGENT0_CONTEXT_TEXT') {
        const data = event.data?.data || {};
        const selectedText = typeof data.selectedText === "string" ? data.selectedText.trim() : "";
        if (!selectedText) return;

        const context = `${selectedText}\n\n`;
        const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement | null;
        if (!textarea) return;

        const existing = textarea.value || "";
        setControlledTextareaValue(textarea, `${context}${existing}`);
        textarea.focus();
      }
    };
    
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const isLoading = status === "streaming" || status === "submitted";

  // File selection handler - now using native FileList
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to FileAttachment array for preview
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
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setAttachments([]);
    setInputValue("");
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setMessages]);

  // Simplified handleSubmit using AI SDK's new API
  const handleSubmit = async (value: { text: string; files: any[] }) => {
    if (!value.text.trim() && attachments.length === 0) return;

    // Build parts array for the message
    const parts: Array<{ type: "text"; text: string } | { type: "file"; url: string; mediaType: string }> = [];
    
    // Add text part
    if (value.text.trim()) {
      parts.push({ type: "text", text: value.text });
    }

    // Add file parts from attachments (using url for FileUIPart)
    for (const att of attachments) {
      parts.push({
        type: "file",
        url: att.url,
        mediaType: att.type,
      });
    }

    // Use parts-based message for multi-modal content
    sendMessage(
      {
        role: "user",
        parts,
      },
      {
        body: {
          model: selectedModel.id,
          enableSearch,
          enableThinking: selectedModel.supportsThinking ? enableThinking : false,
          enableUrlContext: true,
          enableCodeExecution: true,
        },
      }
    );

    setInputValue("");
    setAttachments([]);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle regenerate/reload
  const handleRegenerate = useCallback(() => {
    regenerate({
      body: {
        model: selectedModel.id,
        enableSearch,
        enableThinking: selectedModel.supportsThinking ? enableThinking : false,
        enableUrlContext: true,
        enableCodeExecution: true,
      },
    });
  }, [regenerate, selectedModel, enableSearch, enableThinking]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    if (suggestion.includes("Search")) setEnableSearch(true);
  }, []);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) return null;

  const isStarted = messages.length > 0;
  
  const featureBadges: FeatureBadge[] = [
    { label: "Google Search", enabled: enableSearch, color: "blue" },
    ...(selectedModel.supportsThinking
      ? [{ label: "Thinking", enabled: enableThinking, color: "amber" as const }]
      : []),
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
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <TableOfContents messages={messages} />
        
        {/* Conversation Area */}
        <div className={cn("flex-1 overflow-hidden relative", !isStarted && "hidden")}>
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            onRegenerate={handleRegenerate}
            status={status}
            error={error}
          />
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
                enableThinking={enableThinking}
                thinkingSupported={selectedModel.supportsThinking}
                onToggleThinking={() => {
                  if (!selectedModel.supportsThinking) return;
                  setEnableThinking((prev) => !prev);
                }}
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
