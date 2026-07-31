/**
 * Wire shapes of the HELITEB .NET API, exactly as they arrive.
 *
 * The API serialises with `JsonNamingPolicy.SnakeCaseLower`, so every field here
 * is snake_case and named in Spanish. Nothing outside `api/mappers` should import
 * these: the rest of the app speaks the domain types in `src/types`.
 */

export interface IApiAsesorResumen {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
}

export interface IApiLoginResponse {
  ok: boolean;
  token: string;
  asesor: IApiAsesorResumen;
}

export interface IApiAsesorListItem extends IApiAsesorResumen {
  activo: boolean;
  created_at: string;
  verificado: boolean;
}

export interface IApiStockBodega {
  codigo_bodega: string;
  nombre_sucursal: string;
  ciudad: string | null;
  cantidad_disponible: number;
  precio_msrp_cop: number | null;
}

export interface IApiProducto {
  codigo_sap: string;
  marca: string;
  categoria: string;
  linea: string | null;
  serie: string | null;
  sub_serie: string | null;
  modelo: string;
  descripcion: string | null;
  modelo_etiqueta: string | null;
  precio_msrp_cop: number | null;
  stock_total: number;
  imagen_url: string;
  stock_bodegas: IApiStockBodega[];
}

export interface IApiConversationSummary {
  telefono: string;
  nombre_contacto: string | null;
  ultimo_mensaje_en: string;
  ultimo_mensaje_preview: string | null;
  ultimo_mensaje_role: string | null;
  total_mensajes: number;
}

export interface IApiPagedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface IApiMensaje {
  role: string;
  content: string;
  created_at: string;
}

export interface IApiAgentNota {
  id: number;
  contenido: string;
  activo: boolean;
  created_at: string;
}

export interface IApiMetrics {
  productos: number;
  cotizaciones: number;
  asesores: number;
}

export interface IApiEmbeddingProviderStatus {
  con_embedding: number;
  pendientes: number;
}

export interface IApiEmbeddingsStatus {
  total: number;
  proveedor_activo: string;
  ollama: IApiEmbeddingProviderStatus;
  gemini: IApiEmbeddingProviderStatus;
}

export interface IApiEmbeddingUsoResumen {
  proveedor: string;
  llamadas: number;
  tokens: number;
  costo_estimado_usd: number;
}

export interface IApiEmbeddingsUso {
  dias: number;
  proveedor_activo: string;
  resumen: IApiEmbeddingUsoResumen[];
}

export interface IApiPruebaConexion {
  proveedor: string;
  ok: boolean;
  elapsed_ms: number;
  error: string | null;
}

// ---------------------------------------------------- comparador: modelo normal

export interface IApiCompararLlmSlotResultado {
  llm: string;
  ok: boolean;
  elapsed_ms: number;
  respuesta: string | null;
  error: string | null;
}

export interface IApiCompararLlmResponse {
  slot_a: IApiCompararLlmSlotResultado;
  slot_b: IApiCompararLlmSlotResultado;
}

// -------------------------------------------------- comparador: agente completo

export interface IApiCompararChatSlotResultado {
  llm: string;
  embedding: string;
  ok: boolean;
  elapsed_ms: number;
  respuesta: string | null;
  error: string | null;
}

export interface IApiCompararChatResponse {
  slot_a: IApiCompararChatSlotResultado;
  slot_b: IApiCompararChatSlotResultado;
}

// -------------------------------------------------- comparador: búsqueda semántica

export interface IApiComparacionItem {
  codigo_sap: string;
  marca: string;
  modelo: string;
  descripcion: string | null;
  distancia: number;
}

export interface IApiComparacionProveedorResultado {
  proveedor: string;
  ok: boolean;
  elapsed_ms: number;
  error: string | null;
  resultados: IApiComparacionItem[];
}

export interface IApiComparacionSearchResponse {
  ollama: IApiComparacionProveedorResultado;
  gemini: IApiComparacionProveedorResultado;
}

export interface IApiRecursosActuales {
  ram_usada_mb: number;
  ram_total_mb: number;
  disco_usado_gb: number;
  disco_total_gb: number;
  cpu_porcentaje: number;
}

export interface IApiRecursos {
  actual: IApiRecursosActuales;
  historico_24h: unknown[];
}
