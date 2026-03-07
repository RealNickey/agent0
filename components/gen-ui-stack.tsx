"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { MyUIMessage, PdfOperationResult, ConvertOperationResult } from "@/types/chat";
import { getToolInvocations } from "@/lib/chat-message-utils";

// Import all the Gen UI components
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
import { ImageGenerationLoading, ImageGenerationResult, ImageGeneration } from "@/components/ai-elements/image-generation";
import { Weather, WeatherLoading } from "@/components/weather";
import { MovieCard, MovieCardLoading } from "@/components/movie-card";
import { ConvertResult } from "@/components/convert-result";

export type GenUIItem = {
  id: string;
  type: string;
  component: React.ReactNode;
  timestamp: number;
};

export function extractGenUIs(messages: MyUIMessage[], model?: string): GenUIItem[] {
  const items: GenUIItem[] = [];
  const seenIds = new Set<string>();

  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;

    const toolInvocations = getToolInvocations(message);
    
    const normalizedToolInvocations = toolInvocations.reduce((acc: any[], ti: any, toolIndex: number) => {
      const t = ti?.toolInvocation || ti;
      if (!t || typeof t !== "object") return acc;

      let toolName = t.toolName || t.name;
      if (!toolName && t.type && typeof t.type === "string" && t.type.startsWith("tool-")) {
        toolName = t.type.replace("tool-", "");
      }
      if (!toolName) return acc;

      let state = t.state;
      if (state === "output-available") state = "result";
      if (state === "input-available") state = "call";
      if (!state || typeof state !== "string") {
        const hasResult = t.result !== undefined || t.output !== undefined;
        state = hasResult ? "result" : "call";
      }

      const toolCallId = t.toolCallId || t.id || `${message.id}-tool-${toolIndex}`;

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

    normalizedToolInvocations.forEach((toolInvocation: any) => {
      const isCompleted = toolInvocation.state === "result";
      const hasError = toolInvocation.result?.error === true;
      let component: React.ReactNode = null;

      if (toolInvocation.toolName === "scheduleCalendarEvent" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <EventSchedulingConfirmation toolCallId={toolInvocation.toolCallId} eventDetails={result.eventDetails} reasoning={result.reasoning} />;
        }
      } else if (toolInvocation.toolName === "confirmScheduledEvent" && isCompleted && !hasError && toolInvocation.result?.status === "created") {
        component = <CalendarEvent summary={toolInvocation.result.summary} startTime={toolInvocation.result.startTime} endTime={toolInvocation.result.endTime} link={toolInvocation.result.link} />;
      } else if (toolInvocation.toolName === "draftCalendarEvent" && isCompleted) {
        component = <CalendarDraft draftId={toolInvocation.toolCallId} defaultValues={toolInvocation.result} />;
      } else if (toolInvocation.toolName === "createCalendarEvent" && isCompleted && !hasError) {
        component = <CalendarEvent {...toolInvocation.result} />;
      } else if (toolInvocation.toolName === "composeEmail" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <EmailDraftConfirmation toolCallId={toolInvocation.toolCallId} emailDetails={result.emailDetails} reasoning={result.reasoning} />;
        }
      } else if (toolInvocation.toolName === "scheduleIssueCreation" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <GitHubIssueConfirmation toolCallId={toolInvocation.toolCallId} issueDetails={result.issueDetails} reasoning={result.reasoning} availableRepos={result.availableRepos} />;
        }
      } else if (toolInvocation.toolName === "schedulePRCreation" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <GitHubPRConfirmation toolCallId={toolInvocation.toolCallId} prDetails={result.prDetails} reasoning={result.reasoning} availableRepos={result.availableRepos} availableBranches={result.availableBranches} />;
        }
      } else if (toolInvocation.toolName === "scheduleMerge" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <GitHubMergeConfirmation toolCallId={toolInvocation.toolCallId} mergeDetails={result.mergeDetails} reasoning={result.reasoning} />;
        }
      } else if (toolInvocation.toolName === "createBranch" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubBranchResult branch={toolInvocation.result.branch} baseBranch={toolInvocation.result.baseBranch} sha={toolInvocation.result.sha} owner={toolInvocation.result.owner} repo={toolInvocation.result.repo} message={toolInvocation.result.message} />;
      } else if (toolInvocation.toolName === "listPullRequests" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubPRList pullRequests={toolInvocation.result.pullRequests} count={toolInvocation.result.count} owner={toolInvocation.result.owner} repo={toolInvocation.result.repo} message={toolInvocation.result.message} />;
      } else if (toolInvocation.toolName === "listRepositories" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubRepoList repositories={toolInvocation.result.repositories} count={toolInvocation.result.count} message={toolInvocation.result.message} />;
      } else if (toolInvocation.toolName === "commentOnPR" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubCommentResult issueNumber={toolInvocation.args?.issueNumber} url={toolInvocation.result.url} owner={toolInvocation.result.owner} repo={toolInvocation.result.repo} message={toolInvocation.result.message} />;
      } else if (toolInvocation.toolName === "createIssue" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubIssueConfirmation toolCallId={toolInvocation.toolCallId} issueDetails={{ owner: toolInvocation.result.owner, repo: toolInvocation.result.repo, title: toolInvocation.result.title }} reasoning="Issue created directly" />;
      } else if (toolInvocation.toolName === "createPullRequest" && isCompleted && !hasError && toolInvocation.result?.success) {
        component = <GitHubPRConfirmation toolCallId={toolInvocation.toolCallId} prDetails={{ owner: toolInvocation.result.owner, repo: toolInvocation.result.repo, title: toolInvocation.result.title, head: toolInvocation.args?.head || "", base: toolInvocation.args?.base || "main" }} reasoning="PR created directly" />;
      } else if (toolInvocation.toolName === "createSurveyForm" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <FormCreationConfirmation toolCallId={toolInvocation.toolCallId} formData={result.formData} reasoning={result.reasoning} />;
        }
      } else if (toolInvocation.toolName === "fetchNewResponses" && isCompleted && !hasError) {
        component = <FormResponsesList formId={toolInvocation.result.formId} responseCount={toolInvocation.result.responseCount} responses={toolInvocation.result.responses} checkedAt={toolInvocation.result.checkedAt} />;
      } else if (toolInvocation.toolName === "getResponseSummary" && isCompleted && !hasError) {
        component = <FormSummaryCard formId={toolInvocation.result.formId} formTitle={toolInvocation.result.formTitle} totalResponses={toolInvocation.result.totalResponses} questionCount={toolInvocation.result.questionCount} responderUri={toolInvocation.result.responderUri} firstResponseAt={toolInvocation.result.firstResponseAt} lastResponseAt={toolInvocation.result.lastResponseAt} questionSummaries={toolInvocation.result.questionSummaries} />;
      } else if (toolInvocation.toolName === "scheduleTask" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <TaskSchedulingConfirmation toolCallId={toolInvocation.toolCallId} taskDetails={result.taskDetails} reasoning={result.reasoning} conflictingTasks={result.conflictingTasks} conflictWarning={result.conflictWarning} needsTimeInput={result.needsTimeInput} />;
        }
      } else if (toolInvocation.toolName === "confirmScheduledTask" && isCompleted && !hasError && toolInvocation.result?.status === "created") {
        component = <TaskDisplay taskId={toolInvocation.result.taskId} title={toolInvocation.result.title} notes={toolInvocation.result.notes} due={toolInvocation.result.due} priority={toolInvocation.result.priority} status="needsAction" isNew={true} />;
      } else if (toolInvocation.toolName === "createTask" && isCompleted && !hasError) {
        component = <TaskDisplay taskId={toolInvocation.result.taskId} title={toolInvocation.result.title} notes={toolInvocation.result.notes} due={toolInvocation.result.due} priority={toolInvocation.result.priority} status={toolInvocation.result.status || "needsAction"} isNew={true} />;
      } else if (toolInvocation.toolName === "listTasks" && isCompleted && !hasError) {
        component = <TaskList tasks={toolInvocation.result.tasks} taskCount={toolInvocation.result.taskCount} pendingCount={toolInvocation.result.pendingCount} completedCount={toolInvocation.result.completedCount} message={toolInvocation.result.message} />;
      } else if (toolInvocation.toolName === "completeTask" && isCompleted && !hasError) {
        component = <TaskCompleteDisplay taskId={toolInvocation.result.taskId} title={toolInvocation.result.title} completedAt={toolInvocation.result.completedAt} />;
      } else if (toolInvocation.toolName === "updateTask" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation" && result.action === "update") {
          component = <TaskUpdateConfirmation toolCallId={toolInvocation.toolCallId} currentTask={result.currentTask} proposedChanges={result.proposedChanges} message={result.message} />;
        } else if (!hasError && result.taskId) {
          component = <TaskDisplay taskId={result.taskId} title={result.title} notes={result.notes} due={result.due} priority={result.priority} status="needsAction" isNew={false} />;
        }
      } else if (toolInvocation.toolName === "deleteTask" && isCompleted) {
        const result = toolInvocation.result;
        if (result.status === "pending_confirmation") {
          component = <TaskDeleteConfirmation toolCallId={toolInvocation.toolCallId} taskDetails={result.taskDetails} message={result.message} />;
        }
      } else if (toolInvocation.toolName === "displayWeather") {
        component = isCompleted ? <Weather {...toolInvocation.result} /> : <WeatherLoading location={toolInvocation.args?.location} />;
      } else if (toolInvocation.toolName === "searchMovie") {
        component = isCompleted ? <MovieCard {...toolInvocation.result} /> : <MovieCardLoading title={toolInvocation.args?.title} />;
      } else if (toolInvocation.toolName === "schedulePresentationHeadings" && isCompleted) {
        const result = toolInvocation.result;
        if (result?.status === "pending_confirmation") {
          component = <SlidesHeadingConfirmation toolCallId={toolInvocation.toolCallId} presentationDetails={result.presentationDetails} reasoning={result.reasoning} model={model} />;
        }
      } else if (toolInvocation.toolName === "createPresentation") {
        component = isCompleted ? <PresentationResult {...toolInvocation.result} /> : <PresentationLoading title={toolInvocation.args?.title} />;
      } else if (toolInvocation.toolName === "generateImage") {
        // Single stable node — no AnimatePresence, no layout shift
        component = (
          <ImageGeneration
            key={toolInvocation.toolCallId}
            isReady={isCompleted}
            prompt={toolInvocation.args?.prompt}
            {...(isCompleted ? toolInvocation.result : {})}
          />
        );
      }

      if (component) {
        items.push({
          id: toolInvocation.toolCallId,
          type: toolInvocation.toolName,
          component,
          timestamp: message.metadata?.createdAt || Date.now() + messageIndex,
        });
      }
    });

    // PDF Result from metadata
    if ((message.metadata as any)?.pdfResult) {
      const pdf = (message.metadata as any).pdfResult as PdfOperationResult;
      if (!pdf.error) {
        if (pdf.operation === "merge" && pdf.fileName && pdf.fileUrl) {
          items.push({
            id: `pdf-merge-${message.id}`,
            type: "pdf-merge",
            component: <PdfResult operation="merge" fileName={pdf.fileName} fileUrl={pdf.fileUrl} pageCount={pdf.pageCount} fileSize={pdf.fileSize} message={pdf.message} inputFileCount={pdf.inputFileCount} />,
            timestamp: message.metadata?.createdAt || Date.now() + messageIndex,
          });
        } else if (pdf.operation === "compress" && pdf.results && pdf.results.length > 0) {
          items.push({
            id: `pdf-compress-${message.id}`,
            type: "pdf-compress",
            component: (
              <div className="flex flex-col gap-3 w-full">
                {pdf.results.map((r, i) => (
                  <PdfResult key={`pdf-compress-${message.id}-${i}`} operation="compress" fileName={r.fileName} fileUrl={r.fileUrl} pageCount={r.pageCount} originalSize={r.originalSize} compressedSize={r.compressedSize} compressionRatio={r.compressionRatio} message={`${r.originalSize} → ${r.compressedSize} (${r.compressionRatio}% reduction)`} />
                ))}
              </div>
            ),
            timestamp: message.metadata?.createdAt || Date.now() + messageIndex,
          });
        }
      }
    }

    // Convert Result from metadata
    if ((message.metadata as any)?.convertResult) {
      const conv = (message.metadata as any).convertResult as ConvertOperationResult;
      // Resolve the data URL from window ref
      let resolvedUrl = conv.fileUrl;
      if (typeof window !== "undefined" && conv.fileUrl?.startsWith("__convert_ref__:")) {
        const refId = conv.fileUrl.replace("__convert_ref__:", "");
        resolvedUrl = (window as any).__convertResults?.[refId] || conv.fileUrl;
      }

      // Resolve multi-output refs
      let resolvedOutputs = conv.outputs;
      if (typeof window !== "undefined" && conv.outputs?.length) {
        resolvedOutputs = conv.outputs.map((out) => {
          if (out.fileUrl?.startsWith("__convert_ref__:")) {
            const outRef = out.fileUrl.replace("__convert_ref__:", "");
            return { ...out, fileUrl: (window as any).__convertResults?.[outRef] || out.fileUrl };
          }
          return out;
        });
      }

      items.push({
        id: `convert-${message.id}`,
        type: "convert",
        component: <ConvertResult {...conv} fileUrl={resolvedUrl} outputs={resolvedOutputs} />,
        timestamp: message.metadata?.createdAt || Date.now() + messageIndex,
      });
    }
  });

  return items;
}

