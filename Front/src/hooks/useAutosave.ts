import { useEffect, useRef } from 'react';

import { AUTOSAVE_DEBOUNCE_MS } from '@/constants/app';
import { useDebouncedValue } from './useDebouncedValue';

export interface IAutosaveOptions {
  enabled: boolean;
  /** Only fires when the payload is both dirty and valid. */
  canSave: boolean;
  delayMs?: number;
}

/**
 * Fires `onSave` once the watched payload settles. Skips the very first run so
 * enabling autosave never writes data the user has not touched.
 */
export function useAutosave<T>(
  payload: T,
  onSave: (payload: T) => void,
  { enabled, canSave, delayMs = AUTOSAVE_DEBOUNCE_MS }: IAutosaveOptions,
): void {
  const debounced = useDebouncedValue(payload, delayMs);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (!enabled || !canSave) return;

    onSaveRef.current(debounced);
  }, [debounced, enabled, canSave]);
}
