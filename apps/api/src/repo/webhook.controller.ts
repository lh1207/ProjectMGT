import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { GitWebhookDto } from "./dto/webhook.dto";
import { WebhookService } from "./webhook.service";
import { WebhookSignatureGuard } from "./webhook-signature.guard";

@Controller("webhooks")
export class WebhookController {
  constructor(private readonly webhook: WebhookService) {}

  @Post("git")
  @HttpCode(202)
  @UseGuards(WebhookSignatureGuard)
  handle(@Body() dto: GitWebhookDto): Promise<{ processed: string }> {
    return this.webhook.handle(dto);
  }
}
