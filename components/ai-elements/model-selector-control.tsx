"use client";

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
  supportsTools: boolean;
  supportsToolStreaming: boolean;
  supportsGoogleSearch: boolean;
  supportsUrlContext: boolean;
  supportsImageInput: boolean;
  supportsObjectGeneration: boolean;
  supportsCodeExecution: boolean;
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
  const modelsBySeries = models.reduce<Record<string, Model[]>>(
    (acc, model) => {
      if (!acc[model.series]) {
        acc[model.series] = [];
      }
      acc[model.series].push(model);
      return acc;
    },
    {},
  );

  const seriesOrder = Object.keys(modelsBySeries).sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return bNum - aNum;
    if (!Number.isNaN(aNum)) return -1;
    if (!Number.isNaN(bNum)) return 1;
    return a.localeCompare(b);
  });

  const getSeriesLabel = (series: string) => {
    if (series === "3") return "Gemini 3 (Thinking)";
    if (series === "2.5") return "Gemini 2.5 (Thinking)";
    if (series === "2.0") return "Gemini 2.0";
    if (series === "1.5") return "Gemini 1.5";
    if (series === "gemma") return "Gemma";
    return `Series ${series}`;
  };

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
          {seriesOrder.map((series) => (
            <ModelSelectorGroup key={series} heading={getSeriesLabel(series)}>
              {modelsBySeries[series].map((model) => (
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
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
