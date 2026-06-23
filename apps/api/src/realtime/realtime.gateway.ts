import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type OnGatewayInit,
} from "@nestjs/websockets";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import {
  DomainEvent,
  type CommitCreatedPayload,
  type IssueUpdatedPayload,
  type MilestoneProgressPayload,
  type PrClosedPayload,
  type PrMergedPayload,
  type PrOpenedPayload,
  type SprintUpdatedPayload,
} from "@pmgt/shared";
import type { Server, Socket } from "socket.io";
import type { AuthUser } from "../common/current-user.decorator";
import { ProjectAccessService } from "../common/project-access.service";
import type { JwtPayload } from "../auth/jwt.strategy";

function room(projectId: string): string {
  return `project:${projectId}`;
}

type AuthedSocket = Socket & { data: { user?: AuthUser } };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly access: ProjectAccessService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }
      try {
        const payload = this.jwt.verify<JwtPayload>(token);
        (socket as AuthedSocket).data.user = {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        };
        next();
      } catch {
        next(new Error("Unauthorized"));
      }
    });
  }

  @SubscribeMessage("join")
  async onJoin(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: AuthedSocket,
  ): Promise<{ joined: string }> {
    const userId = client.data.user?.userId;
    if (!userId || !data?.projectId) {
      throw new WsException("Unauthorized");
    }
    await this.access.assertMember(data.projectId, userId).catch(() => {
      throw new WsException("Not a member of this project");
    });
    await client.join(room(data.projectId));
    return { joined: data.projectId };
  }

  private broadcast(projectId: string, event: string, payload: unknown): void {
    this.server?.to(room(projectId)).emit(event, payload);
  }

  @OnEvent(DomainEvent.IssueUpdated)
  onIssue(p: IssueUpdatedPayload): void {
    this.broadcast(p.projectId, DomainEvent.IssueUpdated, p);
  }

  @OnEvent(DomainEvent.SprintUpdated)
  onSprint(p: SprintUpdatedPayload): void {
    this.broadcast(p.projectId, DomainEvent.SprintUpdated, p);
  }

  @OnEvent(DomainEvent.CommitCreated)
  onCommit(p: CommitCreatedPayload): void {
    this.broadcast(p.projectId, DomainEvent.CommitCreated, p);
  }

  @OnEvent(DomainEvent.PrOpened)
  onPrOpened(p: PrOpenedPayload): void {
    this.broadcast(p.projectId, DomainEvent.PrOpened, p);
  }

  @OnEvent(DomainEvent.PrMerged)
  onPrMerged(p: PrMergedPayload): void {
    this.broadcast(p.projectId, DomainEvent.PrMerged, p);
  }

  @OnEvent(DomainEvent.PrClosed)
  onPrClosed(p: PrClosedPayload): void {
    this.broadcast(p.projectId, DomainEvent.PrClosed, p);
  }

  @OnEvent(DomainEvent.MilestoneProgress)
  onMilestone(p: MilestoneProgressPayload): void {
    this.broadcast(p.projectId, DomainEvent.MilestoneProgress, p);
  }
}
