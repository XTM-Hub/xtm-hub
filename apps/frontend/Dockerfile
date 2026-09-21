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
ARG APP_VERSION=0.0.0-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY .yarnrc.yml package.json yarn.lock ./
COPY apps/frontend/. ./apps/frontend/


ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION

# Build the frontend
WORKDIR /app/apps/frontend
RUN corepack enable && \
    echo "NEXT_PUBLIC_APP_VERSION=$APP_VERSION" > .env.local && \
    yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"


# Set the correct permission for prerender cache
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir .next && \
    chown nextjs:nodejs .next

COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
