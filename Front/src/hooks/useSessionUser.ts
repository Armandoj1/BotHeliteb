import { useEffect, useState } from 'react';

import { readSession } from '@/services/auth.service';
import type { IUser } from '@/types';

/**
 * The signed-in advisor, read from the session the API issued at login.
 *
 * Starts `null` because the session lives in `localStorage` and the shell is
 * server-rendered: showing a placeholder for one frame is correct, inventing a
 * user is not.
 */
export function useSessionUser(): IUser | null {
  const [user, setUser] = useState<IUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(readSession()?.user ?? null);

    sync();
    document.addEventListener('astro:page-load', sync);
    return () => document.removeEventListener('astro:page-load', sync);
  }, []);

  return user;
}
