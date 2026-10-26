# Requirements: PLAYlist (Music Library and Player)

Status: Draft. Items marked **(open)** still need a decision.

## 1. Overview

A web app to manage a personal music library. Users add tracks with metadata, upload audio files, organize tracks into playlists, and play them in a browser player.

This app replaces the earlier `app-music-playlist` project (Express, plain HTML, PostgreSQL). It keeps that app's features and adds the items listed below.

## 2. Goals

- Let a user build and maintain a library without editing files by hand.
- Play uploaded tracks in the browser with a persistent queue.
- Keep the codebase modular and testable.

## 3. Users

- **Single user:** one owner runs the app locally and manages the library and playlists. There are no accounts (section 4.7).

## 4. Functional Requirements

### 4.1 Library and tracks

| ID | Requirement | Priority |
|----|-------------|----------|
| LIB-1 | Create, view, edit, and delete tracks | Must |
| LIB-2 | Track fields (see 4.1.1) | Must |
| LIB-3 | Upload audio from the browser and store it at the fixed path defined in 4.1.1 | Must |
| LIB-4 | On upload, read the track length from the audio file | Must |
| LIB-5 | Album art from the audio file's embedded cover, otherwise a default music logo image. Online album art is out of scope for now. | Should |
| LIB-7 | Bulk edit and multi-select delete | Could |

#### 4.1.1 Track fields

**Mandatory**

| Field | Notes |
|-------|-------|
| Type | `movie` or `indie` |
| Album | Text |
| Track name | Text. Used as the audio file name. |
| Language | Dropdown with the fixed list in 4.11 |
| Year | Four-digit year |
| Composers | One or more people from the composers list |
| Artists | One or more people from the artists list |

**Optional**

| Field | Notes |
|-------|-------|
| Lyricists | One or more people from the lyricists list |
| Actors | One or more people from the actors list. The actors featured in the track's video. |
| Track audio | Audio file, stored at the fixed path below |

**Audio path rule**

Audio is stored at:

```text
<project>/audio/<type>/<language>/<year>/<album>/<trackName>.<extension>
```

