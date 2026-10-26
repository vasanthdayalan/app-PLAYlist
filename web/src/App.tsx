import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TracksPage } from './pages/TracksPage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { TrackFormPage } from './pages/TrackFormPage';
import { TrackDetailPage } from './pages/TrackDetailPage';
import { AlbumPage } from './pages/AlbumPage';
import { PersonPage } from './pages/PersonPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { AddPersonPage } from './pages/AddPersonPage';
import { DeletePersonPage } from './pages/DeletePersonPage';
import { ManagePeoplePage } from './pages/ManagePeoplePage';
import { PeoplePage } from './pages/PeoplePage';
import { Player } from './player/Player';
import { AdminModeControl } from './components/AdminModeControl';
import { AdminOnly } from './components/AdminOnly';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/tracks', label: 'Tracks' },
  { to: '/search', label: 'Search' },
  { to: '/people', label: 'People' },
  { to: '/library', label: 'Library' },
];

export default function App() {

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 md:flex">
      <aside className="hidden md:flex md:w-56 md:flex-col gap-1 border-r border-neutral-700 bg-neutral-800 p-4">
        <Link to="/" className="mb-4 border-b border-neutral-700 pb-3 text-lg font-semibold hover:text-white">PLAYlist</Link>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
            {item.label}
          </NavLink>
        ))}
        <div className="mt-auto border-t border-neutral-700 pt-3">
          <AdminModeControl />
        </div>
      </aside>

      <main className="flex-1 p-4 pb-[calc(var(--player-h,0px)+3.5rem)] md:pb-[calc(var(--player-h,0px)+2rem)]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/tracks/new" element={<AdminOnly><TrackFormPage /></AdminOnly>} />
          <Route path="/tracks/:id" element={<TrackDetailPage />} />
          <Route path="/tracks/:id/edit" element={<AdminOnly><TrackFormPage /></AdminOnly>} />
          <Route path="/albums/:id" element={<AlbumPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/new" element={<AdminOnly><AddPersonPage /></AdminOnly>} />
          <Route path="/people/manage" element={<AdminOnly><ManagePeoplePage /></AdminOnly>} />
          <Route path="/people/delete" element={<AdminOnly><DeletePersonPage /></AdminOnly>} />
          <Route path="/people/:id" element={<PersonPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/favorites" element={<FavoritesPage />} />
          <Route path="/library/playlists/:id" element={<PlaylistPage />} />
        </Routes>
      </main>

      <Player />

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-800 bg-neutral-950 p-2 md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}


function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-neutral-700 font-semibold text-white' : 'text-neutral-300 hover:bg-neutral-800'}`;
}
