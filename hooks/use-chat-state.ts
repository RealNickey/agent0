import { useState, useRef } from "react";
import type { Model } from "@/components/ai-elements/model-selector-control";
import type { FileAttachment } from "@/components/ai-elements/attachments-preview";
import { MODELS } from "@/lib/chat-constants";
import type { ChatSessionSummary } from "@/hooks/use-session-sync";

export function useChatState() {
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[0]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [enableSearch, setEnableSearch] = useState(true);
  const [enableUrlContext, setEnableUrlContext] = useState(true);
  const [enableThinking, setEnableThinking] = useState(true);
  const [mentionedTools, setMentionedTools] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  
  // Integrations state
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);
  const [addedIntegrations, setAddedIntegrations] = useState<string[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isFormsConnected, setIsFormsConnected] = useState(false);
  const [isTasksConnected, setIsTasksConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  return {
    selectedModel,
    setSelectedModel,
    isModelOpen,
    setIsModelOpen,
    enableSearch,
    setEnableSearch,
    enableUrlContext,
    setEnableUrlContext,
    enableThinking,
    setEnableThinking,
    mentionedTools,
    setMentionedTools,
    attachments,
    setAttachments,
    inputValue,
    setInputValue,
    isLoaded,
    setIsLoaded,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    setSessions,
    isIntegrationsModalOpen,
    setIsIntegrationsModalOpen,
    activeIntegration,
    setActiveIntegration,
    addedIntegrations,
    setAddedIntegrations,
    isCalendarConnected,
    setIsCalendarConnected,
    isFormsConnected,
    setIsFormsConnected,
    isTasksConnected,
    setIsTasksConnected,
    isGmailConnected,
    setIsGmailConnected,
    fileInputRef,
  };
}
