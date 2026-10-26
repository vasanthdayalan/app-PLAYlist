import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ItunesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  album?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artist?: string;
}
