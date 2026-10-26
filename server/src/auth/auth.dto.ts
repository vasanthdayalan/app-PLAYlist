import { IsString, MaxLength, MinLength } from 'class-validator';

export class RotateAdminTokenDto {
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  token!: string;
}
