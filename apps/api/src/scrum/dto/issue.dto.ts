import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  IssuePriority,
  IssueStatus,
  IssueType,
} from "@pmgt/shared";

export class CreateIssueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsEnum(IssueType)
  @IsOptional()
  type?: IssueType;

  @IsEnum(IssuePriority)
  @IsOptional()
  priority?: IssuePriority;

  @IsInt()
  @Min(0)
  @IsOptional()
  storyPoints?: number;

  @IsString()
  @IsOptional()
  sprintId?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  milestoneId?: string;
}

export class UpdateIssueDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsEnum(IssueType)
  @IsOptional()
  type?: IssueType;

  @IsEnum(IssuePriority)
  @IsOptional()
  priority?: IssuePriority;

  @IsInt()
  @Min(0)
  @IsOptional()
  storyPoints?: number;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsString()
  @IsOptional()
  sprintId?: string | null;

  @IsString()
  @IsOptional()
  milestoneId?: string | null;
}

// Move = change column (status) and/or position. `beforeId`/`afterId` identify the
// neighbours in the destination column for lexorank placement.
export class MoveIssueDto {
  @IsEnum(IssueStatus)
  status!: IssueStatus;

  @IsString()
  @IsOptional()
  beforeId?: string;

  @IsString()
  @IsOptional()
  afterId?: string;
}

export class RankIssueDto {
  @IsString()
  @IsOptional()
  beforeId?: string;

  @IsString()
  @IsOptional()
  afterId?: string;
}
