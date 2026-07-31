import { useEffect, useState } from 'react';

/**
 * Current route, kept in sync with Astro's client-side router.
 *
 * Shell islands are declared `transition:persist`, so they survive navigation
 * and never receive fresh props. `astro:page-load` fires on the initial render
 * and after every swap, which makes it the only reliable source of truth here.
 */
export function usePathname(initialPathname: string): string {
  const [pathname, setPathname] = useState(initialPathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);

    sync();
    document.addEventListener('astro:page-load', sync);
    return () => document.removeEventListener('astro:page-load', sync);
  }, []);

  return pathname;
}
