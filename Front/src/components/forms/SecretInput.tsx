import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';

import { Input, type IInputProps } from '@/components/ui';
import { useClipboard } from '@/hooks/useClipboard';

export interface ISecretInputProps extends Omit<IInputProps, 'type' | 'trailing'> {
  /** Adds a copy-to-clipboard affordance next to the reveal toggle. */
  allowCopy?: boolean;
}

/** Password-style field with an explicit, accessible reveal control. */
export const SecretInput = forwardRef<HTMLInputElement, ISecretInputProps>(function SecretInput(
  { allowCopy = true, value, ...props },
  ref,
) {
  const [revealed, setRevealed] = useState(false);
  const { copied, copy } = useClipboard();
  const stringValue = typeof value === 'string' ? value : '';

  return (
    <Input
      ref={ref}
      type={revealed ? 'text' : 'password'}
      value={value}
      // Chrome ignores autoComplete="off" on password fields and offers the
      // saved site credentials instead — which is how the login email ended up
      // proposed as an API key. "new-password" is the documented opt-out.
      autoComplete="new-password"
      data-lpignore="true"
      data-1p-ignore
      spellCheck={false}
      className="pr-16 font-mono text-[12.5px] tracking-tight"
      trailing={
        <span className="flex items-center">
          {allowCopy && stringValue.length > 0 ? (
            <button
              type="button"
              onClick={() => void copy(stringValue)}
              aria-label={copied ? 'Copiado' : 'Copiar credencial'}
              className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="size-3.5 text-success" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Ocultar credencial' : 'Mostrar credencial'}
            aria-pressed={revealed}
            className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {revealed ? (
              <EyeOff className="size-3.5" aria-hidden />
            ) : (
              <Eye className="size-3.5" aria-hidden />
            )}
          </button>
        </span>
      }
      {...props}
    />
  );
});
