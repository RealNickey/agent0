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
  enableSearch: boolean;
  setEnableSearch: (enable: boolean) => void;
  enableUrlContext: boolean;
  setEnableUrlContext: (enable: boolean) => void;
  setAddedIntegrations: (integrations: string[]) => void;
  setIsCalendarConnected: (connected: boolean) => void;
  setIsFormsConnected: (connected: boolean) => void;
  setIsTasksConnected: (connected: boolean) => void;
  setIsGmailConnected: (connected: boolean) => void;
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

      const savedSearch = localStorage.getItem(STORAGE_KEYS.SEARCH);
      if (savedSearch != null) {
        setEnableSearch(savedSearch === "true");
      }

      const savedUrlContext = localStorage.getItem(STORAGE_KEYS.URL_CONTEXT);
      if (savedUrlContext != null) {
        setEnableUrlContext(savedUrlContext === "true");
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
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.tools && Array.isArray(data.tools)) {
            setAddedIntegrations(data.tools.map((t: any) => t.id));
          }
        })
        .catch((e) => console.error("Failed to fetch installed tools", e));

      // Check Google Calendar auth status
      fetch("/api/auth/google?action=status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setIsCalendarConnected(!!data.connected);
          setIsFormsConnected(!!data.hasFormsScopes);
          setIsTasksConnected(!!data.hasTasksScopes);
          setIsGmailConnected(!!data.hasGmailScopes);
          if (data) {
            setIsCalendarConnected(!!data.connected);
            setIsFormsConnected(!!data.hasFormsScopes);
            setIsTasksConnected(!!data.hasTasksScopes);
          }
        })
        .catch((e) => console.error("Failed to check calendar auth status", e));
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
    setIsLoaded(true);
  }, [setMessages, setSelectedModel, setEnableThinking, setEnableSearch, setEnableUrlContext, setAddedIntegrations, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setIsGmailConnected, setIsLoaded]);

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

  // Save search preference to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.SEARCH, String(enableSearch));
      } catch (e) {
        console.error("Failed to save search to localStorage", e);
      }
    }
  }, [enableSearch, isLoaded]);

  // Save URL context preference to local storage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.URL_CONTEXT, String(enableUrlContext));
      } catch (e) {
        console.error("Failed to save URL context to localStorage", e);
      }
    }
  }, [enableUrlContext, isLoaded]);

  // Save messages to local storage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        // Strip large base64 data from messages before saving to localStorage
        const messagesForStorage = dedupedMessages.map((msg) => {
          if (msg.parts && Array.isArray(msg.parts)) {
            const cleanedParts = msg.parts.map((part: any) => {
              // Strip large base64 data URLs (>50KB) to save localStorage space
              if (part.type === "file" && part.url && typeof part.url === "string") {
                if (part.url.startsWith("data:") && part.url.length > 50000) {
                  return { 
                    type: "text", 
                    text: `[${part.mediaType || "File"} attachment - ${part.name || "file"}]` 
                  };
                }
              }
              return part;
            });
            return { ...msg, parts: cleanedParts };
          }
          return msg;
        });
        
        const serialized = JSON.stringify(messagesForStorage);
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
