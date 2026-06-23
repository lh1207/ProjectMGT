import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  DomainEvent,
  type IssueUpdatedPayload,
  type PrMergedPayload,
} from "@pmgt/shared";
import { MilestoneService } from "./milestone.service";

// Recomputes milestone progress whenever issues change or PRs merge. Driven purely
// by the event bus — milestone never reaches into scrum/repo services.
@Injectable()
export class MilestoneListener {
  constructor(private readonly milestones: MilestoneService) {}

  @OnEvent(DomainEvent.IssueUpdated)
  async onIssueUpdated(payload: IssueUpdatedPayload): Promise<void> {
    const ids = await this.milestones.milestonesForIssue(payload.issueId);
    for (const id of ids) {
      await this.milestones.recomputeAndEmit(id);
    }
  }

  @OnEvent(DomainEvent.PrMerged)
  async onPrMerged(payload: PrMergedPayload): Promise<void> {
    const affected = new Set<string>();
    for (const issueId of payload.issueIds) {
      const ids = await this.milestones.milestonesForIssue(issueId);
      ids.forEach((id) => affected.add(id));
    }
    for (const id of affected) {
      await this.milestones.recomputeAndEmit(id);
    }
  }
}
