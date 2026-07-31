import { AnimatePresence, motion } from 'framer-motion';
import { PlugZap, RotateCcw, Save } from 'lucide-react';

import { Button } from '@/components/ui';
import { TRANSITION } from '@/lib/motion';
import { formatRelativeTime } from '@/utils/format-date';

export interface IProviderCardFooterProps {
  isDirty: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isRestoring: boolean;
  lastTestedAt: string | null;
  onSave: () => void;
  onTest: () => void;
  onRestore: () => void;
}

export function ProviderCardFooter({
  isDirty,
  isSaving,
  isTesting,
  isRestoring,
  lastTestedAt,
  onSave,
  onTest,
  onRestore,
}: IProviderCardFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
      <div className="min-w-0 text-[12px] text-subtle" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {isDirty ? (
            <motion.span
              key="dirty"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={TRANSITION.fast}
              className="flex items-center gap-1.5 font-medium text-warning"
            >
              <span className="size-1.5 rounded-full bg-warning" aria-hidden />
              Cambios sin guardar
            </motion.span>
          ) : (
            <motion.span
              key="clean"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={TRANSITION.fast}
              className="block truncate"
            >
              {lastTestedAt
                ? `Última prueba ${formatRelativeTime(lastTestedAt)}`
                : 'Sin pruebas registradas'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
          isLoading={isRestoring}
          leftIcon={<RotateCcw aria-hidden />}
        >
          Restaurar
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onTest}
          isLoading={isTesting}
          leftIcon={<PlugZap aria-hidden />}
        >
          Probar conexión
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          isLoading={isSaving}
          disabled={!isDirty}
          leftIcon={<Save aria-hidden />}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
