import type { QueueItem } from './player-store';
import { artistNames, trackSubtitle } from '../lib/format';
import type { TrackView } from '../lib/types';

export function toQueueItem(track: TrackView): QueueItem {
  return {
    trackId: track.id,
    title: track.trackName,
    subtitle: trackSubtitle(track),
    album: track.album.name,
    artists: artistNames(track),
  };
}
