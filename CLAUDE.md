# ProjectMGT — Global State Contract

> Read this file fully before editing. Update YOUR module section after each change.
> Never edit another module's owned files without noting it in "Cross-Module Changes".

A self-hostable project-management app fusing **SCRUM**, **simulated Git repo
collaboration**, and **Milestones**. Monorepo: NestJS API + React/Vite SPA, Prisma/SQLite.

## Quick Start

```bash
pnpm install
pnpm db:migrate        # apply migrations, create dev.db
pnpm db:seed           # demo project + user (login: demo@pmgt.dev / password123)
pnpm dev               # api on :3000, web on :5173
pnpm test              # all unit suites
pnpm --filter @pmgt/api test:e2e   # full cross-module e2e

# Production-style run of the API:
pnpm --filter @pmgt/api build && node apps/api/dist/main.js
```

`@pmgt/shared` is a dual ESM+CJS package: NestJS (CJS) resolves `require` → `dist/cjs`,
Vite (ESM) resolves `import` → `dist/esm`. Run its build before app dev (`turbo` handles
this via `^build`).

## Architecture Rules (immutable unless RFC'd here)
- Monorepo: pnpm + turbo. API = NestJS, Web = React/Vite, DB = Prisma/SQLite.
- All shared types/enums/DTO contracts live in `packages/shared`. Import via `@pmgt/shared`.
- No `any`. Strict TS. Every controller input validated by a DTO (`class-validator`).
- DB access only through `PrismaService`. No raw SQL outside dedicated query helpers.
- Cross-module side effects go through the event bus (`@nestjs/event-emitter`),
  never by importing another module's service directly.
- Enum/Prisma schema changes require a migration + a note in "API / Schema Changelog".
- REST base path: `/api/v1`. WebSocket: Socket.IO, one room per `projectId`.

## Module Ownership
| Module | Owner | Owns paths |
|---|---|---|
| shared + db + auth | A1 | packages/shared, apps/api/prisma, apps/api/src/{prisma,auth,users,common} |
| scrum_engine | A2 | apps/api/src/scrum |
| repo_collab | A3 | apps/api/src/repo, apps/api/src/realtime |
| milestone_analytics | A4 | apps/api/src/milestone |
| frontend_shell | A5 | apps/web |

## Build Status
- [x] A1 database_and_auth
- [x] A2 scrum_engine
- [x] A3 repo_collaboration_simulator
- [x] A4 milestone_analytics
- [x] A5 frontend_shell_and_views

## API / Schema Changelog
- 2026-06-23 — A1 — Initial Prisma schema: User, Project, ProjectMember, Sprint, Issue,
  Repository, Commit, CommitIssueRef, PullRequest, IssuePullRequest, Milestone,
  MilestoneSprint. Enums in `@pmgt/shared`. Endpoints: `/auth/{register,login,refresh}`,
  `/users/me`, `/projects` CRUD, `/projects/:id/members`.
- 2026-06-23 — A2 — Scrum endpoints: issues CRUD + `/issues/:id/move` + `/issues/:id/rank`;
  sprints CRUD + `/sprints/:id/{start,complete,board}` + `/projects/:id/velocity`.
- 2026-06-23 — A3 — Repo endpoints: `/projects/:id/repos`, `/repos/:id`,
  `/repos/:id/commits`, `/repos/:id/pulls`, `/pulls/:id`, `/pulls/:id/merge`,
  `/webhooks/git`. Socket.IO gateway at `/` namespace.
- 2026-06-23 — A4 — Milestone endpoints: `/projects/:id/milestones`, `/milestones/:id`,
  `/milestones/:id/sprints`, `/milestones/:id/progress`.
- 2026-06-23 — A3 — Security hardening: per-repo `webhookSecret` + `X-Hub-Signature-256`
  verification on `/webhooks/git`; cross-project `pullRequestId` rejection on commit create
  and merge; JWT-authenticated Socket.IO handshake with project membership check on `join`.
  `RepositoryDto` now includes `webhookSecret`.
- 2026-06-23 — A1 — Expanded seed data: idempotent multi-project loop adds levihuff.net-themed
  demo projects (WDS, ADPR, FOG, PVE, SITE) alongside PMGT, each with sprint, milestone,
  issues, repo, and commits.
- 2026-06-28 — A2 — Async LLM auto-assignment on issue create: `issue.created` event →
  `AutoAssignListener` → Anthropic API; updates `assigneeId` and re-emits `issue.updated`.
  Env: `ANTHROPIC_API_KEY`, optional `AI_ASSIGN_MODEL`.

## Event Bus Registry
| Event | Emitted by | Payload | Consumed by |
|---|---|---|---|
| `issue.created` | scrum | `{ projectId, issueId, assigneeId }` | scrum (auto-assign) |
| `issue.updated` | scrum | `{ projectId, issueId, status }` | realtime, milestone |
| `sprint.updated` | scrum | `{ projectId, sprintId, status }` | realtime |
| `commit.created` | repo | `{ projectId, repoId, commitId, refs }` | realtime |
| `pr.opened` | repo | `{ projectId, repoId, prId, number }` | realtime |
| `pr.merged` | repo | `{ projectId, repoId, prId, issueIds }` | scrum, milestone, realtime |
| `pr.closed` | repo | `{ projectId, repoId, prId }` | realtime |
| `milestone.progress` | milestone | `{ projectId, milestoneId, percent }` | realtime |

## Cross-Module Changes / Blockers
- None outstanding.
