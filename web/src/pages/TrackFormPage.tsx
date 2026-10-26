import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ItunesPanel, type ItunesFill } from '../components/ItunesPanel';
import { PeoplePicker } from '../components/PeoplePicker';
import { YearPicker } from '../components/YearPicker';
import { ApiError } from '../lib/api';
import { useLanguages, useSaveTrack, useTrack, type TrackMetadata } from '../lib/queries';
import type { PersonRef, TrackType, TrackView } from '../lib/types';

const DEFAULT_YEAR = String(new Date().getFullYear());

interface FormState {
  type: TrackType;
  languageId: string;
  album: string;
  trackName: string;
  year: string;
  composers: PersonRef[];
  artists: PersonRef[];
  lyricists: PersonRef[];
  actors: PersonRef[];
}

// Add Track (/tracks/new) and Edit Track (/tracks/:id/edit) share this layout (4.11).
export function TrackFormPage() {
  const { id } = useParams();
  const trackId = id === undefined ? undefined : Number(id);
  const track = useTrack(trackId ?? 0);

  if (trackId !== undefined) {
    if (track.isLoading) return <p className="text-neutral-500">Loading…</p>;
    if (!track.data) return <p className="text-neutral-500">Track not found.</p>;
    return <TrackForm key={track.data.id} trackId={trackId} initial={track.data} />;
  }
  return <TrackForm />;
}

function toInitial(track?: TrackView): FormState {
  return {
    type: track?.type ?? 'movie',
    languageId: track ? String(track.language.id) : '',
    album: track?.album.name ?? '',
    trackName: track?.trackName ?? '',
    year: track ? String(track.year) : DEFAULT_YEAR,
    composers: track?.people.composers ?? [],
    artists: track?.people.artists ?? [],
    lyricists: track?.people.lyricists ?? [],
    actors: track?.people.actors ?? [],
  };
}

interface TrackFormProps {
  trackId?: number;
  initial?: TrackView;
}

function TrackForm({ trackId, initial }: TrackFormProps) {
  const navigate = useNavigate();
  const languages = useLanguages();
  const save = useSaveTrack(trackId);
  const [form, setForm] = useState<FormState>(() => toInitial(initial));
  const [file, setFile] = useState<File | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<TrackView[] | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const fill = (values: ItunesFill) => {
    setForm((prev) => ({
      ...prev,
      trackName: values.trackName ?? prev.trackName,
      album: values.album ?? prev.album,
      year: values.year ? String(values.year) : prev.year,
    }));
  };

  const submit = () => {
    setError(null);
    setDuplicates(null);
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    const metadata: TrackMetadata = {
      type: form.type,
      album: form.album.trim(),
      albumYear: Number(form.year),
      trackName: form.trackName.trim(),
      languageId: Number(form.languageId),
      year: Number(form.year),
      composerIds: form.composers.map((p) => p.id),
      artistIds: form.artists.map((p) => p.id),
      lyricistIds: form.lyricists.map((p) => p.id),
      actorIds: form.actors.map((p) => p.id),
    };
    save.mutate(
      { metadata, file, removeAudio },
      {
        onSuccess: (saved) => navigate(`/tracks/${saved.id}`),
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'DUPLICATE_TRACK') {
            setDuplicates((err.details as { matches?: TrackView[] } | undefined)?.matches ?? []);
            return;
          }
          setError(describeError(err));
        },
      },
    );
  };

  const input = 'w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2';

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h1 className="text-xl font-semibold">{trackId === undefined ? 'Add Track' : 'Edit Track'}</h1>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Track name *</span>
            <input className={input} value={form.trackName} onChange={(e) => set('trackName', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Type *</span>
            <select className={input} value={form.type} onChange={(e) => set('type', e.target.value as TrackType)}>
              <option value="movie">Movie</option>
              <option value="indie">Indie</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Album *</span>
            <input className={input} value={form.album} onChange={(e) => set('album', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Year *</span>
            <YearPicker value={form.year} onChange={(y) => set('year', y)} className={`${input} text-left`} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Language *</span>
            <select className={input} value={form.languageId} onChange={(e) => set('languageId', e.target.value)}>
              <option value="">Select language</option>
              {languages.data?.map((language) => (
                <option key={language.id} value={language.id}>{language.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PeoplePicker label="Composer *" role="composer" selected={form.composers} onChange={(v) => set('composers', v)} />
          <PeoplePicker label="Artist *" role="artist" selected={form.artists} onChange={(v) => set('artists', v)} />
          <PeoplePicker label="Lyricist" role="lyricist" selected={form.lyricists} onChange={(v) => set('lyricists', v)} />
          <PeoplePicker label="Actor" role="actor" selected={form.actors} onChange={(v) => set('actors', v)} />
        </div>

        <div className="space-y-2 text-sm">
          <span className="text-neutral-300">Audio file</span>
          <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-600 bg-neutral-900 px-4 py-6 text-center hover:border-neutral-400 focus-within:border-neutral-300">
            <span className="rounded bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-900">Choose file</span>
            <span className="text-neutral-400">
              {file
                ? file.name
                : removeAudio
                  ? 'Audio will be removed on save'
                  : trackId === undefined
                    ? 'No file chosen'
                    : 'Keep current file or choose a new one'}
            </span>
            <input
              type="file"
              accept=".mp3,.m4a,.opus,audio/mpeg,audio/mp4,audio/ogg"
              onChange={(e) => {
                const chosen = e.target.files?.[0] ?? null;
                setFile(chosen);
                if (chosen) setRemoveAudio(false);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {trackId !== undefined && initial?.hasAudio && !file && (
            <button
              type="button"
              onClick={() => setRemoveAudio((on) => !on)}
              className="rounded px-3 py-1 text-sm text-red-400 hover:bg-neutral-800"
            >
              {removeAudio ? 'Undo remove audio' : 'Remove audio'}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {duplicates && <DuplicatePanel matches={duplicates} />}

        <div className="flex gap-2">
          <button type="submit" disabled={save.isPending} className="rounded bg-neutral-100 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="rounded px-4 py-2 text-neutral-300 hover:bg-neutral-800">
            Cancel
          </button>
        </div>
      </form>

      <ItunesPanel
        defaults={{ trackName: form.trackName, album: form.album, artist: form.artists[0]?.name ?? '' }}
        onUse={fill}
      />
    </section>
  );
}

function DuplicatePanel({ matches }: { matches: TrackView[] }) {
  return (
    <div className="space-y-2 rounded border border-amber-600 bg-amber-950/40 p-3 text-sm">
      <p className="font-semibold text-amber-300">
        A track with the same year, album and name already exists. Change the track name so it becomes unique, or cancel.
      </p>
      <ul className="list-disc pl-5">
        {matches.map((match) => (
          <li key={match.id}>
            <Link to={`/tracks/${match.id}`} className="underline">{match.trackName}</Link>
            <span className="text-neutral-400"> — {match.album.name} · {match.year}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function validate(form: FormState): string | null {
  if (!form.trackName.trim()) return 'Track name is required.';
  if (!form.album.trim()) return 'Album is required.';
  const year = Number(form.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return 'Year must be between 1900 and 2100.';
  if (!form.languageId) return 'Language is required.';
  if (form.composers.length === 0) return 'Select at least one composer.';
  if (form.artists.length === 0) return 'Select at least one artist.';
  return null;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details)) return err.details.join(' ');
    return err.message;
  }
  return 'Could not save the track.';
}
