# syntax=docker/dockerfile:1

# Node.js 22 slim base
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

# Install ca-certificates for TLS
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates && rm -rf /var/lib/apt/lists/*

# --- Build stage ---
FROM base AS build

WORKDIR /app

# Copy lockfile + manifest first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source
COPY . .

# Compile TypeScript → dist/
RUN npm run build

# Pre-download ML model files (Silero VAD weights, etc.)
RUN node dist/agent.js download-files

# Prune to production deps only
RUN npm prune --omit=dev

# --- Production stage ---
FROM base

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

WORKDIR /app

# Copy built app + pruned node_modules
COPY --from=build --chown=appuser:appuser /app /app

USER appuser

ENV NODE_ENV=production

# LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET are injected at runtime by LiveKit Cloud
# Other secrets (GOOGLE_GENERATIVE_AI_API_KEY, SIP_OUTBOUND_TRUNK_ID) are set via lk agent secret set
CMD ["node", "dist/agent.js", "start"]
