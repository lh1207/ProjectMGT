import { Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateSprintDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  goal?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class UpdateSprintDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  goal?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class CompleteSprintDto {
  // Optional destination sprint for unfinished issues; default rolls to backlog.
  @IsString()
  @IsOptional()
  moveUnfinishedToSprintId?: string;
}

export class VelocityQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  lastN?: number;
}
