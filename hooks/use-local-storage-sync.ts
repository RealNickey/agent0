import { useEffect, useMemo } from "react";
import type { Model } from "@/components/ai-elements/model-selector-control";
import type { MyUIMessage } from "@/types/chat";
import { STORAGE_KEYS, MODELS } from "@/lib/chat-constants";

function dedupeMessages(input: MyUIMessage[]): MyUIMessage[] {
  const seen = new Set<string>();
  const result: MyUIMessage[] = [];

  for (let i = input.length - 1; i >= 0; i -= 1) {
    const message = input[i];
    if (!message?.id || seen.has(message.id)) {
      continue;
    }
    seen.add(message.id);
    result.unshift(message);
  }

  return result;
}

interface UseLocalStorageSyncProps {
  messages: MyUIMessage[];
  setMessages: (messages: MyUIMessage[]) => void;
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  enableThinking: boolean;
  setEnableThinking: (enable: boolean) => void;
  setAddedIntegrations: (integrations: string[]) => void;
  setIsCalendarConnected: (connected: boolean) => void;
  setIsFormsConnected: (connected: boolean) => void;
  setIsTasksConnected: (connected: boolean) => void;
  setIsSlidesConnected: (connected: boolean) => void;
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

export function useLocalStorageSync({
  messages,
  setMessages,
  selectedModel,
  setSelectedModel,
  enableThinking,
  setEnableThinking,
  setAddedIntegrations,
  setIsCalendarConnected,
  setIsFormsConnected,
  setIsTasksConnected,
  setIsSlidesConnected,
  isLoaded,
  setIsLoaded,
}: UseLocalStorageSyncProps) {
  const dedupedMessages = useMemo(() => dedupeMessages(messages), [messages]);

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const savedModelId = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (savedModelId) {
        const model = MODELS.find((m) => m.id === savedModelId);
        if (model) setSelectedModel(model);
      }

      const savedThinking = localStorage.getItem(STORAGE_KEYS.THINKING);
      if (savedThinking != null) {
        setEnableThinking(savedThinking === "true");
      }

      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed)) {
            setMessages(dedupeMessages(parsed));
          }
        } catch (e) {
          console.error("Failed to parse saved messages", e);
          localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        }
      }

      // Fetch installed tools from API
      fetch("/api/tools/installed")
        .then((res) => res.json())
        .then((data) => {
          if (data.tools && Array.isArray(data.tools)) {
            setAddedIntegrations(data.tools.map((t: any) => t.id));
          }
        })
        .catch((e) => console.error("Failed to fetch installed tools", e));

      // Check Google Calendar auth status
      fetch("/api/auth/google?action=status")
        .then((res) => res.json())
        .then((data) => {
          setIsCalendarConnected(!!data.connected);
          setIsFormsConnected(!!data.hasFormsScopes);
          setIsTasksConnected(!!data.hasTasksScopes);
          setIsSlidesConnected(!!data.hasSlidesScopes);
        })
        .catch((e) => console.error("Failed to check calendar auth status", e));
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
    setIsLoaded(true);
  }, [setMessages, setSelectedModel, setEnableThinking, setAddedIntegrations, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setIsSlidesConnected, setIsLoaded]);

  // Save model to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel.id);
      } catch (e) {
        console.error("Failed to save model to localStorage", e);
      }
    }
  }, [selectedModel, isLoaded]);

  // Save thinking preference to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.THINKING, String(enableThinking));
      } catch (e) {
        console.error("Failed to save thinking to localStorage", e);
      }
    }
  }, [enableThinking, isLoaded]);

  // Save messages to local storage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        const serialized = JSON.stringify(dedupedMessages);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, serialized);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded, clearing old messages");
          try {
            localStorage.removeItem(STORAGE_KEYS.MESSAGES);
          } catch {
            // Ignore errors when clearing
          }
        } else {
          console.error("Failed to save messages to localStorage", e);
        }
      }
    }
  }, [dedupedMessages, isLoaded]);

  // If model doesn't support thinking, force thinking off
  useEffect(() => {
    if (!selectedModel.supportsThinking && enableThinking) {
      setEnableThinking(false);
    }
  }, [selectedModel, enableThinking, setEnableThinking]);

  return { dedupedMessages };
}
