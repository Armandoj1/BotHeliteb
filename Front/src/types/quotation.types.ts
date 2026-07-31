import type { IdType } from './common.types';

export type QuotationStatusType = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface IQuotationLine {
  productId: IdType;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface IQuotation {
  id: IdType;
  reference: string;
  customerName: string;
  customerCompany: string;
  status: QuotationStatusType;
  total: number;
  currency: string;
  issuedAt: string;
  validUntil: string;
  advisor: string;
  lines: IQuotationLine[];
  /** True when the assistant produced the first draft. */
  generatedByAi: boolean;
}

export interface IQuotationFilters {
  search: string;
  status: QuotationStatusType | 'all';
}
