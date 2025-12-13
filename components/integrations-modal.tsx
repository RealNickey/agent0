"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudSun, Plus, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface IntegrationsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddIntegration: (id: string) => void;
  onRemoveIntegration: (id: string) => void;
  addedIntegrations: string[];
}

const INTEGRATIONS = [
  {
    id: "weather",
    name: "Weather",
    description: "Get real-time weather updates for any location.",
    icon: CloudSun,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

export function IntegrationsModal({
  isOpen,
  onOpenChange,
  onAddIntegration,
  onRemoveIntegration,
  addedIntegrations,
}: IntegrationsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Integrations</DialogTitle>
          <DialogDescription>
            Add integrations to enhance your chat experience.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <AnimatePresence>
            {INTEGRATIONS.map((integration) => {
              const isAdded = addedIntegrations.includes(integration.id);
              return (
                <motion.div
                  key={integration.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={cn("p-2 rounded-md transition-colors", integration.bgColor)}
                    >
                      <integration.icon className={cn("w-6 h-6", integration.color)} />
                    </motion.div>
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {integration.name}
                        {isAdded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium border border-green-500/20">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdded ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            onAddIntegration(integration.id); // Opens the panel
                            onOpenChange(false);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveIntegration(integration.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          onAddIntegration(integration.id);
                          onOpenChange(false);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
