# Personal AI Assistant Agent - Complete Project Specification

## Project Vision

A task-oriented AI agent platform that executes complex workflows through natural language commands. Unlike conversational chatbots, this system focuses on "assign and execute" interactions where users delegate tasks and the agent autonomously completes them using specialized tools, integrations, and human-in-the-loop validation when needed.

---

## Core Architecture

### Technology Stack

**Backend & AI Layer**
- **AI SDK**: Vercel AI SDK
- **LLM**: Google Gemini API (Gemini Flash for speed, Pro for complex reasoning)
- **Database**: Supabase with pgvector extension
- **Authentication**: Clerk
- **File Storage**: Supabase Storage / Vercel Blob

**Frontend Stack**
- **Framework**: Next.js 14+ (App Router, Server Actions)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion

---

## System Design Principles

### Agent Interaction Model
- **Task-Oriented**: Single instruction → Autonomous execution → Result delivery
- **Non-Conversational**: Minimal back-and-forth; agent clarifies only when critical
- **Proactive**: Agent suggests next steps and optimizations
- **Transparent**: Clear execution logs and reasoning chains visible to user

### Human-in-the-Loop (HITL) Integration
**When HITL Triggers**:
- Destructive operations (delete emails, cancel events)
- Sending emails/messages on user's behalf
- Ambiguous instructions requiring clarification
- High-confidence threshold not met

**HITL Interface**:
- Inline approval prompts with preview
- Batch approval for multiple similar actions
- "Trust this action type" option to reduce future prompts
- Timeout handling (auto-cancel or save draft)

---

## Feature Specifications

### 1. Tool Ecosystem (18 Core Tools)

#### Communication & Productivity
**1. Email Summary Tool**
- Aggregate unread emails from Gmail
- Categorize by priority (urgent, important, newsletters, spam)
- Extract action items and deadlines
- Generate daily/weekly digest
- Support filters (sender, date range, labels)

**2. Calendar Event Creation Tool**
- Natural language event parsing ("meeting with John next Tuesday 3pm")
- Auto-detect timezone and duration
- Suggest optimal meeting slots based on calendar availability
- Send invites to attendees
- Add video conference links (Google Meet)

**3. Schedule Meeting Tool**
- Find mutual availability across multiple participants
- Propose 3-5 time slot options
- Create calendar event upon confirmation
- Send meeting reminders

**4. To-Do List Management Tool**
- Create, read, update, delete tasks
- Set priorities, due dates
- Integrate with Google Tasks
- Recurring task support

#### File & Media Operations
**5. Download All Videos Tool**
- Accept URL (YouTube, Twitter, Instagram, etc.)
- Use yt-dlp
- download from link using natural

**6. PDF Operations Tool**
- Merge multiple PDFs
- Compress/optimize file size

**7. File Conversion Tool**
- Document formats (DOCX ↔ PDF, MD ↔ HTML, etc.)
- Image formats (PNG ↔ JPG, WEBP, SVG, etc.)
- Audio formats (MP3, WAV, OGG)
- Video formats (MP4, WEBM, AVI) using FFmpeg
- Batch conversion support
- Quality/compression settings

**8. Image Generator Tool**
- Integration:DALL-E 3
- Text-to-image generation

#### Data Visualization & Documents
**10. Mermaid Graph Tool**
- Generate flowcharts, sequence diagrams, Gantt charts
- Natural language to Mermaid syntax conversion

**11. LaTeX Renderer Tool**
- Render as pdf
- Syntax validation and self correcting 

#### Entertainment & Information
**12. Spotify Integration Tool**
- Play/pause, skip tracks
- Search songs, artists, albums

**13. Movie Tool**
- Search movies/shows (TMDB or OMDB API)
- Get ratings, reviews, streaming availability
- Recommend based on preferences
- Fetch trailers and cast information

**14. Weather Tool**
- Current weather and forecast (5-7 days)
- Location-based or manual input


### 2. Tool Chaining & Workflow Patterns

#### Execution Patterns
**Sequential Chain**
```
User: "Download this video, convert to MP3, and add to my study playlist on Spotify"
→ Download Video → Convert to MP3 → Upload to Spotify → Add to Playlist
```

**Parallel Execution**
```
User: "Summarize my emails and show today's weather and calendar"
→ [Email Summary Tool | Weather Tool | Calendar Tool] → Aggregate results
```

**Conditional Branching**
```
User: "If I have no meetings before noon, schedule a focus block for writing"
→ Check Calendar → IF (no meetings) → Create Calendar Event
```

**Loop/Retry Logic**
```
User: "Download all videos from this playlist"
→ FOR each video → Download → ON FAIL → Retry 3x → Log error
```

#### @ Command System
- **Invocation**: `@toolname parameter1 parameter2`
- **Auto-suggest**: Type `@` to see all available tools with fuzzy search
- **Multi-tool**: `@email @calendar @weather` executes tools in best workflow pattern as the llm decides


---





### 6. Dashboard Interface

#### Daily Overview Audio Briefing

**Content Sources**:
1. **Past File Creations**: Files created in last 24 hours (PDFs, images, documents)
2. **Important Insights**: AI-extracted key takeaways from completed tasks
3. **To-Do List**: Today's tasks (pending, overdue, completed count)
4. **Upcoming Events**: Next 3-5 calendar events with time and location
5. **Email Summary**: Unread count by priority
6. **Weather**: Current conditions and day forecast

**Audio Generation**:
- **TTS Engine**: Google Cloud Text-to-Speech (WaveNet voices)
- **Voice**: User-selectable (default: en-US-Neural2-J)
- **Length**: 2-4 minutes target
- **Generation Time**: 6:00 AM user local time (configurable)
- **Delivery**: Auto-play on dashboard, downloadable MP3
- **Customization**: User toggles which sections to include


#### Dashboard Components

**Hero Section**
- Current time and date
- Audio player for daily briefing
- Quick stats (tasks, events, emails)

**Task Overview**
- Today's to-dos with progress bar
- Overdue items highlighted
- Quick add task input
- Filter by priority/tag

**Calendar Widget**
- Today's events timeline
- Next 7 days summary
- Quick create event button


**Insights Panel**
- AI-generated summaries from completed tasks
- Pattern recognition ("You usually have meetings on Tuesdays")

**Integrations**
