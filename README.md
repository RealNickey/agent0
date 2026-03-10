<div align="center">

# 🤖 Agent0

### *Your AI personal assistant that actually does stuff — not just talks about doing stuff.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Vercel AI SDK](https://img.shields.io/badge/AI_SDK-v6-purple)](https://sdk.vercel.ai)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5_Pro-blue?logo=google)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

> **"What if your AI assistant could actually schedule your meetings, send your emails, check the weather, browse the web, generate presentations, AND play music — all while making snarky observations?"**  
> — No one said this, but Agent0 does it anyway.

</div>

---

## 🌅 What Is Agent0?

Agent0 is a **full-stack AI chat application** powered by Google Gemini that goes way beyond "ChatGPT but at home." It's your personal command center — a beautiful, animated, gradient-soaked dashboard that lets you talk to AI and *actually get things done*. Think Iron Man's JARVIS, but for people who have Google accounts and too many browser tabs open.

It connects to your **Gmail**, **Google Calendar**, **Google Tasks**, **GitHub**, and more — with a Human-in-the-Loop design that means nothing blows up without your approval first. (We learned that lesson the hard way.)

---

## ✨ Screenshots

### 🏠 Main Chat Interface
*The command center. Your AI butler awaits, complete with a weather report, email count, meeting count, and an inbox of your existential dread.*

