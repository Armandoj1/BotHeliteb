import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import {
  PROVIDER_CATEGORY_LABELS,
  PROVIDER_CATEGORY_ORDER,
  PROVIDER_DEFINITIONS,
} from '@/features/ai/config';
import { staggerContainer } from '@/lib/motion';
import type { IProviderConnection, ProviderIdType } from '@/types';
import { ProviderCard } from './ProviderCard';

export interface IProviderGridProps {
  visibleProviderIds: readonly ProviderIdType[];
  connectionsById: Map<ProviderIdType, IProviderConnection>;
  autosave: boolean;
  onConnectionChange: (connection: IProviderConnection) => void;
  onClearSearch: () => void;
}

export function ProviderGrid({
  visibleProviderIds,
  connectionsById,
  autosave,
  onConnectionChange,
  onClearSearch,
}: IProviderGridProps) {
  const visible = new Set(visibleProviderIds);

  if (visible.size === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Ningún proveedor coincide"
        description="Prueba con otro nombre, o revisa la lista completa de proveedores disponibles."
        action={
          <button
            type="button"
            onClick={onClearSearch}
            className="text-[13px] font-medium text-primary transition-opacity hover:opacity-80"
          >
            Limpiar búsqueda
          </button>
        }
      />
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-9">
      {PROVIDER_CATEGORY_ORDER.map((category) => {
        const definitions = PROVIDER_DEFINITIONS.filter(
          (definition) => definition.category === category && visible.has(definition.id),
        );

        if (definitions.length === 0) return null;

        return (
          <section key={category} aria-labelledby={`provider-group-${category}`}>
            <h3
              id={`provider-group-${category}`}
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle"
            >
              {PROVIDER_CATEGORY_LABELS[category]}
            </h3>

            <div className="space-y-4">
              {definitions.map((definition) => {
                const connection = connectionsById.get(definition.id);
                if (!connection) return null;

                return (
                  <ProviderCard
                    key={definition.id}
                    definition={definition}
                    connection={connection}
                    autosave={autosave}
                    onConnectionChange={onConnectionChange}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </motion.div>
  );
}
