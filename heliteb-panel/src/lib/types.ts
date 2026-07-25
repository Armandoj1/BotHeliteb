// Formas del contrato snake_case que expone el API .NET (JsonNamingPolicy.SnakeCaseLower).

export interface StockBodega {
  codigo_sap: string;
  marca: string;
  modelo: string;
  codigo_bodega: string;
  nombre_sucursal: string;
  ciudad: string | null;
  cantidad_disponible: number;
  precio_msrp_cop: number | null;
}

export interface Producto {
  codigo_sap: string;
  marca: string;
  categoria: string;
  linea: string | null;
  serie: string | null;
  sub_serie: string | null;
  modelo: string;
  parametro1: string | null;
  parametro2: string | null;
  parametro3: string | null;
  descripcion: string | null;
  modelo_etiqueta: string | null;
  precio_msrp_cop: number | null;
  stock_total: number;
  imagen_url: string;
  stock_bodegas: StockBodega[];
}

export interface Cotizacion {
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

export interface Asesor {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  created_at: string;
  verificado: boolean;
}

export interface AgenteNota {
  id: number;
  contenido: string;
  activo: boolean;
  created_at: string;
}

export interface ConversationSummary {
  telefono: string;
  nombre_contacto: string | null;
  ultimo_mensaje_en: string;
  ultimo_mensaje_preview: string | null;
  ultimo_mensaje_role: string | null;
  total_mensajes: number;
}

export interface ConversationMessage {
  id: number;
  telefono: string;
  generacion: number;
  role: string;
  content: string;
  created_at: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface Metrics {
  productos: number;
  cotizaciones: number;
  asesores: number;
}

export interface RecursosSnapshot {
  disponible: boolean;
  ram_total_mb: number | null;
  ram_usado_mb: number | null;
  disco_total_gb: number | null;
  disco_usado_gb: number | null;
  cpu_load1m: number | null;
}

export interface RecursosMuestra extends RecursosSnapshot {
  medido_en: string;
}

export interface RecursosResponse {
  actual: RecursosSnapshot;
  historico_24h: RecursosMuestra[];
}
