# ============================================
# Base stage: Node.js with pnpm enabled
# ============================================
FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

# ============================================
# Dependencies stage: Install build dependencies
# ============================================
FROM base AS deps

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ gcc make python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml ./

# ============================================
# Production dependencies stage
# ============================================
FROM deps AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# ============================================
# Build stage: Install all deps and build
# ============================================
FROM deps AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm run build

# ============================================
# MeCab dictionary stage: Build neologd dictionary
# ============================================
FROM debian:bookworm-slim AS mecab-builder

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        mecab libmecab-dev mecab-ipadic-utf8 \
        git make curl ca-certificates xz-utils file patch openssl \
    && git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git /mecab-ipadic-neologd \
    && cd /mecab-ipadic-neologd \
    && curl https://patch-diff.githubusercontent.com/raw/neologd/mecab-ipadic-neologd/pull/91.patch | git apply -v \
    && ./bin/install-mecab-ipadic-neologd -n -y -a -u \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Final stage: Minimal production image
# ============================================
FROM node:22-slim AS runner

ARG GIT_SHA="unknown"
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g corepack@latest && corepack enable

# Install only runtime dependencies for MeCab
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends mecab libmecab2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy MeCab dictionary from builder
COPY --from=mecab-builder /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd

# Update MeCab config to use neologd
RUN sed -i 's|^dicdir.*|dicdir = /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd|' /etc/mecabrc

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/built ./built

# Copy only necessary files
COPY package.json ngwords.txt ./

# Set ownership and switch to non-root user
RUN chown -R node:node /app

USER node

# Use ENTRYPOINT for the main command, CMD for default arguments
# This allows overriding arguments while keeping the base command
ENTRYPOINT ["pnpm"]
CMD ["migrateandstart"]
