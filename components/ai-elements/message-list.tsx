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
import { CalendarDraft } from "@/components/ai-elements/calendar-draft";
import { CalendarEvent } from "@/components/ai-elements/calendar-event";
import { EventSchedulingConfirmation } from "@/components/ai-elements/event-scheduling-confirmation";
import { GitHubIssueConfirmation } from "@/components/ai-elements/github-issue-confirmation";
import { GitHubPRConfirmation } from "@/components/ai-elements/github-pr-confirmation";
import { GitHubMergeConfirmation } from "@/components/ai-elements/github-merge-confirmation";
import { GitHubBranchResult } from "@/components/ai-elements/github-branch-result";
import { GitHubPRList } from "@/components/ai-elements/github-pr-list";
import { GitHubRepoList } from "@/components/ai-elements/github-repo-list";
import { GitHubCommentResult } from "@/components/ai-elements/github-comment-result";
import { EmailDraftConfirmation } from "@/components/ai-elements/email-draft-confirmation";
import { FormCreationConfirmation } from "@/components/ai-elements/form-creation-confirmation";
import { FormResponsesList } from "@/components/ai-elements/form-responses-list";
import { FormSummaryCard } from "@/components/ai-elements/form-summary-card";
import { TaskDisplay } from "@/components/ai-elements/task-display";
import { TaskList } from "@/components/ai-elements/task-list";
import { TaskSchedulingConfirmation } from "@/components/ai-elements/task-scheduling-confirmation";
import { TaskDeleteConfirmation } from "@/components/ai-elements/task-delete-confirmation";
import { TaskUpdateConfirmation } from "@/components/ai-elements/task-update-confirmation";
import { TaskCompleteDisplay } from "@/components/ai-elements/task-complete-display";
import { PdfResult } from "@/components/ai-elements/pdf-result";
import { PresentationResult, PresentationLoading } from "@/components/ai-elements/presentation-result";
import { SlidesHeadingConfirmation } from "@/components/ai-elements/slides-heading-confirmation";
import {
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  FileIcon,
  AlertCircleIcon,
  Volume2Icon,
  SquareIcon,
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
import type { MyUIMessage, PdfOperationResult } from "@/types/chat";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Weather, WeatherLoading } from "@/components/weather";
import { ResearchReport, ResearchLoading } from "@/components/ai-elements/research-report";
import { useTTS } from "@/hooks/use-tts";

function ReadAloudButton({ text }: { text: string }) {
  const { isSpeaking, speak, stop } = useTTS();
  return (
    <MessageAction
      tooltip={isSpeaking ? "Stop" : "Read aloud"}
      onClick={() => (isSpeaking ? stop() : speak(text))}
    >
      {isSpeaking ? (
        <SquareIcon className="size-3.5 text-foreground/75" />
      ) : (
        <Volume2Icon className="size-3.5 text-foreground/75" />
      )}
    </MessageAction>
  );
}

function getDisplayTextContent(
  message: MyUIMessage,
  rawTextContent: string,
  toolInvocations: MyUIMessage["parts"]
): string {
  if (message.role !== "assistant") {
    return rawTextContent;
  }

  // Hide fallback text when dedicated Gen UI cards exist
  const SLIDES_TOOL_NAMES = ["createPresentation", "schedulePresentationHeadings"];
  const IMAGE_TOOL_NAMES = ["generateImage"];
  const GEN_UI_TOOL_NAMES = [...SLIDES_TOOL_NAMES, ...IMAGE_TOOL_NAMES];

  const extractToolName = (part: MyUIMessage["parts"][number]): string | null => {
    if (!part || typeof part !== "object") return null;
    if ("type" in part && typeof part.type === "string" && part.type.startsWith("tool-")) {
      return (part.type as string).slice(5);
    }
    if ("toolName" in part && typeof part.toolName === "string") return part.toolName;
    if ("toolInvocation" in part && part.toolInvocation && typeof (part.toolInvocation as any).toolName === "string") {
      return (part.toolInvocation as any).toolName;
    }
    return null;
  };

  const hasGenUITool = toolInvocations.some((part) => {
    const name = extractToolName(part);
    return name !== null && GEN_UI_TOOL_NAMES.includes(name);
  });

  if (!hasGenUITool) {
    return rawTextContent;
  }

  // Check if the tool has produced a result (not just pending)
  const hasGenUIResult = toolInvocations.some((part) => {
    const name = extractToolName(part);
    if (!name || !GEN_UI_TOOL_NAMES.includes(name)) return false;

    const t = (part as any).toolInvocation || part;
    const state = (t as any).state || "";
    const hasResult =
      state === "result" ||
      state === "output-available" ||
      (t as any).result !== undefined ||
      (t as any).output !== undefined;
    return hasResult;
  });

  if (!hasGenUIResult) {
    return rawTextContent;
  }

  const normalizedText = rawTextContent.trim();
  const isClarificationPrompt =
    normalizedText.length > 0 &&
    (/[?]\s*$/.test(normalizedText) ||
      /^(can|could|would|will|do|does|did|is|are|should|which|what|when|where|who|how)\b/i.test(
        normalizedText
      ));

  if (isClarificationPrompt) {
    return normalizedText;
  }

  return "";
}