- The path is derived from the track fields. The user does not type it.
- If any of type, language, year, album, or track name changes, the audio file moves automatically to the new path, and the stored path is updated.
- Path segments are sanitized (no `/`, `\`, `:`, and other characters invalid on common file systems).
- If the new path is already used by another track, the app shows the duplicate and does not save. The user changes the track name to make it unique, or cancels.
- A track without audio is allowed. It shows in the library but cannot be played.
- Allowed audio formats: mp3, m4a, opus. Only the file extension is checked on upload. The player must support these (see PLY-7).

#### 4.1.2 Track search for the Add Track page

The Add Track page has two panels:

- **Left:** the Add Track form.
- **Right:** Track Search, which queries the iTunes Search API and shows the result as JSON.

| ID | Requirement | Priority |
|----|-------------|----------|
| SCH-1 | Search iTunes (`media=music`, `entity=song`, `country=IN`) using any combination of track name, album, and artist | Must |
| SCH-2 | Show the top match as formatted JSON (`trackName`, `collectionName`, `artistName`, `releaseDate`, `primaryGenreName`) | Must |
| SCH-3 | The user can run further searches with changed or additional terms until the result is right | Must |
| SCH-4 | The user copies values from the JSON and pastes them into the form. The app does not auto-fill the form. | Must |
| SCH-5 | Album and track name are free text in the form. All other choice fields use dropdowns or choices.js. | Must |
| SCH-6 | Any mandatory field missing from the search result is entered manually | Must |
| SCH-7 | Search results are not stored. They are only for reference during entry. | Should |
| SCH-8 | Handle iTunes errors and empty results with a clear message, and keep the form usable | Must |

**Purpose:** The search helps the user check spelling and copy the exact names. Copied artist and composer names must match existing people in the local lists, which prevents duplicates.

**Duplicate check (for 4.1.2 entries):** Before saving, compare year, album, and track name against the library, using normalized values. If a match is found, the duplicate review in 4.1.3 applies before saving.

#### 4.1.3 Duplicate review

When a new or edited track matches an existing track on year, album, and track name (normalized), the app shows a review prompt before saving.

| ID | Requirement | Priority |
|----|-------------|----------|
| DUP-1 | Show only the existing tracks that match, not the whole library | Must |
| DUP-2 | Each matched track shows: track name, album, year, language, type, composers, artists, actors, and audio file status | Must |
| DUP-3 | Show the new entry beside the matches so the fields can be compared | Must |
| DUP-4 | Offer two actions: the user changes the track name so the entry is unique, or **Cancel**. The app does not save a duplicate. | Must |
| DUP-5 | The user can open an existing match to view or edit it, then return to the prompt | Should |
| DUP-6 | If the audio path collides with an existing track's path, show a clear message that the duplicate is not allowed | Must |
| DUP-7 | Nothing is saved until the user chooses. Cancel leaves the library unchanged. | Must |

### 4.2 People

The **Add Person** page manages composers, artists, lyricists, and actors. It replaces the old "Add Artist" page.

| ID | Requirement | Priority |
|----|-------------|----------|
| ART-1 | Maintain composers, artists, lyricists, and actors | Must |
| ART-2 | Create a person inline from the track form | Must |
| ART-3 | Person page listing that person's tracks, grouped by role (composer, artist, lyricist, actor), using the track list view in 4.8 | Must |
| ART-4 | People are created in the UI. People can be renamed on the Manage page. A person can be deleted from the Delete page or the (−) button on the People list, but not while any track (archived included) uses them. | Must |

### 4.3 Playlists

| ID | Requirement | Priority |
|----|-------------|----------|
| PL-1 | Create, rename, and delete named playlists. Stored in the database. | Must |
| PL-2 | Add and remove tracks; reorder tracks by drag and drop. A track can appear only once in a playlist; adding a track that is already there is rejected with a message. | Must |
| PL-3 | Save the current play queue as a playlist | Could |
| PL-4 | Library → Playlists lists all playlists. Selecting one opens its playlist detail page, which uses the track list view from Tracks and Search. | Must |
| PL-5 | Favorites is a fixed entry at the top of Library → Playlists. It lists tracks with the favorite flag set. It is not stored as a playlist. | Must |
| PL-6 | Playlist rename and delete are only on the playlist detail page | Must |

### 4.4 Playback

| ID | Requirement | Priority |
|----|-------------|----------|
| PLY-1 | Footer player with play, pause, seek (10 s skip), volume, and speed (0.5x to 2x) | Must |
| PLY-2 | Play queue: play one track, or add tracks to the queue | Must |
| PLY-3 | Next and previous controls | Must |
| PLY-4 | Repeat (off, all, one) | Could |
| PLY-5 | Restore the last queue and position after a page reload. The queue is per browser (see 4.10). | Could |
| PLY-6 | Player shows track name, people, and album art | Must |
| PLY-7 | Play mp3, m4a, and opus using the native HTML audio element. Upload accepts only these three formats. | Must |

### 4.5 Search and discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| SRC-1 | Quick search across track name, album, and people | Must |
| SRC-2 | Custom filter on one or more fields (contains or equals) | Should |
| SRC-3 | Advanced search fields are limited to album, track name, composer, artist, lyricist, actor, type, and language (see 4.11) | Should |
| SRC-4 | Sort and paginate results (default 100 per page) | Should |

### 4.6 Favorites and history

| ID | Requirement | Priority |
|----|-------------|----------|
| FAV-1 | Toggle a track as favorite. Stored as a flag on the track (single user). | Must |
| FAV-2 | Record recently played tracks and play counts (deferred, not in v1) | Deferred |

### 4.6a Archive (admin)

| ID | Requirement | Priority |
|----|-------------|----------|
| ARC-1 | Admin toggles a track's `archived` flag ON/OFF on the Track Detail page. | Must |
| ARC-2 | Archive is blocked (409) while the track is a favorite or in any playlist. | Must |
| ARC-3 | Archived tracks cannot be favorited or added to a playlist. | Must |
| ARC-4 | Archived tracks are hidden from lists and search in normal mode (not admin). Admin mode shows them. Direct `/tracks/:id` access is not blocked. | Must |
| ARC-5 | Unarchiving only makes the track visible again. | Must |

### 4.7 Accounts (out of scope)

The app runs locally for a single user, so there are no accounts, sign-in, or roles. Favorites and playlists belong to that one user.

| ID | Requirement | Priority |
|----|-------------|----------|
| ACC-1 | No sign-in or sign-out | Out of scope |

### 4.8 Navigation and layout

**Mobile:** bottom navigation with four tabs. The player sits just above the bar.

| Tab | Content |
|-----|---------|
| Home | Tile view of random tracks, with a "Shuffle again" action |
| Tracks | Track list, sortable by year, last added, or album. A "+" button opens Add Track. |
| Search | Default search by track name. An Advanced panel below the box adds filters on other fields. |
| Library | Add Person, Playlists |

**Desktop:** the same four items in a left sidebar, with the same content. The player sits at the bottom of the window.

| ID | Requirement | Priority |
|----|-------------|----------|
| NAV-1 | Mobile uses bottom navigation with the four tabs above | Must |
| NAV-2 | Desktop uses a sidebar with the same four items | Must |
| NAV-3 | Player is above the bottom bar on mobile and at the bottom on desktop. One player component with two layouts. | Must |
| NAV-4 | Add Track is opened from the "+" button on the Tracks tab. It is not a navigation item. | Must |
| NAV-5 | Tracks can be sorted by year, last added, or album | Should |
| NAV-6 | Home shows random tiles and a "Shuffle again" action | Should |
| NAV-7 | Search defaults to track name. Advanced panel offers only the fields in 4.11. | Must |
| NAV-8 | Library contains Add Person and the Playlists view | Must || NAV-10 | Desktop and mobile share the same components and data. Only the layout changes. | Must |
| NAV-11 | Empty lists (search results, Favorites, playlists, and other track lists) show "No records" | Must |

**Track list:** each row shows track name, artists, and album · year · language. Type, composers, lyricists, actors, and audio status appear only on the track detail page.

### 4.9 Track actions and albums

**Track row actions:** each track row (and the player) has a heart and a 3-dot menu.

| ID | Requirement | Priority |
|----|-------------|----------|
| ACT-1 | Heart toggles the track's favorite flag (FAV-1) | Must |
| ACT-2 | Heart is also on the player for the current track | Must |
| ACT-3 | 3-dot menu items: **Play Now**, **Add to Queue**, **Save to Playlist**, **Go to Album** | Must |
| ACT-4 | **Play Now** plays the track immediately and replaces the current queue | Must |
| ACT-5 | **Add to Queue** adds the track to the end of the queue. The user can use it as "Play Next" by moving the track in the queue. | Must |
| ACT-6 | **Save to Playlist** is in the 3-dot menu of track lists and the Track Detail page. It lists "New Playlist…" at the top, then existing playlists | Must |
| ACT-7 | **Go to Album** opens the album page | Must |
| ACT-8 | The menu appears on track rows in Tracks, Home, Search results, Album page, Person page, Playlist detail page, Favorites, the player queue, and the Track Detail page | Must |

**Favorites:** shown as the top entry under Library → Playlists (PL-5). It is generated from the favorite flag and has no separate storage (FAV-1).

**Albums:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ALB-1 | Each album has an album ID. Tracks reference the album by ID, not free text. | Must |
| ALB-2 | Album page shows album name, album year, and its tracks | Must |
| ALB-3 | Album names are typed in the form (free text). A track whose album name and album year match an existing album links to that album. A new name+year creates an album record. | Must |
| ALB-4 | Album is unique on year + normalized album name. The same name in different years is a different album with its own album ID. Each album ID maps to one album page, so the page can always be reached from a track's album ID. | Must |
| ALB-6 | Album year is not a separate input. It equals the track year (single Year field, 1900 to 2100). It is part of the album's identity (ALB-4). | Must |
| ALB-4a | Duplicate check (year, album, track name) compares the track year, the album's normalized name, and the normalized track name | Must |
| ALB-7 | When an audio file with an embedded picture is saved, its cover art is stored with the track and shown on Home tiles, track lists, the Player, and Track Detail. Tracks without art show a neutral glyph. | Must |
| ALB-8 | Uploading a new audio file replaces the stored art (or clears it if the new file has none). Metadata-only edits keep the art. Deleting a track deletes its art. | Must |
| ALB-5 | The album page is reached from the Track Detail page or the track 3-dot menu (**Go to Album**). There is no album list page. | Must |

## 4.10 Data model

Tables are created by versioned migrations (NFR-9).

**Normalization rule:** Every `normalized_*` column is built the same way. Convert to lowercase, remove accents and diacritics, remove punctuation, collapse repeated spaces, and trim both ends. Used for:
- **Duplicate checks (4.1.3):** the key is year + normalized album + normalized track name, joined at check time.
- **Uniqueness:** `people.normalized_name` is unique, so one person can't be created twice with different casing or punctuation.
- **Matching:** names copied from the iTunes result are matched to existing people by normalized name.

This does not catch different spellings (for example, "Abhyankkar" and "Abhyankar"). That needs an alias table, which is not yet in scope.

| Table | Columns | Notes |
|-------|---------|-------|
| `languages` | `id`, `name` (unique) | Language dropdown source |
| `albums` | `id`, `name`, `normalized_name`, `year` (1900 to 2100, equals track year). Unique on (`normalized_name`, `year`) | Album ID (ALB-1, ALB-4, ALB-6) |
| `people` | `id`, `name`, `normalized_name` (unique) | One row per person |
| `person_roles` | `person_id`, `role` (composer, artist, lyricist, actor) | A person can have one or more roles. Controls which dropdowns list them. |
| `tracks` | `id`, `type` (movie/indie, required), `album_id` (FK), `language_id` (FK), `track_name`, `normalized_track_name`, `year`, `favorite` (bool), `duration_seconds` (from file), `audio_path` (nullable, unique, relative to the audio root, includes file extension), `created_at`, `updated_at` | Duplicate key: year + normalized album + normalized track name |
| `album_artwork` | `album_id` (PK, FK cascade), `mime_type`, `data` (bytes) | Cover picture embedded in the audio file, owned by the album. Kept apart from `albums` so list queries stay light. Replaced when a track with new art is uploaded. Kept while the album has at least one track (with or without audio). Removed with the album when its last track is deleted. |
| `track_people` | `track_id`, `person_id`, `role`, `position` | Role per track: composer, artist, lyricist, or actor. Primary key: track_id, person_id, role. |
| `playlists` | `id`, `name`, `created_at` | PL-1 |
| `playlist_tracks` | `playlist_id`, `track_id`, `position` | PL-2 ordering. Primary key: playlist_id, track_id (no duplicate tracks in one playlist). Unique: playlist_id, position. |

**Not stored in the database:**
- **Play queue (PLY-5):** Kept per browser, in the browser's local storage. Each device (laptop, phone) has its own queue and playback. Playing on two devices at once is allowed. The two players do not sync. Because the library (tracks, playlists, favorites) lives in the database, both devices always see the same data.

**Deferred:**
- **Play history (FAV-2):** Not in v1. Would need a `play_history` table later.

## 4.11 Edit, delete, detail, search, and storage rules

**Editing a track**
- If type, language, year, album, or track name changes, the duplicate check runs first. If a duplicate is found, the save is blocked (see 4.1.3). If not, the audio file moves to the new path and the stored path is updated.
- Editing uses the same fields and layout as Add Track.

**Deleting**
- Deleting a track removes its row, its `track_people` and `playlist_tracks` rows, and its audio file. If the track is in the play queue, it is removed from the queue too. No other table or queue entry is left pointing at it.
- A person, album, or language that is used by any track cannot be deleted. The app shows which tracks use it.
- Playlists can be created, renamed, edited, and deleted as usual. Deleting a playlist does not delete its tracks.

**Languages**
- Fixed list: Tamil, English, Malayalam, Telugu, Kannada, Hindi, Spanish, Korean, Others. Seeded into `languages` and not editable in v1.
- Language is always chosen from this dropdown. Free text is not allowed, including for Others.

**Track detail page**
- Shows type, language, year, album, track name, composers, artists, lyricists, and actors.
- Has the heart and 3-dot menu (ACT-1 to ACT-8).
- Links to the album and to each person (composers, artists, lyricists, actors).
- The player stays at the bottom when a track is playing.

**Album page**
- Header: album name and (album year).
- A Play button next to the name and year adds all album tracks to the queue and starts playing.
- Track list below the header, using the same track list view as Tracks and Search.

**Missing or broken audio**
- If the user selects Play on a track whose file is missing or cannot be played, the app shows a prompt to edit the track.

**Upload rules**
- Allowed audio file extensions: mp3, m4a, opus. Only the extension is checked.

**Advanced search fields**
- Only these fields: album, track name, composer, artist, lyricist, actor, type (movie/indie dropdown), and language (dropdown of languages from the database).

**Person page**
- Lists the person's tracks, grouped by role: composer, artist, lyricist, actor. Uses the same track list view as Tracks and Search.

**Storage**
- Audio files stay in the local app folder on the laptop. The phone accesses them through the browser over the local network.
- The server must listen on the local network address, not only localhost.

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Configuration through environment variables; no secrets in source |
| NFR-2 | Validate all API input and return consistent error responses |
| NFR-3 | Multi-row writes (playlist reorder) run in a transaction |
| NFR-4 | Uploads are limited by audio extension (4.11) and size |
| NFR-5 | Automated tests for the API and core UI flows |
| NFR-6 | Health check endpoint and structured logging |
| NFR-7 | Runs locally with Docker Compose (app and PostgreSQL) |
| NFR-8 | No server-side side effects on startup (the old app rewrote `mp3paths.json`) |
| NFR-9 | Database schema managed by versioned migrations |

## 6. Out of Scope (for now)

- Streaming from external services (Spotify, Apple Music, and so on)
- Mobile apps
- Social features (sharing, following)
- Audio transcoding
- Authentication. The app is single-user and local, so phone access over the LAN needs no login.

## 7. Open Decisions

**Decided:**
- Single local user, no accounts (4.7). Phone access over the LAN needs no login.
- Playlists are a v1 feature (4.3), stored in the database.
- Audio is stored in a local folder at the fixed path (4.1.1).
- Track fields, the language dropdown, and the audio extensions (4.1.1, 4.11).
- Duplicates block the save. The user changes the track name or cancels (4.1.3).
- No file hash check, no ID3 pre-fill. Album art comes from the embedded cover, otherwise a default music logo.
- Shuffle is not in playback. Home has a "Shuffle again" tile action. Play history is deferred (FAV-2).
- Favorites appear under Library → Playlists (PL-5).
- Person, album, and playlist detail pages use the track list view (4.8).
- Import and export are removed from v1.

**Open:**
- None.

## 8. Migration from the Previous App

Not required. The previous data and MP3 files are not migrated.

## 9. Architecture

**Stack (confirmed)**
- Backend: NestJS (TypeScript), PostgreSQL, Prisma (versioned migrations, NFR-9).
- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- Server state: TanStack Query. Player state: Zustand. Player: native `<audio>` element.
- Uploads: multer. Duration and embedded cover: music-metadata.
- Validation: Nest pipes with class-validator (NFR-2).
- Tests: Vitest (units), supertest (API), Playwright (UI flows) (NFR-5).
- Runtime: Docker Compose with the app and PostgreSQL (NFR-7).

**Repository layout (one repo)**
```
app-PLAYlist/
  server/            NestJS app, Prisma schema and migrations
  web/               React + Vite app (built and served by the server)
  audio/             Local audio root (bind mount, not committed)
  docker-compose.yml
  REQUIREMENTS.md
```

**Server modules**
- `tracks`, `people`, `albums`, `languages`, `playlists`, `favorites`, `search`, `itunes` (server proxy for the iTunes Search API), `audio` (upload, file storage, and streaming with HTTP Range support).
- Each module has a controller, a service, and a repository.
- API responses are shaped for the web UI. The server may return any shape that serves the screens in section 4 (for example, people grouped by role, and track lists ready for the list view). The shape does not have to mirror the database.
- Shared helpers: normalization (4.10) and audio path building (4.1.1), used by the duplicate check and the file rules.

**Serving**
- The server serves the built web app and the API on one port, bound to the LAN address, so the phone uses one URL.

**Play queue (decided)**
- Per browser, stored in the browser's local storage (PLY-5, 4.10).
- Each device plays independently. Library data is shared through the database. No server-side queue and no sync between devices in v1.
