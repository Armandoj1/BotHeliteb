import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

import { Tooltip } from '@/components/ui';
import { TRANSITION } from '@/lib/motion';
import { useUiStore } from '@/store/ui.store';

export function ThemeToggle() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const hydrateFromDocument = useUiStore((state) => state.hydrateFromDocument);

  useEffect(() => {
    hydrateFromDocument();
  }, [hydrateFromDocument]);

  const isDark = theme === 'dark';

  return (
    <Tooltip content={isDark ? 'Tema claro' : 'Tema oscuro'} side="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="relative grid size-9 place-items-center overflow-hidden rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
            transition={TRANSITION.fast}
            className="absolute grid place-items-center"
          >
            {isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