type ChatStatus = UseChatHelpers<MyUIMessage>["status"];

export type MessageListProps = {
  messages: MyUIMessage[];
  isLoading: boolean;
  status: ChatStatus;
  onRegenerate: () => void;
  error?: Error | undefined;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onRefHydrated?: () => void;
  model?: string;
  hideGenUI?: boolean;
};

export function MessageList({ messages, isLoading, status, onRegenerate, error, containerRef, onRefHydrated, model, hideGenUI = false }: MessageListProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = containerRef || internalScrollContainerRef;
  const [mounted, setMounted] = useState(false);
  
  // Deduplicate messages to prevent React key collisions
  // This can happen during streaming updates or localStorage restoration
  const deduplicatedMessages = messages.reduce((acc, message) => {
    const existingIndex = acc.findIndex(m => m.id === message.id);
    if (existingIndex === -1) {
      acc.push(message);
    } else {
      // Keep the newer version (later in the array = more recent update)
      acc[existingIndex] = message;
    }
    return acc;
  }, [] as MyUIMessage[]);
  
  const lastMessage = deduplicatedMessages[deduplicatedMessages.length - 1];
  const showSendingPlaceholder = status === "submitted" && lastMessage?.role === "user";

  useEffect(() => {
    // Find the scroll container after mount - StickToBottom renders a div with overflow-y-auto
    if (wrapperRef.current) {
      // The scrollable element is the first child of StickToBottom (the div with overflow)
      const scrollEl = wrapperRef.current.querySelector('[style*="overflow"]') as HTMLDivElement 
        || wrapperRef.current.firstElementChild as HTMLDivElement;
      if (scrollEl) {
        if (containerRef) {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = scrollEl;
          onRefHydrated?.();
        } else {
          (internalScrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = scrollEl;
        }
        setMounted(true);
      }
    }
  }, [containerRef, onRefHydrated]);

  return (
    <div ref={wrapperRef} className="relative h-full">
      <Conversation className="h-full">
        <ConversationContent className="max-w-3xl mx-auto w-full py-10 px-4 lg:px-0 gap-8">
        <AnimatePresence initial={false}>
          {deduplicatedMessages.map((message,messageIndex) => {
            const reasoning = getMessageReasoning(message);
            const toolInvocations = getToolInvocations(message);
            const rawTextContent = getMessageTextContent(message);
            const textContent = getDisplayTextContent(message, rawTextContent, toolInvocations);
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
                key={`${message.id}-${messageIndex}`}
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
                        : "text-foreground/75"
                    )}
                  >
                    {message.role === "user" && message.parts && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.parts
                          .filter((part: MyUIMessage["parts"][number]) => "type" in part && part.type === "file")
                          .map((part: MyUIMessage["parts"][number], i: number) => (
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
                          isLoading && message.id === deduplicatedMessages[deduplicatedMessages.length - 1]?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoning}</ReasoningContent>
                      </Reasoning>
                    )}

                    {message.role === "assistant" && (() => {
const seenIds = new Set();
const normalizedToolInvocations = toolInvocations.reduce((acc: any[], ti: any, toolIndex: number) => {
  // Handle nested toolInvocation property or direct tool part
  const t = ti?.toolInvocation || ti;
  if (!t || typeof t !== "object") return acc;

  // Extract tool name from various possible locations
  let toolName = t.toolName || t.name;
  if (!toolName && t.type && typeof t.type === "string" && t.type.startsWith("tool-")) {
    toolName = t.type.replace("tool-", "");
  }
  if (!toolName) {
    console.warn("Tool invocation without toolName:", t);
    return acc; // Skip tools without names
  }

  // Normalize state - be defensive about undefined
  let state = t.state;
  if (state === "output-available") state = "result";
  if (state === "input-available") state = "call";
  if (!state || typeof state !== "string") {
    // Default based on presence of result/output
    const hasResult = t.result !== undefined || t.output !== undefined;
    state = hasResult ? "result" : "call";
  }

  // Generate stable toolCallId
  const toolCallId = t.toolCallId || t.id || `${message.id}-tool-${toolIndex}`;

  // Only add if not duplicate
  if (!seenIds.has(toolCallId)) {
    seenIds.add(toolCallId);
    acc.push({
      toolCallId,
      toolName,
      state,
      args: t.args || t.input || {},
      result: t.result || t.output || null,
    });
  }

  return acc;
}, []);

                      return normalizedToolInvocations.map((toolInvocation: any) => {
                        const isCompleted = toolInvocation.state === "result";
                        const hasError = toolInvocation.result?.error === true;

                        if (!hideGenUI) {
                          // Schedule Calendar Event (with human-in-the-loop confirmation)
                          if (toolInvocation.toolName === "scheduleCalendarEvent" && isCompleted) {
                            const result = toolInvocation.result;
                            if (result.status === "pending_confirmation") {
                              return (
                                <EventSchedulingConfirmation
                                  key={toolInvocation.toolCallId}
                                  toolCallId={toolInvocation.toolCallId}
                                  eventDetails={result.eventDetails}
                                  reasoning={result.reasoning}
                                />
                              );
                            }
                          }

                        // Confirm Scheduled Event (shows success after creation)
                        if (toolInvocation.toolName === "confirmScheduledEvent" && isCompleted) {
                          if (!hasError && toolInvocation.result?.status === "created") {
                            return (
                              <CalendarEvent
                                key={toolInvocation.toolCallId}
                                summary={toolInvocation.result.summary}
                                startTime={toolInvocation.result.startTime}
                                endTime={toolInvocation.result.endTime}
                                link={toolInvocation.result.link}
                              />
                            );
                          }
                        }

                        // Calendar Draft (existing)
                        if (toolInvocation.toolName === "draftCalendarEvent" && isCompleted) {
                           return (
                             <CalendarDraft 
                               key={toolInvocation.toolCallId}
                               draftId={toolInvocation.toolCallId}
                               defaultValues={toolInvocation.result}
                             />
                           );
                        }

                        // Calendar Created
                        if (toolInvocation.toolName === "createCalendarEvent" && isCompleted) {
                          if (!hasError) {
                            return (
                               <CalendarEvent 
                                 key={toolInvocation.toolCallId}
                                 {...toolInvocation.result}
                               />
                            );
                          }
                        }

                        // Compose Email (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "composeEmail" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <EmailDraftConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                emailDetails={result.emailDetails}
                                reasoning={result.reasoning}
                              />
                            );
                          }
                        }

                        // Schedule GitHub Issue Creation (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "scheduleIssueCreation" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <GitHubIssueConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                issueDetails={result.issueDetails}
                                reasoning={result.reasoning}
                                availableRepos={result.availableRepos}
                              />
                            );
                          }
                        }

                        // Schedule GitHub PR Creation (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "schedulePRCreation" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <GitHubPRConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                prDetails={result.prDetails}
                                reasoning={result.reasoning}
                                availableRepos={result.availableRepos}
                                availableBranches={result.availableBranches}
                              />
                            );
                          }
                        }

                        // Schedule GitHub Merge (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "scheduleMerge" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <GitHubMergeConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                mergeDetails={result.mergeDetails}
                                reasoning={result.reasoning}
                              />
                            );
                          }
                        }

                        // GitHub Branch Creation Result
                        if (toolInvocation.toolName === "createBranch" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubBranchResult
                                key={toolInvocation.toolCallId}
                                branch={toolInvocation.result.branch}
                                baseBranch={toolInvocation.result.baseBranch}
                                sha={toolInvocation.result.sha}
                                owner={toolInvocation.result.owner}
                                repo={toolInvocation.result.repo}
                                message={toolInvocation.result.message}
                              />
                            );
                          }
                        }

                        // GitHub List Pull Requests Result
                        if (toolInvocation.toolName === "listPullRequests" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubPRList
                                key={toolInvocation.toolCallId}
                                pullRequests={toolInvocation.result.pullRequests}
                                count={toolInvocation.result.count}
                                owner={toolInvocation.result.owner}
                                repo={toolInvocation.result.repo}
                                message={toolInvocation.result.message}
                              />
                            );
                          }
                        }

                        // GitHub List Repositories Result
                        if (toolInvocation.toolName === "listRepositories" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubRepoList
                                key={toolInvocation.toolCallId}
                                repositories={toolInvocation.result.repositories}
                                count={toolInvocation.result.count}
                                message={toolInvocation.result.message}
                              />
                            );
                          }
                        }

                        // GitHub Comment Result
                        if (toolInvocation.toolName === "commentOnPR" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubCommentResult
                                key={toolInvocation.toolCallId}
                                issueNumber={toolInvocation.args?.issueNumber}
                                url={toolInvocation.result.url}
                                owner={toolInvocation.result.owner}
                                repo={toolInvocation.result.repo}
                                message={toolInvocation.result.message}
                              />
                            );
                          }
                        }

                        // GitHub Issue Creation (direct) — show success Gen UI
                        if (toolInvocation.toolName === "createIssue" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubIssueConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                issueDetails={{
                                  owner: toolInvocation.result.owner,
                                  repo: toolInvocation.result.repo,
                                  title: toolInvocation.result.title,
                                }}
                                reasoning="Issue created directly"
                              />
                            );
                          }
                        }

                        // GitHub PR Creation (direct) — show success Gen UI
                        if (toolInvocation.toolName === "createPullRequest" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return (
                              <GitHubPRConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                prDetails={{
                                  owner: toolInvocation.result.owner,
                                  repo: toolInvocation.result.repo,
                                  title: toolInvocation.result.title,
                                  head: toolInvocation.args?.head || "",
                                  base: toolInvocation.args?.base || "main",
                                }}
                                reasoning="PR created directly"
                              />
                            );
                          }
                        }

                        // GitHub Merge (direct) — show success Gen UI
                        if (toolInvocation.toolName === "mergePullRequest" && isCompleted) {
                          if (!hasError && toolInvocation.result?.success) {
                            return null; // Handled by scheduleMerge
                          }
                        }

                        // Confirm Send Email (shows success after sending)
                        if (toolInvocation.toolName === "confirmSendEmail" && isCompleted) {
                          if (!hasError && toolInvocation.result?.status === "sent") {
                            // Show a success message - the UI already shows it in EmailDraftConfirmation
                            // We can render a simple success indicator here if needed
                            return null; // The component handles the success state
                          }
                        }

                        // Create Survey Form (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "createSurveyForm" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <FormCreationConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                formData={result.formData}
                                reasoning={result.reasoning}
                              />
                            );
                          }
                        }

                        // Confirm Create Form (shows success after creation)
                        if (toolInvocation.toolName === "confirmCreateForm" && isCompleted) {
                          if (!hasError && toolInvocation.result?.status === "created") {
                            // The form was created successfully
                            // Could render a success card here if desired
                            return null; // FormCreationConfirmation handles the success state
                          }
                        }

                        // Fetch Form Responses
                        if (toolInvocation.toolName === "fetchNewResponses" && isCompleted) {
                          if (!hasError) {
                            return (
                              <FormResponsesList
                                key={toolInvocation.toolCallId}
                                formId={toolInvocation.result.formId}
                                responseCount={toolInvocation.result.responseCount}
                                responses={toolInvocation.result.responses}
                                checkedAt={toolInvocation.result.checkedAt}
                              />
                            );
                          }
                        }

                        // Get Response Summary
                        if (toolInvocation.toolName === "getResponseSummary" && isCompleted) {
                          if (!hasError) {
                            return (
                              <FormSummaryCard
                                key={toolInvocation.toolCallId}
                                formId={toolInvocation.result.formId}
                                formTitle={toolInvocation.result.formTitle}
                                totalResponses={toolInvocation.result.totalResponses}
                                questionCount={toolInvocation.result.questionCount}
                                responderUri={toolInvocation.result.responderUri}
                                firstResponseAt={toolInvocation.result.firstResponseAt}
                                lastResponseAt={toolInvocation.result.lastResponseAt}
                                questionSummaries={toolInvocation.result.questionSummaries}
                              />
                            );
                          }
                        }

                        // Schedule Task (with human-in-the-loop confirmation)
                        if (toolInvocation.toolName === "scheduleTask" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <TaskSchedulingConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                taskDetails={result.taskDetails}
                                reasoning={result.reasoning}
                                conflictingTasks={result.conflictingTasks}
                                conflictWarning={result.conflictWarning}
                                needsTimeInput={result.needsTimeInput}
                              />
                            );
                          }
                        }

                        // Confirm Scheduled Task (shows success after creation)
                        if (toolInvocation.toolName === "confirmScheduledTask" && isCompleted) {
                          if (!hasError && toolInvocation.result?.status === "created") {
                            return (
                              <TaskDisplay
                                key={toolInvocation.toolCallId}
                                taskId={toolInvocation.result.taskId}
                                title={toolInvocation.result.title}
                                notes={toolInvocation.result.notes}
                                due={toolInvocation.result.due}
                                priority={toolInvocation.result.priority}
                                status="needsAction"
                                isNew={true}
                              />
                            );
                          }
                        }

                        // Create Task
                        if (toolInvocation.toolName === "createTask" && isCompleted) {
                          if (!hasError) {
                            return (
                              <TaskDisplay
                                key={toolInvocation.toolCallId}
                                taskId={toolInvocation.result.taskId}
                                title={toolInvocation.result.title}
                                notes={toolInvocation.result.notes}
                                due={toolInvocation.result.due}
                                priority={toolInvocation.result.priority}
                                status={toolInvocation.result.status || "needsAction"}
                                isNew={true}
                              />
                            );
                          }
                        }

                        // List Tasks - only show when explicitly listing
                        if (toolInvocation.toolName === "listTasks" && isCompleted) {
                          if (!hasError) {
                            return (
                              <TaskList
                                key={toolInvocation.toolCallId}
                                tasks={toolInvocation.result.tasks}
                                taskCount={toolInvocation.result.taskCount}
                                pendingCount={toolInvocation.result.pendingCount}
                                completedCount={toolInvocation.result.completedCount}
                                message={toolInvocation.result.message}
                              />
                            );
                          }
                        }

                        // Complete Task - show completed task display
                        if (toolInvocation.toolName === "completeTask" && isCompleted) {
                          if (!hasError) {
                            return (
                              <TaskCompleteDisplay
                                key={toolInvocation.toolCallId}
                                taskId={toolInvocation.result.taskId}
                                title={toolInvocation.result.title}
                                completedAt={toolInvocation.result.completedAt}
                              />
                            );
                          }
                        }

                        // Update Task (with HITL confirmation)
                        if (toolInvocation.toolName === "updateTask" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation" && result.action === "update") {
                            return (
                              <TaskUpdateConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                currentTask={result.currentTask}
                                proposedChanges={result.proposedChanges}
                                message={result.message}
                              />
                            );
                          }
                          // If update was confirmed and successful
                          if (!hasError && result.taskId) {
                            return (
                              <TaskDisplay
                                key={toolInvocation.toolCallId}
                                taskId={result.taskId}
                                title={result.title}
                                notes={result.notes}
                                due={result.due}
                                priority={result.priority}
                                status="needsAction"
                                isNew={false}
                              />
                            );
                          }
                        }

                        // Delete Task (with HITL confirmation)
                        if (toolInvocation.toolName === "deleteTask" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result.status === "pending_confirmation") {
                            return (
                              <TaskDeleteConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                taskDetails={result.taskDetails}
                                message={result.message}
                              />
                            );
                          }
                          // If delete was successful, don't show anything (task is gone)
                          if (!hasError && result.deleted) {
                            return null;
                          }
                        }

                        // PDF tools are now rendered from message.metadata.pdfResult (see below)
                        // Skip any legacy PDF tool parts that may still be in history
                        if (toolInvocation.toolName === "mergePDFs" || toolInvocation.toolName === "compressPDF") {
                          return null;
                        }

                        // Special rendering for Weather tool - wrapped in Tool UI
                        if (toolInvocation.toolName === "displayWeather") {
                          
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

                        // Special rendering for Research tool - wrapped in Tool UI
                        if (toolInvocation.toolName === "conductResearch") {
                          return (
                            <div key={toolInvocation.toolCallId} className="flex flex-col gap-2 w-full">
                              <Tool defaultOpen={false}>
                                <ToolHeader
                                  title="Research Report"
                                  type={"tool-conductResearch" as any}
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
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="w-full"
                              >
                                {isCompleted ? (
                                  <ResearchReport {...toolInvocation.result} />
                                ) : (
                                  <ResearchLoading query={toolInvocation.args?.query} />
                                )}
                              </motion.div>
                            </div>
                          );
                        }

                        // Special rendering for Presentation tool - wrapped in Tool UI
                        if (toolInvocation.toolName === "schedulePresentationHeadings" && isCompleted) {
                          const result = toolInvocation.result;
                          if (result?.status === "pending_confirmation") {
                            return (
                              <SlidesHeadingConfirmation
                                key={toolInvocation.toolCallId}
                                toolCallId={toolInvocation.toolCallId}
                                presentationDetails={result.presentationDetails}
                                reasoning={result.reasoning}
                                model={model}
                              />
                            );
                          }
                        }

                        // Special rendering for Presentation tool - wrapped in Tool UI
                        if (toolInvocation.toolName === "createPresentation") {
                          return (
                            <div key={toolInvocation.toolCallId} className="flex flex-col gap-2 w-full">
                              <Tool defaultOpen={false}>
                                <ToolHeader
                                  title="Create Presentation"
                                  type={"tool-createPresentation" as any}
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
                              
                              {/* Presentation UI rendered outside the Tool component */}
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="w-full"
                              >
                                {isCompleted ? (
                                  <PresentationResult {...toolInvocation.result} />
                                ) : (
                                  <PresentationLoading title={toolInvocation.args?.title} />
                                )}
                              </motion.div>
                            </div>
                          );
                        }

                        } // End of !hideGenUI block

                        // generateImage is always rendered in the gen-ui stack — hide the raw tool part
                        if (toolInvocation.toolName === "generateImage") {
                          return null;
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

                    {/* PDF Result from metadata (not tool parts) */}
                    {!hideGenUI && message.role === "assistant" && (message.metadata as any)?.pdfResult && (() => {
                      const pdf = (message.metadata as any).pdfResult as PdfOperationResult;
                      if (pdf.error) return null; // Error already shown in text content
                      
                      if (pdf.operation === "merge" && pdf.fileName && pdf.fileUrl) {
                        return (
                          <PdfResult
                            key={`pdf-merge-${message.id}`}
                            operation="merge"
                            fileName={pdf.fileName}
                            fileUrl={pdf.fileUrl}
                            pageCount={pdf.pageCount}
                            fileSize={pdf.fileSize}
                            message={pdf.message}
                            inputFileCount={pdf.inputFileCount}
                          />
                        );
                      }
                      
                      if (pdf.operation === "compress" && pdf.results && pdf.results.length > 0) {
                        return (
                          <div className="flex flex-col gap-3 w-full">
                            {pdf.results.map((r, i) => (
                              <PdfResult
                                key={`pdf-compress-${message.id}-${i}`}
                                operation="compress"
                                fileName={r.fileName}
                                fileUrl={r.fileUrl}
                                pageCount={r.pageCount}
                                originalSize={r.originalSize}
                                compressedSize={r.compressedSize}
                                compressionRatio={r.compressionRatio}
                                message={`${r.originalSize} → ${r.compressedSize} (${r.compressionRatio}% reduction)`}
                              />
                            ))}
                          </div>
                        );
                      }
                      
                      return null;
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
                        <MessageResponse className="text-foreground/75">{textContent}</MessageResponse>
                      ) : shouldShowThinkingPlaceholder ? (
                        <ThinkingIndicator />
                      ) : null
                    ) : (
                      <div className="whitespace-pre-wrap text-lg leading-relaxed text-foreground/75">{textContent}</div>
                    )}
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2">
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => navigator.clipboard.writeText(textContent)}
                      >
                        <CopyIcon className="size-3.5 text-foreground/75" />
                      </MessageAction>
                      {textContent && <ReadAloudButton text={textContent} />}
                      <MessageAction tooltip="Regenerate" onClick={() => onRegenerate()}>
                        <RefreshCwIcon className="size-3.5 text-foreground/75" />
                      </MessageAction>
                      <div className="flex-1" />
                      <MessageAction tooltip="Good response">
                        <ThumbsUpIcon className="size-3.5 text-foreground/75" />
                      </MessageAction>
                      <MessageAction tooltip="Bad response">
                        <ThumbsDownIcon className="size-3.5 text-foreground/75" />
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
                  <Shimmer className="text-lg font-medium text-foreground/60">
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
                <p className="text-base text-foreground font-medium">Something went wrong</p>
                <p className="text-base text-foreground/80">{error.message || "An error occurred while generating the response."}</p>
                <button
                  onClick={() => onRegenerate()}
                  className="text-base text-primary hover:underline"
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
    className="text-lg font-medium text-foreground/60"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
  >
    Thinking...
  </motion.span>
);
