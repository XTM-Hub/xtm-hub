# Getting started - XTM Hub Development

This guide will help you quickly set up XTM Hub for local development and contribution.

## Prerequisites

Before you start, make sure you have the following installed:

- **Node.js** (see `.nvmrc` for the exact version)
- **Yarn 4** via Corepack (see `package.json#packageManager` for the exact version)
- **Docker** and **Docker Compose**
- **Git**

## Project structure

XTM Hub is a Yarn 4 workspaces monorepo. The apps live under `apps/`:

- **`apps/backend`** (`@xtm-hub/backend`) - Backend API (Node.js + Express 5 + GraphQL + Apollo Server + Knex)
- **`apps/frontend`** (`@xtm-hub/frontend`) - Frontend (Next.js + React + React-Query + (Relay **DEPRECATED**))
- **`apps/e2e`** (`@xtm-hub/test_e2e`) - End-to-end tests (Playwright)
- **`xtm-hub-dev/`** - Local development Docker Compose setup

## Quick setup

### 1. Clone the repository

```bash
git clone https://github.com/XTM-Hub/xtm-hub.git
cd xtm-hub
```

### 2. Enable Corepack and install dependencies

Corepack is required so that the Yarn version pinned in `package.json` is used
instead of any globally installed Yarn:

```bash
corepack enable
yarn install
```

### 3. Configure local settings

Create a local configuration file at `apps/backend/config/local.json`:

```json
{
  "oidc_provider": {
    "issuer": "https://your-auth-provider.com",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3002/auth/oidc/callback"],
    "logout_callback_url": ["http://localhost:3002/oidc/callback"],
    "response_types": ["code"]
  },
  "minio": {
    "bucketName": "xtmhubbucket",
    "region": "us-east-1",
    "endpoint": "localhost",
    "port": 9002,
    "accessKeyId": "portal",
    "secretAccessKey": "changeme",
    "useSsl": false
  },
  "database": {
    "host": "localhost",
    "port": 5434,
    "user": "portal",
    "password": "portal-password",
    "database": "cloud-portal"
  },
  "port": 4002,
  "smtp_options": {
    "host": "localhost",
    "port": 1025,
    "secure": false,
    "from": "no-reply@localhost"
  },
  "session": { // Used to keep sessions in memory for development when the backend keeps restarting.
    "name": "cloud-portal",
    "secret": "anythingShouldWorkForDev"
  }
}
```

> **Note**: For OIDC authentication, you'll need to configure your own identity provider or use a local development setup.

### 4. Start development environment

The development environment requires **three separate terminals**, all from the repository root.

#### Terminal 1: Start docker services

```bash
docker compose -f ./xtm-hub-dev/docker-compose.yml up
```

This starts:
- **PostgreSQL** on port `5434`
- **Silo** (S3 object storage, MinIO fork) on port `9002` (console on `8902`)
- **PgAdmin** on port `8888`
- **Elasticsearch** on port `9204`
- **Kibana** on port `5603`
- **Mailpit** on ports `8025` (web UI) and `1025` (SMTP)

#### Terminal 2: Start the backend server

```bash
yarn dev:api
```

The API will be available at `http://localhost:4002`

#### Terminal 3: Start the frontend server

```bash
yarn dev:front
```

The frontend will be available at `http://localhost:3002`

### 5. Access the application

Once everything is running:

- **Frontend**: http://localhost:3002
- **API**: http://localhost:4002
- **Silo Console**: http://localhost:8902
- **PgAdmin**: http://localhost:8888 (portal@filigran.io / portal-password)
- **Kibana**: http://localhost:5603
- **Mailpit**: http://localhost:8025

You can log in with default user admin@filigran.io / admin

## Development workflow

Commands below can be run either from the repository root (prefixed with
`yarn workspace @xtm-hub/backend` / `yarn workspace @xtm-hub/frontend`) or by
`cd`-ing into the corresponding `apps/*` folder first and dropping the workspace
prefix, e.g. `cd apps/backend && yarn test`.

### Backend (`apps/backend`)

- **Development mode**: `yarn dev` (alias of `yarn start-dev`)
- **Type check**: `yarn check-ts`
- **Lint**: `yarn lint` / `yarn lint:fix`
- **Run tests**: `yarn test`
- **Build**: `yarn build`
- **Database migrations**: `yarn migrate:latest`
- **Generate types from DB schema**: `yarn generate-pg-to-ts`
- **Generate GraphQL types**: `yarn generate:ts`
- **Scaffold a new module**: `yarn generate:module`

