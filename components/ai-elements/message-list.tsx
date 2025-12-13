"use client";

import { useRef, useEffect, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  FileIcon,
  AlertCircleIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  getMessageTextContent,
  getMessageReasoning,
  getToolInvocations,
  getMessageSources,
  getToolTitle,
} from "@/lib/chat-message-utils";
import type { MyUIMessage } from "@/types/chat";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Weather, WeatherLoading } from "@/components/weather";

type ChatStatus = UseChatHelpers<MyUIMessage>["status"];

export type MessageListProps = {
  messages: MyUIMessage[];
  isLoading: boolean;
  status: ChatStatus;
  onRegenerate: () => void;
  error?: Error | undefined;
};

export function MessageList({ messages, isLoading, status, onRegenerate, error }: MessageListProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const lastMessage = messages[messages.length - 1];
  const showSendingPlaceholder = status === "submitted" && lastMessage?.role === "user";

  useEffect(() => {
    // Find the scroll container after mount - StickToBottom renders a div with overflow-y-auto
    if (wrapperRef.current) {
      // The scrollable element is the first child of StickToBottom (the div with overflow)
      const scrollEl = wrapperRef.current.querySelector('[style*="overflow"]') as HTMLDivElement 
        || wrapperRef.current.firstElementChild as HTMLDivElement;
      if (scrollEl) {
        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = scrollEl;
        setMounted(true);
      }
    }
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full">
      {/* Scroll Progress Indicator */}
      <div className="pointer-events-none absolute left-0 top-0 z-50 w-full">
        <div className="absolute left-0 top-0 h-1 w-full bg-muted/30" />
        {mounted && (
          <ScrollProgress
            containerRef={scrollContainerRef}
            className="absolute top-0 bg-primary"
          />
        )}
      </div>
      <Conversation className="h-full">
        <ConversationContent className="max-w-3xl mx-auto w-full py-10 px-4 lg:px-0 gap-8">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const textContent = getMessageTextContent(message);
            const reasoning = getMessageReasoning(message);
            const toolInvocations = getToolInvocations(message);
            const sources = getMessageSources(message);
            const isLastMessage = lastMessage?.id === message.id;
            const hasAssistantContent =
              message.role !== "assistant"
                ? true
                : Boolean(textContent && textContent.trim()) ||
                  Boolean(reasoning && reasoning.trim()) ||
                  toolInvocations.length > 0 ||
                  sources.length > 0;
            const shouldShowThinkingPlaceholder =
              message.role === "assistant" &&
              isLastMessage &&
              status === "streaming" &&
              !hasAssistantContent;

            return (
              <motion.div
                key={message.id}
                id={`message-${message.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Message from={message.role} className="group">
                  <MessageContent
                    className={cn(
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : ""
                    )}
                  >
                    {message.role === "user" && message.parts && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.parts
                          .filter((part: any) => part.type === "file")
                          .map((part: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-2 py-1 bg-background/20 rounded text-xs"
                            >
                              <FileIcon className="size-3" />
                              <span>Attached file</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {message.role === "assistant" && reasoning && (
                      <Reasoning
                        isStreaming={
                          isLoading && message.id === messages[messages.length - 1]?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoning}</ReasoningContent>
                      </Reasoning>
                    )}

                    {message.role === "assistant" && (() => {
                      const normalizedToolInvocations = toolInvocations.map((ti: any) => {
                        const t = ti.toolInvocation || ti;
                        
                        // Extract tool name - handle both old and new AI SDK formats
                        // Old format: t.toolName exists
                        // New AI SDK 5.0 format: tool name is in type like "tool-displayWeather"
                        let toolName = t.toolName;
                        if (!toolName && t.type && t.type.startsWith("tool-")) {
                          toolName = t.type.replace("tool-", "");
                        }
                        
                        // Normalize state - handle different state formats
                        // New format: "input-available", "output-available", "output-error"
                        // Old format: "call", "result"
                        let state = t.state;
                        if (state === "output-available") state = "result";
                        
                        return {
                          toolCallId: t.toolCallId || `tool-${Date.now()}-${Math.random()}`,
                          toolName: toolName,
                          state: state,
                          args: t.args || t.input,
                          result: t.result || t.output,
                        };
                      });
                      return normalizedToolInvocations.map((toolInvocation: any) => {
                        // Special rendering for Weather tool - wrapped in Tool UI
                        if (toolInvocation.toolName === "displayWeather") {
                          const isCompleted = toolInvocation.state === "result";
                          const hasError = toolInvocation.result?.error === true;
                          
                          return (
                            <div key={toolInvocation.toolCallId} className="flex flex-col gap-2 w-full">
                              <Tool defaultOpen={false}>
                                <ToolHeader
                                  title="Weather Information"
                                  type={"tool-displayWeather" as any}
                                  state={
                                    hasError
                                      ? "output-error"
                                      : isCompleted
                                      ? "output-available"
                                      : "input-available"
                                  }
                                />
                                <ToolContent>
                                  <ToolInput input={toolInvocation.args} />
                                </ToolContent>
                              </Tool>
                              
                              {/* Weather UI rendered outside the Tool component */}
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="w-full"
                              >
                                {isCompleted ? (
                                  <Weather {...toolInvocation.result} />
                                ) : (
                                  <WeatherLoading location={toolInvocation.args?.location} />
                                )}
                              </motion.div>
                            </div>
                          );
                        }
                        // Default tool rendering
                        return (
                          <Tool key={toolInvocation.toolCallId} defaultOpen={false}>
                            <ToolHeader
                              title={getToolTitle(toolInvocation.toolName || "")}
                              type="tool-invocation"
                              state={
                                toolInvocation.state === "result"
                                  ? "output-available"
                                  : "input-available"
                              }
                            />
                            <ToolContent>
                              <ToolInput input={toolInvocation.args} />
                              {toolInvocation.state === "result" && (
                                <ToolOutput
                                  output={toolInvocation.result}
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      });
                    })()}

                    {message.role === "assistant" && sources.length > 0 && (
                      <Sources>
                        <SourcesTrigger count={sources.length} />
                        <SourcesContent>
                          {sources.map((source: any, i: number) => (
                            <Source
                              key={i}
                              href={source.source?.url || source.url}
                              title={source.source?.title || source.title || "Source"}
                            />
                          ))}
                        </SourcesContent>
                      </Sources>
                    )}

                    {message.role === "assistant" ? (
                      hasAssistantContent ? (
                        <MessageResponse>{textContent}</MessageResponse>
                      ) : shouldShowThinkingPlaceholder ? (
                        <ThinkingIndicator />
                      ) : null
                    ) : (
                      <div className="whitespace-pre-wrap">{textContent}</div>
                    )}
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2">
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => navigator.clipboard.writeText(textContent)}
                      >
                        <CopyIcon className="size-3.5" />
                      </MessageAction>
                      <MessageAction tooltip="Regenerate" onClick={() => onRegenerate()}>
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
            );
          })}
          {showSendingPlaceholder && (
            <motion.div
              key="sending-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Message from="assistant">
                <MessageContent className="w-fit">
                  <Shimmer className="text-sm font-medium text-muted-foreground">
                    {"Sending..."}
                  </Shimmer>
                </MessageContent>
              </Message>
            </motion.div>
          )}
          {/* Error Display */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <AlertCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-destructive font-medium">Something went wrong</p>
                <p className="text-sm text-muted-foreground">{error.message || "An error occurred while generating the response."}</p>
                <button
                  onClick={() => onRegenerate()}
                  className="text-sm text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    </div>
  );
}

const ThinkingIndicator = () => (
  <motion.span
    aria-live="polite"
    className="text-sm font-medium text-muted-foreground"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
  >
    Thinking...
  </motion.span>
);
