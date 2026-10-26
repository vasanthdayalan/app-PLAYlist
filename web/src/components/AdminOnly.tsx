import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '../lib/admin-store';

// Route guard for admin-only pages. Normal users are sent home.
export function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
