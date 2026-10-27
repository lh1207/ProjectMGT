# Development Guide

This guide covers the local workflow for ProjectMGT contributors.

## Prerequisites

- Node.js 20 or newer
- pnpm 9.x, matching `packageManager` in the root `package.json`
- SQLite, used through Prisma

Install dependencies from the repository root:

```bash
pnpm install
```

## Local Environment

The API loads configuration with Nest `ConfigModule`, so values can come from the shell or
from `apps/api/.env`.

Recommended local `apps/api/.env`:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="dev-access-secret-change-me"
JWT_REFRESH_SECRET="dev-refresh-secret-change-me"
CORS_ORIGIN="http://localhost:5173"
```

`DATABASE_URL` is interpreted by Prisma commands run inside `apps/api`. With the value above,
the SQLite database is created at `apps/api/prisma/dev.db`.

## Database Workflow

Apply migrations and seed demo data:

```bash
pnpm db:migrate
pnpm db:seed
```

Generate the Prisma client after schema changes:

```bash
pnpm db:generate
```

Create a migration after editing `apps/api/prisma/schema.prisma`:

```bash
pnpm --filter @pmgt/api prisma migrate dev --name your_change_name
```

Schema notes:

- SQLite has no native enum support in this app. Prisma stores enum-like fields as strings.
- `packages/shared/src/enums.ts` is the source of truth for enum values.
- DTO validation and service logic should reject invalid enum strings before writes.

## Running the App

Start every package through Turborepo:

```bash
pnpm dev
```

Runtime endpoints:

- API: `http://localhost:3000/api/v1`
- Web: `http://localhost:5173`
- Socket.IO: proxied through Vite at `/socket.io`

The Vite dev server proxies `/api` and `/socket.io` to the API, so frontend code can use
relative URLs in development.

Demo login:

- Email: `demo@pmgt.dev`
- Password: `password123`

## Scripts

Root scripts:

| Command | Purpose |
|---|---|
| `pnpm dev` | Start API and web dev servers through Turbo |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests across shared, API, and web packages |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm lint` | Run configured package lint scripts |
| `pnpm db:migrate` | Apply Prisma migrations for the API |
| `pnpm db:seed` | Seed demo projects and users |
| `pnpm db:generate` | Generate the Prisma client |

Package-specific examples:

```bash
pnpm --filter @pmgt/shared test
pnpm --filter @pmgt/api test
pnpm --filter @pmgt/api test:e2e
pnpm --filter @pmgt/web test
pnpm --filter @pmgt/web typecheck
```

## Testing

The test stack is split by package:

- `packages/shared`: state machine and LexoRank unit tests.
- `apps/api`: Jest unit tests plus a cross-module e2e suite.
- `apps/web`: Vitest and Testing Library tests.

The API e2e script uses `DATABASE_URL=file:./test-e2e.db` and `prisma db push`, so it does
not depend on the local development database.

## Architecture Conventions

- Shared contracts live in `packages/shared` and are imported as `@pmgt/shared`.
- API controllers validate request bodies with DTO classes from each module's `dto` folder.
- Database access goes through `PrismaService`.
- Cross-module side effects use `@nestjs/event-emitter`.
- Realtime updates are domain events broadcast by `apps/api/src/realtime/realtime.gateway.ts`.
- Frontend API hooks live under `apps/web/src/features/*/api.ts`.
- Frontend presentational components should stay separate from data-fetching hooks where practical.

When changing a cross-module contract, update the shared package, relevant tests, and any
affected API/web code in the same change.
