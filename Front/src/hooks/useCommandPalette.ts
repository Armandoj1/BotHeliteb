import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';

import { NAV_ITEMS } from '@/constants/navigation';
import type { INavItem } from '@/types';
import { normalizeText } from '@/utils/collection';
import { useKeyboardShortcut } from './useKeyboardShortcut';

export interface ICommandPaletteState {
  open: boolean;
  query: string;
  results: readonly INavItem[];
  activeIndex: number;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  select: (item: INavItem) => void;
}

/** Owns every behaviour of the ⌘K palette; the component only renders. */
export function useCommandPalette(): ICommandPaletteState {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useKeyboardShortcut('k', () => setOpen((previous) => !previous), { meta: true, allowInInputs: true });

  const results = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return NAV_ITEMS;

    return NAV_ITEMS.filter(
      (item) =>
        normalizeText(item.label).includes(needle) ||
        normalizeText(item.description).includes(needle),
    );
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const select = useCallback((item: INavItem) => {
    setOpen(false);
    window.location.assign(item.href);
  }, []);

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % results.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + results.length) % results.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const item = results[activeIndex];
        if (item) select(item);
      }
    },
    [results, activeIndex, select],
  );

  return { open, query, results, activeIndex, setOpen, setQuery, onInputKeyDown, select };
}
