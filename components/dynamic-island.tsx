"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Blocks, TreePine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { ModelSelectorControl, Model, ModelSelectorControlProps } from "@/components/ai-elements/model-selector-control";

interface DynamicIslandProps extends Partial<ModelSelectorControlProps> {
  className?: string;
  onOpenIntegrations?: () => void;
  models?: Model[];
  selectedModel?: Model;
  onSelectModel?: (model: Model) => void;
  isModelOpen?: boolean;
  onModelOpenChange?: (open: boolean) => void;
  onNewChat?: () => void;
}

export function DynamicIsland({ 
  className,
  models = [],
  selectedModel,
  onSelectModel,
  isModelOpen = false,
  onModelOpenChange,
  onOpenIntegrations,
  onNewChat
}: DynamicIslandProps) {
  const { user, isLoaded } = useUser();
  const [showControls, setShowControls] = React.useState(false);

  return (
    <div className={cn("fixed top-6 left-1/2 -translate-x-1/2 z-50", className)}>
      <motion.div
        onMouseLeave={() => setShowControls(false)}
        initial={{ y: -20, opacity: 0, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex items-center gap-2 p-1.5 rounded-full bg-[#0A0A0A]/40 backdrop-blur-[32px] border border-white/8 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2)]"
      >
        {/* Logo / New Chat */}
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => setShowControls(true)}
          onClick={onNewChat}
          className="flex items-center justify-center size-10 rounded-full bg-white/5 text-white/90 transition-colors border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] shrink-0"
        >
          <TreePine className="size-5" />
        </motion.button>

        <AnimatePresence mode="popLayout">
            {showControls && (
            <motion.div
              key="island-controls"
              initial={{ opacity: 0, scale: 0.9, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.9, width: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center overflow-hidden"
            >
              <div className="w-px h-6 bg-white/8 mx-1 shrink-0" />

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0 px-1">
                {selectedModel && onSelectModel && (
                  <ModelSelectorControl
                    models={models}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    isOpen={isModelOpen || false}
                    onOpenChange={onModelOpenChange || (() => {})}
                    className="h-10 border-none bg-transparent hover:bg-white/8 text-white/90 w-auto min-w-[130px] transition-colors rounded-full px-4 font-medium" 
                  />
                )}
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 gap-2 text-white/80 hover:text-white hover:bg-white/8 rounded-full px-4 transition-colors font-medium"
                    onClick={onOpenIntegrations}
                >
                    <Blocks className="size-4" />
                    <span>Tools</span>
                </Button>
              </div>
              
              <div className="w-px h-6 bg-white/8 mx-1 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Section */}
        <div className="flex items-center gap-3 px-3 pr-1.5 shrink-0">
          <span className="text-base font-medium text-white/70 tracking-tight">Hello,</span>

          <SignedIn>
            <div className="flex items-center gap-2">
              <div className="h-9 px-4 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <span className="text-sm font-medium text-white/90">{isLoaded ? user?.firstName : "..."}</span>
              </div>
              <div className="size-9 rounded-full border border-dashed border-white/20 p-0.5 flex items-center justify-center bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <UserButton appearance={{ elements: { userButtonAvatarBox: "size-full" } }} />
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="h-9 px-4 rounded-full border border-dashed border-white/20 flex items-center justify-center gap-2 hover:bg-white/8 hover:border-white/40 transition-all duration-300 cursor-pointer group bg-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Plus className="size-4 text-white/50 group-hover:text-white/90 transition-colors" />
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Add Name</span>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </motion.div>
    </div>
  );
}