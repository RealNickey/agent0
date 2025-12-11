# Agent0 - AI Chat Application

A Next.js chat application powered by Google Gemini models with the Vercel AI SDK, featuring **Generative UI** capabilities.

## Features

- 🤖 **Multiple Gemini Models**: Support for Gemini 2.5 Pro, Flash, and Flash Lite
- 🧠 **Thinking Mode**: Enhanced reasoning with Gemini 2.5+ models
- 🔍 **Google Search Integration**: Real-time web search capabilities
- 🌐 **URL Context**: Extract and analyze content from URLs
- ⚡ **Code Execution**: Run Python code in real-time
- 🌦️ **Weather Tool**: Beautiful weather cards with generative UI (see [docs/WEATHER_TOOL.md](docs/WEATHER_TOOL.md))
- 📎 **File Attachments**: Upload images, PDFs, and documents
- 💬 **Real-time Streaming**: Stream responses as they're generated
- 🎨 **Dark Mode**: Beautiful dark theme with OKLCH colors

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Create a `.env.local` file with:

```bash
# Required: Google AI API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Optional: Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Optional: Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Get your Google AI API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Generative UI Example

The weather tool demonstrates **generative UI** - the AI doesn't just return text, it generates rich UI components:

**Try asking:** "What's the weather in San Francisco?"

Instead of plain JSON, you'll see a beautiful weather card with:
- Dynamic color gradients based on conditions
- Large, readable temperature display
- Weather icons and detailed metrics
- Wind speed, humidity, and precipitation data

See [docs/WEATHER_TOOL.md](docs/WEATHER_TOOL.md) for implementation details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
