/**
 * Real routes of the HELITEB .NET API (see `Heliteb.Api/Controllers`).
 * Services reference these instead of inlining strings.
 */
export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
    changePassword: '/api/auth/cambiar-password',
  },
  dashboard: {
    metrics: '/api/metrics',
    health: '/api/health',
  },
  catalog: {
    products: '/api/products',
  },
  conversations: {
    list: '/api/conversaciones',
    messages: (telefono: string) => `/api/conversaciones/${encodeURIComponent(telefono)}/mensajes`,
  },
  chat: {
    send: '/api/chat',
    history: (sessionId: string) => `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`,
  },
  quotations: {
    list: '/api/cotizaciones',
    pdf: (folio: string) => `/api/cotizacion/${encodeURIComponent(folio)}/pdf`,
  },
  advisors: {
    list: '/api/asesores',
    create: '/api/asesores',
    remove: (id: string) => `/api/asesores/${encodeURIComponent(id)}`,
  },
  notes: {
    list: '/api/agente-notas',
    activate: (id: number) => `/api/agente-notas/${id}/activar`,
    deactivate: (id: number) => `/api/agente-notas/${id}/desactivar`,
    remove: (id: number) => `/api/agente-notas/${id}`,
  },
  resources: {
    system: '/api/system/recursos',
  },
  ai: {
    status: '/api/embeddings/status',
    usage: (dias: number) => `/api/embeddings/uso?dias=${dias}`,
    switchProvider: (proveedor: string) =>
      `/api/embeddings/proveedor?proveedor=${encodeURIComponent(proveedor)}`,
    test: (proveedor: string) => `/api/embeddings/probar?proveedor=${encodeURIComponent(proveedor)}`,
    geminiConfig: '/api/embeddings/gemini-config',
    // LLM axis (DeepSeek, Groq) — separate route family: they orchestrate tools,
    // they are not embedding providers, even though the panel lists all of them
    // together under "Uso de IA".
    llmConfig: (proveedor: string) => `/api/llm/${encodeURIComponent(proveedor)}-config`,
    llmTest: (proveedor: string) => `/api/llm/probar?proveedor=${encodeURIComponent(proveedor)}`,
    compareLlm: '/api/llm/comparar',
    compareChat: '/api/embeddings/comparar-chat',
    compareSearch: '/api/embeddings/comparar',
  },
} as const;
