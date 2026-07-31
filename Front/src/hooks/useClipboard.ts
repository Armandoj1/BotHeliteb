import { useCallback, useEffect, useRef, useState } from 'react';

export interface IClipboardApi {
  copied: boolean;
  copy: (value: string) => Promise<boolean>;
}

/** Copy helper with a self-resetting "copied" flag for button feedback. */
export function useClipboard(resetAfterMs = 1800): IClipboardApi {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
