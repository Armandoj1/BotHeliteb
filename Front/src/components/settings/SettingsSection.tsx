import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { Button, Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { TRANSITION } from '@/lib/motion';

export interface ISettingsSectionProps {
  title: string;
  description: string;
  isDirty: boolean;
  isSaving: boolean;
  onSubmit: () => void;
  onReset: () => void;
  children: ReactNode;
}

/** Card shell with the shared save/discard footer used by every settings form. */
export function SettingsSection({
  title,
  description,
  isDirty,
  isSaving,
  onSubmit,
  onReset,
  children,
}: ISettingsSectionProps) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        {/* Se suman columnas en vez de estirar los campos: en un monitor ancho, un
            input de 900px para "Zona horaria" se ve peor que tres columnas llenas. */}
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
          <div className="text-[12px] text-subtle" aria-live="polite">
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
                >
                  Todo guardado
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={!isDirty} onClick={onReset}>
              Descartar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={!isDirty}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
