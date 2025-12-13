"use client";

import { useEffect } from "react";

type Agent0ContextTextPayload = {
  selectedText: string;
  pageUrl?: string | null;
  pageTitle?: string | null;
  timestamp?: number;
};

function setControlledTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const proto = window.HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  const setter = descriptor?.set;
  if (setter) {
    setter.call(textarea, value);
  } else {
    textarea.value = value;
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

export function ExtensionContextBridge() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // The extension injects a script into this page, so origin should be same-origin.
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "AGENT0_CONTEXT_TEXT") return;

      const data = (event.data?.data || {}) as Partial<Agent0ContextTextPayload>;
      const selectedText = typeof data.selectedText === "string" ? data.selectedText.trim() : "";
      if (!selectedText) return;

      const pageTitle = typeof data.pageTitle === "string" ? data.pageTitle.trim() : "";
      const pageUrl = typeof data.pageUrl === "string" ? data.pageUrl.trim() : "";

      const context = pageUrl
        ? `[Context from: ${pageTitle || pageUrl}]\n${pageUrl}\n\n${selectedText}\n\n`
        : `[Context]\n\n${selectedText}\n\n`;

      const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as
        | HTMLTextAreaElement
        | null;
      if (!textarea) return;

      const existing = textarea.value || "";
      setControlledTextareaValue(textarea, `${context}${existing}`);
      textarea.focus();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
