import { useEffect, useState } from 'react';

/**
 * Reads a media query in React. Starts `false` on the server and syncs on mount,
 * which keeps hydration deterministic — anything that must be correct before the
 * first paint belongs in CSS, not here.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);

    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