### Frontend (`apps/frontend`)

- **Development mode**: `yarn dev`
- **Type check**: `yarn check-ts`
- **Lint**: `yarn lint`
- **Run tests**: `yarn test`
- **[DEPRECATED] Generate Relay artifacts**: `yarn relay` (**required** after any GraphQL schema change)
- **Generate GraphQL artifacts for react-query**: `yarn codegen` (**required** after any GraphQL schema change)
- **Build**: `yarn build`

### E2E testing (`apps/e2e`)

```bash
cd apps/e2e
yarn install

# Run E2E tests (make sure both API and frontend are running)
yarn test:e2e

# Run with UI
yarn test:e2e:ui

# Generate new tests
yarn generate-test-e2e
```

**Important**: For E2E testing, start the backend in test mode from `apps/backend`:

```bash
yarn start-dev-e2e-test
```

## Contributing

### Development setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch**: `git checkout -b feature/my-feature`
4. **Make your changes** and test them
5. **Commit** following the commit format below
6. **Push** to your fork and create a Pull Request

### Commit format

All commit and pull request titles follow the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification
with a GitHub issue reference:

```
type(scope?): description (#issueNumber)
```

**Types**: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`

The description starts with a lowercase letter and has no trailing period. There is no
`[package]` bracket prefix; use the relevant scope instead (e.g. `backend`, `frontend`).

**Examples**:
- `feat(frontend): add card component (#123)`
- `fix(backend): handle missing auth token (#456)`

See the [Commit, pull request & issue conventions](https://github.com/XTM-Hub/xtm-hub/blob/main/CONTRIBUTING.md#commit-pull-request--issue-conventions)
section of `CONTRIBUTING.md` for the full convention.

### Testing

Before submitting a PR, run all tests:

```bash
# Backend tests
cd apps/backend
yarn test:ci

# Frontend tests
cd apps/frontend
yarn test:ci

# E2E tests
cd apps/e2e
yarn test:e2e
```

## Troubleshooting

### Common issues

1. **Port conflicts**: Ensure ports 3002, 4002, 5434, 5603, 8025, 8888, 9002, 8902, 9204, 1025 are available
2. **Docker issues**: Verify the Docker daemon is running and `docker compose` is available
3. **Yarn version mismatch**: Always run `corepack enable` first; the global/npm Yarn will not work
4. **Silo (S3) credentials**: Ensure `accessKeyId` and `secretAccessKey` in `local.json` match `docker-compose.yml`

### Reset development environment

```bash
# Stop and remove all containers
docker compose -f ./xtm-hub-dev/docker-compose.yml down -v

# Restart services
docker compose -f ./xtm-hub-dev/docker-compose.yml up -d

# Reinstall dependencies if needed
yarn install
```

### Database issues

```bash
cd apps/backend

# Reset the test database
yarn clean-db-test

# Re-run migrations
yarn migrate:latest
```

### Package manager issues

If you're using an IDE like IntelliJ/WebStorm, make sure it's configured to use `yarn` instead of `npm` for running scripts.

### Authentication setup

For local development, you have a few options for OIDC authentication:

1. **Use a development auth provider** (Auth0, Keycloak, etc.)
2. **Mock authentication** for local testing
3. **Skip auth temporarily** by modifying the local configuration

## Getting help

- **Issues**: [GitHub Issues](https://github.com/XTM-Hub/xtm-hub/issues)
- **Beginner Issues**: [Good First Issues](https://github.com/XTM-Hub/xtm-hub/issues?q=is%3Aissue+state%3Aopen+label%3A%22good+first+issue%22)
- **Community**: [Slack Channel](https://community.filigran.io)
- **Documentation**: [Official Docs](https://docs.hub.filigran.io)

---

**Ready to contribute?** Check out our [beginner-friendly issues](https://github.com/XTM-Hub/xtm-hub/issues?q=is%3Aissue+state%3Aopen+label%3A%22good+first+issue%22) and [contributing guide](https://github.com/XTM-Hub/xtm-hub/blob/main/CONTRIBUTING.md).
