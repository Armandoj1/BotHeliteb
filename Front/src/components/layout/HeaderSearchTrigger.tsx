import { Search } from 'lucide-react';

export interface IHeaderSearchTriggerProps {
  onOpen: () => void;
}

/** Looks like a field, behaves like a button — the palette owns the real input. */
export function HeaderSearchTrigger({ onOpen }: IHeaderSearchTriggerProps) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-[13px] text-subtle transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:flex xl:w-72"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Buscar…</span>
        <kbd className="shrink-0 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-subtle">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpen}
        aria-label="Buscar"
        className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:hidden"
      >
        <Search className="size-4" aria-hidden />
      </button>
    </>
  );
}
