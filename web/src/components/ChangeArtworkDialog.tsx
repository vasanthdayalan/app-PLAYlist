import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useChangeAlbumArtwork } from '../lib/queries';
import { ApiError } from '../lib/api';

const MIN_SIZE = 600;
const MAX_OUTPUT = 800;
const PREVIEW_MAX = 400;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

interface Crop {
  x: number;
  y: number;
  size: number;
}

interface ChangeArtworkDialogProps {
  albumId: number;
  onClose: () => void;
}

// Crop is in source-image pixels; the preview is only scaled for display.
export function ChangeArtworkDialog({ albumId, onClose }: ChangeArtworkDialogProps) {
  const upload = useChangeAlbumArtwork();
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  // Revoke the object URL when the selected file changes or the dialog closes.
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const onFileChosen = (chosen: File | undefined) => {
    setError(null);
    setImage(null);
    setCrop(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(chosen.type)) {
      setFile(null);
      setError('Choose a JPG or PNG image.');
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(chosen);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const shorter = Math.min(img.naturalWidth, img.naturalHeight);
      if (shorter < MIN_SIZE) {
        setFile(null);
        setError(`Image must be at least ${MIN_SIZE}x${MIN_SIZE} pixels (this one is ${img.naturalWidth}x${img.naturalHeight}).`);
        return;
      }
      setFile(chosen);
      setImage(img);
      setCrop({
        size: shorter,
        x: (img.naturalWidth - shorter) / 2,
        y: (img.naturalHeight - shorter) / 2,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFile(null);
      setError('That file could not be read as an image.');
    };
    img.src = objectUrl;
  };

  if (!image || !crop || !file) {
    return (
      <Overlay onClose={onClose}>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="rounded border border-neutral-600 bg-neutral-800 px-3 py-1 text-sm text-neutral-100 hover:border-neutral-400">
            Choose image
          </span>
          <span className="text-sm text-neutral-400">{file ? file.name : 'No file chosen'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => onFileChosen(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-neutral-400">JPG or PNG, at least 600x600 pixels, up to 10 MB.</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Actions onCancel={onClose} />
      </Overlay>
    );
  }

  const shorter = Math.min(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(PREVIEW_MAX / image.naturalWidth, PREVIEW_MAX / image.naturalHeight);
  const previewWidth = image.naturalWidth * scale;
  const previewHeight = image.naturalHeight * scale;

  const setCropClamped = (next: Crop) => {
    const size = Math.min(Math.max(next.size, MIN_SIZE), shorter);
    const x = Math.min(Math.max(next.x, 0), image.naturalWidth - size);
    const y = Math.min(Math.max(next.y, 0), image.naturalHeight - size);
    setCrop({ size, x, y });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: crop.x, y: crop.y };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    setCropClamped({
      size: crop.size,
      x: start.x + (event.clientX - start.pointerX) / scale,
      y: start.y + (event.clientY - start.pointerY) / scale,
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const onSave = () => {
    const outputSize = Math.min(crop.size, MAX_OUTPUT);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Your browser could not prepare the image.');
      return;
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, outputSize, outputSize);
    const type = file.type;
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Your browser could not prepare the image.');
          return;
        }
        upload.mutate(
          { albumId, file: blob },
          {
            onSuccess: onClose,
            onError: (err) => setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.'),
          },
        );
      },
      type,
      0.92,
    );
  };

  return (
    <Overlay onClose={onClose}>
      <div className="relative select-none touch-none overflow-hidden" style={{ width: previewWidth, height: previewHeight }}>
        <img src={url ?? undefined} alt="" draggable={false} className="block h-full w-full" />
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div
          role="presentation"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute cursor-move border-2 border-white bg-transparent"
          style={{
            left: crop.x * scale,
            top: crop.y * scale,
            width: crop.size * scale,
            height: crop.size * scale,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-400">
        Crop size
        <input
          type="range"
          min={MIN_SIZE}
          max={shorter}
          step={1}
          value={crop.size}
          onChange={(event) => {
            const size = Number(event.target.value);
            setCropClamped({ size, x: crop.x + (crop.size - size) / 2, y: crop.y + (crop.size - size) / 2 });
          }}
          className="flex-1"
        />
      </label>
      <p className="text-xs text-neutral-400">
        Drag the box to choose the area. Saved as {Math.min(crop.size, MAX_OUTPUT)}x{Math.min(crop.size, MAX_OUTPUT)} pixels.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Actions onCancel={onClose} onSave={onSave} saving={upload.isPending} />
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Change artwork" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-full space-y-3 overflow-auto rounded-lg bg-neutral-900 p-4" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-base font-semibold">Change artwork</h2>
        {children}
      </div>
    </div>
  );
}

function Actions({ onCancel, onSave, saving }: { onCancel: () => void; onSave?: () => void; saving?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded px-3 py-1 text-sm text-neutral-300 hover:text-white">
        Cancel
      </button>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save artwork'}
        </button>
      )}
    </div>
  );
}
