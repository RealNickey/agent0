```mermaid
flowchart TD
    U[User] --> PI[PromptInputArea]
    PI --> FM[File and Tool Mention Parsing]
    FM --> CU[ChatUI]
    CU --> LS[LocalStorage Sync]
    CU --> SS[Session Sync]
    CU --> CT[StripLargeDataChatTransport]
    CT --> API[POST /api/chat]

    API --> AU[Clerk Auth]
    API --> MEM[Load User Memories]
    API --> SAN[Sanitize Messages and Tool Parts]
    API --> ROUTE{Mentioned tools present?}

    ROUTE -->|Yes| CUSTOM[Custom Tool Router]
    ROUTE -->|No| PROVIDER[Google Provider Tool Router]

    CUSTOM --> INST[Installed Tool Registry]
    CUSTOM --> TOOLS[Weather Calendar Forms Gmail Tasks GitHub Slides Image Movie Research Memory Tools]
    PROVIDER --> GTOOLS[Google Search URL Context Code Execution]

    TOOLS --> EXT[External APIs and Services]
    GTOOLS --> AI[AI Provider]
    EXT --> AI
    MEM --> AI
    SAN --> AI

    AI --> STREAM[streamText and UI message stream]
    STREAM --> RESP[Assistant Parts: text reasoning tool outputs sources]
    RESP --> RENDER[MessageList and AI Elements]
    RENDER --> OUT[Final UI response]

    OUT --> SAVE{Signed in with session?}
    SAVE -->|Yes| MSGAPI[POST /api/sessions/:id/messages]
    MSGAPI --> DB[(Supabase chat_messages)]
    SAVE -->|No| LS

    API -. fire and forget .-> EXTRACT[Memory Extractor]
    EXTRACT --> MEMDB[(Supabase user_memories)]

    EXT --> GOOG[Google Workspace APIs]
    EXT --> OPENMETEO[Open-Meteo]
    EXT --> TMDB[TMDB]
    EXT --> CF[Cloudflare Workers AI]
    EXT --> GH[GitHub API]
    EXT --> BLOB[Vercel Blob]
```

```mermaid
flowchart LR
    subgraph Client[Next.js Client]
        PAGE[app/page.tsx]
        CHAT[components/chat-ui.tsx]
        INPUT[PromptInputArea]
        MSG[MessageList and ai-elements]
        HOOKS[State Hooks and Handlers]
        EXTN[Browser Extension Listener]
        STORE[(Browser localStorage)]
    end

    subgraph Server[Next.js App Router Backend]
        CHATAPI[app/api/chat/route.ts]
        SESSAPI[Session APIs]
        AUTHAPI[Google OAuth APIs]
        TOOLAPI[Tool Install and Marketplace APIs]
        FEATUREAPI[Calendar Gmail Forms Tasks Image PDF Glance Voice APIs]
    end

    subgraph Domain[Domain and Service Layer]
        TOOLS[ai/*.ts tool modules]
        DBLIB[lib/db/* persistence]
        AUTHLIB[lib/google-calendar.ts]
        INSTALLLIB[lib/installed-tools.ts]
        MODELS[lib/model-fallback.ts]
        IMGSTORE[lib/image-store.ts]
        MEMORY[lib/memory-extractor.ts and memory tools]
    end

    subgraph Data[Data Stores]
        SUPA[(Supabase PostgreSQL)]
        FILES[(.installed-tools.json and .google-tokens.json)]
        IMGCACHE[(In-process image cache)]
        BLOB[(Vercel Blob)]
    end

    subgraph External[External Providers]
        CLERK[Clerk Auth]
        GEMINI[Google Gemini and provider tools]
        GROQ[Groq Models]
        COHERE[Cohere Models]
        OPENROUTER[OpenRouter Models]
        GOOGLE[Google OAuth Calendar Gmail Forms Tasks]
        GITHUB[GitHub API]
        WEATHER[Open-Meteo]
        TMDBAPI[TMDB]
        CFAI[Cloudflare Workers AI]
    end

    PAGE --> CHAT
    CHAT --> INPUT
    CHAT --> MSG
    CHAT --> HOOKS
    CHAT --> STORE
    CHAT --> CHATAPI
    HOOKS --> SESSAPI
    HOOKS --> TOOLAPI
    EXTN --> CHAT

    CHATAPI --> TOOLS
    CHATAPI --> DBLIB
    CHATAPI --> MODELS
    SESSAPI --> DBLIB
    AUTHAPI --> AUTHLIB
    TOOLAPI --> INSTALLLIB
    FEATUREAPI --> TOOLS
    FEATUREAPI --> AUTHLIB
    FEATUREAPI --> IMGSTORE

    DBLIB --> SUPA
    INSTALLLIB --> FILES
    AUTHLIB --> FILES
    IMGSTORE --> IMGCACHE
    FEATUREAPI --> BLOB

    CHATAPI --> CLERK
    CHATAPI --> GEMINI
    CHATAPI --> GROQ
    CHATAPI --> COHERE
    CHATAPI --> OPENROUTER
    TOOLS --> GOOGLE
    TOOLS --> GITHUB
    TOOLS --> WEATHER
    TOOLS --> TMDBAPI
    TOOLS --> CFAI

    NQ[No dedicated message queue; background extraction runs in-process]
    CHATAPI -. background side effect .-> NQ
```

