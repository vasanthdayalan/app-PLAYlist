#!/usr/bin/env node
// Exports the PLAYlist PostgreSQL library into a read-only SQLite file
// (library.db) consumed by the Android dashboard app.
//
// Usage: npm run export -- [output-path]
// DATABASE_URL is read from the environment, falling back to server/.env.

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import pg from 'pg';
import sharp from 'sharp';

const SCHEMA_VERSION = 1;
const THUMB_SIZE = 300;
const THUMB_QUALITY = 82;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const outPath = resolve(process.argv[2] ?? join(here, 'out', 'library.db'));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = join(repoRoot, 'server', '.env');
  if (!existsSync(envPath)) {
    throw new Error('DATABASE_URL is not set and server/.env was not found');
  }
  const line = readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL missing from server/.env');
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

const SQLITE_SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE languages (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE albums (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  year            INTEGER NOT NULL
);
CREATE TABLE album_artwork (
  album_id  INTEGER PRIMARY KEY REFERENCES albums(id),
  mime_type TEXT NOT NULL,
  data      BLOB NOT NULL
);
CREATE TABLE people (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL
);
CREATE TABLE person_roles (
  person_id INTEGER NOT NULL REFERENCES people(id),
  role      TEXT NOT NULL,
  PRIMARY KEY (person_id, role)
);
CREATE TABLE tracks (
  id                    INTEGER PRIMARY KEY,
  type                  TEXT NOT NULL,
  album_id              INTEGER NOT NULL REFERENCES albums(id),
  language_id           INTEGER NOT NULL REFERENCES languages(id),
  track_name            TEXT NOT NULL,
  normalized_track_name TEXT NOT NULL,
  year                  INTEGER NOT NULL,
  favorite              INTEGER NOT NULL,
  archived              INTEGER NOT NULL,
  duration_seconds      INTEGER,
  created_at            TEXT NOT NULL
);
CREATE TABLE track_people (
  track_id  INTEGER NOT NULL REFERENCES tracks(id),
  person_id INTEGER NOT NULL REFERENCES people(id),
  role      TEXT NOT NULL,
  position  INTEGER NOT NULL,
  PRIMARY KEY (track_id, person_id, role)
);
CREATE INDEX idx_tracks_album ON tracks(album_id);
CREATE INDEX idx_tracks_language ON tracks(language_id);
CREATE INDEX idx_tracks_year ON tracks(year);
CREATE INDEX idx_track_people_person ON track_people(person_id);
CREATE VIRTUAL TABLE search_index USING fts4(kind, ref_id, text);
`;

async function makeThumbnail(data) {
  return sharp(data)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .flatten({ background: '#000000' })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();
}

async function main() {
  const pool = new pg.Pool({ connectionString: loadDatabaseUrl(), max: 4 });

  mkdirSync(dirname(outPath), { recursive: true });
  const tmpPath = `${outPath}.tmp`;
  rmSync(tmpPath, { force: true });
  const db = new Database(tmpPath);

  try {
    console.log('Reading PostgreSQL…');
    const [languages, albums, artwork, people, personRoles, tracks, trackPeople] =
      await Promise.all([
        pool.query('SELECT id, name FROM languages ORDER BY id'),
        pool.query('SELECT id, name, normalized_name, year FROM albums ORDER BY id'),
        pool.query('SELECT album_id, data FROM album_artwork'),
        pool.query('SELECT id, name, normalized_name FROM people ORDER BY id'),
        pool.query('SELECT person_id, role::text AS role FROM person_roles'),
        pool.query(`
          SELECT id, type::text AS type, album_id, language_id, track_name,
                 normalized_track_name, year, favorite, archived, duration_seconds,
                 created_at
          FROM tracks ORDER BY id`),
        pool.query('SELECT track_id, person_id, role::text AS role, position FROM track_people'),
      ]);

    const albumById = new Map(albums.rows.map((a) => [a.id, a]));
    const personById = new Map(people.rows.map((p) => [p.id, p]));

    const creditsByTrack = new Map();
    for (const row of trackPeople.rows) {
      const names = creditsByTrack.get(row.track_id) ?? [];
      names.push(personById.get(row.person_id)?.name ?? '');
      creditsByTrack.set(row.track_id, names);
    }

    db.exec(SQLITE_SCHEMA);

    const insertLanguage = db.prepare('INSERT INTO languages (id, name) VALUES (?, ?)');
    const insertAlbum = db.prepare(
      'INSERT INTO albums (id, name, normalized_name, year) VALUES (?, ?, ?, ?)',
    );
    const insertPerson = db.prepare(
      'INSERT INTO people (id, name, normalized_name) VALUES (?, ?, ?)',
    );
    const insertPersonRole = db.prepare('INSERT INTO person_roles (person_id, role) VALUES (?, ?)');
    const insertTrack = db.prepare(`
      INSERT INTO tracks (id, type, album_id, language_id, track_name, normalized_track_name,
                          year, favorite, archived, duration_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertTrackPerson = db.prepare(
      'INSERT INTO track_people (track_id, person_id, role, position) VALUES (?, ?, ?, ?)',
    );
    const insertSearch = db.prepare('INSERT INTO search_index (kind, ref_id, text) VALUES (?, ?, ?)');

    console.log('Writing SQLite…');
    db.transaction(() => {
      for (const row of languages.rows) insertLanguage.run(row.id, row.name);

      for (const row of albums.rows) {
        insertAlbum.run(row.id, row.name, row.normalized_name, row.year);
        insertSearch.run('album', String(row.id), row.name);
      }

      for (const row of people.rows) {
        insertPerson.run(row.id, row.name, row.normalized_name);
        insertSearch.run('person', String(row.id), row.name);
      }
      for (const row of personRoles.rows) insertPersonRole.run(row.person_id, row.role);

      for (const row of tracks.rows) {
        insertTrack.run(
          row.id,
          row.type,
          row.album_id,
          row.language_id,
          row.track_name,
          row.normalized_track_name,
          row.year,
          row.favorite ? 1 : 0,
          row.archived ? 1 : 0,
          row.duration_seconds,
          row.created_at.toISOString(),
        );
        const albumName = albumById.get(row.album_id)?.name ?? '';
        const credits = (creditsByTrack.get(row.id) ?? []).join(' ');
        insertSearch.run('track', String(row.id), `${row.track_name} ${albumName} ${credits}`);
      }

      for (const row of trackPeople.rows) {
        insertTrackPerson.run(row.track_id, row.person_id, row.role, row.position);
      }
    })();

    console.log(`Generating ${THUMB_SIZE}px artwork thumbnails…`);
    const insertArtwork = db.prepare(
      'INSERT INTO album_artwork (album_id, mime_type, data) VALUES (?, ?, ?)',
    );
    for (const row of artwork.rows) {
      const thumb = await makeThumbnail(row.data);
      insertArtwork.run(row.album_id, 'image/jpeg', thumb);
    }

    const counts = {
      tracks: tracks.rowCount,
      albums: albums.rowCount,
      people: people.rowCount,
      languages: languages.rowCount,
      artwork: artwork.rowCount,
    };
    const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    db.transaction(() => {
      insertMeta.run('schema_version', String(SCHEMA_VERSION));
      insertMeta.run('exported_at', new Date().toISOString());
      for (const [key, value] of Object.entries(counts)) {
        insertMeta.run(`count_${key}`, String(value));
      }
    })();
    db.pragma(`user_version = ${SCHEMA_VERSION}`);

    db.exec('VACUUM');
    db.close();
    rmSync(outPath, { force: true });
    await rename(tmpPath, outPath);

    console.log(`Done: ${outPath}`);
    console.log(
      `  tracks=${counts.tracks} albums=${counts.albums} people=${counts.people} ` +
        `languages=${counts.languages} artwork=${counts.artwork}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
