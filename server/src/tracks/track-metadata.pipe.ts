import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TrackMetadataDto } from './track.dto.js';

// The metadata arrives either as a JSON string (multipart form) or as an object (plain JSON body).
@Injectable()
export class TrackMetadataPipe implements PipeTransform<unknown, Promise<TrackMetadataDto>> {
  async transform(value: unknown): Promise<TrackMetadataDto> {
    let raw: unknown = value;
    if (typeof value === 'string') {
      try {
        raw = JSON.parse(value);
      } catch {
        throw new BadRequestException('metadata must be valid JSON');
      }
    }
    if (typeof raw !== 'object' || raw === null) {
      throw new BadRequestException('metadata is required');
    }
    const dto = plainToInstance(TrackMetadataDto, raw);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors.flatMap((error) => Object.values(error.constraints ?? {})));
    }
    return dto;
  }
}