```mermaid
flowchart LR
    GUEST[Guest User]
    MEMBER[Signed-in User]
    EXTUSER[Browser Extension]
    GOOGLE[Google Workspace]
    GITHUB[GitHub]

    UC1((Start chat))
    UC2((Send multimodal prompt))
    UC3((Receive streamed answer))
    UC4((Use provider search and URL context))
    UC5((Mention and invoke installed tools))
    UC6((Manage integrations))
    UC7((Authorize Google services))
    UC8((Persist sessions and messages))
    UC9((Store and retrieve personal memory))
    UC10((Manage calendar forms gmail and tasks))
    UC11((Create GitHub issues and PRs))
    UC12((Generate images and research results))
    UC13((Attach screenshots from extension))

    GUEST --> UC1
    GUEST --> UC2
    GUEST --> UC3
    GUEST --> UC4
    GUEST --> UC5
    GUEST --> UC6
    MEMBER --> UC1
    MEMBER --> UC2
    MEMBER --> UC3
    MEMBER --> UC5
    MEMBER --> UC6
    MEMBER --> UC8
    MEMBER --> UC9
    MEMBER --> UC10
    MEMBER --> UC11
    MEMBER --> UC12
    EXTUSER --> UC13
    GOOGLE --> UC7
    GOOGLE --> UC10
    GITHUB --> UC11

    UC6 --> UC7
    UC5 --> UC10
    UC5 --> UC11
    UC5 --> UC12
    UC2 --> UC13
    UC8 --> UC9
```

```mermaid
flowchart LR
    USER[User] --> SYS((Agent0 System))
    EXT[Browser Extension] --> SYS
    SYS --> USER

    SYS --> CLERK[Clerk Auth]
    SYS --> AI[AI Providers]
    SYS --> GOOGLE[Google Workspace APIs]
    SYS --> GITHUB[GitHub API]
    SYS --> WEATHER[Open-Meteo]
    SYS --> TMDB[TMDB]
    SYS --> CFAI[Cloudflare Workers AI]
    SYS --> BLOB[Vercel Blob]

    SYS <--> CHATDB[(Supabase chat data)]
    SYS <--> MEMDB[(Supabase user memories)]
    SYS <--> FILEDB[(Local JSON integration and token files)]
    SYS <--> IMGDB[(In-process image cache)]
```

