import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { GitWebhookDto } from "./dto/webhook.dto";
import { verifyWebhookSignature } from "./webhook-signature.util";

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request> & { body: GitWebhookDto }>();
    const repoId = req.body?.repoId;
    if (!repoId) {
      throw new UnauthorizedException("Missing repoId");
    }

    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
      select: { webhookSecret: true },
    });
    if (!repo) {
      throw new NotFoundException("Unknown repository");
    }
    if (!repo.webhookSecret) {
      throw new UnauthorizedException("Repository webhook secret is not configured");
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException("Missing request body");
    }

    const signature = req.header("x-hub-signature-256");
    if (!verifyWebhookSignature(repo.webhookSecret, rawBody, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    return true;
  }
}
