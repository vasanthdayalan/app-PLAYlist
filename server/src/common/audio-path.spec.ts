import { describe, expect, it } from 'vitest';
import { buildRelativeAudioPath, sanitizePathSegment } from './audio-path.js';

describe('sanitizePathSegment', () => {
  it('removes characters invalid in file names', () => {
    expect(sanitizePathSegment('AC/DC: Live?')).toBe('ACDC Live');
  });

  it('removes trailing dots', () => {
    expect(sanitizePathSegment('Song...')).toBe('Song');
  });
});

describe('buildRelativeAudioPath', () => {
  it('builds type/language/year/album/track.ext', () => {
    expect(
      buildRelativeAudioPath({
        type: 'movie',
        language: 'Tamil',
        year: 2019,
        album: 'Master',
        trackName: 'Vaathi Raid',
        extension: 'MP3',
      }),
    ).toBe('movie/Tamil/2019/Master/Vaathi Raid.mp3');
  });

  it('rejects extensions outside the allowed list', () => {
    expect(() =>
      buildRelativeAudioPath({
        type: 'indie',
        language: 'English',
        year: 2020,
        album: 'A',
        trackName: 'B',
        extension: 'flac',
      }),
    ).toThrow('Unsupported audio extension');
  });
});
