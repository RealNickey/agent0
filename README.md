<div align="center">

# Agent0

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Vercel AI SDK](https://img.shields.io/badge/AI_SDK-v6-purple)](https://sdk.vercel.ai)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5_Pro-blue?logo=google)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

A comprehensive, full-stack AI personal assistant application powered by Google Gemini. Agent0 integrates directly with core productivity tools to streamline scheduling, communication, and task management within a secure, Human-in-the-Loop framework.

</div>

---

## Overview

Agent0 is a sophisticated AI chat application designed to function as an actionable personal assistant. Beyond standard conversational capabilities, it executes concrete tasks via robust integrations with Google services (Gmail, Calendar, Tasks, Forms), GitHub, and more. All critical actions require explicit user approval, ensuring complete control over automated operations.

---

## Presentation Deck

<div align="center">
  <iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="800" height="450" src="https://embed.figma.com/slides/Yf5MgNmX3hmyvzQgXrhWp8/Nalathe-PPT?node-id=233-126&embed-host=share" allowfullscreen></iframe>
</div>

---

## Core Features

- **Multi-Model Architecture**: Primarily powered by Google Gemini, with extensible support for OpenAI, Cohere, Groq, and OpenRouter.
- **Advanced Integrations**:
  - **Gmail**: Search, read, draft, and send emails.
  - **Google Calendar**: Manage events and determine availability.
  - **Google Tasks**: Comprehensive task management and synchronization.
  - **GitHub**: Repository operations, issue tracking, and PR management.
  - **Multimedia & Utilities**: Real-time weather, image generation (DALL-E 3), and web search grounding.
- **Modern User Interface**: A responsive, animated dashboard featuring dark mode, glassmorphism design, and interactive data visualization.
- **Session Persistence**: Long-term memory and conversation tracking utilizing Supabase with pgvector embeddings.
- **Voice Interface**: Real-time voice interaction with visual waveform feedback.
- **Browser Extension**: Cross-tab awareness and quick-capture functionality for Chrome and Firefox.

---

## Technical Stack

- **Frontend**: Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4, Framer Motion v12, shadcn/ui.
- **AI Framework**: Vercel AI SDK v6.
- **Authentication**: Clerk v6.
- **Database & Storage**: Supabase (PostgreSQL + pgvector), Vercel Blob.

---

## Getting Started

### Prerequisites

To utilize the full functionality of Agent0, you will need to provision API keys for the following services:

- **Google Gemini API** (Required)
- **Clerk** (Required for authentication)
- **Supabase** (Optional: required for session persistence)
- **Google OAuth Credentials** (Optional: required for Workspace integrations)
- **GitHub Token** (Optional)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RealNickey/agent0.git
   cd agent0
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file based on the provided template and populate it with your credentials.
   ```bash
   cp .env.example .env.local
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   Navigate to `http://localhost:3000` to access the application.

---

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: UI elements, chat interface components, and feature modules.
- `ai/`: Tool definitions for system integrations (e.g., Calendar, Gmail).
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions and database clients.
- `browser-extension/`: Source code for the companion browser extension.

---

## License

This project is licensed under the MIT License.