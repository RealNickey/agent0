"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Weather } from "@/components/weather";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string | null;
}

const INTEGRATION_DETAILS: Record<string, { name: string; description: string; functions: { name: string; description: string }[] }> = {
  weather: {
    name: "Weather",
    description: "Get real-time weather updates for any location.",
    functions: [
      { name: "displayWeather", description: "Get current weather for a location using Open-Meteo API" }
    ]
  },
  calendar: {
    name: "Calendar",
    description: "Manage events and check availability on Google Calendar.",
    functions: [
      { name: "createEvent", description: "Create a new calendar event" },
      { name: "listEvents", description: "List upcoming calendar events" },
      { name: "updateEvent", description: "Modify an existing event" },
      { name: "deleteEvent", description: "Remove an event" },
      { name: "findAvailability", description: "Find free time slots" }
    ]
  },
  gmail: {
    name: "Gmail",
    description: "Manage emails through Gmail.",
    functions: [
      { name: "searchEmails", description: "Search for emails using Gmail search operators" },
      { name: "getThread", description: "Get full email conversation thread" },
      { name: "createDraft", description: "Create an email draft" },
      { name: "sendMessage", description: "Send an email or draft" },
      { name: "getMessageContent", description: "Get detailed content of a specific email" }
    ]
  },
  tasks: {
    name: "Tasks",
    description: "Manage to-do lists with Google Tasks.",
    functions: [
      { name: "createTask", description: "Create a new task" },
      { name: "scheduleTask", description: "Schedule task with HITL confirmation" },
      { name: "listTasks", description: "List tasks in a task list" },
      { name: "updateTask", description: "Modify an existing task" },
      { name: "deleteTask", description: "Remove a task" },
      { name: "completeTask", description: "Mark a task as completed" },
      { name: "getTaskLists", description: "Get all task lists" },
      { name: "scheduleTaskWorkTime", description: "Find optimal time slots for task completion" }
    ]
  },
  forms: {
    name: "Forms",
    description: "Create surveys and collect responses.",
    functions: [
      { name: "createSurveyForm", description: "Create a new survey/form with questions" },
      { name: "fetchNewResponses", description: "Fetch new responses since last check" },
      { name: "watchResponsesWebhook", description: "Set up webhook for real-time notifications" },
      { name: "updateFormSchema", description: "Add or remove questions from a form" },
      { name: "getResponseSummary", description: "Get aggregate statistics for form responses" }
    ]
  },
  pdf: {
    name: "PDF",
    description: "Merge multiple PDFs or compress PDF files.",
    functions: [
      { name: "mergePDFs", description: "Merge multiple PDF files into a single PDF" },
      { name: "compressPDF", description: "Compress a PDF file to reduce its size" }
    ]
  },
  mermaid: {
    name: "Mermaid",
    description: "Generate Mermaid diagram code for flowcharts, sequences, and more.",
    functions: [
      { name: "generateDiagram", description: "Generate Mermaid diagram code based on description" },
      { name: "createFlowchart", description: "Create flowchart diagrams" },
      { name: "createSequenceDiagram", description: "Create sequence diagrams for interactions" },
      { name: "createGanttChart", description: "Create Gantt charts for project timelines" }
    ]
  },
  slides: {
    name: "Slides",
    description: "Create beautiful reveal.js presentations with images, animations, and professional styling.",
    functions: [
      { name: "schedulePresentationHeadings", description: "Draft editable slide heading overview before generation" },
      { name: "createPresentation", description: "Generate HTML presentation with rich visuals and animations" }
    ]
  },
  github: {
    name: "GitHub",
    description: "Manage repositories, issues, branches, and pull requests on GitHub.",
    functions: [
      { name: "listRepositories", description: "List all owned and collaborated repos (use type='all' for everything)" },
      { name: "listCollaboratedRepositories", description: "List repos where you are a collaborator but not the owner" },
      { name: "createIssue", description: "Create a new issue with title, body, and labels" },
      { name: "createBranch", description: "Create a branch from a base ref" },
      { name: "createPullRequest", description: "Open a new pull request" },
      { name: "mergePullRequest", description: "Merge a PR (merge / squash / rebase)" },
      { name: "commentOnPR", description: "Add a comment to a pull request" },
      { name: "listPullRequests", description: "List PRs with state filtering" }
    ]
  },
  movie: {
    name: "Movie",
    description: "Search for movies and get detailed information from TMDB.",
    functions: [
      { name: "searchMovie", description: "Search for a movie by title and return poster, year, runtime, genres, rating, and overview" }
    ]
  },
  image: {
    name: "Image",
    description: "Generate images from text prompts using Cloudflare Workers AI (Flux-1-Schnell).",
    functions: [
      { name: "generateImage", description: "Generate an image from a text prompt using Flux-1-Schnell model" }
    ]
  },
  research: {
    name: "Research",
    description: "Conduct deep research across multiple authoritative sources including Wikipedia, Europe PMC peer-reviewed papers, OpenAlex academic publications, and DuckDuckGo. Synthesizes a comprehensive journal-style report with numbered sections, full literature review, key findings, and a complete reference list with citations.",
    functions: [
      { name: "conductResearch", description: "Research any topic by fetching full content from Wikipedia, Europe PMC, OpenAlex, and DuckDuckGo — then synthesizes a downloadable report with citations" }
    ]
  }
};

export function IntegrationPanel({
  isOpen,
  onClose,
  integrationId,
}: IntegrationPanelProps) {
  // Mock weather data state
  const [weatherData, setWeatherData] = useState({
    location: "San Francisco, CA",
    temperature: 72,
    temperatureUnit: "°F",
    apparentTemperature: 70,
    humidity: 45,
    windSpeed: 8,
    windSpeedUnit: "mph",
    weatherCode: 1, // Sunny/Cloudy
    weatherDescription: "Partly Cloudy",
  });

  const details = integrationId ? INTEGRATION_DETAILS[integrationId] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-background border-l shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">
                  {details ? details.name : "Integration"}
                </h2>
                {details && (
                  <Badge variant="secondary" className="text-xs">
                    Connected
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {details ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-sm">{details.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Available Functions</h3>
                    <div className="grid gap-3">
                      {details.functions.map((fn) => (
                        <div key={fn.name} className="p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                          <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {fn.name}
                          </code>
                          <p className="text-sm text-muted-foreground mt-1.5">
                            {fn.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {integrationId === "weather" && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Live Preview</h3>
                      <Weather {...weatherData} />
                      <div className="text-xs text-muted-foreground mt-2">
                        <p>Integration active. Weather data is simulated for demo purposes.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>Select an integration to view details</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
