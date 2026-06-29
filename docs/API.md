# API Reference

The REST API is served under `/api/v1`. All routes except `POST /auth/register`,
`POST /auth/login`, `POST /auth/refresh`, and `POST /webhooks/git` require a bearer access
token:

```http
Authorization: Bearer <accessToken>
```

Request bodies are validated with DTO classes and unknown fields are rejected.

## Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a user and return access and refresh tokens |
| `POST` | `/auth/login` | Return access and refresh tokens for valid credentials |
| `POST` | `/auth/refresh` | Exchange a refresh token for a new token pair |
| `GET` | `/users/me` | Return the authenticated user |

Auth responses include:

- `accessToken`
- `refreshToken`
- `user`

## Projects

| Method | Route | Description |
|---|---|---|
| `POST` | `/projects` | Create a project and add the creator as admin |
| `GET` | `/projects` | List projects for the authenticated user |
| `GET` | `/projects/:id` | Get one project by membership |
| `PATCH` | `/projects/:id` | Update project metadata |
| `GET` | `/projects/:id/members` | List project members |
| `POST` | `/projects/:id/members` | Add a member by email |

Project membership is enforced by service-level access checks.

## Scrum

### Issues

| Method | Route | Description |
|---|---|---|
| `GET` | `/projects/:projectId/issues` | List project issues |
| `POST` | `/projects/:projectId/issues` | Create an issue |
| `GET` | `/issues/:id` | Get one issue |
| `PATCH` | `/issues/:id` | Update issue fields |
| `DELETE` | `/issues/:id` | Delete an issue |
| `PATCH` | `/issues/:id/move` | Move an issue between statuses and optionally sprints |
| `PATCH` | `/issues/:id/rank` | Reorder an issue with LexoRank |

Issue keys use the project key plus a monotonic sequence, such as `PMGT-12`.

### Sprints

| Method | Route | Description |
|---|---|---|
| `GET` | `/projects/:projectId/sprints` | List project sprints |
| `POST` | `/projects/:projectId/sprints` | Create a sprint |
| `PATCH` | `/sprints/:id` | Update sprint fields |
| `POST` | `/sprints/:id/start` | Start a planned sprint |
| `POST` | `/sprints/:id/complete` | Complete a sprint and roll over unfinished work |
| `GET` | `/sprints/:id/board` | Return board columns for a sprint |
| `GET` | `/projects/:projectId/velocity?lastN=3` | Return velocity for recent completed sprints |

## Repositories

| Method | Route | Description |
|---|---|---|
| `GET` | `/projects/:projectId/repos` | List repositories for a project |
| `POST` | `/projects/:projectId/repos` | Create a simulated repository |
| `GET` | `/repos/:id` | Get one repository |
| `GET` | `/repos/:id/commits` | List commits |
| `POST` | `/repos/:id/commits` | Create a commit and parse issue references |
| `GET` | `/repos/:id/pulls` | List pull requests |
| `POST` | `/repos/:id/pulls` | Open a pull request |
| `PATCH` | `/pulls/:id` | Update pull-request status |
| `POST` | `/pulls/:id/merge` | Merge a pull request |

Commit messages can reference issues with forms such as `Refs PMGT-1`, `Fixes PMGT-1`,
`Closes PMGT-1`, or `Fixes #1`. Merging a pull request auto-closes linked issues.

## Milestones

| Method | Route | Description |
|---|---|---|
| `GET` | `/projects/:projectId/milestones` | List project milestones |
| `POST` | `/projects/:projectId/milestones` | Create a milestone |
| `GET` | `/milestones/:id` | Get one milestone |
| `PATCH` | `/milestones/:id` | Update milestone fields |
| `DELETE` | `/milestones/:id` | Delete a milestone |
| `POST` | `/milestones/:id/sprints` | Link sprints to a milestone |
| `GET` | `/milestones/:id/progress` | Return progress and risk rollup |

Milestone progress is recomputed from linked sprints and issues when relevant domain events
are emitted.

## Webhooks

`POST /webhooks/git` accepts a GitHub-shaped payload and requires an HMAC signature:

```http
X-Hub-Signature-256: sha256=<hex digest>
```

The signature is computed over the raw request body using the target repository's
`webhookSecret`. The request body must include `repoId` so the guard can load the correct
secret before verification.

Accepted payload shape:

- `repoId`
- `event`, either `push` or `pull_request`
- `ref`, for push branch refs such as `refs/heads/main`
- `commits[]`, each with `id`, `message`, and `author.email`
- `action`, either `opened` or `closed` for pull-request events
- `pull_request`, with `title`, `body`, `head`, `base`, `merged`, and `issueIds`
- `number`, required to close or merge an existing pull request

The endpoint returns HTTP `202` with `{ "processed": "<event>" }` when accepted.

## Realtime

Socket.IO uses the same access token as the REST API. The client sends it in the socket
auth payload, then joins one project room:

```ts
const socket = io("/", {
  transports: ["websocket"],
  auth: { token: accessToken },
});

socket.emit("join", { projectId });
```

The gateway verifies the JWT and checks project membership before joining the room.

Broadcast domain events:

| Event | Typical UI invalidation |
|---|---|
| `issue.updated` | Issue list, board, sprint list |
| `sprint.updated` | Board and sprint list |
| `commit.created` | Commits, pull requests, board |
| `pr.opened` | Pull requests and repo views |
| `pr.merged` | Pull requests, board, milestones |
| `pr.closed` | Pull requests and repo views |
| `milestone.progress` | Milestone list and progress cards |

Event names are defined in `packages/shared/src/events.ts`.
