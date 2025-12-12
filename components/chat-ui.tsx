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
import type { SerializableToolExtension } from "@/lib/tool-registry";

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
  INSTALLED_TOOLS: "agent0-installed-tools",
};

export function ChatUI() {
  const [selectedModel, setSelectedModel] = useState<Model>(models[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Tool management state
  const [availableTools, setAvailableTools] = useState<SerializableToolExtension[]>([]);
  const [installedToolIds, setInstalledToolIds] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<SerializableToolExtension[]>([]);

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
      setSelectedTools([]); // Clear selected tools after message is sent
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
    
    // Load installed tool IDs
    const savedInstalledTools = localStorage.getItem(STORAGE_KEYS.INSTALLED_TOOLS);
    if (savedInstalledTools) {
      try {
        setInstalledToolIds(JSON.parse(savedInstalledTools));
      } catch (e) {
        console.error("Failed to parse installed tools", e);
      }
    }
    
    setIsLoaded(true);
  }, [setMessages]);
  
  // Fetch available tools from API
  useEffect(() => {
    fetch('/api/tools/available')
      .then((res) => res.json())
      .then((tools) => setAvailableTools(tools))
      .catch((err) => console.error('Failed to fetch available tools:', err));
  }, []);
  
  // Get installed tools filtered by installed IDs
  const installedTools = availableTools.filter((tool) => installedToolIds.includes(tool.id));

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

  // Listen for screenshots from browser extension
  useEffect(() => {
    const handleScreenshotMessage = (event: MessageEvent) => {
      // Verify message origin and type
      if (event.data?.type === 'AGENT0_SCREENSHOT') {
        const { screenshot, pageUrl, pageTitle, selectedText } = event.data.data;
        
        // Extract filename from pageTitle or URL
        const filename = `${pageTitle || 'Screenshot'}.png`;
        
        // Create attachment from screenshot
        const screenshotAttachment: FileAttachment = {
          name: filename,
          type: 'image/png',
          size: screenshot.length,
          url: screenshot,
        };
        
        // Add to attachments
        setAttachments((prev) => [...prev, screenshotAttachment]);
        
        // Optionally, pre-fill input with context
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
        
        // Focus the input
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Screenshot received and attached:', {
          pageTitle,
          pageUrl,
          hasSelectedText: !!selectedText
        });
      }
    };
    
    window.addEventListener('message', handleScreenshotMessage);
    return () => window.removeEventListener('message', handleScreenshotMessage);
  }, []);

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

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setAttachments([]);
    setInputValue("");
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  }, [setMessages]);

  const handleSubmit = async (value: { text: string; files: any[]; selectedTools?: SerializableToolExtension[] }) => {
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
    
    // Collect tools to send - either from parameter or state
    const toolsToSend = value.selectedTools || selectedTools;
    
    console.log('[ChatUI] Sending message with tools:', toolsToSend.map(t => t.id));

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
          customTools: toolsToSend.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            icon: tool.icon,
            parameters: tool.parameters,
          })),
        },
      }
    );

    setInputValue("");
    setAttachments([]);
    setSelectedTools([]);
  };
  
  // Tool selection handlers
  const handleToolSelect = useCallback((tool: SerializableToolExtension) => {
    setSelectedTools((prev) => {
      // Don't add if already selected
      if (prev.some((t) => t.id === tool.id)) return prev;
      return [...prev, tool];
    });
  }, []);
  
  const handleToolRemove = useCallback((toolId: string) => {
    setSelectedTools((prev) => prev.filter((t) => t.id !== toolId));
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    if (suggestion.includes("Search")) setEnableSearch(true);
  }, []);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) return null;

  const isStarted = messages.length > 0;
  
  // When custom tools are selected, Google's built-in tools are disabled
  const hasCustomTools = selectedTools.length > 0;
  
  const featureBadges: FeatureBadge[] = hasCustomTools
    ? [
        { label: `${selectedTools.length} Custom Tool${selectedTools.length > 1 ? 's' : ''}`, enabled: true, color: "orange" },
      ]
    : [
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
        onNewChat={handleNewChat}
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
                availableTools={installedTools}
                selectedTools={selectedTools}
                onToolSelect={handleToolSelect}
                onToolRemove={handleToolRemove}
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
