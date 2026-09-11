FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

# Copy monorepo configuration files
COPY .yarnrc.yml package.json yarn.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/e2e/package.json ./apps/e2e/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

# Install all dependencies at the workspace level
RUN corepack enable && \
    yarn install --immutable

# Copy e2e test files
COPY ./apps/e2e/playwright.config.ts ./apps/e2e/
COPY ./apps/e2e/tests ./apps/e2e/tests

# Copy migrations and seeds (these are copied by the CI pipeline before the Docker build)
COPY ./apps/e2e/migrations ./apps/e2e/migrations
COPY ./apps/e2e/seeds ./apps/e2e/seeds
COPY ./apps/e2e/test-utils.ts ./apps/e2e/test-utils.ts

WORKDIR /app/apps/e2e

CMD ["yarn", "test:e2e"]
