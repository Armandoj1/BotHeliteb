import { create } from 'zustand';

import { TOAST_DURATION_MS } from '@/constants/app';
import type { ToneType } from '@/types';
import { createId } from '@/utils/id';

export interface IToast {
  id: string;
  tone: Exclude<ToneType, 'neutral'> | 'neutral';
  title: string;
  description?: string;
  duration: number;
}

export interface IToastInput {
  tone?: IToast['tone'];
  title: string;
  description?: string;
  duration?: number;
}

interface IToastStore {
  toasts: IToast[];
  push: (input: IToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE = 4;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Toasts live in a module-level store rather than React context: Astro renders
 * many independent islands, and a store is the only way they can share one
 * viewport without a provider wrapping the whole page.
 */
export const useToastStore = create<IToastStore>((set, get) => ({
  toasts: [],

  push: ({ tone = 'neutral', title, description, duration = TOAST_DURATION_MS }) => {
    const id = createId('toast');

    set((state) => ({
      toasts: [...state.toasts, { id, tone, title, description, duration }].slice(-MAX_VISIBLE),
    }));

    timers.set(
      id,
      setTimeout(() => get().dismiss(id), duration),
    );

    return id;
  },

  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  clear: () => {
    timers.forEach(clearTimeout);
    timers.clear();
    set({ toasts: [] });
  },
}));