![Main Chat UI](https://github.com/user-attachments/assets/cd9c413d-be1d-4f59-9e2a-286b30be9728)

---

### 🌄 At-a-Glance Dashboard (`/glance`)
*Good morning! (Or evening. Or whatever time it is where you are.) Here's your day summarized in exactly four lines, like a fortune cookie that actually knows your Google Calendar.*

![At-a-Glance](https://github.com/user-attachments/assets/ecf4e447-9aac-482f-8cb4-8646c0a541d6)

---

### 📅 Today's Schedule (`/meet`)
*Your meetings, laid out beautifully. Connect Google Calendar and it'll show you all the standups you forgot to prepare for.*

![Today's Schedule](https://github.com/user-attachments/assets/11fdee61-b488-4e0f-b29b-a7afd3ad312d)

---

### 🗂️ File Browser (`/folder`)
*Navigate your files like it's 1994 but make it gorgeous. Pixel art aesthetic meets modern file management.*

![Folder View](https://github.com/user-attachments/assets/b14c4995-3543-453d-a0ff-e6806d283378)

---

### 🎙️ Voice Mode (`/voice`)
*Talk to your AI out loud like the future-person you are. Includes a live waveform visualizer so you can feel like you're in a sci-fi movie.*

![Voice Interface](https://github.com/user-attachments/assets/0426371f-ea25-4e77-bfdb-5139079e8675)

---

### ✅ Task Manager (`/notes`)
*Your to-do list, powered by Google Tasks. Finally, a place to put all those tasks you'll definitely do later.*

![Task Manager](https://github.com/user-attachments/assets/2847038d-d4e0-4f9f-a6e9-4d6fb9d1623f)

---

### 🎵 Music 3000 (`/music3000`)
*A music player interface that belongs in a cyberpunk movie. Connect your tunes and let the vibes flow while you boss your AI around.*

![Music 3000](https://github.com/user-attachments/assets/65bfc283-6d74-4b31-92de-538d96e71146)

---

## 🚀 Features

### 💬 AI Chat That Actually Does Things

| Feature | Description |
|---------|-------------|
| 🧠 **Multi-model support** | Google Gemini 2.5 Pro/Flash, OpenAI, Cohere, Groq, OpenRouter — because having one AI isn't enough |
| 💭 **Chain-of-thought reasoning** | Watch the AI think out loud. Collapsible, so you can pretend you understood it |
| 🔍 **Google Search grounding** | Real-time web search so your AI doesn't make things up (as often) |
| 📎 **File attachments** | Drop images, PDFs, text files — the AI will read them so you don't have to |
| 🎙️ **Voice input** | Speak your requests. The AI listens. Unlike some people. |
| 📝 **Session persistence** | Your conversations survive page refreshes, unlike your motivations on Monday morning |
| 🔗 **URL context extraction** | Paste a link and the AI will read the whole page. Web scraping as a service. |
| ⚡ **Streaming responses** | See answers appear in real-time, character by character, very dramatic |

### 🛠️ Tool Ecosystem (50+ Tools!)

Agent0 has more tools than a Swiss Army knife that went to college:

#### 📧 Gmail Integration
- Search, read, draft, and send emails
- Categorize important messages
- Human-in-the-Loop confirmation before sending (so you don't accidentally email your boss at 2am)

#### 📅 Google Calendar
- Create, update, delete events
- Find availability ("When is everyone free?" — Agent0 knows)
- Full HITL confirmation flow — no surprise meetings

#### ✅ Google Tasks
- Create, complete, schedule, and manage tasks
- Syncs with Google Tasks so it actually persists beyond a browser refresh

#### 📊 Google Forms
- Create surveys and forms from a conversation
- Fetch and summarize responses
- Set up webhooks for new responses

#### 🖥️ Google Slides
- Generate presentations from a text description
- Because nothing says "I prepared for this meeting" like an AI-generated deck

#### 🐙 GitHub Integration
- Create issues, manage PRs, merge branches
- Query repositories and branch operations
- For developers who never leave the chat window

#### 🌤️ Weather
- Real-time weather via Open-Meteo API (free, no key needed!)
- Use `@weather` in your message to summon it

#### 🎬 Movie/TV Info
- Search TMDB for movies and shows
- Get recommendations based on your mood ("something sad but not *too* sad")

#### 🖼️ Image Generation
- DALL-E 3 integration for generating images
- "Draw me a cat in a spacesuit" — done

#### 🧠 Long-term Memory
- Remembers things you've told it across conversations
- Powered by Supabase with pgvector embeddings

### 🎨 Beautiful Interface

- **Dark mode only** — because we have taste
- **Animated everything** — Framer Motion v12 making every interaction feel premium
- **macOS-style Dynamic Island** — the pill-shaped nav bar that Apple wishes it had on Mac
- **Glassmorphism cards** — frosted glass aesthetic throughout
- **Real-time analog clock** — because why have a boring digital time when you can have a ticking SVG masterpiece?
- **Live weather icons** — 9 hand-crafted weather states (sunny ☀️, cloudy ⛅, rainy 🌧️, snowy 🌨️, stormy ⛈️, and more)

### 🧩 @Mention Tool System

Type `@weather`, `@calendar`, or `@github` in your message to activate specific tools. It's like Discord slash commands but for your AI assistant. Very cool, very functional, very unnecessary to explain this much.

```
You: @weather What should I wear today?
Agent0: It's 22°C and sunny in your location. Light jacket optional, sunglasses mandatory, vibes: immaculate.
```

### 🔌 Browser Extension

A Chrome/Firefox extension that:
- 📸 Captures screenshots with `Ctrl+Shift+S` and sends them directly to your chat
- 🔄 Gives Agent0 cross-tab awareness
- 🎵 Controls media playback from any tab
- Works on Chrome, Edge, Firefox, Brave, Opera

---

## 🏗️ Tech Stack

```
Frontend:    Next.js 16 (App Router) + TypeScript 5
Styling:     Tailwind CSS v4 + Framer Motion v12
AI:          Vercel AI SDK v6 + Google Gemini API
Auth:        Clerk v6
Database:    Supabase (PostgreSQL + pgvector)
Storage:     Vercel Blob
UI:          shadcn/ui (new-york style) + Radix UI
Icons:       Lucide React
Fonts:       Geist + Rubik
```

The dependency list is long enough that reading `package.json` feels like a spiritual experience.

---

## ⚙️ Getting Started

### Prerequisites

You'll need API keys for some of this. Don't panic — most are free tiers.

| Service | Required | Free Tier? | What For |
|---------|----------|------------|----------|
| Google Gemini API | ✅ Yes | ✅ Yes | The brains of the operation |
| Clerk | ✅ Yes | ✅ Yes | Authentication |
| Supabase | ⚠️ Optional | ✅ Yes | Session/memory persistence |
| Google OAuth | ⚠️ Optional | ✅ Yes | Gmail, Calendar, Tasks, Forms |
| GitHub Token | ⚠️ Optional | ✅ Yes | GitHub integration |
| TMDB API Key | ⚠️ Optional | ✅ Yes | Movie/TV tool |
| OpenAI API | ⚠️ Optional | ❌ No | Image generation + fallback |

### Installation

```bash
# Clone the repo
git clone https://github.com/RealNickey/agent0.git
cd agent0

# Install dependencies (go make a coffee, this takes a sec)
npm install

# Set up your environment variables
cp .env.example .env.local
# Fill in your API keys in .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and behold your new AI overlord.

### Environment Variables

```env
# Required - The actual AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here

# Required - Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Optional but recommended - Persistence
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional - Google integrations (OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Optional - Other integrations
GITHUB_TOKEN=ghp_...
TMDB_API_KEY=your_tmdb_key
OPENAI_API_KEY=sk-...
```

---

## 🗂️ Project Structure

```
agent0/
├── app/                    # Next.js App Router pages & API routes
│   ├── page.tsx            # Main chat interface (/)
│   ├── glance/             # At-a-glance dashboard (/glance)
│   ├── meet/               # Today's schedule (/meet)
│   ├── folder/             # File browser (/folder)
│   ├── voice/              # Voice interface (/voice)
│   ├── notes/              # Task manager (/notes)
│   ├── music3000/          # Music player (/music3000)
│   └── api/                # 40+ API routes (chat, auth, calendar, gmail, github...)
│
├── components/
│   ├── ai-elements/        # 60+ AI-specific components (messages, tools, confirmations)
│   ├── ui/                 # shadcn/ui primitives (buttons, dialogs, etc.)
│   ├── chat-ui.tsx         # Main chat orchestrator
│   ├── dynamic-island.tsx  # The fancy pill-shaped nav bar
│   ├── at-a-glance.tsx     # Dashboard summary widget
│   ├── today-schedule.tsx  # Calendar schedule view
│   └── ...                 # 30+ more feature components
│
├── ai/                     # Tool definitions (weather, calendar, gmail, github...)
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, DB clients, constants
├── types/                  # TypeScript type definitions
├── browser-extension/      # Chrome/Firefox extension source
└── proxy.ts                # Auth middleware (Clerk)
```

---

## 🧰 Available Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint (find the bugs you created)
```

---

## 🔐 Authentication

Agent0 uses [Clerk](https://clerk.com) for authentication. Sign up, sign in, and your chat sessions, memory, and preferences persist across devices. The only public route is `/glance` — everything else requires you to prove you're human. (Or at least that you have a Google account, which is close enough.)

---

## 🤝 Contributing

Found a bug? Have a feature idea? Want to make the README even funnier? PRs are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-cool-thing`)
3. Make your changes
4. Run the linter (`npm run lint`)
5. Submit a PR and describe what you did in excruciating detail

---

## 📋 Roadmap

Things that are coming (probably):

- [ ] 📧 Full email compose UI with rich text
- [ ] 🎬 Video download integration (yt-dlp)
- [ ] 📄 PDF operations (merge, compress, annotate)
- [ ] 🎨 Mermaid diagram rendering
- [ ] 📐 LaTeX math rendering
- [ ] 🎵 Spotify integration (proper music control)
- [ ] 📚 RAG with Supabase pgvector (ask questions about your documents)
- [ ] ✅ Google Tasks full HITL approval UI

---

## 📄 License

MIT License — use it, fork it, ship it, just don't blame us when your AI schedules you into 7 back-to-back meetings.

---

<div align="center">

**Built with ☕, 🧠, and an unhealthy amount of Tailwind CSS classes.**

*If this README made you smile at least once, consider giving the repo a ⭐*

</div>
