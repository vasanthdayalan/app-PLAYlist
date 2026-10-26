import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueueItem {
  trackId: number;
  title: string;
  subtitle: string;
  // Optional so queues saved before these fields existed still load.
  album?: string;
  artists?: string;
}

interface PlayerState {
  queue: QueueItem[];
  currentIndex: number;
  playing: boolean;
  repeat: boolean;
  toggleRepeat: () => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  addToQueue: (items: QueueItem[]) => void;
  playNow: (items: QueueItem[], startIndex?: number) => void;
  playNext: (items: QueueItem[]) => void;
  removeFromQueue: (trackId: number) => void;
  moveInQueue: (from: number, to: number) => void;
  jumpTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  setPlaying: (playing: boolean) => void;
  clearQueue: () => void;
}

// The queue lives in this browser's local storage, so each device keeps its own queue.
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: 0,
      playing: false,
      repeat: false,
      toggleRepeat: () => set((state) => ({ repeat: !state.repeat })),
      shuffle: false,
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
      addToQueue: (items) => set((state) => ({ queue: [...state.queue, ...items] })),
      playNow: (items, startIndex = 0) => set({ queue: items, currentIndex: startIndex, playing: true }),
      playNext: (items) =>
        set((state) => {
          const insertAt = state.queue.length === 0 ? 0 : state.currentIndex + 1;
          const queue = [...state.queue];
          queue.splice(insertAt, 0, ...items);
          return { queue };
        }),
      moveInQueue: (from, to) =>
        set((state) => {
          if (to < 0 || to >= state.queue.length) return state;
          const queue = [...state.queue];
          const [item] = queue.splice(from, 1);
          queue.splice(to, 0, item);
          // Keep the current index pointing at the same track.
          let currentIndex = state.currentIndex;
          if (from === state.currentIndex) currentIndex = to;
          else if (from < state.currentIndex && to >= state.currentIndex) currentIndex -= 1;
          else if (from > state.currentIndex && to <= state.currentIndex) currentIndex += 1;
          return { queue, currentIndex };
        }),
      jumpTo: (index) => set({ currentIndex: index, playing: true }),
      next: () => {
        const { currentIndex, queue, repeat, shuffle } = get();
        // With shuffle on, jump to a random later track; the queue order itself is left unchanged.
        if (shuffle && currentIndex + 1 < queue.length) {
          const offset = Math.floor(Math.random() * (queue.length - currentIndex - 1));
          set({ currentIndex: currentIndex + 1 + offset });
        } else if (currentIndex + 1 < queue.length) set({ currentIndex: currentIndex + 1 });
        else if (repeat && queue.length > 0) set({ currentIndex: 0, playing: true });
        else set({ playing: false });
      },
      previous: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
      },
      setPlaying: (playing) => set({ playing }),
      removeFromQueue: (trackId) =>
        set((state) => {
          const index = state.queue.findIndex((item) => item.trackId === trackId);
          if (index === -1) return state;
          const queue = state.queue.filter((item) => item.trackId !== trackId);
          const currentIndex =
            index < state.currentIndex ? state.currentIndex - 1 : Math.min(state.currentIndex, Math.max(queue.length - 1, 0));
          return { queue, currentIndex };
        }),
      clearQueue: () => set({ queue: [], currentIndex: 0, playing: false }),
    }),
    {
      name: 'playlist-player-queue',
      partialize: (state) => ({ queue: state.queue, currentIndex: state.currentIndex, repeat: state.repeat, shuffle: state.shuffle }),
    },
  ),
);
