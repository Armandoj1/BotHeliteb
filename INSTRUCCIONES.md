# HELITEB SAS – Agente Comercial IA
## Guía de instalación y configuración

---

## Arquitectura

```
Excel (datos) ──→ N8N (sincronizacion_excel / subir_imagenes_cloudinary)
                                                         ↓
                                                    PostgreSQL (Docker)
                                                         ↓
                                       Backend .NET (agente: Groq, fallback DeepSeek)
                                                  ↙    ↓    ↘
                                       Panel Astro  WhatsApp  Kommo
                                       (Chat/Cotiz.) (InboxCRM)  (chat espejo)
                                                       vía ngrok
```

**Stack:** PostgreSQL 16 · pgAdmin 4 · N8N (solo Excel/imágenes) · .NET 8 · Groq (fallback DeepSeek) · Astro + React

> El agente de WhatsApp ya NO corre en N8N — se migró completo a `backend-dotnet/` (ver
> `Heliteb.Agent`). N8N sigue activo únicamente para dos workflows independientes: la carga
> masiva del Excel de catálogo y la subida de imágenes a Cloudinary (`n8n/sincronizacion_excel.json`,
> `n8n/sync_excel_postgres.json`, `n8n/subir_imagenes_cloudinary.json`) — no hay integración entre
> ese N8N y el backend .NET, son procesos separados que solo comparten la misma base Postgres.

---

## PASO 1 – Levantar la base de datos (Docker)

> **Un solo comando. No requiere instalar PostgreSQL.**

```bash
docker compose up -d
```

Esto levanta automáticamente:
- **PostgreSQL 16** en `localhost:5433` — con el schema ya aplicado al arrancar
- **pgAdmin 4** en `http://localhost:5050` — panel visual de la BD, ya configurado

### Credenciales de PostgreSQL

| Campo        | Valor            |
|---|---|
| Host         | `localhost`      |
| Puerto       | `5433`           |
| Base de dato | `heliteb`        |
| Usuario      | `heliteb_user`   |
| Contraseña   | `Heliteb2026!`   |

### Credenciales de pgAdmin

| Campo    | Valor                  |
|---|---|
| URL      | http://localhost:5050  |
| Email    | `admin@heliteb.co`     |
| Password | `Heliteb2026!`         |

El servidor de PostgreSQL ya aparece configurado automáticamente en pgAdmin al abrirlo.

### Comandos útiles de Docker

```bash
docker compose up -d        # Iniciar contenedores
docker compose down         # Detener contenedores (datos se conservan)
docker compose down -v      # Detener Y borrar todos los datos
docker compose logs -f      # Ver logs en tiempo real
```

---

## PASO 2 – Backend .NET + Panel Astro

El backend real (API, agente, envío de WhatsApp/Kommo) es el contenedor
`heliteb-api`, levantado por `docker compose up -d` en el paso 1 — no hace
falta correr nada aparte para el backend.

El panel (`heliteb-panel/`, Astro + React) requiere Node aparte:

```bash
cd heliteb-panel
npm install     # solo la primera vez
npm run dev     # http://localhost:4321
```

Login con el WhatsApp de un asesor ya registrado en la tabla `asesores`
(recibe un código OTP por correo). El panel habla siempre con el backend
a través de su propio proxy autenticado — no hay URLs que configurar a mano.

---

## PASO 3 – N8N (solo Excel/imágenes, opcional)

N8N ya **no** corre el agente ni el canal de WhatsApp (eso vive en
`backend-dotnet/Heliteb.Agent`, activo automáticamente con el paso 1). Los
workflows en `n8n/tools/*` y `n8n/whatsapp_agente.json` son la versión vieja,
ya no se usan — se mantienen en el repo solo como referencia histórica.

Los dos workflows que **sí siguen activos**, si necesitas cargar un catálogo
nuevo (ver PASO 4):

- `n8n/sincronizacion_excel.json` / `n8n/sync_excel_postgres.json`
- `n8n/subir_imagenes_cloudinary.json`

Para importarlos: N8N → menú ☰ → Import from file. Necesitan una credencial
PostgreSQL propia (N8N → Credentials → New → PostgreSQL, mismos datos del
paso 1: host `localhost`, puerto `5433`, db `heliteb`, user `heliteb_user`).

### Gestión de memoria conversacional del bot

El agente (`.NET`) guarda cada turno en `conversacion_mensaje` (Postgres, no
en memoria de N8N) y arma la ventana de contexto por sesión/generación desde
ahí — ver `ConversationRepository` y `AgentOrchestrator`. La identidad y
verificación del asesor (tablas `asesores` / `asesor_auth`) se re-consulta en
cada turno relacionado con cotizar, nunca depende del historial de chat.

---

## PASO 4 – Cargar el catálogo

El panel ya no tiene una función de carga de Excel/imágenes (el backend .NET
no la implementa — ver la pestaña "Cargar catálogo" del panel, que lo explica).
Se hace corriendo los workflows de N8N directamente:

1. `n8n/sincronizacion_excel.json` / `n8n/sync_excel_postgres.json` — leen el
   Excel y hacen upsert en `productos`/`precios`/`inventario`.
