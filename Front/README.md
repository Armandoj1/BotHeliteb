# Nexus · AI Operations Console

Panel administrativo construido con **Astro + React + TypeScript + Tailwind CSS v4**, pensado como
producto SaaS: superficie monocroma y minimalista, microinteracciones con Framer Motion y
una arquitectura por capas lista para conectarse a un backend real.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + build de producción
npm run preview
```

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework / routing | Astro 5 (islas de React, SSG) |
| UI | React 19 + TypeScript estricto |
| Estilos | Tailwind CSS v4 (`@theme inline` sobre tokens propios) |
| Primitivas accesibles | Radix UI (`@radix-ui/react-*`) |
| Iconos | Lucide |
| Animación | Framer Motion |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |
| Estado compartido | Zustand (solo shell y toasts) |

Las islas se hidratan por página: cada pantalla carga únicamente el JavaScript de su módulo.

---

## Arquitectura

```
src/
├── api/              Cliente HTTP tipado y catálogo de endpoints
├── components/
│   ├── ui/           Design system (18 primitivas reutilizables)
│   ├── common/       Composiciones transversales (ListScreen, PageHeader, AsyncBoundary…)
│   ├── layout/       Sidebar, header, command palette, theme toggle
│   ├── forms/        Controles de formulario de dominio (SecretInput, CredentialField)
│   ├── dashboard/    Métricas y gráficos
│   ├── ai/           Consola de proveedores de IA
│   └── <feature>/    chat · conversations · catalog · quotations · advisors · notes · sync · resources · settings
├── features/         Configuración, hooks y vocabulario por módulo de negocio
├── hooks/            Hooks genéricos (useAsyncResource, useListModule, useToast…)
├── layouts/          BaseLayout.astro y AdminLayout.astro
├── pages/            Una ruta por módulo (11 + 404)
├── services/         Acceso a datos; única capa que habla con `api/` o con `mocks/`
├── schemas/          Validación Zod
├── store/            Estado global mínimo (UI shell, toasts)
├── mocks/            Datos simulados, sin dependencias de UI
├── types/            Interfaces y tipos del dominio
├── constants/        Navegación, rutas y constantes de aplicación
├── utils/            Funciones puras (formato, colecciones, storage…)
└── styles/           Tokens, capa base y bridge con Tailwind
```

### Reglas que sigue el código

- **Responsabilidad única.** Los componentes renderizan; los hooks orquestan; los servicios hablan
  con la red; los `utils` son funciones puras. Ningún componente hace `fetch`.
- **Tamaño acotado.** Ningún componente, hook o servicio supera las 200 líneas. Los únicos archivos
  más largos son datos (`mocks/`) y el registro de proveedores.
- **Sin duplicación.** Los patrones repetidos se extrajeron a piezas únicas:
  `useListModule` (fetch → filtro → paginación), `ListScreen` (encabezado, toolbar, estados vacíos,
  paginación), `AsyncBoundary` (carga / error), `useSettingsSection` (formularios de configuración).
- **Tipado completo.** `astro check` termina con 0 errores, 0 advertencias y sin `any`.
- **Convenciones.** `PascalCase` en componentes, `camelCase` en funciones, prefijo `I` en interfaces,
  sufijo `Type` en tipos, prefijo `use` en hooks, `MAYÚSCULAS` en constantes globales.

---

## Conexión con un backend real

Los servicios nunca deciden de dónde vienen los datos: eso vive en `src/services/transport.ts`.

```ts
export function fetchProducts(): Promise<ResultType<IProduct[]>> {
  return readResource(ENDPOINTS.catalog.list, async () => MOCK_PRODUCTS);
}
```

Basta con definir la variable de entorno para que toda la aplicación pase a HTTP real:

```bash
# .env
PUBLIC_API_URL=https://api.tu-dominio.com
```

Sin esa variable se usan los mocks con latencia simulada. Los servicios devuelven siempre un
`ResultType<T>` discriminado (`{ ok: true, value }` | `{ ok: false, error }`), así que ninguna
excepción cruza la frontera hacia la UI.

---

## Módulos

| Ruta | Módulo | Qué incluye |
| --- | --- | --- |
| `/login` | Acceso | Formulario validado con Zod, estados de error y sesión simulada |
| `/` | Panel general | 6 métricas con sparkline, área, barras apiladas, ranking por canal y actividad |
| `/chat` | Chat | Bandeja + hilo + composer (⏎ envía, ⇧⏎ salto de línea) |
| `/conversations` | Conversaciones | Tabla filtrable por estado y canal + panel lateral con el hilo |
| `/catalog` | Catálogo | Tabla con stock, estados y toggle "cotizable por IA" (optimista) |
| `/quotations` | Cotizaciones | Estados, totales y origen (humano o IA) |
| `/advisors` | Asesores | Tarjetas con disponibilidad, carga y satisfacción |
| `/notes` | Notas del agente | CRUD con diálogo, validación Zod y confirmación de borrado |
| `/sync` | Sincronización | Salud por origen, progreso en vivo e historial de ejecuciones |
| `/resources` | Recursos | Base de conocimiento con estado de indexación y reindexado |
| `/ai-usage` | **Uso de IA** | Credenciales de 11 proveedores + consumo por proveedor |
| `/compare` | **Comparador** | Un mensaje, dos modelos en paralelo, métricas y veredicto |
| `/settings` | Configuración | Espacio de trabajo, asistente y notificaciones (3 formularios) |

### Uso de IA — el módulo central

Once proveedores: OpenAI, Anthropic, Google Gemini, Grok (xAI), DeepSeek, Mistral AI, OpenRouter,
Hugging Face, Ollama (con indicador de ejecución local), Azure OpenAI y AWS Bedrock.

Cada proveedor se declara como **datos**, no como código:

```ts
{
  id: 'azure-openai',
  name: 'Azure OpenAI',
  category: 'cloud',
  fields: [
    { name: 'endpoint',   label: 'Endpoint',   kind: 'url',    required: true, pattern: { … } },
    { name: 'apiKey',     label: 'API Key',    kind: 'secret', required: true, minLength: 32 },
    { name: 'deployment', label: 'Deployment', kind: 'text',   required: true, span: 'half' },
    { name: 'apiVersion', label: 'API Version',kind: 'select', required: true, options: […] },
  ],
}
```

A partir de esa definición se generan automáticamente el formulario (`CredentialField`), el esquema
de validación (`buildCredentialsSchema`) y el estado de la tarjeta. **Agregar un proveedor nuevo es
añadir un objeto**, no escribir un formulario (principio abierto/cerrado).

La pantalla cubre: estado de conexión (conectado / credencial inválida / falta información / sin
configurar), validación en tiempo real con máscaras por proveedor, autoguardado opcional con
debounce, indicador de cambios sin guardar, probar conexión con latencia medida, guardar, restaurar,
skeletons, estados vacío/error y toasts.

### Comparador de modelos

Un mismo mensaje, enviado a dos modelos que arrancan en el mismo instante. Cada slot transmite su
respuesta al ritmo real del proveedor (`tokens/s`), así que el que gana se ve antes de leer una sola
cifra. Al terminar ambos, se rankean las tres variables medibles:

| | Se mide | No se mide |
| --- | --- | --- |
| Velocidad | primer token y tiempo total | |
| Costo | precio por millón de tokens de entrada y salida | |
| Extensión | tokens de salida | |
| Calidad | | **la juzga quien lee** — la UI no la finge |

Solo admite proveedores con conexión verificada en `/ai-usage`: comparar contra una credencial sin
probar no demuestra nada. Diferencias menores al 5% se reportan como empate técnico en lugar de
inventar un ganador.

---

## Diseño

- **Tipografía.** Poppins en todo el producto, autoalojada con `@fontsource` (pesos 400/500/600/700),
  sin depender de ningún CDN. Al ser una geométrica de sidebearings amplios, el `letter-spacing` base
  se corrige a `-0.006em` y los titulares a `-0.024em`.
- **Paleta.** Monocroma estricta: blanco, negro y cuatro grises. **El acento es el propio color de
  texto** (negro sobre claro, blanco sobre oscuro), así que el énfasis nace del contraste y no del
  tono. El color solo aparece cuando significa algo: éxito, advertencia y error.
- **Tokens.** Todo el color, radio, sombra y métrica del shell vive en `styles/theme.css`; Tailwind
  los consume vía `@theme inline`, de modo que el tema oscuro es un solo cambio de clase.
- **Sombras.** Cuatro niveles muy tenues; nada flota sin motivo.
- **Movimiento.** Vocabulario compartido en `lib/motion.ts` (fade, scale, slide, stagger). Duraciones
  de 160–420 ms, sin rebotes, y `prefers-reduced-motion` respetado globalmente.
- **Tema.** Claro/oscuro con conmutador; un script inline aplica la preferencia antes del primer
  pintado, así que no hay parpadeo.

### Gráficos

Una paleta acromática no puede sostener cinco categorías distinguibles con honestidad, así que
`lib/chart-theme.ts` fija dos reglas y todos los gráficos las obedecen:

1. **Máximo dos series categóricas por gráfico**, con contraste verificado en claro y en oscuro.
2. **Más de dos categorías dejan de codificarse por color** y pasan a `RankedBarList`, que ordena por
   posición y rotula cada fila directamente.

### Sidebar

Tres formas progresivas, para que la navegación nunca desaparezca:

| Ancho | Forma |
| --- | --- |
| `≥ 1024 px` | Barra completa de 264 px, colapsable a rail por el usuario |
| `768–1024 px` | Rail de iconos forzado (con tooltips), útil en ventanas estrechas y con zoom |
| `< 768 px` | Drawer desde el header |

El estado colapsado se escribe en `<html data-sidebar>` antes del primer pintado y **el layout se
resuelve solo con CSS** (una variable `--sidebar-width` y la variante `rail:`), por lo que ninguna
isla necesita re-renderizar para que la geometría sea correcta.

---

## Navegación y sesión

- **Sin recargas.** `<ClientRouter />` de Astro intercambia el documento en cliente. El sidebar, el
  header y el viewport de toasts se declaran `transition:persist`, así que no se desmontan al
  navegar: no hay parpadeo ni pérdida de estado. La ruta activa la resuelve `usePathname`, que
  escucha `astro:page-load`.
- **Preferencias tras el swap.** Intercambiar documentos reinicia los atributos de `<html>`, de modo
  que el script previo al pintado se vuelve a ejecutar en `astro:after-swap` para restaurar tema,
  rail y sesión sin parpadeo.
- **Guardia de sesión.** Ese mismo script redirige a `/login` cuando no hay sesión, y de `/login` al
  panel cuando sí la hay. Al ejecutarse antes del primer pintado, nunca se ve una pantalla que no
  corresponde. `Cerrar sesión` vive en el menú de perfil.

> La sesión en `localStorage` es una comodidad de cliente, **no** una frontera de seguridad: la
> validación real corresponde al backend.

---

## Accesibilidad

- Navegación completa por teclado, incluida la paleta de comandos (`⌘K` / `Ctrl+K`, flechas, `↵`).
- Foco visible en todos los controles interactivos (`:focus-visible`, nunca `outline: none`).
- Estructura semántica: `nav`, `main`, `header`, `table`, `dl`, listas reales.
- `aria-label`, `aria-current`, `aria-invalid`, `aria-describedby` y `aria-live` donde corresponde;
  `FormField` cablea etiqueta, ayuda y error automáticamente.
- El estado nunca depende solo del color: siempre hay texto o forma acompañando.
- Diálogos y drawers con foco atrapado y cierre con `Esc` (Radix).

## Responsive

Diseñado móvil primero y verificado en cuatro tramos: móvil (drawer + una columna), tablet
(dos columnas, sidebar en drawer), laptop (sidebar fija, tres columnas) y escritorio amplio.
Las tablas hacen scroll horizontal dentro de su contenedor; la página nunca lo hace.