```mermaid
flowchart TD
    U[User] --> UI[ChatUI]
    UI --> PREFS[(localStorage)]
    UI --> INPUT[PromptInputArea]
    INPUT --> PARSE[Parse text files and @tool mentions]
    PARSE --> SEND[sendMessage via useChat]
    SEND --> CHATAPI[POST /api/chat]

    U --> AUTH[Sign in with Clerk]
    AUTH --> UI

    UI --> NEWSESSION{Signed in?}
    NEWSESSION -->|Yes| S1[POST /api/sessions]
    S1 --> SDB[(Supabase chat_sessions)]
    UI --> LOADSESSION[GET /api/sessions and /messages]
    LOADSESSION --> SDB
    LOADSESSION --> MDB[(Supabase chat_messages)]

    CHATAPI --> STREAM[Stream assistant response]
    STREAM --> UI
    UI --> RENDER[Render text reasoning sources and tool cards]
    RENDER --> U

    UI --> SAVE{AI turn finished and signed in?}
    SAVE -->|Yes| SAVEMSG[POST /api/sessions/:id/messages]
    SAVEMSG --> MDB
    SAVE -->|No| PREFS

    UI --> INTEG[Install or remove integrations]
    INTEG --> TOOLAPI[/api/tools/install]
    INTEG --> OAUTH[/api/auth/google]
    OAUTH --> GOOGLE[Google OAuth Consent]
    GOOGLE --> CALLBACK[/api/auth/google/callback]
    CALLBACK --> TOKENS[(.google-tokens.json)]

    EXT[Browser Extension] --> SCREEN[Send screenshot or page context]
    SCREEN --> UI
```

```mermaid
flowchart LR
    REQ[Chat Request] --> VALIDATE[Validate request body]
    VALIDATE --> AUTH[Resolve Clerk user]
    AUTH --> MEMLOAD[Load user memories]
    MEMLOAD --> CLEAN[Clean messages for provider and sanitize tool parts]
    CLEAN --> MODEL[Select model and provider options]
    MODEL --> ROUTER{mentionedTools length > 0?}

    ROUTER -->|Yes| CUSTOM[Build custom tool set]
    ROUTER -->|No| PROVIDER[Build Google provider tool set]

    CUSTOM --> INSTALL[Check installed tools]
    CUSTOM --> WEATHERTOOL[Weather tool]
    CUSTOM --> CALTOOL[Calendar tools]
    CUSTOM --> FORMSTOOL[Forms tools]
    CUSTOM --> GMAILTOOL[Gmail tools]
    CUSTOM --> TASKSTOOL[Tasks tools]
    CUSTOM --> GITHUBTOOL[GitHub tools]
    CUSTOM --> SLIDESTOOL[Slides tools]
    CUSTOM --> IMAGETOOL[Image tools]
    CUSTOM --> MOVIETOOL[Movie tools]
    CUSTOM --> RESEARCHTOOL[Research tools]
    CUSTOM --> MEMORYTOOL[Memory tools]

    PROVIDER --> GSEARCH[googleSearch]
    PROVIDER --> URLCTX[urlContext]
    PROVIDER --> CODEEXEC[codeExecution]

    INSTALL --> TOOLFILES[(.installed-tools.json)]
    MEMLOAD --> MEMDB[(Supabase user_memories)]

    WEATHERTOOL --> OPENMETEO[Open-Meteo]
    CALTOOL --> GOOGLEAPI[Google Calendar]
    FORMSTOOL --> GOOGLEAPI
    GMAILTOOL --> GOOGLEAPI
    TASKSTOOL --> GOOGLEAPI
    GITHUBTOOL --> GITHUB[GitHub API]
    IMAGETOOL --> CF[Cloudflare Workers AI]
    MOVIETOOL --> TMDB[TMDB]
    RESEARCHTOOL --> SOURCES[Research sources]

    GSEARCH --> AIPROV[AI model provider]
    URLCTX --> AIPROV
    CODEEXEC --> AIPROV
    WEATHERTOOL --> AIPROV
    CALTOOL --> AIPROV
    FORMSTOOL --> AIPROV
    GMAILTOOL --> AIPROV
    TASKSTOOL --> AIPROV
    GITHUBTOOL --> AIPROV
    SLIDESTOOL --> AIPROV
    IMAGETOOL --> AIPROV
    MOVIETOOL --> AIPROV
    RESEARCHTOOL --> AIPROV
    MEMORYTOOL --> AIPROV

    AIPROV --> STREAM[streamText result]
    STREAM --> RESPONSE[toUIMessageStreamResponse]
    RESPONSE --> CLIENT[Client renderer]

    RESPONSE -. async extraction .-> EXTRACT[extractAndSaveMemories]
    EXTRACT --> MEMDB
```

