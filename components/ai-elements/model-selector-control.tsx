"use client";

import { useId, useState, useEffect } from "react";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorSeparator,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

export type Model = {
  id: string;
  name: string;
  provider: string;
  series: string;
  supportsThinking: boolean;
};

export type ModelSelectorControlProps = {
  models: Model[];
  selectedModel: Model;
  onSelectModel: (model: Model) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModelSelectorControl({
  models,
  selectedModel,
  onSelectModel,
  isOpen,
  onOpenChange,
}: ModelSelectorControlProps) {
  const model25Series = models.filter((m) => m.series === "2.5");
  
  // Fix hydration mismatch by only rendering the dialog trigger after mount
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Render a placeholder button during SSR to prevent hydration mismatch
  if (!isMounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 rounded-full border-dashed px-3 bg-background/50 backdrop-blur-sm"
      >
        <ModelSelectorLogo provider={selectedModel.provider} />
        <span className="text-xs font-medium">{selectedModel.name}</span>
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <ModelSelector open={isOpen} onOpenChange={onOpenChange}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 rounded-full border-dashed px-3 bg-background/50 backdrop-blur-sm"
        >
          <ModelSelectorLogo provider={selectedModel.provider} />
          <span className="text-xs font-medium">{selectedModel.name}</span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search Gemini models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No model found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Gemini 2.5 (Thinking)">
            {model25Series.map((model) => (
              <ModelSelectorItem
                key={model.id}
                onSelect={() => {
                  onSelectModel(model);
                  onOpenChange(false);
                }}
                className="gap-2"
              >
                <ModelSelectorLogo provider={model.provider} />
                <ModelSelectorName>{model.name}</ModelSelectorName>
                {selectedModel.id === model.id && (
                  <CheckIcon className="ml-auto size-4" />
                )}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
