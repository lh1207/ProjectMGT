import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent, type IssueCreatedPayload } from "@pmgt/shared";
import { AutoAssignService } from "./auto-assign.service";

@Injectable()
export class AutoAssignListener {
  constructor(private readonly autoAssign: AutoAssignService) {}

  @OnEvent(DomainEvent.IssueCreated)
  async onIssueCreated(payload: IssueCreatedPayload): Promise<void> {
    if (payload.assigneeId !== null) return;
    await this.autoAssign.assignIssue(payload.issueId, payload.projectId);
  }
}
