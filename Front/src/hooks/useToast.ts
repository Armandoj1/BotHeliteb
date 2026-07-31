import { useMemo } from 'react';

import { useToastStore, type IToastInput } from '@/store/toast.store';

type ToastPayloadType = Omit<IToastInput, 'tone'>;

export interface IToastApi {
  success: (payload: ToastPayloadType) => void;
  error: (payload: ToastPayloadType) => void;
  warning: (payload: ToastPayloadType) => void;
  info: (payload: ToastPayloadType) => void;
  dismiss: (id: string) => void;
}

/** Ergonomic, tone-typed wrapper over the toast store. */
export function useToast(): IToastApi {
  const push = useToastStore((state) => state.push);
  const dismiss = useToastStore((state) => state.dismiss);

  return useMemo(
    () => ({
      success: (payload) => void push({ ...payload, tone: 'success' }),
      error: (payload) => void push({ ...payload, tone: 'danger' }),
      warning: (payload) => void push({ ...payload, tone: 'warning' }),
      info: (payload) => void push({ ...payload, tone: 'primary' }),
      dismiss,
    }),
    [push, dismiss],
  );
}
