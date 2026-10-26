import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ItunesQueryDto } from './itunes.dto.js';

const ITUNES_URL = 'https://itunes.apple.com/search';
const TIMEOUT_MS = 8000;

export interface ItunesSongMatch {
  trackName: string | null;
  collectionName: string | null;
  artistName: string | null;
  releaseDate: string | null;
  primaryGenreName: string | null;
}

interface ItunesResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
}

const MAX_MATCHES = 3;

// Copy-only lookup (SCH-1 to SCH-4): the results are shown for reference and never saved.
@Injectable()
export class ItunesService {
  async searchTop(query: ItunesQueryDto): Promise<{ matches: ItunesSongMatch[]; resultCount: number }> {
    const terms = [query.trackName, query.album, query.artist]
      .map((term) => term?.trim())
      .filter((term): term is string => Boolean(term));
    if (terms.length === 0) {
      throw new BadRequestException('Enter at least one of track name, album, or artist');
    }

    const url = new URL(ITUNES_URL);
    url.searchParams.set('term', terms.join(' '));
    url.searchParams.set('media', 'music');
    url.searchParams.set('entity', 'song');
    url.searchParams.set('country', 'IN');
    url.searchParams.set('limit', String(MAX_MATCHES));

    let body: { resultCount?: number; results?: ItunesResult[] };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      body = (await response.json()) as typeof body;
    } catch {
      throw new ServiceUnavailableException({
        code: 'ITUNES_UNAVAILABLE',
        message: 'iTunes search is not available right now. You can still enter the track manually.',
      });
    }

    return {
      resultCount: body.resultCount ?? body.results?.length ?? 0,
      matches: (body.results ?? []).slice(0, MAX_MATCHES).map((item) => ({
        trackName: item.trackName ?? null,
        collectionName: item.collectionName ?? null,
        artistName: item.artistName ?? null,
        releaseDate: item.releaseDate ?? null,
        primaryGenreName: item.primaryGenreName ?? null,
      })),
    };
  }
}

