"use client";

import { Button } from "@/components/ui/button";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { TreePine } from "lucide-react";
import { ModelSelectorControl, Model } from "@/components/ai-elements/model-selector-control";

export type ChatHeaderProps = {
  models: Model[];
  selectedModel: Model;
  onSelectModel: (model: Model) => void;
  isModelOpen: boolean;
  onModelOpenChange: (open: boolean) => void;
  onNewChat?: () => void;
};

export function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  isModelOpen,
  onModelOpenChange,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 lg:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={onNewChat}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNewChat?.();
          }
        }}
      >
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
          <TreePine className="size-4" />
        </div>
        <span className="font-semibold text-sm">Agent0</span>
      </div>

      <ModelSelectorControl
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        isOpen={isModelOpen}
        onOpenChange={onModelOpenChange}
      />

      <div className="flex items-center gap-2">
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
