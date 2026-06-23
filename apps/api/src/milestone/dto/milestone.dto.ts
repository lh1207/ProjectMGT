import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  targetDate!: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sprintIds?: string[];
}

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  targetDate?: Date;
}

export class LinkSprintsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sprintIds!: string[];
}
