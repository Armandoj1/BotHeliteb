import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { ISelectOption } from '@/types';

export interface ISelectProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<ISelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
  id?: string;
}

/** Accessible select built on Radix so keyboard and typeahead work everywhere. */
export function Select<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = 'Selecciona una opción',
  disabled = false,
  invalid = false,
  size = 'md',
  className,
  id,
  ...aria
}: ISelectProps<T>) {
  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={aria['aria-label']}
        aria-invalid={invalid || undefined}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-md border bg-surface text-[13px]',
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle',
          'data-[placeholder]:text-subtle',
          size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3',
          invalid ? 'border-danger' : 'border-border focus-visible:border-primary',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-subtle" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'pop-surface z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-lg border border-border bg-elevated p-1 shadow-lg',
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer select-none items-start gap-2 rounded-md py-2 pl-2.5 pr-8 text-[13px] outline-none',
                  'text-foreground transition-colors duration-100',
                  'data-[highlighted]:bg-surface-muted',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
                )}
              >
                <div className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-[11px] text-subtle">
                      {option.description}
                    </span>
                  ) : null}
                </div>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 top-2.5">
                  <Check className="size-3.5 text-primary" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