2. `n8n/subir_imagenes_cloudinary.json` — sube las imágenes a Cloudinary.

Ejecutar manualmente desde la UI de N8N (no están conectados al backend .NET
ni se disparan solos).

---

## PASO 5 – Activar y usar el agente

El agente (`backend-dotnet/Heliteb.Agent`) ya está activo en cuanto el
contenedor `heliteb-api` está arriba — no hay nada que activar aparte.

1. Para probar sin WhatsApp: pestaña "Chat" del panel Astro
   (`http://localhost:4321`), habla directo con el mismo agente.
2. Para WhatsApp real: seguir la sección siguiente (InboxCRM + túnel público).

---

## Casos de uso para la demo

| Intención | Ejemplo de pregunta |
|---|---|
| Especificaciones | "¿Qué cámaras bullet tienen rango IR mayor a 50m?" |
| Precio MSRP | "¿Cuánto vale el DS-2CD2T47G2-L? ¿Cuánto con IVA?" |
| Stock por bodega | "¿Hay DS-2CD1023G0E-I en Bogotá o Barranquilla?" |
| Comparativa | "Compara el DS-2CD1023G0E-I con el DS-2CD1043G0-I" |
| Ventas cruzadas | "El cliente lleva 4 cámaras dome, ¿qué más le ofrezco?" |
| Cotización | "Genera una cotización para Seguridad Total S.A. con los códigos 311315990 y 311315672" |

---

## WhatsApp (Factor Diferenciador)

Se conecta a través de **InboxCRM** (`https://lumark.cloud`, CRM multicanal ya
en producción). InboxCRM corre en producción y necesita llegar al backend
.NET, que corre local — para eso se expone con un **túnel público** (ngrok,
dominio fijo, ver `start-heliteb.ps1`):

```powershell
C:\ngrok\ngrok.exe http --url=<tu-dominio-fijo>.ngrok-free.dev 5090
```

`start-heliteb.ps1` ya levanta el stack Docker + este túnel automáticamente al
iniciar sesión (tarea programada "HELITEB-Autostart"); solo hace falta correrlo
a mano si algo quedó caído.

1. En InboxCRM, crear/usar el workspace de HELITEB: Super Admin → Workspaces →
   "Crear workspace" (crea el workspace + el usuario propietario en un solo paso).
2. Generar la API key del workspace (todavía no hay botón en el panel para esto, se
   hace con una llamada directa):
   - Inicia sesión en `https://lumark.cloud/` con el usuario del workspace de HELITEB.
   - Abre la consola del navegador (F12 → Console) y ejecuta:
     ```js
     fetch('/api/apikeys', {
       method: 'POST',
       headers: {
         'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ name: 'HELITEB backend' })
     }).then(r => r.json()).then(console.log);
     ```
   - Copia el campo `key` de la respuesta (`incrm_...`) — **solo se muestra una vez**.
3. Pega esa clave en `.env` como `INBOXCRM_API_KEY` (raíz del repo) y reinicia
   `heliteb-api` (`docker compose up -d --build heliteb-api`) para que la tome.
4. Conectar en InboxCRM el canal de WhatsApp del workspace (QR/Evolution o Meta) desde
   su propio panel — InboxCRM ya resuelve cuál usar, HELITEB no necesita saberlo.
5. Activar el reenvío de mensajes entrantes hacia el backend .NET (con el mismo token del paso 2):
   ```js
   fetch('/api/webhook-settings', {
     method: 'PUT',
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ isEnabled: true, webhookUrl: '<URL pública de ngrok>/webhook/heliteb-whatsapp' })
   }).then(r => r.json()).then(console.log);
   ```

No se requiere instalar Evolution API ni configurar Meta directamente desde este
proyecto — eso ya lo resuelve InboxCRM.

---

## Normalización de tablas (para la sustentación)

| Tabla | Propósito | Equivalente en Odoo |
|---|---|---|
| `marcas` | Catálogo de marcas normalizadas | `res.partner` (proveedor) |
| `categorias` | Categorías jerárquicas | `product.category` |
| `productos` | Catálogo principal | `product.template` |
| `precios` | MSRP separado del producto | `product.pricelist.item` |
| `bodegas` | Sucursales con código oficial | `stock.warehouse` |
| `inventario` | Stock N:M producto–bodega | `stock.quant` |
| `cotizaciones` | Historial de cotizaciones generadas (folio, PDF, snapshot de productos en JSONB) | — |
| `asesores` / `asesor_auth` | Asesores autorizados a cotizar por WhatsApp y su verificación OTP (código, expiración, ventana de 12h) | — |
| `app_config` | Configuración persistente clave-valor (hoy: SMTP) | — |

**Por qué va más allá del esquema del PDF:**
El PDF tenía `marca` y `categoria` como texto libre en `productos`. La versión normalizada:
- Elimina duplicados y datos sucios ("HIKVISION" vs "Hikvision")
- Permite filtrar por marca sin `LIKE` (más rápido con índice)
- Mapea directamente a los modelos de Odoo campo por campo
- Escala para agregar datos extra por marca (logo, contacto, etc.)
