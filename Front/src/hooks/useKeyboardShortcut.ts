import { useEffect, useRef } from 'react';

export interface IShortcutOptions {
  /** Requires ⌘ on macOS or Ctrl elsewhere. */
  meta?: boolean;
  shift?: boolean;
  /** Fires even while a text field has focus (used by Escape-like keys). */
  allowInInputs?: boolean;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Declarative global shortcut binding with a stable handler reference. */
export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  { meta = false, shift = false, allowInInputs = false }: IShortcutOptions = {},
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(event.metaKey || event.ctrlKey)) return;
      if (!meta && (event.metaKey || event.ctrlKey)) return;
      if (shift !== event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        target !== null && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable);
      if (isEditable && !allowInInputs) return;

      handlerRef.current(event);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, meta, shift, allowInInputs]);
}
