import { motion } from 'framer-motion';
import { UserPlus, UsersRound } from 'lucide-react';
import { useState } from 'react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { DataToolbar } from '@/components/common/DataToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Select,
  Skeleton,
  TooltipProvider,
} from '@/components/ui';
import { useAdvisors } from '@/features/advisors/hooks/useAdvisors';
import { ADVISOR_STATUS_OPTIONS } from '@/features/advisors/labels';
import { useSessionUser } from '@/hooks/useSessionUser';
import { useToast } from '@/hooks/useToast';
import { staggerContainer } from '@/lib/motion';
import type { IAdvisor } from '@/types';
import { AdvisorCard } from './AdvisorCard';
import { CreateAdvisorDialog } from './CreateAdvisorDialog';

const GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

/** Island root for `/advisors`. Cards instead of rows: this is people, not data. */
export function AdvisorsPanel() {
  const state = useAdvisors();
  const { resource, query, filters } = state;
  const user = useSessionUser();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [createOpen, setCreateOpen] = useState(false);
  const [porEliminar, setPorEliminar] = useState<IAdvisor | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const confirmarEliminacion = async () => {
    if (!porEliminar) return;

    setEliminando(true);
    const resultado = await state.remove(porEliminar.id);
    setEliminando(false);

    if (!resultado.ok) {
      // El backend rechaza borrarse a uno mismo y borrar al único administrador;
      // se muestra su motivo tal cual en vez de un error genérico.
      toast.error({ title: 'No se pudo eliminar', description: resultado.error });
      return;
    }

    toast.success({
      title: 'Asesor eliminado',
      description: `${porEliminar.name} ya no tiene acceso al panel.`,
    });
    setPorEliminar(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asesores"
        description="El equipo de HELITEB con acceso al panel — quién puede entrar y con qué rol."
        actions={
          <>
            <Badge tone="success" size="md" withDot>
              {state.onlineCount} en línea
            </Badge>
            {isAdmin ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus aria-hidden />}
                onClick={() => setCreateOpen(true)}
              >
                Crear asesor
              </Button>
            ) : null}
          </>
        }
      />

      <DataToolbar
        query={filters.search}
        onQueryChange={(value) => state.setFilter('search', value)}
        searchPlaceholder="Buscar por nombre, correo o rol…"
        filters={
          <Select
            value={filters.status}
            onValueChange={(value) => state.setFilter('status', value)}
            options={ADVISOR_STATUS_OPTIONS}
            aria-label="Filtrar por estado"
            className="w-44"
          />
        }
        actions={
          state.hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={state.resetFilters}>
              Limpiar filtros
            </Button>
          ) : null
        }
      />

      <AsyncBoundary
        status={resource.status}
        error={resource.error}
        onRetry={() => void resource.reload()}
        skeleton={
          <div className={GRID_CLASSES}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="block" className="h-[236px]" />
            ))}
          </div>
        }
      >
        {query.matchCount === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={state.hasActiveFilters ? 'Sin asesores que coincidan' : 'Aún no hay asesores'}
            description={
              state.hasActiveFilters
                ? 'Ajusta los filtros para ver al resto del equipo.'
                : isAdmin
                  ? 'Crea la primera cuenta de asesor para que tu equipo pueda entrar al panel.'
                  : 'Pídele a un administrador que cree tu cuenta de asesor.'
            }
            variant="page"
            action={
              state.hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={state.resetFilters}>
                  Limpiar filtros
                </Button>
              ) : null
            }
          />
        ) : (
          // El proveedor es obligatorio para los <Tooltip> del botón de eliminar:
          // sin él, Radix lanza una excepción y la isla entera queda en blanco —
          // la página se veía vacía, sin buscador, sin botones y sin esqueleto.
          <TooltipProvider delayDuration={280}>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={GRID_CLASSES}
            >
              {query.result.items.map((advisor) => (
                <AdvisorCard
                  key={advisor.id}
                  advisor={advisor}
                  onDelete={isAdmin ? setPorEliminar : undefined}
                  esUnoMismo={advisor.id === user?.id}
                />
              ))}
            </motion.div>
          </TooltipProvider>
        )}
      </AsyncBoundary>

      {isAdmin ? (
        <>
          <CreateAdvisorDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={state.create} />

          <ConfirmDialog
            open={porEliminar !== null}
            onOpenChange={(abierto) => {
              if (!abierto) setPorEliminar(null);
            }}
            title={`¿Eliminar a ${porEliminar?.name ?? ''}?`}
            description={
              `Se borra la cuenta de ${porEliminar?.email ?? ''} y pierde el acceso al panel ` +
              'de inmediato. Las cotizaciones que ya generó se conservan. Esto no se puede deshacer.'
            }
            confirmLabel="Eliminar cuenta"
            destructive
            isLoading={eliminando}
            onConfirm={() => void confirmarEliminacion()}
          />
        </>
      ) : null}
    </div>
  );
}
