"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { MyUIMessage, PdfOperationResult } from "@/types/chat";
import { StripLargeDataChatTransport } from "@/lib/chat-transport";
// Components
import { DynamicIsland } from "@/components/dynamic-island";
import { PromptInputArea } from "@/components/prompt-input-area";
import { MessageList } from "@/components/ai-elements/message-list";
import { AttachmentsPreview } from "@/components/ai-elements/attachments-preview";
import { IntegrationsModal } from "@/components/integrations-modal";
import { IntegrationPanel } from "@/components/integration-panel";
import { FileDropZone } from "@/components/file-drop-zone";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { GenUIStack, extractGenUIs } from "@/components/gen-ui-stack";
import { Folder } from "@/components/folder";
import { Music } from "@/components/music";
import { EmailCardCarousel } from "@/components/email-card-carousel";
import { TodoList } from "@/components/todo-list";
import { AtAGlance } from "@/components/at-a-glance";
import { TodaySchedule } from "@/components/today-schedule";
import { AudioWave } from "@/components/audio-wave";

// Hooks and Constants
import { useChatState } from "@/hooks/use-chat-state";
import { useLocalStorageSync } from "@/hooks/use-local-storage-sync";
import { useSessionSync } from "@/hooks/use-session-sync";
import { useFileHandlers } from "@/hooks/use-file-handlers";
import { useExtensionListeners } from "@/hooks/use-extension-listeners";
import { useIntegrationHandlers } from "@/hooks/use-integration-handlers";
import { MODELS, DEFAULT_SUGGESTIONS, STORAGE_KEYS } from "@/lib/chat-constants";
import { useUser } from "@clerk/nextjs";

