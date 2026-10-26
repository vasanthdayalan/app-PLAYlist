import { BadRequestException } from '@nestjs/common';

export const ARTWORK_MAX_BYTES = 10 * 1024 * 1024;
export const ARTWORK_MIN_SIZE = 600;
export const ARTWORK_MAX_SIZE = 800;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Start-of-frame markers that carry the image size (excludes DHT, JPG and DAC markers).
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

interface ImageInfo {
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

// Reads the type and size from the file header, so the declared mimetype is not trusted.
export function readImageInfo(buffer: Buffer): ImageInfo | null {
  if (buffer.length >= 24 && PNG_SIGNATURE.every((byte, i) => buffer[i] === byte)) {
    return { mimeType: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpegSize(buffer);
  }
  return null;
}

function readJpegSize(buffer: Buffer): ImageInfo | null {
  let i = 2;
  while (i + 4 <= buffer.length) {
    if (buffer[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    // Standalone markers have no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = buffer.readUInt16BE(i + 2);
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (i + 9 > buffer.length) return null;
      return {
        mimeType: 'image/jpeg',
        height: buffer.readUInt16BE(i + 5),
        width: buffer.readUInt16BE(i + 7),
      };
    }
    i += 2 + length;
  }
  return null;
}

// Album art must be a square between 600 and 800 pixels; larger crops are scaled down in the browser.
export function validateAlbumArtwork(buffer: Buffer): { mimeType: string; data: Buffer<ArrayBuffer> } {
  const info = readImageInfo(buffer);
  if (!info) throw new BadRequestException('Artwork must be a JPG or PNG image');
  if (info.width !== info.height) throw new BadRequestException('Artwork must be square');
  if (info.width < ARTWORK_MIN_SIZE) {
    throw new BadRequestException(`Artwork must be at least ${ARTWORK_MIN_SIZE}x${ARTWORK_MIN_SIZE} pixels`);
  }
  if (info.width > ARTWORK_MAX_SIZE) {
    throw new BadRequestException(`Artwork must be at most ${ARTWORK_MAX_SIZE}x${ARTWORK_MAX_SIZE} pixels`);
  }
  return { mimeType: info.mimeType, data: Buffer.from(buffer) };
}
