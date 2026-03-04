"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "calendar" | "email";
  title: string;
  body: string;
  timestamp: string;
  link?: string;
}

interface NotificationBannerProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

function NotificationCard({ notification, onDismiss }: { notification: NotificationItem; onDismiss: (id: string) => void }) {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 10000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const Icon = notification.type === "calendar" ? Calendar : Mail;

  return (
    <motion.div
      key={notification.id}
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-80 rounded-2xl p-4 cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
        backdropFilter: "blur(60px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
      onClick={() => {
        if (notification.link) {
          window.open(notification.link, "_blank");
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "flex items-center justify-center size-9 rounded-full shrink-0",
          notification.type === "calendar"
            ? "bg-blue-500/20 text-blue-400"
            : "bg-emerald-500/20 text-emerald-400"
        )}>
          <Icon className="size-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">
            {notification.title}
          </p>
          <p className="text-xs text-white/50 truncate mt-0.5">
            {notification.body}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="flex items-center justify-center size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 shrink-0"
        >
          <X className="size-3.5 text-white/60" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationBanner({ notifications, onDismiss }: NotificationBannerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-60 flex flex-col gap-3 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 5).map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
