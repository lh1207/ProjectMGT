import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

// A trimmed, GitHub-shaped webhook payload. Real GitHub sends more; we accept the
// subset the simulator needs and ignore the rest. `repoId` identifies the target
// repository (the simulator's stand-in for repository.full_name resolution).

export class WebhookAuthorDto {
  @IsString()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class WebhookCommitDto {
  @IsString()
  @IsOptional()
  id?: string; // sha

  @IsString()
  message!: string;

  @ValidateNested()
  @Type(() => WebhookAuthorDto)
  author!: WebhookAuthorDto;
}

export class WebhookPullRequestDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  head!: string; // source branch

  @IsString()
  @IsOptional()
  base?: string; // target branch

  @IsBoolean()
  @IsOptional()
  merged?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  issueIds?: string[];
}

export class GitWebhookDto {
  @IsIn(["push", "pull_request"])
  event!: "push" | "pull_request";

  @IsString()
  repoId!: string;

  @IsString()
  @IsOptional()
  ref?: string; // e.g. refs/heads/main

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookCommitDto)
  @IsOptional()
  commits?: WebhookCommitDto[];

  @IsIn(["opened", "closed"])
  @IsOptional()
  action?: "opened" | "closed";

  @ValidateNested()
  @Type(() => WebhookPullRequestDto)
  @IsOptional()
  pull_request?: WebhookPullRequestDto;

  // For pull_request "closed" events, which PR number to act on.
  @IsOptional()
  number?: number;
}
