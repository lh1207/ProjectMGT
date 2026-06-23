import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Z][A-Z0-9]+$/, {
    message: "key must be uppercase letters/digits, e.g. PMGT",
  })
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}
