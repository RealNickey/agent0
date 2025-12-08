"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { getMessageTextContent } from "@/lib/chat-message-utils";

interface TableOfContentsProps {
  messages: any[];
}

export function TableOfContents({ messages }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const tocScrollRef = useRef<HTMLDivElement>(null);

  // Filter only user messages
  const userMessages = messages.filter((m) => m.role === "user");

  // Optional: Add intersection observer to update activeId on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Extract ID from message-{id}
            const id = entry.target.id.replace("message-", "");
            // Only update if it's a user message
            if (userMessages.find(m => m.id === id)) {
               setActiveId(id);
            }
          }
        });
      }
    );

    userMessages.forEach((m) => {
      const el = document.getElementById(`message-${m.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [userMessages]);

  if (userMessages.length === 0) return null;

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      // Scroll TOC to bring the button into view
      const button = document.getElementById(`toc-button-${id}`);
      if (button && tocScrollRef.current) {
        const container = tocScrollRef.current;
        const buttonRect = button.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const buttonTopRelative = buttonRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: buttonTopRelative - 20, behavior: "smooth" }); // 20px margin
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden md:flex fixed right-4 md:right-6 lg:right-8 top-1/2 -translate-y-1/2 w-48 md:w-52 lg:w-56 xl:w-64 flex-col gap-2 p-2 md:p-3 lg:p-4 z-50"
    >
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider pl-3 md:pl-4">
        Contents
      </div>
      <div className="relative flex flex-col gap-1 max-h-[50vh] md:max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide" ref={tocScrollRef}>
        {/* Vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

        {userMessages.map((m) => {
          let text = m.content;
          // Try to get text from parts if content is empty or if parts exist
          if ((!text || text === "") && (m as any).parts) {
             text = getMessageTextContent(m);
          }
          
          // Truncate text to 4-5 words
          const truncatedText = text.split(/\s+/).slice(0, 5).join(" ") + (text.split(/\s+/).length > 5 ? "..." : "");
          const isActive = activeId === m.id;

          return (
            <button
              key={m.id}
              id={`toc-button-${m.id}`}
              onClick={() => scrollToMessage(m.id)}
              className={cn(
                "group relative flex items-center py-1.5 pl-3 md:pl-4 text-xs md:text-sm text-left transition-colors w-full",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="toc-active"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-full"
                />
              )}
              <span className="truncate w-full">{truncatedText || "New Message"}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
