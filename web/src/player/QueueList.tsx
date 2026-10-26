import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { QueueItem } from './player-store';

interface QueueListProps {
  queue: QueueItem[];
  currentIndex: number;
  onJump: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (trackId: number) => void;
}

// Each row is identified by its position; the list is reordered only after a drop.
const rowId = (item: QueueItem, index: number) => `${index}-${item.trackId}`;

export function QueueList({ queue, currentIndex, onJump, onMove, onRemove }: QueueListProps) {
  // A touch must be held briefly before dragging, so scrolling the list still works.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = queue.map(rowId);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onMove(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {queue.map((item, index) => (
            <QueueRow
              key={ids[index]}
              id={ids[index]}
              item={item}
              isCurrent={index === currentIndex}
              onJump={() => onJump(index)}
              onRemove={() => onRemove(item.trackId)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface QueueRowProps {
  id: string;
  item: QueueItem;
  isCurrent: boolean;
  onJump: () => void;
  onRemove: () => void;
}

function QueueRow({ id, item, isCurrent, onJump, onRemove }: QueueRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 text-sm ${isCurrent ? 'text-green-400' : ''} ${isDragging ? 'relative z-10 rounded bg-neutral-900 opacity-80' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="flex h-11 w-9 shrink-0 touch-none cursor-grab items-center justify-center text-neutral-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <rect x="3" y="5" width="18" height="2" rx="1" />
          <rect x="3" y="11" width="18" height="2" rx="1" />
          <rect x="3" y="17" width="18" height="2" rx="1" />
        </svg>
      </button>
      <button type="button" onClick={onJump} className="min-h-11 min-w-0 flex-1 truncate text-left">
        {item.album === undefined ? (
          <span className="block truncate">
            {item.title} <span className="text-neutral-500">{item.subtitle}</span>
          </span>
        ) : (
          <>
            <span className="block truncate">
              {item.title} <span className="text-neutral-500">({item.album})</span>
            </span>
            <span className="block truncate text-xs text-neutral-400">{item.artists}</span>
          </>
        )}
      </button>
      <button type="button" aria-label="Remove from queue" onClick={onRemove} className="flex h-11 w-9 items-center justify-center text-neutral-500 hover:text-red-400">
        ✕
      </button>
    </li>
  );
}
