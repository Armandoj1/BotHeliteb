import { AnimatePresence } from 'framer-motion';

import { useToastStore } from '@/store/toast.store';
import { ToastCard } from './ToastCard';

/**
 * Mounted once in the admin layout. Any island can raise a toast through the
 * store without needing a provider in its own React tree.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2.5"
    >
      <ul className="flex flex-col items-end gap-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
