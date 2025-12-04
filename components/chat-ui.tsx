"use client";

import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputButton,
  PromptInputTools,
  PromptInputSpeechButton,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
  ModelSelectorGroup,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  PaperclipIcon,
  GlobeIcon,
  TreePine,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

const models = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google" },
];

export function ChatUI() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const handleSubmit = async (value: { text: string; files: any[] }) => {
    if (!value.text.trim() && value.files.length === 0) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content: value.text,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a simulated response. I am an AI assistant styled with Vercel-like aesthetics. How can I help you today?",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const isStarted = messages.length > 0;

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground bg-grid">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4 lg:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <TreePine className="size-4" />
          </div>
          <span className="font-semibold text-sm">Agent0</span>
        </div>
        
        <ModelSelector open={isModelOpen} onOpenChange={setIsModelOpen}>
          <ModelSelectorTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full border-dashed px-3 bg-background/50 backdrop-blur-sm">
              <ModelSelectorLogo provider={selectedModel.provider} />
              <span className="text-xs font-medium">{selectedModel.name}</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent>
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList>
              <ModelSelectorEmpty>No model found.</ModelSelectorEmpty>
              <ModelSelectorGroup heading="Models">
                {models.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      setSelectedModel(model);
                      setIsModelOpen(false);
                    }}
                    className="gap-2"
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    {selectedModel.id === model.id && (
                      <CheckIcon className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        <div className="flex items-center gap-2">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Conversation Area */}
        <div className={cn("flex-1 overflow-hidden relative", !isStarted && "hidden")}>
          <Conversation className="h-full">
            <ConversationContent className="max-w-3xl mx-auto w-full py-10 px-4 lg:px-0 gap-8">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Message from={message.role} className="group">
                      <MessageContent className={cn(
                        message.role === "user" ? "bg-primary text-primary-foreground shadow-sm" : ""
                      )}>
                        {message.role === "assistant" ? (
                            <MessageResponse>{message.content}</MessageResponse>
                        ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </MessageContent>
                      {message.role === "assistant" && (
                        <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2">
                          <MessageAction tooltip="Copy">
                            <CopyIcon className="size-3.5" />
                          </MessageAction>
                          <MessageAction tooltip="Regenerate">
                            <RefreshCwIcon className="size-3.5" />
                          </MessageAction>
                          <div className="flex-1" />
                          <MessageAction tooltip="Good response">
                            <ThumbsUpIcon className="size-3.5" />
                          </MessageAction>
                          <MessageAction tooltip="Bad response">
                            <ThumbsDownIcon className="size-3.5" />
                          </MessageAction>
                        </MessageActions>
                      )}
                    </Message>
                  </motion.div>
                ))}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Message from="assistant">
                            <MessageContent className="w-fit">
                                <div className="flex items-center gap-1 h-6">
                                    <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="size-1.5 rounded-full bg-foreground/40 animate-bounce" />
                                </div>
                            </MessageContent>
                        </Message>
                    </motion.div>
                )}
              </AnimatePresence>
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
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
            {!isStarted && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-2"
              >
                <h1 className="text-3xl font-semibold tracking-tight">How can I help you today?</h1>
                <p className="text-muted-foreground">Ask me anything about code, design, or writing.</p>
              </motion.div>
            )}

            <motion.div layout className="w-full">
              <PromptInput
                onSubmit={handleSubmit}
                className="rounded-2xl border shadow-sm bg-background focus-within:ring-1 focus-within:ring-ring transition-all"
              >
                <PromptInputTextarea 
                    className="min-h-[50px] max-h-[200px] py-4 text-base sm:text-sm resize-none border-none focus-visible:ring-0 shadow-none" 
                    placeholder="Send a message..."
                />
                <PromptInputFooter className="px-3 pb-3 pt-0 border-none">
                  <PromptInputTools>
                    <PromptInputButton tooltip="Attach file">
                      <PaperclipIcon className="size-4" />
                    </PromptInputButton>
                    <PromptInputButton tooltip="Search web">
                      <GlobeIcon className="size-4" />
                    </PromptInputButton>
                    <PromptInputSpeechButton />
                  </PromptInputTools>
                  <PromptInputSubmit 
                    className="rounded-full" 
                    status={isLoading ? "streaming" : "ready"}
                  />
                </PromptInputFooter>
              </PromptInput>
            </motion.div>

            {!isStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full"
              >
                {["Explain quantum computing", "Write a poem about code", "Debug a React component", "Design a logo concept"].map((suggestion) => (
                    <button 
                        key={suggestion} 
                        onClick={() => handleSubmit({ text: suggestion, files: [] })}
                        className="flex items-center justify-start px-4 py-3 text-sm text-left border rounded-xl hover:bg-accent/50 transition-colors bg-background/50 backdrop-blur-sm"
                    >
                        {suggestion}
                    </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
