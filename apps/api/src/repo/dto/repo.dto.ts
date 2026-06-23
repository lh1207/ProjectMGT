import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { PullRequestStatus } from "@pmgt/shared";

export class CreateRepoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9][a-z0-9-_]*$/, {
    message: "slug must be lowercase alphanumeric with - or _",
  })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  defaultBranch?: string;
}

export class CreateCommitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  sha?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  authorEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  authorName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  branch?: string;

  @IsString()
  @IsOptional()
  pullRequestId?: string;
}

export class CreatePullRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  body?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sourceBranch!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  targetBranch?: string;

  // Explicit issue links (by id). Commit parsing also links issues automatically.
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  issueIds?: string[];
}

export class UpdatePullRequestStatusDto {
  @IsEnum(PullRequestStatus)
  status!: PullRequestStatus;
}
