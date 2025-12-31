"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Mail, CheckSquare, Calendar, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  DashboardHeader,
  StatsCard,
  TasksWidget,
  CalendarWidget,
  InsightsWidget,
  WeatherWidget,
  QuickChatInput,
  Task,
  CalendarEvent,
  Insight,
} from "@/components/dashboard";

const STORAGE_KEY = "agent0-dashboard-tasks";

// Demo data
const defaultTasks: Task[] = [
  { id: "1", title: "Review project proposal", completed: true, priority: "high", dueTime: "9:00 AM" },
  { id: "2", title: "Team standup meeting", completed: true, priority: "medium", dueTime: "10:00 AM" },
  { id: "3", title: "Complete quarterly report", completed: false, priority: "high", dueTime: "2:00 PM" },
  { id: "4", title: "Reply to client emails", completed: false, priority: "medium", dueTime: "4:00 PM" },
  { id: "5", title: "Prepare presentation slides", completed: false, priority: "low" },
];

const defaultEvents: CalendarEvent[] = [
  { id: "1", title: "Team Standup", time: "10:00 AM", endTime: "10:15 AM", isVideoCall: true },
  { id: "2", title: "Project Review", time: "2:00 PM", endTime: "3:00 PM", location: "Conference Room A" },
  { id: "3", title: "Client Call", time: "4:00 PM", endTime: "4:30 PM", isVideoCall: true },
  { id: "4", title: "Weekly Planning", time: "5:00 PM", endTime: "5:30 PM" },
];

const defaultInsights: Insight[] = [
  { id: "1", text: "You have 3 high-priority tasks due today. Consider starting with the quarterly report.", type: "suggestion" },
  { id: "2", text: "You typically complete more tasks in the morning. Your next focus block is at 11 AM.", type: "pattern" },
  { id: "3", text: "2 meetings today are video calls. Ensure your setup is ready.", type: "summary" },
];

// Helper to load tasks - only call on client
function getInitialTasks(): Task[] {
  if (typeof window === "undefined") return defaultTasks;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore errors
  }
  return defaultTasks;
}

export default function DashboardPage() {
  const router = useRouter();
  // Use lazy initialization for hydration safety - loads from localStorage on client
  const [tasks, setTasks] = useState<Task[]>(() => getInitialTasks());
  const isInitialMount = useRef(true);
  const events = defaultEvents;
  const insights = defaultInsights;

  // Weather data - would be fetched from API in production
  const weatherData = {
    temperature: 68,
    temperatureUnit: "°F",
    condition: "Partly Cloudy",
    weatherCode: 2,
    location: "San Francisco",
    high: 72,
    low: 58,
  };

  // Save to localStorage on changes after initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Ignore storage errors
    }
  }, [tasks]);

  const handleAddTask = useCallback((title: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
      priority: "medium",
    };
    setTasks((prev) => [...prev, newTask]);
  }, []);

  const handleToggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const handleQuickChat = useCallback((value: string) => {
    // Navigate to chat with the question as a query param
    router.push(`/?q=${encodeURIComponent(value)}`);
  }, [router]);

  const handleAskAgent = useCallback((insight: string) => {
    router.push(`/?q=${encodeURIComponent(`Tell me more about: ${insight}`)}`);
  }, [router]);

  const handleRefresh = useCallback(() => {
    // Refresh the page data using Next.js router
    router.refresh();
  }, [router]);

  // Calculate stats
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  const upcomingEvents = events.length;

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <DashboardHeader onRefresh={handleRefresh} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h1 className="text-2xl font-bold tracking-tight">
              Good {getGreeting()}
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your day
            </p>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatsCard
              title="Pending Tasks"
              value={pendingTasks}
              subtitle={`${completedTasks} completed`}
              icon={CheckSquare}
            />
            <StatsCard
              title="Today's Events"
              value={upcomingEvents}
              subtitle="Next in 2 hours"
              icon={Calendar}
            />
            <StatsCard
              title="Unread Emails"
              value={12}
              subtitle="3 important"
              icon={Mail}
            />
            <WeatherWidget {...weatherData} />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Tasks */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <TasksWidget
                tasks={tasks}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
              />
            </motion.div>

            {/* Center Column - Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <CalendarWidget events={events} />
            </motion.div>

            {/* Right Column - Insights + Quick Chat */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1 space-y-6"
            >
              <InsightsWidget
                insights={insights}
                onAskAgent={handleAskAgent}
              />

              {/* Quick Chat Input */}
              <div className="p-4 rounded-xl border bg-card">
                <QuickChatInput onSubmit={handleQuickChat} />
              </div>
            </motion.div>
          </div>

          {/* AI Assistant Prompt at Bottom */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center py-6"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>
                Agent0 is ready to help. Ask anything or{" "}
                <Link href="/" className="text-primary hover:underline">
                  open full chat
                </Link>
              </span>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
