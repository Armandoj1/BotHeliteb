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
    initials: buildInitials(asesor.nombre),
    role: asesor.verificado ? 'Asesor verificado' : 'Asesor',
    status: resolveStatus(asesor),
    // Workload metrics do not exist in the API yet. Zero is honest; inventing
    // numbers here would make the cards look informative while being fiction.
    activeConversations: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    satisfaction: 0,
    specialties: [asesor.telefono],
  };
}
