ARG APP_VERSION=0.0.0-dev
FROM node:24.20.0-alpine3.24 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy monorepo configuration files
COPY .yarnrc.yml package.json yarn.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/e2e/package.json ./apps/e2e/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

# Install all dependencies at the workspace level
RUN corepack enable && \
    yarn install --immutable

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY apps/frontend/. ./apps/frontend/
COPY .yarnrc.yml package.json yarn.lock ./

# Set the version of the app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}

# Copy root node_modules for proper dependencies resolution
COPY --from=deps /app/node_modules ./node_modules


WORKDIR /app/apps/frontend
RUN corepack enable && \
    echo "NEXT_PUBLIC_APP_VERSION=${APP_VERSION}" > .env.local

RUN yarn relay

CMD ["yarn", "test:ci"]
