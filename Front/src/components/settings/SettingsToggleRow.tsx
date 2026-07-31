import { useId } from 'react';

import { Switch } from '@/components/ui';

export interface ISettingsToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Label + description + switch, wired so the whole row is a click target. */
export function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: ISettingsToggleRowProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-sunken/50 p-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-foreground">
          {label}
        </label>
        <p id={descriptionId} className="mt-0.5 text-[12px] leading-relaxed text-muted">
          {description}
        </p>
      </div>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={descriptionId}
        className="mt-0.5"
      />
    </div>
  );
}
