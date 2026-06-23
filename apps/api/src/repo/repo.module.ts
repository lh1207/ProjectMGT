import { Module } from "@nestjs/common";
import { CommitsService } from "./commits.service";
import { PullRequestsService } from "./pull-requests.service";
import { RepoController } from "./repo.controller";
import { RepositoriesService } from "./repositories.service";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";
import { WebhookSignatureGuard } from "./webhook-signature.guard";

@Module({
  controllers: [RepoController, WebhookController],
  providers: [
    RepositoriesService,
    CommitsService,
    PullRequestsService,
    WebhookService,
    WebhookSignatureGuard,
  ],
  exports: [RepositoriesService, CommitsService, PullRequestsService],
})
export class RepoModule {}
