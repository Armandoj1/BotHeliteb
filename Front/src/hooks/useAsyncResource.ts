import { useCallback, useEffect, useRef, useState } from 'react';

import type { IAsyncState, ResultType } from '@/types';

export interface IAsyncResource<T> extends IAsyncState<T> {
  reload: () => Promise<void>;
  /** Optimistic local update; skips the loading state. */
  setData: (updater: (current: T) => T) => void;
}

/**
 * One place where "call a service, render skeleton / empty / error" is solved.
 * Every screen consumes this instead of hand-rolling `useEffect` + `useState`.
 */
export function useAsyncResource<T>(loader: () => Promise<ResultType<T>>): IAsyncResource<T> {
  const [state, setState] = useState<IAsyncState<T>>({
    data: null,
    status: 'loading',
    error: null,
  });

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }));

    const result = await loaderRef.current();
    if (!mountedRef.current) return;

    setState(
      result.ok
        ? { data: result.value, status: 'success', error: null }
        : { data: null, status: 'error', error: result.error },
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setData = useCallback((updater: (current: T) => T) => {
    setState((current) =>
      current.data === null ? current : { ...current, data: updater(current.data) },
    );
  }, []);

  return { ...state, reload, setData };
}