```mermaid
classDiagram
    class ChatUI {
      +selectedModel
      +messages: MyUIMessage[]
      +attachments
      +mentionedTools: string[]
      +handleSubmit()
      +handleNewChat()
    }

    class PromptInputArea {
      +value: string
      +attachments
      +mentionedTools: string[]
      +onSubmit()
      +onToolMentionsChange()
    }

    class StripLargeDataChatTransport {
      +api: string
      +sendMessages()
      +stripLargePayloads()
    }

    class MyUIMessage {
      +id: string
      +role: string
      +parts: UIMessagePart[]
      +metadata: MessageMetadata
    }

    class MessageMetadata {
      +createdAt: number
      +model: string
      +totalTokens: number
      +totalUsage
      +pdfResult: PdfOperationResult
    }

    class ChatRoute {
      +POST(req)
      +cleanMessagesForProvider()
      +sanitizeToolParts()
      +getModelInstance()
    }

    class UseSessionSync {
      +createNewSession()
      +switchSession()
      +saveMessagesToDB()
    }

    class UseIntegrationHandlers {
      +handleAddIntegration()
      +handleRemoveIntegration()
      +reloadIntegrations()
    }

    class SessionStore {
      +ensureUser()
      +createSession()
      +getSessionsForUser()
      +updateSessionTitle()
      +deleteSession()
    }

    class MessageStore {
      +saveMessages()
      +getMessagesForSession()
      +stripLargeData()
    }

    class MemoryStore {
      +getMemoriesForUser()
      +upsertMemory()
      +deleteMemory()
      +searchMemoriesForUser()
      +formatMemoriesForPrompt()
    }

    class InstalledToolsRegistry {
      +getInstalledTools()
      +isToolInstalled()
      +addInstalledTool()
      +removeInstalledTool()
    }

    class GoogleAuthStore {
      +getAuthorizationUrl()
      +exchangeCodeForTokens()
      +storeTokens()
      +getTokens()
      +getValidAccessToken()
    }

    class ImageStore {
      +storeGeneratedImage()
      +getGeneratedImage()
      +cleanupExpiredImages()
    }

    class ToolModules {
      +weatherTools
      +calendarTools
      +formsTools
      +gmailTools
      +tasksTools
      +githubTools
      +slidesTools
      +createImageTools()
      +movieTools
      +researchTools
      +createMemoryTools()
    }

    class Supabase {
      +chat_sessions
      +chat_messages
      +user_memories
      +documents
      +document_chunks
    }

    class ClerkAuth
    class AIProviders
    class GoogleWorkspaceAPIs
    class ExternalAPIs

    ChatUI --> PromptInputArea : renders
    ChatUI --> StripLargeDataChatTransport : uses
    ChatUI --> UseSessionSync : uses
    ChatUI --> UseIntegrationHandlers : uses
    ChatUI --> MyUIMessage : manages
    MyUIMessage --> MessageMetadata : contains

    StripLargeDataChatTransport --> ChatRoute : sends to
    ChatRoute --> ToolModules : orchestrates
    ChatRoute --> InstalledToolsRegistry : checks
    ChatRoute --> MemoryStore : reads and writes
    ChatRoute --> AIProviders : invokes
    ChatRoute --> ClerkAuth : authenticates

    UseSessionSync --> SessionStore : uses
    UseSessionSync --> MessageStore : uses through APIs
    UseIntegrationHandlers --> InstalledToolsRegistry : updates through APIs
    UseIntegrationHandlers --> GoogleAuthStore : triggers OAuth through APIs

    SessionStore --> Supabase : persists
    MessageStore --> Supabase : persists
    MemoryStore --> Supabase : persists
    ToolModules --> GoogleAuthStore : uses tokens and OAuth helpers
    GoogleAuthStore --> GoogleWorkspaceAPIs : exchanges tokens
    ToolModules --> GoogleWorkspaceAPIs : calendar gmail forms tasks
    ToolModules --> ExternalAPIs : weather github tmdb image research
    ImageStore --> ExternalAPIs : serves generated image references
```