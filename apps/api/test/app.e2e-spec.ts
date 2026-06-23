import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { io } from "socket.io-client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { signWebhookPayload } from "../src/repo/webhook-signature.util";

// End-to-end smoke across all four modules. Exercises the same flow described in
// the plan's verification section. Uses a dedicated DATABASE_URL (see test:e2e).
describe("ProjectMGT API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let projectId: string;
  let sprintId: string;
  let issueId: string;
  let repoId: string;
  let webhookSecret: string;
  let milestoneId: string;
  let serverPort = 0;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const api = (path: string) => `/api/v1${path}`;

  function signedWebhook(body: Record<string, unknown>, secret = webhookSecret) {
    const raw = JSON.stringify(body);
    return {
      raw,
      signature: signWebhookPayload(secret, raw),
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    serverPort =
      typeof address === "object" && address ? address.port : 3000;

    prisma = app.get(PrismaService);
    await prisma.clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it("A1: registers and authenticates a user", async () => {
    const res = await request(app.getHttpServer())
      .post(api("/auth/register"))
      .send({ email: "e2e@pmgt.dev", password: "password123", name: "E2E" })
      .expect(201);
    token = res.body.accessToken;
    expect(token).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get(api("/users/me"))
      .set(auth())
      .expect(200);
    expect(me.body.email).toBe("e2e@pmgt.dev");
  });

  it("A1: rejects unauthenticated access", async () => {
    await request(app.getHttpServer()).get(api("/users/me")).expect(401);
  });

  it("A1/A2: creates a project, sprint, and issue", async () => {
    const project = await request(app.getHttpServer())
      .post(api("/projects"))
      .set(auth())
      .send({ key: "E2E", name: "E2E Project" })
      .expect(201);
    projectId = project.body.id;

    const sprint = await request(app.getHttpServer())
      .post(api(`/projects/${projectId}/sprints`))
      .set(auth())
      .send({ name: "Sprint 1" })
      .expect(201);
    sprintId = sprint.body.id;

    const issue = await request(app.getHttpServer())
      .post(api(`/projects/${projectId}/issues`))
      .set(auth())
      .send({ title: "Build the thing", storyPoints: 5, sprintId })
      .expect(201);
    issueId = issue.body.id;
    expect(issue.body.key).toBe("E2E-1");
    expect(issue.body.status).toBe("BACKLOG");
  });

  it("A2: enforces the state machine on move", async () => {
    // BACKLOG → DONE is illegal.
    await request(app.getHttpServer())
      .patch(api(`/issues/${issueId}/move`))
      .set(auth())
      .send({ status: "DONE" })
      .expect(400);

    // BACKLOG → TODO is legal.
    await request(app.getHttpServer())
      .patch(api(`/issues/${issueId}/move`))
      .set(auth())
      .send({ status: "TODO" })
      .expect(200);
  });

  it("A2: starts the sprint and exposes a board", async () => {
    await request(app.getHttpServer())
      .post(api(`/sprints/${sprintId}/start`))
      .set(auth())
      .expect(201);

    const board = await request(app.getHttpServer())
      .get(api(`/sprints/${sprintId}/board`))
      .set(auth())
      .expect(200);
    const todo = board.body.columns.find((c: any) => c.status === "TODO");
    expect(todo.issues).toHaveLength(1);
  });

  it("A4: creates a milestone linked to the sprint", async () => {
    const target = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
    const milestone = await request(app.getHttpServer())
      .post(api(`/projects/${projectId}/milestones`))
      .set(auth())
      .send({ name: "v1", targetDate: target, sprintIds: [sprintId] })
      .expect(201);
    milestoneId = milestone.body.id;

    const progress = await request(app.getHttpServer())
      .get(api(`/milestones/${milestoneId}/progress`))
      .set(auth())
      .expect(200);
    expect(progress.body.total).toBe(1);
    expect(progress.body.done).toBe(0);
  });

  it("A3→A2→A4: merging a PR auto-closes the linked issue and advances progress", async () => {
    const repo = await request(app.getHttpServer())
      .post(api(`/projects/${projectId}/repos`))
      .set(auth())
      .send({ name: "app", slug: "app" })
      .expect(201);
    repoId = repo.body.id;
    webhookSecret = repo.body.webhookSecret;

    // Commit that references the issue by key.
    const commit = await request(app.getHttpServer())
      .post(api(`/repos/${repoId}/commits`))
      .set(auth())
      .send({
        message: "Fixes E2E-1 implement the thing",
        authorEmail: "e2e@pmgt.dev",
        authorName: "E2E",
      })
      .expect(201);
    expect(commit.body.linkedIssueIds).toContain(issueId);

    // Open a PR explicitly linking the issue, then merge it.
    const pr = await request(app.getHttpServer())
      .post(api(`/repos/${repoId}/pulls`))
      .set(auth())
      .send({
        title: "Implement the thing",
        sourceBranch: "feature/thing",
        issueIds: [issueId],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(api(`/pulls/${pr.body.id}/merge`))
      .set(auth())
      .expect(201);

    // Allow the event bus to settle.
    await new Promise((r) => setTimeout(r, 50));

    const issue = await request(app.getHttpServer())
      .get(api(`/issues/${issueId}`))
      .set(auth())
      .expect(200);
    expect(issue.body.status).toBe("DONE");

    const progress = await request(app.getHttpServer())
      .get(api(`/milestones/${milestoneId}/progress`))
      .set(auth())
      .expect(200);
    expect(progress.body.done).toBe(1);
    expect(progress.body.percent).toBe(100);
  });

  it("A2: completes the sprint and reports velocity", async () => {
    await request(app.getHttpServer())
      .post(api(`/sprints/${sprintId}/complete`))
      .set(auth())
      .send({})
      .expect(201);

    const velocity = await request(app.getHttpServer())
      .get(api(`/projects/${projectId}/velocity`))
      .set(auth())
      .expect(200);
    expect(velocity.body.averageVelocity).toBe(5);
  });

  it("A3: webhook ingress parses and links commits", async () => {
    // Add a fresh issue to reference from the webhook.
    const issue = await request(app.getHttpServer())
      .post(api(`/projects/${projectId}/issues`))
      .set(auth())
      .send({ title: "Webhook target" })
      .expect(201);

    const payload = {
      event: "push",
      repoId,
      ref: "refs/heads/main",
      commits: [
        {
          id: "deadbeef",
          message: `Refs ${issue.body.key} via webhook`,
          author: { email: "e2e@pmgt.dev", name: "E2E" },
        },
      ],
    };
    const { raw, signature } = signedWebhook(payload);

    await request(app.getHttpServer())
      .post(api("/webhooks/git"))
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", signature)
      .send(raw)
      .expect(202);

    const commits = await request(app.getHttpServer())
      .get(api(`/repos/${repoId}/commits`))
      .set(auth())
      .expect(200);
    const hook = commits.body.find((c: any) => c.sha === "deadbeef");
    expect(hook.linkedIssueIds).toContain(issue.body.id);
  });

  it("A3: rejects unsigned webhook payloads", async () => {
    await request(app.getHttpServer())
      .post(api("/webhooks/git"))
      .send({
        event: "push",
        repoId,
        ref: "refs/heads/main",
        commits: [],
      })
      .expect(401);
  });

  it("A3: rejects webhook payloads with an invalid signature", async () => {
    const payload = {
      event: "push",
      repoId,
      ref: "refs/heads/main",
      commits: [],
    };
    const { raw } = signedWebhook(payload);

    await request(app.getHttpServer())
      .post(api("/webhooks/git"))
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=invalid")
      .send(raw)
      .expect(401);
  });

  it("A3: rejects cross-project pullRequestId on commit create", async () => {
    const otherProject = await request(app.getHttpServer())
      .post(api("/projects"))
      .set(auth())
      .send({ key: "OTH", name: "Other Project" })
      .expect(201);

    const otherRepo = await request(app.getHttpServer())
      .post(api(`/projects/${otherProject.body.id}/repos`))
      .set(auth())
      .send({ name: "other", slug: "other" })
      .expect(201);

    const otherPr = await request(app.getHttpServer())
      .post(api(`/repos/${otherRepo.body.id}/pulls`))
      .set(auth())
      .send({
        title: "Other PR",
        sourceBranch: "feature/other",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(api(`/repos/${repoId}/commits`))
      .set(auth())
      .send({
        message: "Cross-project PR link attempt",
        authorEmail: "e2e@pmgt.dev",
        authorName: "E2E",
        pullRequestId: otherPr.body.id,
      })
      .expect(400);
  });

  it("A3: realtime rejects unauthenticated socket connections", async () => {
    await new Promise<void>((resolve, reject) => {
      const client = io(`http://127.0.0.1:${serverPort}`, {
        transports: ["websocket"],
        forceNew: true,
      });
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("expected unauthenticated socket to fail"));
      });
      client.on("connect_error", () => {
        client.disconnect();
        resolve();
      });
    });
  });

  it("A3: realtime rejects join for non-members", async () => {
    const outsider = await request(app.getHttpServer())
      .post(api("/auth/register"))
      .send({
        email: "outsider@pmgt.dev",
        password: "password123",
        name: "Outsider",
      })
      .expect(201);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        client.disconnect();
        reject(new Error("timed out waiting for join rejection"));
      }, 5000);

      const client = io(`http://127.0.0.1:${serverPort}`, {
        transports: ["websocket"],
        forceNew: true,
        auth: { token: outsider.body.accessToken },
      });

      client.on("connect", () => {
        client.emit("join", { projectId });
      });

      client.on("exception", () => {
        clearTimeout(timer);
        client.disconnect();
        resolve();
      });

      client.on("connect_error", (error) => {
        clearTimeout(timer);
        client.disconnect();
        reject(error);
      });
    });
  });
});
