"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { SerializableToolExtension } from "@/lib/tool-registry";
import { motion, AnimatePresence } from "motion/react";

export interface MentionMenuProps {
  query: string;
  tools: SerializableToolExtension[];
  onSelect: (tool: SerializableToolExtension) => void;
  onClose: () => void;
  visible: boolean;
  position?: { x: number; y: number };
}

export const MentionMenu = forwardRef<HTMLDivElement, MentionMenuProps>(
  ({ query, tools, onSelect, onClose, visible, position }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Filter tools based on query
    const filteredTools = tools.filter(
      (tool) =>
        !query ||
        tool.name.toLowerCase().includes(query.toLowerCase()) ||
        tool.description.toLowerCase().includes(query.toLowerCase()) ||
        tool.id.toLowerCase().includes(query.toLowerCase())
    );

    // Reset selection when query changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Handle keyboard navigation
    useEffect(() => {
      if (!visible) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < filteredTools.length - 1 ? prev + 1 : 0
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredTools.length - 1
            );
            break;
          case "Enter":
            e.preventDefault();
            if (filteredTools[selectedIndex]) {
              onSelect(filteredTools[selectedIndex]);
            }
            break;
          case "Escape":
            e.preventDefault();
            onClose();
            break;
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [visible, filteredTools, selectedIndex, onSelect, onClose]);

    if (!visible) return null;

    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-72 rounded-lg border bg-popover shadow-lg",
              "bottom-full mb-2"
            )}
            style={position ? { left: position.x, bottom: position.y } : undefined}
          >
            <Command className="rounded-lg">
              <CommandList className="max-h-64">
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  No tools found
                </CommandEmpty>
                <CommandGroup heading="Available Tools">
                  {filteredTools.map((tool, index) => (
                    <CommandItem
                      key={tool.id}
                      value={tool.id}
                      onSelect={() => onSelect(tool)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer",
                        index === selectedIndex && "bg-accent"
                      )}
                    >
                      {tool.icon && (
                        <span className="text-lg shrink-0">{tool.icon}</span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">
                          {tool.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {tool.description}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

MentionMenu.displayName = "MentionMenu";

export default MentionMenu;
