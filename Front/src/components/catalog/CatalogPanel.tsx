import { Package, Plus } from 'lucide-react';

import { ListScreen } from '@/components/common/ListScreen';
import { Button, Select, TooltipProvider } from '@/components/ui';
import { useCatalog } from '@/features/catalog/hooks/useCatalog';
import { buildCategoryOptions, PRODUCT_STATUS_OPTIONS } from '@/features/catalog/labels';
import { CatalogTable } from './CatalogTable';

/** Island root for `/catalog`. */
export function CatalogPanel() {
  const catalog = useCatalog();
  const { resource, query, filters } = catalog;

  return (
    <TooltipProvider delayDuration={280}>
      <ListScreen
        title="Catálogo"
        description="Productos disponibles para el asistente. Controla qué artículos puede cotizar automáticamente."
        headerActions={
          <Button variant="primary" size="sm" leftIcon={<Plus aria-hidden />}>
            Nuevo producto
          </Button>
        }
        search={{
          value: filters.search,
          onChange: (value) => catalog.setFilter('search', value),
          placeholder: 'Buscar por nombre, SKU o descripción…',
        }}
        filters={
          <>
            <Select
              value={filters.category}
              onValueChange={(value) => catalog.setFilter('category', value)}
              options={buildCategoryOptions(catalog.items)}
              aria-label="Filtrar por categoría"
              className="w-48"
            />
            <Select
              value={filters.status}
              onValueChange={(value) => catalog.setFilter('status', value)}
              options={PRODUCT_STATUS_OPTIONS}
              aria-label="Filtrar por estado"
              className="w-44"
            />
          </>
        }
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeletonColumns={7}
        matchCount={query.matchCount}
        hasActiveFilters={catalog.hasActiveFilters}
        onClearFilters={catalog.resetFilters}
        empty={{
          icon: Package,
          title: 'Aún no hay productos',
          description:
            'Sincroniza tu ERP o crea productos manualmente para que el asistente pueda cotizarlos.',
        }}
        pagination={query.result}
        onPageChange={query.setPage}
      >
        <CatalogTable
          products={query.result.items}
          onToggleAi={(product, enabled) => void catalog.setAiEnabled(product, enabled)}
        />
      </ListScreen>
    </TooltipProvider>
  );
}
