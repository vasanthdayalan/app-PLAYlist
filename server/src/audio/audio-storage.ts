import { mkdirSync } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { parseFile } from 'music-metadata';

export const AUDIO_INCOMING_DIR = '.incoming';

export function audioRoot(): string {
  return resolve(process.env.AUDIO_ROOT ?? join(process.cwd(), '..', 'audio'));
}

export function incomingDir(): string {
  return join(audioRoot(), AUDIO_INCOMING_DIR);
}

export function ensureIncomingDir(): string {
  const dir = incomingDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Resolves a stored relative path and refuses anything outside the audio root.
export function absoluteAudioPath(relativePath: string): string {
  const root = audioRoot();
  const absolute = resolve(root, relativePath);
  const rel = relative(root, absolute);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Audio path escapes the audio root');
  }
  return absolute;
}

export async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

// Moves an uploaded temp file (inside the audio root) to its final relative path.
export async function moveUploadedFile(tempPath: string, relativePath: string): Promise<void> {
  const target = absoluteAudioPath(relativePath);
  await mkdir(dirname(target), { recursive: true });
  await rename(tempPath, target);
}

export async function moveStoredFile(fromRelative: string, toRelative: string): Promise<void> {
  const target = absoluteAudioPath(toRelative);
  await mkdir(dirname(target), { recursive: true });
  await rename(absoluteAudioPath(fromRelative), target);
}

export async function removeStoredFile(relativePath: string): Promise<void> {
  try {
    await unlink(absoluteAudioPath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export async function removeTempFile(tempPath: string | undefined): Promise<void> {
  if (!tempPath) return;
  try {
    await unlink(tempPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export interface AudioInfo {
  durationSeconds: number | null;
  artwork: { mimeType: string; data: Buffer<ArrayBuffer> } | null;
}

// A file that cannot be read still gets saved; its length and artwork are simply unknown.
export async function readAudioInfo(path: string): Promise<AudioInfo> {
  try {
    const metadata = await parseFile(path, { duration: true });
    const duration = metadata.format.duration;
    const picture = metadata.common.picture?.[0];
    return {
      durationSeconds: duration ? Math.round(duration) : null,
      artwork: picture ? { mimeType: picture.format, data: Buffer.from(picture.data) as Buffer<ArrayBuffer> } : null,
    };
  } catch {
    return { durationSeconds: null, artwork: null };
  }
}
