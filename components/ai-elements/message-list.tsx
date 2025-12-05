"use client";

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
  MessageAttachment,
  MessageAttachments,
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
  FileTextIcon,
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
  return (
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
                    {message.role === "user" && message.parts && (() => {
                      const fileParts = message.parts.filter((part: any) => part.type === "file");
                      if (fileParts.length === 0) return null;
                      
                      return (
                        <MessageAttachments className="mb-2">
                          {fileParts.map((part: any, i: number) => {
                            // Reconstruct the data URL for display
                            const dataUrl = part.data?.startsWith("data:") 
                              ? part.data 
                              : `data:${part.mediaType};base64,${part.data}`;
                            
                            return (
                              <MessageAttachment
                                key={i}
                                data={{
                                  type: "file",
                                  mediaType: part.mediaType,
                                  url: dataUrl,
                                  filename: part.filename || (part.mediaType?.startsWith("image/") ? "Image" : "File"),
                                }}
                              />
                            );
                          })}
                        </MessageAttachments>
                      );
                    })()}

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
                        return {
                          toolCallId: t.toolCallId,
                          toolName: t.toolName,
                          state: t.state,
                          args: t.args,
                          result: t.result,
                        };
                      });
                      return normalizedToolInvocations.map((toolInvocation: any) => (
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
                      ));
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
  );
}
