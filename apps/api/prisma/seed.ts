import { PrismaClient, User } from "@prisma/client";
import { randomBytes } from "node:crypto";
import {
  IssuePriority,
  IssueStatus,
  IssueType,
  MilestoneStatus,
  SprintStatus,
  UserRole,
  initialRanks,
} from "@pmgt/shared";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface IssueSeed {
  title: string;
  type: string;
  status: string;
  points: number;
  priority: string;
}

interface CommitSeed {
  sha: string;
  message: string;
}

interface ProjectSeedDef {
  key: string;
  name: string;
  description: string;
  sprintName: string;
  sprintGoal: string;
  milestoneName: string;
  milestoneDescription: string;
  issues: IssueSeed[];
  repoName: string;
  repoSlug: string;
  commits: CommitSeed[];
}

const projectSeeds: ProjectSeedDef[] = [
  {
    key: "PMGT",
    name: "ProjectMGT Platform",
    description: "Dogfooding the platform on itself.",
    sprintName: "Sprint 1 — Foundations",
    sprintGoal: "Stand up auth, board, and repo simulation.",
    milestoneName: "v1.0 Launch",
    milestoneDescription: "First public, self-hostable release.",
    issues: [
      { title: "Set up JWT auth", type: IssueType.STORY, status: IssueStatus.DONE, points: 3, priority: IssuePriority.HIGH },
      { title: "Kanban board drag-and-drop", type: IssueType.STORY, status: IssueStatus.IN_PROGRESS, points: 5, priority: IssuePriority.HIGH },
      { title: "Commit 'Fixes #' parser", type: IssueType.TASK, status: IssueStatus.TODO, points: 3, priority: IssuePriority.MEDIUM },
      { title: "Milestone progress rollup", type: IssueType.STORY, status: IssueStatus.TODO, points: 2, priority: IssuePriority.MEDIUM },
      { title: "Flaky refresh-token edge case", type: IssueType.BUG, status: IssueStatus.BACKLOG, points: 1, priority: IssuePriority.LOW },
    ],
    repoName: "platform",
    repoSlug: "platform",
    commits: [{ sha: "a1b2c3d4", message: "Initial scaffolding" }],
  },
  {
    key: "WDS",
    name: "Windows Imaging & Zero-Touch",
    description: "MDT, WDS, SCCM, PXE — zero-touch deployment pipeline.",
    sprintName: "Sprint 1 — Imaging Pipeline",
    sprintGoal: "Stand up MDT share and PXE boot for lab VLAN.",
    milestoneName: "Production Rollout",
    milestoneDescription: "Zero-touch Windows deployment in production.",
    issues: [
      { title: "Configure MDT deployment share", type: IssueType.STORY, status: IssueStatus.DONE, points: 5, priority: IssuePriority.HIGH },
      { title: "Wire SCCM OSD task sequence", type: IssueType.STORY, status: IssueStatus.IN_PROGRESS, points: 8, priority: IssuePriority.HIGH },
      { title: "Test PXE boot on lab VLAN", type: IssueType.TASK, status: IssueStatus.TODO, points: 3, priority: IssuePriority.MEDIUM },
      { title: "Document DISM capture workflow", type: IssueType.TASK, status: IssueStatus.BACKLOG, points: 2, priority: IssuePriority.LOW },
    ],
    repoName: "imaging-scripts",
    repoSlug: "imaging-scripts",
    commits: [
      { sha: "wds001ab", message: "Add PXE boot task sequence" },
      { sha: "wds002cd", message: "Configure MDT deployment share" },
    ],
  },
  {
    key: "ADPR",
    name: "AD Provisioning Automation",
    description: "PowerShell onboarding automation for Active Directory.",
    sprintName: "Sprint 1 — Onboarding Scripts",
    sprintGoal: "Automate new-hire AD account provisioning.",
    milestoneName: "40% Time Reduction",
    milestoneDescription: "Cut manual onboarding setup time across 180+ locations.",
    issues: [
      { title: "New-hire AD account template", type: IssueType.STORY, status: IssueStatus.DONE, points: 5, priority: IssuePriority.HIGH },
      { title: "Group Policy assignment script", type: IssueType.STORY, status: IssueStatus.IN_PROGRESS, points: 5, priority: IssuePriority.HIGH },
      { title: "Exchange mailbox provisioning hook", type: IssueType.TASK, status: IssueStatus.TODO, points: 3, priority: IssuePriority.MEDIUM },
      { title: "Audit log for provisioning runs", type: IssueType.TASK, status: IssueStatus.BACKLOG, points: 2, priority: IssuePriority.LOW },
    ],
    repoName: "ad-automation",
    repoSlug: "ad-automation",
    commits: [
      { sha: "adpr001a", message: "Add New-ADUser provisioning script" },
      { sha: "adpr002b", message: "Wire Group Policy assignment" },
    ],
  },
  {
    key: "FOG",
    name: "Imaging Lab",
    description: "FOG Project + VMware lab for capture/deploy testing.",
    sprintName: "Sprint 1 — Lab Setup",
    sprintGoal: "Capture and deploy test images via FOG and VMware.",
    milestoneName: "Lab Operational",
    milestoneDescription: "Full imaging workflow tested outside production.",
    issues: [
      { title: "Install FOG Project on lab server", type: IssueType.STORY, status: IssueStatus.DONE, points: 3, priority: IssuePriority.HIGH },
      { title: "Configure VMware PXE boot network", type: IssueType.TASK, status: IssueStatus.IN_PROGRESS, points: 5, priority: IssuePriority.HIGH },
      { title: "Capture Windows 11 reference image", type: IssueType.STORY, status: IssueStatus.TODO, points: 5, priority: IssuePriority.MEDIUM },
      { title: "Test multicast deploy to 5 VMs", type: IssueType.TASK, status: IssueStatus.BACKLOG, points: 3, priority: IssuePriority.LOW },
    ],
    repoName: "imaging-lab",
    repoSlug: "imaging-lab",
    commits: [{ sha: "fog001ab", message: "Add FOG server install notes" }],
  },
  {
    key: "PVE",
    name: "Proxmox Homelab Node",
    description: "Self-hosted stack: Jellyfin, Pi-hole, Home Assistant, etc.",
    sprintName: "Sprint 1 — Stack Deploy",
    sprintGoal: "Containerize core homelab services on Proxmox.",
    milestoneName: "24/7 Uptime",
    milestoneDescription: "All homelab services running with monitoring.",
    issues: [
      { title: "Deploy Pi-hole container", type: IssueType.STORY, status: IssueStatus.DONE, points: 2, priority: IssuePriority.HIGH },
      { title: "Set up Jellyfin media server", type: IssueType.STORY, status: IssueStatus.IN_PROGRESS, points: 3, priority: IssuePriority.MEDIUM },
      { title: "Configure Uptime Kuma monitors", type: IssueType.TASK, status: IssueStatus.TODO, points: 2, priority: IssuePriority.MEDIUM },
      { title: "Home Assistant integration bridge", type: IssueType.STORY, status: IssueStatus.BACKLOG, points: 5, priority: IssuePriority.LOW },
    ],
    repoName: "homelab",
    repoSlug: "homelab",
    commits: [
      { sha: "pve001ab", message: "Deploy Pi-hole container" },
      { sha: "pve002cd", message: "Add docker-compose for Jellyfin" },
    ],
  },
  {
    key: "SITE",
    name: "levihuff.net Portfolio",
    description: "Personal site — infrastructure showcase and resume.",
    sprintName: "Sprint 1 — Site Refresh",
    sprintGoal: "Update featured work and resume sections.",
    milestoneName: "2026 Portfolio Launch",
    milestoneDescription: "Public site refresh for job search season.",
    issues: [
      { title: "Featured infrastructure work cards", type: IssueType.STORY, status: IssueStatus.DONE, points: 3, priority: IssuePriority.HIGH },
      { title: "Resume PDF download page", type: IssueType.TASK, status: IssueStatus.IN_PROGRESS, points: 2, priority: IssuePriority.HIGH },
      { title: "Blog post: AI ops on the homelab", type: IssueType.STORY, status: IssueStatus.TODO, points: 5, priority: IssuePriority.MEDIUM },
      { title: "Contact form spam protection", type: IssueType.TASK, status: IssueStatus.BACKLOG, points: 2, priority: IssuePriority.LOW },
    ],
    repoName: "levihuff-net",
    repoSlug: "levihuff-net",
    commits: [{ sha: "site001a", message: "Add featured infrastructure work section" }],
  },
];

