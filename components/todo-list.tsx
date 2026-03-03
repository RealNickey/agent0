"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, RefreshCw } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const STRIKE_PATHS = [
  "M 0 10 Q 12.5 0, 25 10 T 50 10 T 75 10 T 100 10",
  "M 0 10 Q 12.5 20, 25 10 T 50 10 T 75 10 T 100 10",
  "M 0 10 Q 16.6 0, 33.3 10 T 66.6 10 T 100 10",
  "M 0 10 Q 16.6 20, 33.3 10 T 66.6 10 T 100 10",
];

function getStrikePath(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return STRIKE_PATHS[hash % STRIKE_PATHS.length];
}

export function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [newTask, setNewTask] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/list");
      if (res.status === 401) {
        setNotConnected(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setNotConnected(true);
      } else {
        setTasks(
          // show pending first, completed after
          (data.tasks as { id: string; title: string; isCompleted: boolean }[])
            .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted))
            .map((t) => ({ id: t.id, title: t.title, completed: t.isCompleted }))
        );
        setNotConnected(false);
      }
    } catch {
      setNotConnected(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = { id: tempId, title: newTask.trim(), completed: false };
    setTasks((prev) => [optimistic, ...prev]);
    setNewTask("");
    inputRef.current?.focus();
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title }),
      });
      const data = await res.json();
      if (!data.error) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: data.taskId } : t)));
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)));
    try {
      await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, completed: newCompleted }),
      });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: task.completed } : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
    } catch {
      if (task) setTasks((prev) => [...prev, task]);
    }
  };

  return (
    <div
      className="relative w-[306px] h-72 mx-auto flex items-center justify-center select-none rounded-[28px] p-4"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Inner inset container */}
      <div
        className="absolute inset-4 rounded-[18px] bg-black/5"
        style={{ boxShadow: "inset 0 4px 10px rgba(0,0,0,0.1)" }}
      />

      {/* Yellow sticky background */}
      <div
        className="absolute inset-4 rounded-[18px] bg-[#fddf72]"
        style={{ margin: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
      />

      {/* Container for the 3D papers, scaled down slightly to fit */}
      <div className="relative w-full h-full flex items-center justify-center scale-90">
        {/* Back paper (rotated) */}
        <div
          className="absolute bg-[#fff6e5] rounded-[5px]"
          style={{
            width: 210,
            height: 210,
            boxShadow: "0px 3.5px 3.5px rgba(0,0,0,0.25)",
            transform: "rotate(-9deg)",
          }}
        />

        {/* Front paper */}
        <motion.div
          className="relative bg-[#fff6e5] rounded-[5px] flex flex-col pt-5 pb-4 px-5"
          style={{ width: 210, height: 210, boxShadow: "3.5px 3.5px 3.5px rgba(0,0,0,0.25)" }}
          whileHover={{
            scale: 1.02,
            rotate: 1,
            y: -2,
            boxShadow: "5px 5px 8px rgba(0,0,0,0.2)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Task list — full-width scroll area so wheel works everywhere */}
          <div
            className="flex-1 w-full flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw size={18} className="text-[#2664eb]/40 animate-spin" />
              </div>
            ) : notConnected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
                <span className="text-[#2664eb]/50 text-[13px] font-medium leading-snug">
                  Connect Google Tasks<br />to see your to-do list
                </span>
                <button
                  onClick={() => window.open("/api/auth/google", "googleAuth", "width=500,height=600")}
                  className="text-[#2664eb] text-[12px] underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  Connect
                </button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[#2664eb]/40 text-[13px]">No tasks — add one!</span>
              </div>
            ) : (
              <AnimatePresence>
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{
                      duration: 0.2,
                      layout: { type: "spring", bounce: 0.4, duration: 0.6 },
                    }}
                    className="relative flex items-center justify-between group w-full"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="relative text-left text-[#2664eb] text-[18px] leading-snug cursor-pointer flex-1 min-w-0 overflow-hidden"
                      style={{ fontFamily: "var(--font-geist-sans, sans-serif)" }}
                    >
                      {/* Text + strike scoped to text width */}
                      <span className="relative inline-block max-w-full truncate align-bottom">
                        <motion.span
                          className="inline-block font-bold"
                          animate={{ opacity: task.completed ? 0.5 : 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          -{task.title}
                        </motion.span>

                        {/* SVG hand-drawn strike-through — sized to this span */}
                        <motion.svg
                          className="absolute pointer-events-none"
                          style={{ top: "30%", left: 0, width: "100%", height: "40%", overflow: "visible" }}
                          viewBox="0 0 100 20"
                          preserveAspectRatio="none"
                        >
                          <motion.path
                            d={getStrikePath(task.id)}
                            stroke="#2664eb"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                            initial={false}
                            animate={{
                              pathLength: task.completed ? 1 : 0,
                              opacity: task.completed ? 1 : 0,
                            }}
                            transition={{
                              duration: 0.4,
                              ease: task.completed ? "easeOut" : "easeIn",
                            }}
                          />
                        </motion.svg>
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 shrink-0 text-[#2664eb]/40 hover:text-[#2664eb] transition-all p-1 rounded-full hover:bg-[#2664eb]/10"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Add task input */}
          {!notConnected && (
            <form
              onSubmit={addTask}
              className="flex items-center gap-1 mt-2 border-t border-[#2664eb]/20 pt-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="new task..."
                className="flex-1 bg-transparent outline-none text-[#2664eb] text-[16px] placeholder:text-[#2664eb]/40 min-w-0"
                style={{ fontFamily: "var(--font-geist-sans, sans-serif)" }}
              />
              <motion.button
                type="submit"
                disabled={!newTask.trim()}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="text-[#2664eb] hover:bg-[#2664eb]/10 rounded-full p-0.5 transition-colors disabled:opacity-30"
              >
                <Plus size={16} />
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
