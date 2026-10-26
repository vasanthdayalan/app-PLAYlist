import { isAllowedAudioExtension } from '../audio/audio-formats.js';

export type TrackType = 'movie' | 'indie';

export interface AudioPathInput {
  type: TrackType;
  language: string;
  year: number;
  album: string;
  trackName: string;
  extension: string;
}

const INVALID_PATH_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;

export function sanitizePathSegment(value: string): string {
  return value
    .replace(INVALID_PATH_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .trim();
}

// Relative to the audio root: <type>/<language>/<year>/<album>/<trackName>.<ext>
export function buildRelativeAudioPath(input: AudioPathInput): string {
  if (!isAllowedAudioExtension(input.extension)) {
    throw new Error(`Unsupported audio extension: ${input.extension}`);
  }
  const segments = [
    input.type,
    sanitizePathSegment(input.language),
    String(input.year),
    sanitizePathSegment(input.album),
  ];
  const fileName = `${sanitizePathSegment(input.trackName)}.${input.extension.toLowerCase()}`;
  const parts = [...segments, fileName];
  if (parts.some((part) => part.length === 0)) {
    throw new Error('Audio path segments must not be empty');
  }
  return parts.join('/');
}
