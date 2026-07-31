import { ENDPOINTS } from '@/api/endpoints';
import { toQuotation, type IApiCotizacion } from '@/api/mappers/quotation.mapper';
import type { IQuotation, ResultType } from '@/types';
import { readCollection } from './transport';

export function fetchQuotations(): Promise<ResultType<IQuotation[]>> {
  return readCollection<IApiCotizacion, IQuotation>(
    ENDPOINTS.quotations.list,
    toQuotation,
    async () => [],
  );
}
