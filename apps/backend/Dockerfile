FROM node:24.21.0-alpine3.24 AS base

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
COPY --from=deps /app/node_modules ./node_modules
COPY .yarnrc.yml package.json yarn.lock ./
COPY apps/backend/. ./apps/backend/

# Build the backend
WORKDIR /app/apps/backend
RUN corepack enable && \
    yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 graphql && \
    mkdir .graphql && \
    chown graphql:nodejs .graphql

COPY --from=builder --chown=graphql:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/config ./config
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/package.json .
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/tests ./tests
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/src/seeds ./src/seeds
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/dist .
COPY --from=builder --chown=graphql:nodejs /app/apps/backend/src/server/mail-template ./src/server/mail-template

USER graphql
EXPOSE 4001

CMD ["node", "./index.js"]
