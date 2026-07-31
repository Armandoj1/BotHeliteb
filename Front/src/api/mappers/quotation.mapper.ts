import type { IQuotation, QuotationStatusType } from '@/types';

/** Wire shape of `Cotizacion` (see Heliteb.Domain.Entities.Cotizacion). */
export interface IApiCotizacion {
  id: number;
  folio: string;
  cliente: string;
  cliente_email: string | null;
  asesor: string | null;
  subtotal: number;
  iva: number;
  total: number;
  productos_count: number;
  pdf_url: string;
  created_at: string;
}

/** Quotes are valid for 15 days; the API stores only the issue date. */
const VALIDITY_DAYS = 15;

/**
 * The backend has no status column: a quotation exists because it was generated
 * and sent. Age is the only signal available, so anything past its validity
 * window reads as expired and everything else as sent.
 */
function resolveStatus(createdAt: string): QuotationStatusType {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > VALIDITY_DAYS * 86_400_000 ? 'expired' : 'sent';
}

export function toQuotation(cotizacion: IApiCotizacion): IQuotation {
  const issuedAt = cotizacion.created_at;
  const validUntil = new Date(new Date(issuedAt).getTime() + VALIDITY_DAYS * 86_400_000);

  return {
    id: String(cotizacion.id),
    reference: cotizacion.folio,
    customerName: cotizacion.cliente,
    customerCompany: cotizacion.cliente_email ?? '—',
    status: resolveStatus(issuedAt),
    total: cotizacion.total,
    currency: 'COP',
    issuedAt,
    validUntil: validUntil.toISOString(),
    advisor: cotizacion.asesor ?? 'Asistente',
    // The API returns a count, not the lines; the detail lives inside the PDF.
    lines: Array.from({ length: cotizacion.productos_count }, (_, index) => ({
      productId: `${cotizacion.folio}-${index}`,
      name: `Partida ${index + 1}`,
      quantity: 1,
      unitPrice: 0,
    })),
    // Every quotation in this system is produced by the agent.
    generatedByAi: true,
  };
}
