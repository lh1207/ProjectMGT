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

```bash
pnpm install
pnpm db:migrate        # apply migrations, create dev.db
pnpm db:seed           # demo project + users
pnpm dev               # api on :3000, web on :5173 (Vite proxies /api + /socket.io)
```

Sign in with **demo@pmgt.dev / password123**.

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

See `CLAUDE.md` for the module-ownership map and the event-bus registry.
