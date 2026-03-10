import type { Model } from "@/components/ai-elements/model-selector-control";

// Models with their capabilities (tool-calling verified)
export const MODELS: Model[] = [
  // Google Gemini
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", series: "2.5", supportsThinking: true },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", series: "2.5", supportsThinking: true },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google", series: "2.5", supportsThinking: true },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", series: "2.0", supportsThinking: false },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", provider: "google", series: "3", supportsThinking: true },
  { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite (Preview)", provider: "google", series: "3.1", supportsThinking: true },

  // Groq
  { id: "groq:llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", series: "3.3", supportsThinking: false },
  { id: "groq:llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", provider: "groq", series: "3.1", supportsThinking: false },
  { id: "groq:qwen/qwen3-32b", name: "Qwen 3 32B", provider: "groq", series: "3", supportsThinking: false },
  { id: "groq:moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 Instruct", provider: "groq", series: "k2", supportsThinking: false },
  { id: "groq:meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17B", provider: "groq", series: "4", supportsThinking: false },
  { id: "groq:meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", provider: "groq", series: "4", supportsThinking: false },
  { id: "groq:openai/gpt-oss-20b", name: "GPT-OSS 20B", provider: "groq", series: "oss", supportsThinking: false },
  { id: "groq:openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "groq", series: "oss", supportsThinking: false },

  // Cohere
  { id: "cohere:command-a-03-2025", name: "Command A", provider: "cohere", series: "a", supportsThinking: false },
  { id: "cohere:command-r7b-12-2024", name: "Command R7B", provider: "cohere", series: "r7b", supportsThinking: false },
  { id: "cohere:command-r-08-2024", name: "Command R", provider: "cohere", series: "r", supportsThinking: false },
  { id: "cohere:command-nightly", name: "Command Nightly", provider: "cohere", series: "nightly", supportsThinking: false },
];

export const DEFAULT_SUGGESTIONS = [
  "Search for latest AI news",
  "Calculate the 50th Fibonacci number",
  "Explain this URL: https://vercel.com",
  "Summarize a PDF document",
];

export const STORAGE_KEYS = {
  MODEL: "agent0-selected-model",
  MESSAGES: "agent0-chat-messages",
  THINKING: "agent0-enable-thinking",
  SEARCH: "agent0-enable-search",
  URL_CONTEXT: "agent0-enable-url-context",
  INTEGRATIONS: "agent0-added-integrations",
} as const;
