import type { IApiAsesorListItem } from '@/api/contracts';
import type { AdvisorStatusType, IAdvisor } from '@/types';
import { buildInitials } from './auth.mapper';

/**
 * The API reports two booleans, not presence. `verificado` means the advisor has
 * a live OTP session with the WhatsApp bot, which is the closest real signal to
 * "available" the backend actually has.
 */
function resolveStatus(asesor: IApiAsesorListItem): AdvisorStatusType {
  if (!asesor.activo) return 'offline';
  return asesor.verificado ? 'online' : 'away';
}

export function toAdvisor(asesor: IApiAsesorListItem): IAdvisor {
  return {
    id: String(asesor.id),
    name: asesor.nombre,
    email: asesor.email,
    phone: asesor.telefono,
    initials: buildInitials(asesor.nombre),
    role: asesor.rol === 'admin' ? 'admin' : 'asesor',
    status: resolveStatus(asesor),
    active: asesor.activo,
  };
}
