# Agent0 Outbound Calling Agent

A LiveKit voice AI agent that makes outbound phone calls using Gemini Multimodal Live API. It can autonomously complete tasks like booking appointments, gathering information, or making reservations.

## Architecture

```
User (Chat UI) → @call mention → Next.js API → LiveKit Agent Dispatch
                                                      ↓
                                              LiveKit Cloud Worker
                                                      ↓
                                           Gemini Multimodal Live
                                                      ↓
                                              SIP Outbound Call
                                                      ↓
                                            Phone Conversation
                                                      ↓
                                         Task Completion Report
```

## Prerequisites

1. **LiveKit Cloud account** with project credentials
2. **SIP Trunk provider** (Twilio or Telnyx) configured in LiveKit Cloud
3. **Google API key** for Gemini Multimodal Live

## Setup

### 1. Install LiveKit CLI

```bash
# Windows
winget install LiveKit.LiveKitCLI

# macOS
brew install livekit-cli

# Linux
curl -sSL https://get.livekit.io/cli | bash
```

### 2. Authenticate with LiveKit Cloud

```bash
lk cloud auth
```

### 3. Set up SIP Trunk

You need an outbound SIP trunk from Twilio or Telnyx. Follow the LiveKit docs:
https://docs.livekit.io/telephony/making-calls/outbound-trunk/

**Twilio example** (`outbound-trunk.json`):
```json
{
  "trunk": {
    "name": "Agent0 Outbound (Twilio)",
    "address": "<your-twilio-sip-domain>.pstn.twilio.com",
    "numbers": ["+1XXXXXXXXXX"],
    "auth_username": "<twilio-username>",
    "auth_password": "<twilio-password>"
  }
}
```

Create the trunk:
```bash
lk sip outbound create outbound-trunk.json
```

List trunks to get the ID:
```bash
lk sip outbound list
```

### 4. Configure Environment

Copy `.env.local` and fill in `SIP_OUTBOUND_TRUNK_ID`:
```
SIP_OUTBOUND_TRUNK_ID=ST_xxxxxxxxxxxxx
```

Also set in the main project's `.env.development.local`.

### 5. Install Dependencies

```bash
cd livekit-agent
npm install
```

### 6. Download Model Files

```bash
npm run download-files
```

### 7. Run Agent Locally (Dev)

```bash
npm run dev
```

### 8. Deploy to LiveKit Cloud

```bash
lk agent deploy
```

## Usage

In the Agent0 chat, use **@call** to trigger the calling agent:

```
@call Call +14155550123 and book a dental cleaning appointment for next Thursday at 3pm
```

The agent will:
1. Dispatch to LiveKit Cloud
2. Dial the phone number via SIP
3. Conduct the conversation using Gemini Multimodal Live
4. Complete the task autonomously
5. Report results back to the chat UI

## Agent Name

The agent registers as `agent0-caller`. This must match the dispatch name used in the Next.js API route.
