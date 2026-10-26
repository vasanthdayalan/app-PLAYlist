import { useState } from 'react';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

interface YearPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Decade grid year picker. The value stays a string so it matches the form state.
export function YearPicker({ value, onChange, className }: YearPickerProps) {
  const selected = value === '' ? NaN : Number(value);
  const [open, setOpen] = useState(false);
  const [decade, setDecade] = useState(() => Math.floor((Number.isInteger(selected) ? selected : MAX_YEAR) / 10) * 10);

  const toggle = () => {
    if (!open) setDecade(Math.floor((Number.isInteger(selected) ? selected : MAX_YEAR) / 10) * 10);
    setOpen(!open);
  };

  const years = Array.from({ length: 10 }, (_, i) => decade + i).filter((y) => y >= MIN_YEAR && y <= MAX_YEAR);

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} className={className}>
        {value || 'Select year'}
      </button>
      {open && (
        <div role="dialog" aria-label="Pick year" className="absolute z-20 mt-1 w-64 rounded border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous decade"
              onClick={() => setDecade((d) => Math.max(MIN_YEAR, d - 10))}
              disabled={decade <= MIN_YEAR}
              className="rounded px-3 py-1 text-neutral-100 hover:bg-neutral-800 disabled:opacity-30"
            >
              «
            </button>
            <span className="text-sm font-semibold">
              {decade}–{decade + 9}
            </span>
            <button
              type="button"
              aria-label="Next decade"
              onClick={() => setDecade((d) => Math.min(MAX_YEAR - 9, d + 10))}
              disabled={decade >= MAX_YEAR - 9}
              className="rounded px-3 py-1 text-neutral-100 hover:bg-neutral-800 disabled:opacity-30"
            >
              »
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(String(y));
                  setOpen(false);
                }}
                aria-pressed={y === selected}
                className={`rounded px-2 py-2 text-sm ${y === selected ? 'bg-neutral-100 font-semibold text-neutral-900' : 'text-neutral-200 hover:bg-neutral-800'}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
