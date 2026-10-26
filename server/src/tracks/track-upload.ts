import type { PersonRole, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ensureIncomingDir } from '../audio/audio-storage.js';

export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

export const trackUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => callback(null, ensureIncomingDir()),
    filename: (_req, file, callback) =>
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_AUDIO_BYTES },
};
