import { SearchX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Card, EmptyState, Pagination } from '@/components/ui';
import type { IPaginatedResult, RequestStatusType } from '@/types';
import { AsyncBoundary } from './AsyncBoundary';
import { DataToolbar } from './DataToolbar';
import { PageHeader } from './PageHeader';
import { TableSkeleton } from './TableSkeleton';

export interface IListScreenProps {
  title: string;
  description: string;
  headerActions?: ReactNode;

  search: { value: string; onChange: (value: string) => void; placeholder: string };
  filters?: ReactNode;
  toolbarActions?: ReactNode;

  status: RequestStatusType;
  error: string | null;
  onRetry: () => void;
  skeletonColumns?: number;

  /** Result count before pagination — distinguishes "no matches" from "no data". */
  matchCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  empty: { icon: LucideIcon; title: string; description: string };

  pagination: IPaginatedResult<unknown>;
  onPageChange: (page: number) => void;

  /** The table (or grid) rendering the current page. */
  children: ReactNode;
}

/**
 * The list-screen shell: header, toolbar, async states, empty states and
 * pagination. Feature panels supply configuration and a table — nothing else.
 */
export function ListScreen({
  title,
  description,
  headerActions,
  search,
  filters,
  toolbarActions,
  status,
  error,
  onRetry,
  skeletonColumns = 6,
  matchCount,
  hasActiveFilters,
  onClearFilters,
  empty,
  pagination,
  onPageChange,
  children,
}: IListScreenProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={headerActions} />

      <DataToolbar
        query={search.value}
        onQueryChange={search.onChange}
        searchPlaceholder={search.placeholder}
        filters={filters}
        actions={
          <>
            {toolbarActions}
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        <AsyncBoundary
          status={status}
          error={error}
          onRetry={onRetry}
          skeleton={<TableSkeleton columns={skeletonColumns} />}
        >
          {matchCount === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                icon={SearchX}
                title="Sin resultados"
                description="Ningún registro coincide con los filtros aplicados. Ajusta la búsqueda para ver más."
                action={
                  <Button variant="secondary" size="sm" onClick={onClearFilters}>
                    Limpiar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={empty.icon}
                title={empty.title}
                description={empty.description}
              />
            )
          ) : (
            <>
              {children}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={onPageChange}
              />
            </>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}
