# HELITEB — API del agente comercial

Guía para integrar un sistema externo (un CRM, un chat web, otro agente) con el
bot vendedor de HELITEB SAS. Todo lo que está aquí está verificado contra
producción, no es un diseño propuesto.

---

## 1. Qué es este sistema

HELITEB SAS distribuye videovigilancia (HIKVISION y EZVIZ) en el Caribe
colombiano, con diez sedes. Este servicio es **un agente de ventas conversacional**:
recibe el mensaje de un cliente en lenguaje natural y responde como lo haría un
asesor — recomienda productos, dice precios reales, dice si hay existencias y en
qué sede, y arma cotizaciones.

Corre sobre ASP.NET 8, PostgreSQL con pgvector, y un LLM (DeepSeek por defecto,
Groq como alternativa). No es un chatbot de árbol de decisiones: cada turno el
modelo decide qué herramientas llamar contra la base de datos real.

**Qué sabe responder, con datos reales:**

| Tema | De dónde sale |
|---|---|
| Catálogo, fichas y precios | Lista de precios del proveedor (4.223 referencias) |
| Existencias por sede | Inventario de Odoo, sincronizado |
| Cotizaciones en PDF | Las genera y las sube a Cloudinary |
| Garantías, medios de pago, sedes | Tablas propias con las políticas de la empresa |

**Qué NO hace:** no cierra ventas, no cobra, no despacha. Cuando algo requiere
decisión humana, remite al asesor.

---

## 2. El endpoint

```
POST https://api.helitebdev.cloud/api/agente/mensaje
```

**Autenticación:** header `X-Api-Key` con la clave del entorno. No es un JWT y no
hay que renovarla. Si falta o está mal → `401`. Si el servidor no tiene clave
configurada → `503` (la API está deshabilitada en ese entorno).

**Petición** (JSON, snake_case):

```json
{
  "session_id": "crm-cliente-8842",
  "mensaje": "Necesito una cámara wifi para la entrada de mi casa",
  "nombre_contacto": "María Restrepo"
}
```

| Campo | Obligatorio | Para qué sirve |
|---|---|---|
| `session_id` | sí | Llave de la conversación. **El mismo id continúa la charla; uno nuevo la empieza de cero.** Máx. 80 caracteres. Usa un id estable por cliente. |
| `mensaje` | sí | El texto del cliente, tal cual lo escribió. |
| `nombre_contacto` | no | Si lo conoces, el agente saluda por el nombre. |

**Respuesta** (`200`):

```json
{
  "ok": true,
  "session_id": "crm-cliente-8842",
  "respuesta": "¡Con gusto! Te muestro las cámaras WiFi para exterior..."
}
```

`respuesta` viene con formato de WhatsApp: `*negrita*`, `_cursiva_`, saltos de
línea y emojis. Si tu canal no es WhatsApp, conviértelo antes de mostrarlo.

**Historial de una conversación:**

```
GET https://api.helitebdev.cloud/api/agente/historial?sessionId=crm-cliente-8842
```

Devuelve `mensajes[]` con `rol` (`user` / `assistant`), `contenido` y `fecha`.
Los mensajes internos de herramientas no se incluyen.

---

## 3. Ejemplo completo

```bash
curl -X POST https://api.helitebdev.cloud/api/agente/mensaje \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $HELITEB_API_KEY" \
  -d '{
        "session_id": "demo-001",
        "mensaje": "Tienen la DS-2CE16D0T-IRF? cuantas hay y en donde?"
      }'
```

Respuesta real de producción:

> ¡Sí, la tenemos! Es la **HIKVISION DS-2CE16D0T-IRF**, cámara bala Turbo HD de
> 2 MP con visión nocturna hasta 25 m (Smart IR), IP67 y señal 4 en 1.
>
> Se maneja con dos opciones de lente que comparten el mismo inventario:
> **2.8mm** — $100.022 · **3.6mm** — $98.069
>
> Hay **25 unidades** en total, todas en mostrador:
> Bogotá (A. BOGOTA) 11 · Cartagena (A. CARTAGENA) 10 · Valledupar (A. OBRERO) 4
>
> Como la referencia se maneja unificada en bodega, el asesor confirma el lente
> exacto al momento de despachar.

