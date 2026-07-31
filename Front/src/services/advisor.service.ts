import type { IApiAsesorListItem } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { toAdvisor } from '@/api/mappers/advisor.mapper';
import type { IAdvisor, ResultType } from '@/types';
import { readCollection } from './transport';

export function fetchAdvisors(): Promise<ResultType<IAdvisor[]>> {
  return readCollection<IApiAsesorListItem, IAdvisor>(
    ENDPOINTS.advisors.list,
    toAdvisor,
    async () => [],
  );
}
