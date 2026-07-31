import { SearchInput, Switch, Tooltip } from '@/components/ui';

export interface IAiConsoleToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  autosave: boolean;
  onAutosaveChange: (enabled: boolean) => void;
}

export function AiConsoleToolbar({
  query,
  onQueryChange,
  autosave,
  onAutosaveChange,
}: IAiConsoleToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder="Buscar proveedor…"
        aria-label="Buscar proveedor"
        className="sm:w-72"
      />

      <Tooltip
        content="Guarda automáticamente cada cambio válido tras una breve pausa"
        side="left"
      >
        <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2">
          <Switch
            checked={autosave}
            onCheckedChange={onAutosaveChange}
            aria-label="Activar autoguardado"
          />
          <span className="text-[13px] text-muted">Autoguardado</span>
        </label>
      </Tooltip>
    </div>
  );
}
