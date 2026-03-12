"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudSun, Plus, Trash2, ExternalLink, Calendar, FileText, Mail, ListTodo, Network, FileStack, Github, ImageIcon, Film, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { GlowEffect } from "@/components/ui/glow-effect";

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
  {
    id: "calendar",
    name: "Calendar",
    description: "Manage events and check availability on Google Calendar.",
    icon: Calendar,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Create, track, and manage to-do lists with Google Tasks.",
    icon: ListTodo,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "forms",
    name: "Forms",
    description: "Create surveys and forms, collect responses with Google Forms.",
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Search, read, draft, and send emails through Gmail.",
    icon: Mail,
    color: "text-red-600",
    bgColor: "bg-red-600/10",
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Merge multiple PDFs or compress PDF files for smaller size.",
    icon: FileStack,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "mermaid",
    name: "Mermaid",
    description: "Generate mermaid diagram code for flowcharts, sequences, and more.",
    icon: Network,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Create issues, branches, pull requests, and manage repos on GitHub.",
    icon: Github,
    color: "text-gray-300",
    bgColor: "bg-gray-500/10",
  },
  {
    id: "image",
    name: "Image",
    description: "Generate images from text prompts using Cloudflare Workers AI (Flux-1-Schnell).",
    icon: ImageIcon,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  {
    id: "movie",
    name: "Movie",
    description: "Search for movies and get posters, ratings, runtime, genres, and descriptions from TMDB.",
    icon: Film,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "research",
    name: "Research",
    description: "Deep research across Wikipedia, PubMed, and academic sources with downloadable reports.",
    icon: Search,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
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
      <DialogContent className="sm:max-w-[70vw] md:max-w-[65vw] lg:max-w-[800px] xl:max-w-[900px] h-[70vh] flex flex-col p-4 sm:p-6 md:p-8 gap-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-2xl text-foreground">Integrations</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Add integrations to enhance your chat experience.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 py-4">
            <AnimatePresence mode="popLayout">
              {INTEGRATIONS.map((integration) => {
                const isAdded = addedIntegrations.includes(integration.id);
                return (
                  <motion.div
                    key={integration.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative flex flex-col h-full"
                  >
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <GlowEffect
                        colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
                        mode="static"
                        blur="medium"
                      />
                    </div>
                    <div className="relative h-full min-h-[220px] flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 group-hover:bg-card/90">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className={cn("p-2.5 rounded-lg w-fit", integration.bgColor)}>
                            <integration.icon className={cn("w-6 h-6", integration.color)} />
                          </div>
                          {isAdded && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium border border-green-500/20 shadow-sm">
                              Active
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg leading-tight mb-2 opacity-90">{integration.name}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t w-full">
                        {isAdded ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 px-2 whitespace-nowrap"
                              onClick={() => {
                                onAddIntegration(integration.id);
                                onOpenChange(false);
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-1.5 shrink-0" />
                              Details
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1 px-2 whitespace-nowrap"
                              onClick={() => onRemoveIntegration(integration.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1.5 shrink-0" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => {
                              onAddIntegration(integration.id);
                              onOpenChange(false);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Integration
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
