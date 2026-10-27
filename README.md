# ProjectMGT

A self-hostable project-management web app fusing three pillars:

- **SCRUM** — product/sprint backlogs, a drag-and-drop Kanban board, sprint lifecycle
  (start/complete with roll-over), and velocity tracking.
- **Repository collaboration** (simulated, webhook-ready) — repos, commits, pull requests,
  `Fixes #123` / `Fixes PMGT-1` commit-message cross-referencing, and a GitHub-shaped
  webhook. Merging a PR auto-closes its linked issues.
- **Milestones** — target dates aggregating multiple sprints/issues with live progress
  rollups and at-risk detection.

Everything is wired together by an in-process event bus and pushed to the UI in real time
over Socket.IO — merge a PR and watch the board and milestone progress update live.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/api` | NestJS REST API, Socket.IO gateway, Prisma schema, migrations, seed data |
| `apps/web` | React/Vite SPA with project, backlog, board, repo, and milestone views |
| `packages/shared` | Shared enums, DTO types, event names, state machine, and LexoRank helpers |
| `docs` | Development workflow and API reference |

## Stack

| | |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | NestJS (modular: auth, scrum, repo, milestone, realtime) |
| DB | Prisma + SQLite (`apps/api/prisma/dev.db`) — swap `provider` for Postgres |
| Contracts | `@pmgt/shared` (enums, DTOs, state machine, event payloads) |
| Web | React + Vite, TanStack Query, Zustand, Tailwind, `@dnd-kit` |
| Realtime | Socket.IO, one room per project |

## Quick start

Prerequisites: Node.js 20+ and pnpm 9.x.

```bash
pnpm install
pnpm db:migrate        # apply migrations, create dev.db
pnpm db:seed           # demo project + users
pnpm dev               # api on :3000, web on :5173 (Vite proxies /api + /socket.io)
```

Sign in with **demo@pmgt.dev / password123**.

Seed data is idempotent. It creates the ProjectMGT demo project plus several additional
portfolio-style projects with sprints, issues, milestones, repositories, and commits.

## Configuration

The API reads environment variables through Nest's `ConfigModule`. For local development,
the server has sensible defaults for runtime options, but Prisma still expects
`DATABASE_URL` from the shell or `apps/api/.env`.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | none | SQLite database path, relative to `apps/api/prisma` for Prisma commands |
| `PORT` | `3000` | NestJS HTTP and Socket.IO server |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin for HTTP and websocket requests |
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-me` | Override outside disposable local development |
| `JWT_REFRESH_SECRET` | JWT module secret | Set explicitly for non-local environments |
| `JWT_ACCESS_TTL` | `900s` | Access-token lifetime |
| `JWT_REFRESH_TTL` | `7d` | Refresh-token lifetime |
| `ANTHROPIC_API_KEY` | none | Enables async LLM auto-assignment on new issues; skipped silently if unset |
| `AI_ASSIGN_MODEL` | `claude-sonnet-4-6` | Anthropic model for auto-assignment |

Create `apps/api/.env` for local overrides:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="replace-me"
JWT_REFRESH_SECRET="replace-me-too"
ANTHROPIC_API_KEY="sk-ant-..."
```

## Tests

```bash
pnpm test                          # all unit suites (shared + api + web)
pnpm --filter @pmgt/api test:e2e   # full cross-module e2e against a throwaway DB
```

## Architecture notes

- The Prisma schema (`apps/api/prisma/schema.prisma`) is the data contract. SQLite has no
  native enums, so enum columns are `String` validated against `@pmgt/shared`.
- Cross-module side effects flow through `@nestjs/event-emitter` — no module imports another
  module's service. Example chain: `pr.merged` → scrum closes issues → `issue.updated` →
  milestone recomputes progress → `milestone.progress` → broadcast to the project room.
- The frontend keeps data-fetching (`features/*/api.ts` hooks) separate from presentational
  components (`BoardView`, `MilestoneProgressCard`); a WebSocket subscription invalidates the
  relevant TanStack Query caches for real-time updates.

## More documentation

- [Development guide](docs/DEVELOPMENT.md) covers scripts, database workflow, testing, and
  project conventions.
- [API reference](docs/API.md) lists REST routes, auth behavior, realtime events, and webhook
  signature requirements.
- `CLAUDE.md` tracks module ownership, cross-module rules, and the event-bus registry.
