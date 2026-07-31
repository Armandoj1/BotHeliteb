import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';

import { DialogOverlay } from '@/components/ui/internal/DialogOverlay';
import { cn } from '@/lib/cn';
import { TRANSITION } from '@/lib/motion';
import type { ICommandPaletteState } from '@/hooks/useCommandPalette';

export interface ICommandPaletteProps {
  state: ICommandPaletteState;
}

/** Purely presentational — every behaviour lives in `useCommandPalette`. */
export function CommandPalette({ state }: ICommandPaletteProps) {
  const { open, setOpen, query, setQuery, results, activeIndex, onInputKeyDown, select } = state;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogOverlay />
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={TRANSITION.base}
                className="fixed left-1/2 top-[12vh] z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-elevated shadow-xl focus:outline-none"
              >
                <DialogPrimitive.Title className="sr-only">Buscar en el panel</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Escribe para filtrar módulos y presiona Enter para navegar
                </DialogPrimitive.Description>

                <div className="flex items-center gap-2.5 border-b border-border px-4">
                  <Search className="size-4 shrink-0 text-subtle" aria-hidden />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Buscar módulos, acciones o registros…"
                    aria-label="Buscar en el panel"
                    className="h-12 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-subtle"
                  />
                  <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:block">
                    ESC
                  </kbd>
                </div>

                <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-1.5">
                  {results.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[13px] text-muted">
                      Sin coincidencias para «{query}»
                    </p>
                  ) : (
                    <ul role="listbox" aria-label="Resultados">
                      {results.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = index === activeIndex;

                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onClick={() => select(item)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-100',
                                isActive ? 'bg-surface-muted' : 'hover:bg-surface-muted/60',
                              )}
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface text-subtle">
                                <Icon className="size-3.5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-foreground">
                                  {item.label}
                                </span>
                                <span className="block truncate text-[12px] text-subtle">
                                  {item.description}
                                </span>
                              </span>
                              {isActive ? (
                                <CornerDownLeft className="size-3.5 shrink-0 text-subtle" aria-hidden />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <footer className="flex items-center gap-3 border-t border-border bg-surface-sunken/60 px-4 py-2 text-[11px] text-subtle">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border px-1 font-mono">↑</kbd>
                    <kbd className="rounded border border-border px-1 font-mono">↓</kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border px-1 font-mono">↵</kbd>
                    abrir
                  </span>
                </footer>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
