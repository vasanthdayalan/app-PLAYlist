export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'opus'] as const;

export type AudioExtension = (typeof ALLOWED_AUDIO_EXTENSIONS)[number];

export function isAllowedAudioExtension(value: string): value is AudioExtension {
  return (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(value.toLowerCase());
}

const MIME_BY_EXTENSION: Record<AudioExtension, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  opus: 'audio/ogg',
};

export function audioMimeType(extension: string): string {
  return isAllowedAudioExtension(extension) ? MIME_BY_EXTENSION[extension] : 'application/octet-stream';
}