export function ChatUI() {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // State management
  const state = useChatState();
  const {
    selectedModel, setSelectedModel,
    isModelOpen, setIsModelOpen,
    enableSearch, setEnableSearch,
    enableUrlContext, setEnableUrlContext,
    enableThinking, setEnableThinking,
    mentionedTools, setMentionedTools,
    attachments, setAttachments,
    inputValue, setInputValue,
    isLoaded,
    currentSessionId, setCurrentSessionId,
    sessions, setSessions,
    isIntegrationsModalOpen, setIsIntegrationsModalOpen,
    activeIntegration, setActiveIntegration,
    addedIntegrations, setAddedIntegrations,
    isCalendarConnected, setIsCalendarConnected,
    isFormsConnected, setIsFormsConnected,
    isTasksConnected, setIsTasksConnected,
    isGmailConnected, setIsGmailConnected,
    fileInputRef,
  } = state;

  const { isSignedIn } = useUser();

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat<MyUIMessage>({
    id: "gemini-chat",
    transport: new StripLargeDataChatTransport({
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

  // Save messages to Supabase after each AI turn completes
  useEffect(() => {
    if (status === 'ready' && messages.length > 0 && isSignedIn && currentSessionId) {
      saveMessagesToDB();
    }
  }, [status, messages.length, isSignedIn, currentSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hooks for state management
  const { dedupedMessages } = useLocalStorageSync({
    messages,
    setMessages,
    selectedModel,
    setSelectedModel,
    enableThinking,
    setEnableThinking,
    enableSearch,
    setEnableSearch,
    enableUrlContext,
    setEnableUrlContext,
    setAddedIntegrations,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
    setIsGmailConnected,
    isLoaded,
    setIsLoaded: state.setIsLoaded,
  });

  // Session sync — manages Supabase persistence when signed in
  const { createNewSession, switchSession, saveMessagesToDB } = useSessionSync({
    messages,
    setMessages,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    setSessions,
    setIsLoaded: state.setIsLoaded,
  });

  const { handleFileSelect, handleFilesDropped, removeAttachment } = useFileHandlers(setAttachments);

  useExtensionListeners(
    setAttachments,
    setInputValue,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
    setIsGmailConnected,
    setEnableSearch
  );

  const { handleAddIntegration, handleRemoveIntegration } = useIntegrationHandlers({
    addedIntegrations,
    setAddedIntegrations,
    setActiveIntegration,
    activeIntegration,
    setIsCalendarConnected,
    setIsFormsConnected,
    setIsTasksConnected,
    setIsGmailConnected,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [isModalRefHydrated, setIsModalRefHydrated] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const isEmailExpanded = expandedEmailId !== null;

  // Reset hydration state when modal closes
  useEffect(() => {
    if (!isChatModalOpen) {
      setIsModalRefHydrated(false);
    }
  }, [isChatModalOpen]);

  // One-time cleanup: remove any legacy PDF tool parts from message history
  // These were created by the old implementation and break the AI SDK's message processing
  useEffect(() => {
    if (!isLoaded || messages.length === 0) return;
    
    let needsCleanup = false;
    const cleaned = messages.map((msg) => {
      if (!msg.parts || !Array.isArray(msg.parts)) return msg;
      
      const hasPdfToolPart = msg.parts.some((part: any) => 
        part.type === "tool-mergePDFs" || 
        part.type === "tool-compressPDF" ||
        (part.type === "tool-invocation" && (part.toolName === "mergePDFs" || part.toolName === "compressPDF"))
      );
      
      if (!hasPdfToolPart) return msg;
      needsCleanup = true;
      
      // Convert tool parts to text, preserving the result message
      const cleanedParts = msg.parts
        .filter((part: any) => {
          if (part.type === "tool-mergePDFs" || part.type === "tool-compressPDF") return false;
          if (part.type === "tool-invocation" && (part.toolName === "mergePDFs" || part.toolName === "compressPDF")) return false;
          return true;
        });
      
      // If all parts were removed, add a placeholder text
      if (cleanedParts.length === 0) {
        cleanedParts.push({ type: "text", text: "(PDF operation completed)" });
      }
      
      return { ...msg, parts: cleanedParts } as MyUIMessage;
    });
    
    if (needsCleanup) {
      console.log("[PDF cleanup] Removed legacy PDF tool parts from message history");
      setMessages(cleaned);
    }
  }, [isLoaded]); // Only run once on load

  // Chat handlers

  const handleNewChat = useCallback(async () => {
    setAttachments([]);
    setInputValue("");
    setMentionedTools([]);
    setEnableSearch(true);
    setEnableUrlContext(true);
    setEnableThinking(true);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (isSignedIn) {
      await createNewSession(selectedModel.id);
    } else {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }
  }, [setMessages, setAttachments, setInputValue, setMentionedTools, setEnableSearch, setEnableUrlContext, setEnableThinking, fileInputRef, isSignedIn, createNewSession, selectedModel]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChatModalOpen) {
        setIsChatModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isChatModalOpen]);

  // Prevent body scroll and layout shift when the modal is open
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    if (isChatModalOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth) document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = originalOverflow || "";
      document.body.style.paddingRight = originalPaddingRight || "";
    }

    return () => {
      document.body.style.overflow = originalOverflow || "";
      document.body.style.paddingRight = originalPaddingRight || "";
    };
  }, [isChatModalOpen]);

  // Simplified handleSubmit using AI SDK's new API
  const handleSubmit = async (value: { text: string; files: any[] }) => {
    if (!value.text.trim() && attachments.length === 0) return;

    setIsChatModalOpen(true);

    // --- PDF: handle entirely client-side (zero AI tokens) ---
    const isPdfOnly = mentionedTools.length > 0 && mentionedTools.every(t => t.toLowerCase() === "pdf");
    const pdfFiles = attachments.filter(a => a.type === "application/pdf");

    if (isPdfOnly) {
      const userText = value.text.trim().toLowerCase();
      const isMerge = /merge|combine|join|concat/.test(userText);
      const isCompress = /compress|reduce|shrink|optimi|smaller/.test(userText);

      let operation: "merge" | "compress";
      if (isMerge) operation = "merge";
      else if (isCompress) operation = "compress";
      else operation = pdfFiles.length >= 2 ? "merge" : "compress";

      const ts = Date.now();
      const userMsgId = `pdf-user-${ts}`;
      const assistantMsgId = `pdf-asst-${ts}`;

      // Build user message parts — text only, NO base64 file parts
      const userParts: any[] = [];
      if (value.text.trim()) userParts.push({ type: "text", text: value.text });
      for (const att of attachments) {
        if (att.type === "application/pdf") {
          userParts.push({ type: "text", text: `📎 ${att.name || "PDF file"}` });
        } else {
          userParts.push({ type: "file", url: att.url, mediaType: att.type });
        }
      }

      // Handle missing PDF files
      if (pdfFiles.length === 0) {
        setMessages((prev) => [
          ...prev,
          { id: userMsgId, role: "user", parts: userParts } as MyUIMessage,
          { id: assistantMsgId, role: "assistant", parts: [{ type: "text", text: "Please attach PDF files to use @pdf. For merging attach 2+ PDFs, for compression attach 1+ PDFs." }] } as MyUIMessage,
        ]);
        setInputValue(""); setAttachments([]); setMentionedTools([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (operation === "merge" && pdfFiles.length < 2) {
        setMessages((prev) => [
          ...prev,
          { id: userMsgId, role: "user", parts: userParts } as MyUIMessage,
          { id: assistantMsgId, role: "assistant", parts: [{ type: "text", text: "Please attach at least 2 PDF files to merge." }] } as MyUIMessage,
        ]);
        setInputValue(""); setAttachments([]); setMentionedTools([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Show loading message (plain text, no tool parts)
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", parts: userParts } as MyUIMessage,
        {
          id: assistantMsgId,
          role: "assistant",
          parts: [{ type: "text", text: operation === "merge" ? "⏳ Merging PDFs..." : `⏳ Compressing ${pdfFiles.length} PDF(s)...` }],
        } as MyUIMessage,
      ]);
      setInputValue(""); setAttachments([]); setMentionedTools([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Call PDF API directly — no AI model involved
      let pdfResultData: PdfOperationResult;
      try {
        if (operation === "merge") {
          const res = await fetch("/api/pdf/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: pdfFiles.map(f => f.url) }),
          });
          const data = await res.json();
          if (res.ok) {
            const refId = `pdf-merge-${ts}`;
            if (typeof window !== "undefined") {
              (window as any).__pdfResults = (window as any).__pdfResults || {};
              (window as any).__pdfResults[refId] = data.fileUrl;
            }
            pdfResultData = {
              operation: "merge",
              fileName: data.fileName || "merged.pdf",
              fileUrl: `__pdf_ref__:${refId}`,
              pageCount: data.pageCount,
              fileSize: data.fileSize,
              inputFileCount: pdfFiles.length,
              message: `Successfully merged ${pdfFiles.length} PDFs into "${data.fileName}" (${data.pageCount} pages, ${data.fileSize})`,
            };
          } else {
            pdfResultData = { operation: "merge", error: true, message: data.error || "Failed to merge PDFs" };
          }
        } else {
          // Compress each PDF file individually
          const results: PdfOperationResult["results"] = [];
          for (let i = 0; i < pdfFiles.length; i++) {
            const pdf = pdfFiles[i];
            try {
              const res = await fetch("/api/pdf/compress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file: pdf.url,
                  outputFileName: pdf.name ? `compressed-${pdf.name}` : `compressed-${i + 1}.pdf`,
                }),
              });
              const data = await res.json();
              if (res.ok) {
                const refId = `pdf-compress-${ts}-${i}`;
                if (typeof window !== "undefined") {
                  (window as any).__pdfResults = (window as any).__pdfResults || {};
                  (window as any).__pdfResults[refId] = data.fileUrl;
                }
                results.push({
                  fileName: data.fileName || `compressed-${i + 1}.pdf`,
                  fileUrl: `__pdf_ref__:${refId}`,
                  pageCount: data.pageCount,
                  originalSize: data.originalSize,
                  compressedSize: data.compressedSize,
                  compressionRatio: data.compressionRatio,
                });
              }
            } catch {
              // Skip individual failures
            }
          }
          if (results.length > 0) {
            pdfResultData = {
              operation: "compress",
              results,
              message: `Successfully compressed ${results.length} PDF(s)`,
            };
          } else {
            pdfResultData = { operation: "compress", error: true, message: "Failed to compress PDFs" };
          }
        }
      } catch (err) {
        pdfResultData = { operation, error: true, message: err instanceof Error ? err.message : "PDF operation failed" };
      }

      // Update assistant message — text summary + metadata with pdfResult (NO tool parts)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? ({
                ...msg,
                parts: [{ type: "text", text: pdfResultData.error ? `❌ ${pdfResultData.message}` : `✅ ${pdfResultData.message}` }],
                metadata: { pdfResult: pdfResultData },
              } as MyUIMessage)
            : msg
        )
      );
      return;
    }
    // --- End PDF client-side handling ---

    // Build parts array for the message
    const parts: Array<{ type: "text"; text: string } | { type: "file"; url: string; mediaType: string }> = [];
    
    // Add text part (prompt processing happens on backend)
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
          sessionId: currentSessionId ?? undefined,
          enableSearch,
          enableThinking: selectedModel.supportsThinking ? enableThinking : false,
          enableUrlContext,
          enableCodeExecution: true,
          mentionedTools,
        },
      }
    );

    setInputValue("");
    setAttachments([]);
    setMentionedTools([]);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle regenerate/reload
  const handleRegenerate = useCallback(() => {
    setIsChatModalOpen(true);
    regenerate({
      body: {
        model: selectedModel.id,
        enableSearch,
        enableThinking: selectedModel.supportsThinking ? enableThinking : false,
        enableUrlContext,
        enableCodeExecution: true,
        mentionedTools,
      },
    });
  }, [regenerate, selectedModel, enableSearch, enableUrlContext, enableThinking, mentionedTools]);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) return null;

  const genUIs = extractGenUIs(dedupedMessages, selectedModel.id);

  return (
    <FileDropZone onFilesDropped={handleFilesDropped}>
      <div 
        className="flex h-screen w-full flex-col text-foreground bg-cover bg-center bg-no-repeat selection:bg-[#8ca7bc]/30"
        style={{ backgroundImage: 'url("/Dashboard.png")' }}
      >
        {/* Header */}
        <DynamicIsland 
          models={MODELS}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isModelOpen={isModelOpen}
          onModelOpenChange={setIsModelOpen}
          onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
          onNewChat={handleNewChat}
        />
        
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Dashboard Background Widgets (always visible) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex flex-col justify-center"
        >
          {/* Left side widgets (hidden on small screens) */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isEmailExpanded ? { opacity: 0, x: -100, scale: 0.9 } : { opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: isEmailExpanded ? 0 : 0.1 }}
            className="absolute top-[48%] left-[2%] 2xl:left-[4%] -translate-y-1/2 pointer-events-auto hidden xl:flex flex-col gap-8 scale-[0.765] lg:scale-[0.81] xl:scale-[0.855] origin-left z-20"
          >
            <TodoList />
            <TodaySchedule />
          </motion.div>

          {/* Centered At a Glance Text - moved below dynamic island and scaled down */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={isEmailExpanded ? { opacity: 0, y: -100, scale: 0.9 } : { opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute inset-x-0 top-[14%] flex flex-col items-center justify-start pointer-events-auto z-0 scale-[0.675] sm:scale-[0.81] origin-top"
          >
            <AtAGlance location="Kochi" weatherCondition="cloudy" />
          </motion.div>

          {/* Email Carousel */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
            className="absolute inset-x-0 bottom-28 z-10 pointer-events-none flex w-full justify-center"
          >
            <div className="w-full xl:w-[85%] 2xl:w-[90%] max-w-[1600px]">
              <EmailCardCarousel
                isGmailConnected={isGmailConnected}
                selectedModel={selectedModel.id}
                onReply={(email) => {
                  setInputValue(`@gmail Reply to ${email.subject} from ${email.senderEmail}`);
                  setMentionedTools(["gmail"]);
                }}
                onExpandChange={setExpandedEmailId}
              />
            </div>
          </motion.div>

          {/* Right side widgets (hidden on small screens) */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isEmailExpanded ? { opacity: 0, x: 100 } : { opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: isEmailExpanded ? 0 : 0.2 }}
            className="absolute top-[48%] right-[2%] 2xl:right-[4%] -translate-y-1/2 pointer-events-auto hidden xl:flex flex-col gap-8 scale-[0.765] lg:scale-[0.81] xl:scale-[0.855] origin-right items-center z-10"
          >
            <AudioWave />
            <Folder />
          </motion.div>

          {/* Bottom-right Music Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={isEmailExpanded ? { opacity: 0, y: 100 } : { opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: isEmailExpanded ? 0 : 0.3 }}
            className="absolute bottom-4 right-[2%] 2xl:right-[4%] pointer-events-auto hidden xl:flex scale-[0.52] lg:scale-[0.55] xl:scale-[0.585] origin-bottom-right items-center z-10"
          >
            <Music />
          </motion.div>
        </motion.div>

        {/* Input Area Container */}
        <div className={cn(
          "absolute inset-x-0 bottom-8 px-4 transition-all duration-300",
          isChatModalOpen ? "z-60" : "z-20"
        )}>
          <div className="max-w-4xl mx-auto w-full flex flex-col items-center gap-3">
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
              attachments={attachments}
              onRemoveAttachment={removeAttachment}
              mentionedTools={mentionedTools}
              onToolMentionsChange={setMentionedTools}
              addedIntegrations={addedIntegrations}
              onOpenChat={() => setIsChatModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Liquid Glass Modal with Smooth Animation */}
      <AnimatePresence>
        {isChatModalOpen && (
          <>
            {/* Backdrop for clicking outside to close (Transparent, NO BLUR) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatModalOpen(false)}
              className="fixed inset-0 z-40" 
            />

            {/* Outer Positioning Wrapper — holds Chat + Gen UI side by side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-40%" }}
              animate={{
                opacity: 1,
                scale: 1,
                x: "-50%",
                y: attachments.length > 0 ? "-60%" : "-54%",
              }}
              exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-40%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.6 }}
              className="fixed left-1/2 top-1/2 z-50 flex flex-row items-center origin-[50%_0%]"
              style={{ gap: "16px" }}
            >
              {/* Chat Panel — wide rectangle */}
              <motion.div
                animate={{ width: genUIs.length > 0 ? "60vw" : "85vw" }}
                transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                className="relative h-[75vh] overflow-hidden rounded-3xl no-horizontal-scroll shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
                  backdropFilter: "blur(60px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 25px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)",
                }}
              >
                {/* Glass Shine Effect */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    width: "40%",
                  }}
                />

                {/* Chat Content */}
                <div className="relative h-full flex flex-col no-horizontal-scroll">
                  {/* Scroll Progress at the left border */}
                  {isModalRefHydrated && (
                    <ScrollProgress
                      containerRef={modalScrollRef}
                      className="w-[3px] bg-white/40"
                      orientation="vertical"
                    />
                  )}

                  {/* Messages Area with Hidden Scrollbar */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="flex-1 overflow-hidden px-8 pt-8 no-horizontal-scroll"
                  >
                    <div className="h-full overflow-y-auto scrollbar-hide no-horizontal-scroll">
                      <MessageList
                        messages={dedupedMessages}
                        isLoading={isLoading}
                        onRegenerate={handleRegenerate}
                        status={status}
                        error={error}
                        containerRef={modalScrollRef}
                        onRefHydrated={() => setIsModalRefHydrated(true)}
                        model={selectedModel.id}
                        hideGenUI={genUIs.length > 0}
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Close Button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  onClick={() => setIsChatModalOpen(false)}
                  className="absolute right-6 top-6 z-10 flex items-center justify-center size-12 rounded-full bg-black/10 backdrop-blur-xl border border-black/10 hover:bg-black/20 transition-all duration-200 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg
                    className="size-6 text-foreground/80 group-hover:text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </motion.div>

              {/* Gen UI Panel — tall separate rectangle */}
              <AnimatePresence>
                {genUIs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, scale: 0.96 }}
                    animate={{ opacity: 1, width: "27vw", scale: 1 }}
                    exit={{ opacity: 0, width: 0, scale: 0.96 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                    className="h-[75vh] overflow-hidden rounded-3xl shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.09) 100%)",
                      backdropFilter: "blur(60px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 25px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)",
                    }}
                  >
                    <GenUIStack items={genUIs} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onOpenChange={setIsIntegrationsModalOpen}
        onAddIntegration={handleAddIntegration}
        onRemoveIntegration={handleRemoveIntegration}
        addedIntegrations={addedIntegrations}
      />

      <IntegrationPanel
        isOpen={!!activeIntegration}
        onClose={() => setActiveIntegration(null)}
        integrationId={activeIntegration}
      />
      </div>
    </FileDropZone>
  );
}
