FROM node:22-slim AS base

ARG GIT_SHA="unknown"
ENV GIT_SHA=$GIT_SHA

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g corepack@latest && corepack enable

FROM base AS init
COPY . /app
WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ gcc make python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

FROM init AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM init AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile \
    && pnpm run build

FROM base
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends mecab libmecab-dev mecab-ipadic-utf8 \
    git make curl ca-certificates xz-utils file patch sudo openssl \
    && git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git \
    && cd mecab-ipadic-neologd \
    && curl https://patch-diff.githubusercontent.com/raw/neologd/mecab-ipadic-neologd/pull/91.patch | git apply -v \
    && ./bin/install-mecab-ipadic-neologd -n -y -a \
    && cd .. \
    && rm -rf mecab-ipadic-neologd \
    && apt-get purge -y --auto-remove git make curl ca-certificates xz-utils file patch openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/built /app/built
COPY ngwords.txt package.json /app/

RUN chown -R node:node /app
USER node
CMD ["pnpm", "migrateandstart"]
