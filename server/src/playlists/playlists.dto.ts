import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class PlaylistNameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class AddPlaylistTrackDto {
  @IsInt()
  trackId!: number;
}

export class AddPlaylistTracksDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  trackIds!: number[];
}

export class ReorderPlaylistDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  trackIds!: number[];
}
