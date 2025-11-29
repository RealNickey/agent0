"use client";

import { useState, useRef, useCallback, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Paperclip,
  Send,
  X,
  Calendar,
  Mail,
  Cloud,
  CheckSquare,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Response } from "@/components/ui/response";
import { cn } from "@/lib/utils";

const quickActions = [
  { icon: Calendar, label: "Schedule meeting", prompt: "Help me schedule a meeting for tomorrow at 2 PM" },
  { icon: Mail, label: "Draft email", prompt: "Help me draft a professional email" },
  { icon: Cloud, label: "Check weather", prompt: "What's the weather forecast for today?" },
  { icon: CheckSquare, label: "Create task", prompt: "Create a task list for my day" },
];

export function ChatInterface() {
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setInputValue(transcript);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const removeFile = useCallback(() => {
    setAttachedFile(null);
    setFileContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleQuickAction = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !fileContent) return;

    let content = inputValue;
    if (fileContent) {
      content = `${inputValue}\n\nFile content:\n${fileContent}`;
    }

    sendMessage(content);

    setInputValue("");
    setAttachedFile(null);
    setFileContent("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [inputValue, fileContent, sendMessage]);

  // Helper to get text content from message parts
  const getMessageContent = (message: typeof messages[0]) => {
    return message.parts
      ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("") ?? "";
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="mx-auto max-w-3xl py-8">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">How can I help you today?</h2>
              <p className="mb-8 text-center text-muted-foreground">
                I&apos;m your AI assistant. Ask me anything or try one of these quick actions.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-auto flex-col gap-2 p-4"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "user" ? (
                      <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                        <p className="whitespace-pre-wrap">{getMessageContent(message)}</p>
                      </div>
                    ) : (
                      <Card className="max-w-[80%] border-border/50 bg-card/50 px-4 py-3 backdrop-blur-sm">
                        <Response>{getMessageContent(message)}</Response>
                      </Card>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <Card className="border-border/50 bg-card/50 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 px-4 py-4 backdrop-blur-lg">
        <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
          {/* Attached File Badge */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <Badge variant="secondary" className="gap-2 pr-1">
                  <Paperclip className="h-3 w-3" />
                  {attachedFile.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-destructive/20"
                    onClick={removeFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Agent0 anything..."
                className="min-h-[52px] max-h-[200px] resize-none rounded-xl border-border/50 bg-muted/50 pr-24 text-base placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.md,.json,.csv,.xml,.html,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.css"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isListening
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={isListening ? stopListening : startListening}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              size="icon"
              className="h-[52px] w-[52px] shrink-0 rounded-xl"
              disabled={(!inputValue.trim() && !fileContent) || isLoading}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {isListening && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-center text-sm text-muted-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                Listening... Click the mic button to stop
              </span>
            </motion.p>
          )}
        </form>
      </div>
    </div>
  );
}