async function seedProjectGraph(
  def: ProjectSeedDef,
  demo: User,
  teammate: User,
): Promise<void> {
  const existing = await prisma.project.findUnique({ where: { key: def.key } });
  if (existing) {
    console.log(`Seed: ${def.key} project already exists, skipping.`);
    return;
  }

  const project = await prisma.project.create({
    data: {
      key: def.key,
      name: def.name,
      description: def.description,
      members: {
        create: [
          { userId: demo.id, role: UserRole.ADMIN },
          { userId: teammate.id, role: UserRole.MEMBER },
        ],
      },
    },
  });

  const now = new Date();
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const sprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      name: def.sprintName,
      goal: def.sprintGoal,
      status: SprintStatus.ACTIVE,
      startDate: now,
      endDate: new Date(now.getTime() + twoWeeks),
      committedPoints: def.issues.reduce((sum, i) => sum + i.points, 0),
    },
  });

  const milestone = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: def.milestoneName,
      description: def.milestoneDescription,
      status: MilestoneStatus.ACTIVE,
      startDate: now,
      targetDate: new Date(now.getTime() + 3 * twoWeeks),
      sprints: { create: [{ sprintId: sprint.id }] },
    },
  });

  const ranks = initialRanks(def.issues.length);

  let seq = 0;
  for (let i = 0; i < def.issues.length; i++) {
    const s = def.issues[i]!;
    seq += 1;
    await prisma.issue.create({
      data: {
        projectId: project.id,
        sprintId: s.status === IssueStatus.BACKLOG ? null : sprint.id,
        milestoneId: milestone.id,
        key: `${def.key}-${seq}`,
        title: s.title,
        type: s.type,
        status: s.status,
        priority: s.priority,
        storyPoints: s.points,
        boardRank: ranks[i]!,
        reporterId: demo.id,
        assigneeId: i % 2 === 0 ? demo.id : teammate.id,
        closedAt: s.status === IssueStatus.DONE ? now : null,
      },
    });
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { issueSeq: seq },
  });

  const repo = await prisma.repository.create({
    data: {
      projectId: project.id,
      name: def.repoName,
      slug: def.repoSlug,
      defaultBranch: "main",
      webhookSecret: randomBytes(32).toString("hex"),
    },
  });

  for (const commit of def.commits) {
    await prisma.commit.create({
      data: {
        repositoryId: repo.id,
        sha: commit.sha,
        message: commit.message,
        authorEmail: demo.email,
        authorName: demo.name,
        branch: "main",
      },
    });
  }

  console.log(`Seed: created ${def.key} — ${def.name}`);
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@pmgt.dev" },
    update: {},
    create: {
      email: "demo@pmgt.dev",
      passwordHash,
      name: "Demo User",
      role: UserRole.ADMIN,
    },
  });

  const teammate = await prisma.user.upsert({
    where: { email: "alex@pmgt.dev" },
    update: {},
    create: {
      email: "alex@pmgt.dev",
      passwordHash,
      name: "Alex Rivera",
      role: UserRole.MEMBER,
    },
  });

  for (const def of projectSeeds) {
    await seedProjectGraph(def, demo, teammate);
  }

  console.log("Seed complete: login with demo@pmgt.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
