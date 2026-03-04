"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NotificationItem {
  id: string;
  type: "calendar" | "email";
  title: string;
  body: string;
  timestamp: string;
  link?: string;
}

interface UseNotificationsParams {
  enabled: boolean;
  pollingInterval?: number;
}

export function useNotifications({ enabled, pollingInterval = 60000 }: UseNotificationsParams) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const unreadCount = notifications.length;

  // Request notification permission on mount when enabled
  useEffect(() => {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [enabled]);

  // Poll for notifications
  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications/poll");
        if (!res.ok) return;

        const data = await res.json();
        const items: NotificationItem[] = data.notifications || [];
        const newItems: NotificationItem[] = [];

        for (const item of items) {
          if (!seenIds.current.has(item.id)) {
            seenIds.current.add(item.id);
            newItems.push(item);

            // Fire browser notification
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(item.title, {
                  body: item.body,
                  icon: "/assets/logo.png",
                  tag: item.id,
                });
              } catch {
                // Notification may fail in some environments
              }
            }
          }
        }

        if (newItems.length > 0) {
          setNotifications((prev) => [...newItems, ...prev]);
        }
      } catch {
        // Silently fail on poll errors
      }
    };

    // Poll immediately on enable
    poll();

    const intervalId = setInterval(poll, pollingInterval);
    return () => clearInterval(intervalId);
  }, [enabled, pollingInterval]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    seenIds.current.clear();
  }, []);

  return {
    notifications,
    unreadCount,
    dismissNotification,
    dismissAll,
    clearAll,
  };
}
