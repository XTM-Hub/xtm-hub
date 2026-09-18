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
COPY apps/backend/. ./apps/backend/
COPY .yarnrc.yml package.json yarn.lock ./
RUN corepack enable

# Copy root node_modules for proper dependencies resolution
COPY --from=deps /app/node_modules ./node_modules


# Run tests from the backend directory
WORKDIR /app/apps/backend
CMD ["yarn", "test:ci"]
