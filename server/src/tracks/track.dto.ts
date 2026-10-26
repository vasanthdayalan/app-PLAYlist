import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const parseBooleanQuery = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export const TRACK_TYPES = ['movie', 'indie'] as const;

export class TrackMetadataDto {
  @IsIn(TRACK_TYPES)
  type!: (typeof TRACK_TYPES)[number];

  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  album!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  albumYear!: number;

  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  trackName!: string;

  @IsInt()
  @Min(1)
  languageId!: number;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  composerIds!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  artistIds!: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  lyricistIds: number[] = [];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  actorIds: number[] = [];
}

export class TrackFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  album?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1900)
  @Max(2100)
  albumYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  composer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lyricist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actor?: string;

  @IsOptional()
  @IsIn(TRACK_TYPES)
  type?: (typeof TRACK_TYPES)[number];

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  languageId?: number;

  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  hasAudio?: boolean;

  // Archived tracks are hidden unless the client is in admin mode.
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  includeArchived?: boolean;

  // Admin-only filter: returns just the archived tracks.
  @IsOptional()
  @Transform(parseBooleanQuery)
  @IsBoolean()
  archivedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @IsOptional()
  @IsIn(['added', 'year', 'album'])
  sort?: 'added' | 'year' | 'album';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class FavoriteDto {
  @IsBoolean()
  favorite!: boolean;
}

export class ArchiveDto {
  @IsBoolean()
  archived!: boolean;
}