// ─── GenUIStack ──────────────────────────────────────────────────────────────
// Shows 1 card at a time — fully visible, interactive.
// Scroll wheel swaps cards; active card exits "up and behind" with a 3-D tilt.
// ─────────────────────────────────────────────────────────────────────────────

export function GenUIStack({ items }: { items: GenUIItem[] }) {
  const [activeIndex, setActiveIndex] = useState(items.length - 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Always jump to the newest card when a new item arrives
  useEffect(() => {
    setActiveIndex(items.length - 1);
  }, [items.length]);

  const navigate = useCallback(
    (toIndex: number) => {
      if (isScrollingRef.current || toIndex === activeIndex) return;
      if (toIndex < 0 || toIndex >= items.length) return;
      isScrollingRef.current = true;
      setActiveIndex(toIndex);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 650);
    },
    [activeIndex, items.length],
  );

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrollingRef.current) return;

    // If the user is scrolling horizontally, use it for navigation
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
      // Respect scrollable children — only trap at left / right boundary
      let target = e.target as HTMLElement | null;
      while (target && target !== containerRef.current) {
        if (target.scrollWidth > target.clientWidth) {
          const s = window.getComputedStyle(target);
          if (s.overflowX === "auto" || s.overflowX === "scroll") {
            const atLeft = target.scrollLeft === 0;
            const atRight =
              Math.abs(
                target.scrollWidth - target.clientWidth - target.scrollLeft,
              ) < 1;
            if ((e.deltaX < 0 && !atLeft) || (e.deltaX > 0 && !atRight)) return;
            break;
          }
        }
        target = target.parentElement;
      }

      if (e.deltaX < 0 && activeIndex > 0) navigate(activeIndex - 1);
      else if (e.deltaX > 0 && activeIndex < items.length - 1)
        navigate(activeIndex + 1);
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      onWheel={handleScroll}
      style={{ perspective: "1100px" }}
    >
      {/* ── Card counter ────────────────────────────────────────────────── */}
      {items.length > 1 && (
        <div className="absolute top-4 inset-x-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-foreground/30 tabular-nums">
            {activeIndex + 1}&thinsp;/&thinsp;{items.length}
          </span>
        </div>
      )}

      {/* ── Single card area — fills the panel ──────────────────────────── */}
      <div
        className="relative w-[92%] h-[90%]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Active card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={items[activeIndex].id}
            className="absolute inset-0 rounded-2xl border border-white/15 overflow-hidden z-10 flex flex-col"
            style={{
              background:
                "linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.08) 100%)",
              backdropFilter: "blur(52px) saturate(180%)",
              boxShadow:
                "0 24px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
              transformStyle: "preserve-3d",
            }}
            initial={{ y: 32, scale: 0.91, opacity: 0, rotateX: 14 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotateX: 0 }}
            exit={{
              y: "-38%",
              scale: 0.76,
              opacity: 0,
              rotateX: -24,
              filter: "blur(5px)",
              transition: {
                duration: 0.46,
                ease: [0.4, 0, 0.6, 1],
              },
            }}
            transition={{
              type: "spring",
              stiffness: 270,
              damping: 27,
            }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col custom-scrollbar">
              {items[activeIndex].component}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Pagination dots (vertical, right edge) ──────────────────────── */}
      {items.length > 1 && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => navigate(index)}
              className={cn(
                "w-1.5 rounded-full transition-all duration-300 cursor-pointer",
                index === activeIndex
                  ? "bg-primary/85 h-5 shadow-[0_0_6px_var(--primary)]"
                  : "bg-white/25 hover:bg-white/50 h-1.5",
              )}
            />
          ))}
        </div>
      )}

      {/* ── Scroll hints (shown only when multiple cards exist) ─────────── */}
      {items.length > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center z-20 pointer-events-none">
          <motion.span
            className="text-[10px] font-medium text-foreground/25 tracking-widest uppercase"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            scroll horizontally to browse
          </motion.span>
        </div>
      )}
    </div>
  );
}