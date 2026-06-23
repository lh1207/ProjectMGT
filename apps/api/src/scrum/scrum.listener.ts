import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent, type PrMergedPayload } from "@pmgt/shared";
import { IssuesService } from "./issues.service";

// Decouples repo → scrum: when a PR merges, linked issues auto-close. The repo
// module never imports IssuesService directly — it only emits pr.merged.
@Injectable()
export class ScrumListener {
  constructor(private readonly issues: IssuesService) {}

  @OnEvent(DomainEvent.PrMerged)
  async onPrMerged(payload: PrMergedPayload): Promise<void> {
    for (const issueId of payload.issueIds) {
      await this.issues.closeIssue(issueId, payload.projectId);
    }
  }
}
