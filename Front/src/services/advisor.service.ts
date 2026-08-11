import type { IApiAsesorListItem, IApiCrearAsesorResponse } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import { toAdvisor } from '@/api/mappers/advisor.mapper';
import type { CreateAdvisorFormType } from '@/schemas/advisor.schema';
import type { IAdvisor, ResultType } from '@/types';
import { readCollection } from './transport';

export function fetchAdvisors(): Promise<ResultType<IAdvisor[]>> {
  return readCollection<IApiAsesorListItem, IAdvisor>(
    ENDPOINTS.advisors.list,
    toAdvisor,
    async () => [],
  );
}

/** La contraseña temporal solo viene en esta respuesta — el llamador debe mostrarla una vez. */
export async function createAdvisor(
  payload: CreateAdvisorFormType,
): Promise<ResultType<{ advisor: IAdvisor; temporaryPassword: string }>> {
  const result = await httpClient.post<IApiCrearAsesorResponse>(ENDPOINTS.advisors.create, payload);
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      advisor: toAdvisor({ ...result.value.asesor, created_at: new Date().toISOString(), verificado: false }),
      temporaryPassword: result.value.password_temporal,
    },
  };
}

/**
 * Elimina la cuenta de un asesor. El backend rechaza borrarse a uno mismo y
 * borrar al único administrador, así que aquí no se duplica esa lógica: se
 * muestra el motivo que devuelva.
 */
export async function deleteAdvisor(id: string): Promise<ResultType<string>> {
  const result = await httpClient.delete<{ ok: boolean }>(ENDPOINTS.advisors.remove(id));
  if (!result.ok) return result;

  return { ok: true, value: id };
}
