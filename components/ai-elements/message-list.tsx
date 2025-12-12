"use client";

import { useRef, useEffect, useState } from "react";
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
import { Weather } from "@/components/weather";
import {
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  FileIcon,
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

export type MessageListProps = {
  messages: any[];
  isLoading: boolean;
  onRegenerate: () => void;
};

export function MessageList({ messages, isLoading, onRegenerate }: MessageListProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

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

                    {/* Render AI SDK 5.0 typed tool parts (tool-${toolName}) */}
                    {message.role === "assistant" && message.parts && message.parts.map((part: any, index: number) => {
                      // Check for typed tool parts: tool-displayWeather
                      if (part.type === 'tool-displayWeather') {
                        switch (part.state) {
                          case 'input-available':
                            return <div key={index} className="my-4 p-4 bg-muted/50 rounded-lg">Loading weather...</div>;
                          case 'output-available':
                            return (
                              <div key={index} className="my-4">
                                <Weather {...part.output} />
                              </div>
                            );
                          case 'output-error':
                            return <div key={index} className="my-4 p-4 bg-destructive/10 text-destructive rounded-lg">Error: {part.errorText}</div>;
                          default:
                            return null;
                        }
                      }
                      return null;
                    })}

                    {/* Fallback: Render legacy tool-invocation parts */}
                    {message.role === "assistant" && toolInvocations.length > 0 && (() => {
                      const normalizedToolInvocations = toolInvocations
                        .map((ti: any) => {
                          // Legacy shape (registry UI components) sometimes wrap the invocation
                          // in a `toolInvocation` property.
                          const t = ti?.toolInvocation ?? ti;

                          const toolCallId = t?.toolCallId ?? t?.toolCallID ?? t?.id;
                          const toolName = t?.toolName;

                          // AI SDK ToolUIPart uses `input`/`output` and a state like
                          // 'input-available' | 'output-available' | 'output-error'.
                          const input = t?.input ?? t?.args;
                          const output = t?.output ?? t?.result;
                          const errorText = t?.errorText;

                          // Normalize common state values.
                          const rawState: string | undefined = t?.state;
                          const state =
                            rawState === "result"
                              ? "output-available"
                              : rawState === "call"
                                ? "input-available"
                                : rawState ?? (output != null ? "output-available" : "input-available");

                          return {
                            toolCallId,
                            toolName,
                            type: "tool-invocation",
                            state,
                            input,
                            output,
                            errorText,
                          };
                        })
                        .filter((t: any) => t.toolCallId)
                        // Filter out displayWeather to avoid duplicate rendering (handled above)
                        .filter((t: any) => t.toolName !== 'displayWeather');

                      return normalizedToolInvocations.map((toolInvocation: any) => {
                        
                        return (
                        <Tool key={toolInvocation.toolCallId} defaultOpen={false}>
                          <ToolHeader
                            title={getToolTitle(toolInvocation.toolName || "")}
                            type={toolInvocation.type}
                            state={toolInvocation.state as any}
                          />
                          <ToolContent>
                            <ToolInput input={toolInvocation.input} />
                            {(toolInvocation.state === "output-available" ||
                              toolInvocation.state === "output-error") && (
                              <ToolOutput
                                output={toolInvocation.output}
                                errorText={toolInvocation.errorText}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      )});
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
                      <MessageResponse>{textContent}</MessageResponse>
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
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
  );
}