---

## 4. Cosas que hay que entender para no integrar mal

Estas no son sutilezas: son reglas del negocio que ya causaron errores reales.

**Los tiempos de respuesta son de segundos, no de milisegundos.** Entre 4 y 40
segundos según la pregunta: el agente hace varias llamadas al LLM y consulta la
base en el medio. Pon un timeout de **60 segundos como mínimo** y muestra un
indicador de "escribiendo". No reintentes por timeout corto: vas a duplicar la
conversación.

**Una llamada = un turno.** No mandes dos mensajes del mismo cliente en paralelo
con el mismo `session_id`; espera la respuesta del primero.

**Cuatro estados de disponibilidad, y no son lo mismo:**

- *En sede* — hay unidades en mostrador, entrega directa.
- *En bodega central* — hay, pero requiere traslado.
- *Agotado* — la manejamos, hoy en cero.
- *Bajo pedido* — no la tenemos; se le compra al proveedor. **El 78% del catálogo
  está aquí.** El agente ya lo dice explícitamente; no lo presentes como stock.

**Las sedes tienen nombre de barrio, no de ciudad.** `A. OBRERO` y `A. CENTRO`
son las **dos sedes de Valledupar**; `A. MONTERIA` es otra distinta. Si vas a
reformatear la respuesta, no deduzcas la ciudad: usa la que ya viene.

**Hay referencias que comparten inventario.** El proveedor factura un código SAP
por cada lente (2.8mm y 3.6mm son códigos distintos), pero en bodega son una sola
referencia. Cuando pasa eso, el agente reporta las unidades **una sola vez** y
avisa que el asesor confirma el lente. No sumes cantidades entre variantes: le
prometerías al cliente el doble de lo que hay.

**Los precios son MSRP en pesos colombianos, con IVA.** El agente tiene un
guardián que impide que mencione precios que no salieron de la base.

---

## 5. Errores

| Código | Qué pasó | Qué hacer |
|---|---|---|
| `400` | Falta `session_id` o `mensaje`, o el id excede 80 caracteres | Corregir la petición |
| `401` | `X-Api-Key` ausente o incorrecta | Revisar la clave |
| `503` | La API no tiene clave configurada en ese entorno | Avisar al equipo de HELITEB |
| `500` | Error interno; el cuerpo trae un `trace_id` | Reportar con ese `trace_id` |

---

## 6. Los otros canales (contexto)

El mismo agente atiende por tres puertas distintas. Todas comparten cerebro,
catálogo e historial:

1. **WhatsApp** — `POST /webhook/heliteb-whatsapp`, con firma HMAC. No devuelve la
   respuesta: la entrega él mismo por InboxCRM. Es el canal del cliente final.
2. **Panel del asesor** — `https://panel.helitebdev.cloud`, con login de asesor.
   Tiene el catálogo, las conversaciones, cotizaciones y un chat de prueba.
3. **Esta API** — para cualquier otro sistema.

Como el historial se guarda por `session_id`, si usas el número de teléfono del
cliente como id, tu integración y WhatsApp comparten la misma conversación.
Si prefieres mantenerlas separadas, usa un prefijo propio (`crm-`, `web-`).

---

## 7. Obtener la clave

La clave vive en `~/heliteb/.env` del servidor de producción, en la variable
`AGENT_API_KEY`. Se generó directamente allá para que no circule por chats ni
quede en historiales. Para leerla:

```bash
ssh root@<servidor> "grep '^AGENT_API_KEY=' ~/heliteb/.env"
```

Trátala como una contraseña: da acceso al agente completo, y cada llamada consume
tokens de LLM facturables. Si se filtra, se rota cambiando el valor en `.env` y
recreando el contenedor `heliteb-api`.
