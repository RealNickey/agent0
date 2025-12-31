"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueTime?: string;
};

export type TasksWidgetProps = {
  tasks: Task[];
  onAddTask?: (title: string) => void;
  onToggleTask?: (id: string) => void;
  className?: string;
};

export function TasksWidget({
  tasks,
  onAddTask,
  onToggleTask,
  className,
}: TasksWidgetProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleAddTask = () => {
    if (newTaskTitle.trim() && onAddTask) {
      onAddTask(newTaskTitle.trim());
      setNewTaskTitle("");
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-sm">Today&apos;s Tasks</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {tasks.length} completed
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <div className="px-4 py-2">
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 max-h-[240px]">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks for today
          </p>
        ) : (
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onToggleTask?.(task.id)}
              className={cn(
                "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                "hover:bg-accent/50",
                task.completed && "opacity-50"
              )}
            >
              {task.completed ? (
                <CheckCircle2 className="size-4 mt-0.5 text-primary shrink-0" />
              ) : (
                <Circle
                  className={cn(
                    "size-4 mt-0.5 shrink-0",
                    getPriorityColor(task.priority)
                  )}
                />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm block truncate",
                    task.completed && "line-through"
                  )}
                >
                  {task.title}
                </span>
                {task.dueTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="size-3" />
                    {task.dueTime}
                  </span>
                )}
              </div>
              {task.priority === "high" && !task.completed && (
                <AlertCircle className="size-3 text-red-500 shrink-0 mt-1" />
              )}
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddTask();
              }
            }}
          />
          <Button
            size="icon"
            variant="secondary"
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
