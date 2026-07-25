# Guía de instalación y despliegue en el VPS

> Nota: aunque este archivo vive dentro de `heliteb-panel/`, describe el despliegue
> de **todo el sistema** (Postgres, Ollama, la API .NET, este panel, y Caddy). Todos
> los comandos de esta guía se ejecutan desde la **raíz del repositorio** (un nivel
> arriba de esta carpeta), no desde dentro de `heliteb-panel/`.

Esta guía asume un VPS Ubuntu 22.04 o 24.04 **nuevo**, sin nada instalado, y va paso
a paso — cada paso trae el comando exacto para copiar y pegar, y cómo confirmar que
funcionó antes de seguir al siguiente. Está pensada para alguien que no ha trabajado
antes con este proyecto específico.

Si algo no funciona en un paso, **no sigas al siguiente** — revisa la sección
"Solución de problemas" al final antes de continuar.

---

## 0. Qué se va a instalar

Todo corre en contenedores Docker (nada se instala "suelto" en el sistema operativo,
excepto Docker mismo). Son 6 piezas:

| Contenedor | Qué hace |
|---|---|
| `heliteb_postgres` | Base de datos (catálogo, cotizaciones, asesores, conversaciones) |
| `heliteb_ollama` | Genera los "embeddings" para la búsqueda del catálogo |
| `heliteb_api` | El backend (.NET) — el agente de IA, el bot de WhatsApp, toda la lógica |
| `heliteb_panel` | El panel web para los asesores (Astro, este mismo proyecto) |
| `heliteb_pgadmin` | Interfaz visual para ver la base de datos (opcional, para soporte) |
| `heliteb_caddy` | Recibe el tráfico de internet y lo reparte — también saca el candado HTTPS solo, automáticamente |

El agente de n8n para sincronizar sedes/garantías/reportes **no** vive en este VPS —
corre en `n8n.heliteb.co`, un servicio aparte que ya está configurado. Esta guía solo
cubre lo que va en este servidor.

---

## 1. Requisitos antes de empezar

- Un VPS con Ubuntu 22.04+ (mínimo 2 GB de RAM, 20 GB de disco — con 4 GB de RAM va
  más cómodo, sobre todo por Ollama).
- Acceso por SSH al VPS (usuario con permisos de `sudo`).
- Dos (sub)dominios apuntando a la IP del VPS, por ejemplo:
  - `panel.heliteb.co` → panel web para asesores
  - `api.heliteb.co` → solo para que InboxCRM/Kommo/n8n le hablen a la API

  Esto se configura en el proveedor donde está registrado el dominio (ej. Namecheap,
  GoDaddy, Cloudflare): un registro tipo **A** para cada subdominio, apuntando a la
  IP pública del VPS. Puede tardar unos minutos en propagarse.

- Los siguientes datos a la mano (te los da José Armando):
  - API key de DeepSeek y de Groq
  - API key de InboxCRM
  - La clave JWT y el secreto de sincronización con n8n (o generarlos tú, ver paso 5)

---

## 2. Conectarse al VPS y preparar el sistema

Conéctate por SSH:

```bash
ssh tu_usuario@IP_DEL_VPS
```

Actualiza el sistema:

```bash
sudo apt update && sudo apt upgrade -y
```

**Verificación:** el comando debe terminar sin errores en rojo.

---

## 3. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Cierra la sesión SSH y vuelve a conectarte (para que el cambio de permisos aplique):

```bash
exit
ssh tu_usuario@IP_DEL_VPS
```

**Verificación:**

```bash
docker --version
docker compose version
```

Ambos comandos deben mostrar un número de versión, no un error.

---

## 4. Descargar el proyecto

Descarga el .zip del repositorio de GitHub (José Armando te da el link) y súbelo al
VPS, o descárgalo directo desde el servidor:

```bash
cd ~
curl -L -o heliteb.zip "URL_DEL_ZIP_QUE_TE_DIERON"
sudo apt install -y unzip
unzip heliteb.zip
cd PruebaTecnicaHeliteb*    # el nombre exacto de la carpeta puede variar
```

**Verificación:** `ls` debe mostrar, entre otras cosas, `docker-compose.yml`,
`backend-dotnet/`, `heliteb-panel/`, `sql/`. Todos los pasos siguientes se corren
parados en esta carpeta (la raíz del repo).

---

## 5. Configurar las variables de entorno (`.env`)

Este es el paso más importante — aquí van todos los secretos.

```bash
cp .env.example .env
nano .env
```

Reemplaza cada `CHANGE_ME` con el valor real (el archivo `.env.example` explica de
dónde sale cada uno). Para las claves que tú mismo generas (`JWT_SIGNING_KEY`,
`N8N_SYNC_SECRET`), puedes usar:

```bash
openssl rand -base64 32
```

Corre ese comando dos veces (una para cada clave) y pega el resultado.

Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.

**Verificación:**

```bash
grep CHANGE_ME .env
```

Este comando **no debe mostrar nada** — si muestra algo, quedó un valor sin llenar.

---

## 6. Configurar los dominios en Caddy

Abre el archivo `Caddyfile` (ya viene armado, solo hay que confirmar que los
dominios coinciden con los que pusiste en `.env`):

```bash
cat Caddyfile
```

No hace falta editarlo — Caddy lee `PANEL_DOMAIN` y `API_DOMAIN` directo del `.env`
que ya configuraste. Solo confirma que esos dos dominios **ya apuntan** (DNS) a la
IP de este VPS antes de seguir (puedes verificarlo con `ping panel.tudominio.com`
desde tu propio computador).

---

## 7. Abrir los puertos necesarios (firewall)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Confirma cuando pregunte (`y`).

**Verificación:**

```bash
sudo ufw status
```

Debe mostrar `22`, `80` y `443` como `ALLOW`.

> Nota: el resto de puertos (5090 de la API, 5050 de pgAdmin, 5433 de Postgres) NO
> se abren al público — solo son accesibles desde dentro del propio VPS. Eso es
> intencional, es más seguro así. Si necesitas entrar a pgAdmin desde tu
> computador, usa un túnel SSH en vez de abrir el puerto (pregúntale a José Armando
> cómo si lo necesitas).

---

## 8. Levantar todo

```bash
docker compose up -d --build
```

Esto va a tardar varios minutos la primera vez (construye las imágenes y descarga
Postgres/Ollama). No lo interrumpas.

**Verificación:**

```bash
docker compose ps
```

Los 6 contenedores deben decir `Up` (o `Up (healthy)` para el de Postgres). Si
alguno dice `Restarting` o `Exited`, algo falló — revisa sus logs:

```bash
docker compose logs -f heliteb-api      # o el nombre del que falló
```

(`Ctrl+C` para salir de los logs).

---

## 9. Descargar el modelo de embeddings de Ollama

Ollama arranca vacío — hay que decirle qué modelo usar (una sola vez):

```bash
docker exec heliteb_ollama ollama pull bge-m3
```

Esto tarda unos minutos (descarga ~1.2 GB). **Verificación:**

```bash
docker exec heliteb_ollama ollama list
```

Debe aparecer `bge-m3` en la lista.

---

## 10. Verificación final

Desde tu propio computador (no desde el VPS), abre en el navegador:

```
https://panel.tudominio.com/login
```

Debe cargar la pantalla de login (con candado HTTPS, sin advertencias). Si carga
pero da error al pedir el código, revisa que el `.env` tenga bien las credenciales
de correo (sección Configuración del panel, ya logueado, o pregunta a José
Armando por las credenciales SMTP ya guardadas en la base de datos).

Checklist final:

- [ ] `https://panel.tudominio.com/login` carga con HTTPS
- [ ] Puedes iniciar sesión con un asesor registrado
- [ ] La sección "Catálogo" muestra productos
- [ ] La sección "Recursos" muestra uso real de RAM/disco (no "no disponible")
- [ ] `docker compose ps` — los 6 contenedores en `Up`

---

## Mantenimiento

**Ver logs en vivo:**
```bash
docker compose logs -f
```

**Actualizar a una versión nueva del código:**
```bash
cd ~/PruebaTecnicaHeliteb*
git pull                      # si se clonó con git, o reemplaza el .zip descargado
docker compose up -d --build
```

**Backup de la base de datos:**
```bash
docker exec heliteb_postgres pg_dump -U heliteb_user heliteb > backup_$(date +%Y%m%d).sql
```
Guarda ese archivo `.sql` en un lugar seguro (fuera del VPS, idealmente).

**Reiniciar todo:**
```bash
docker compose restart
```

**Apagar todo (sin borrar datos):**
```bash
docker compose down
```
(los datos de Postgres quedan guardados en un volumen de Docker — `docker compose down -v` sí los borraría, no lo uses a menos que quieras empezar de cero).

---

## Solución de problemas comunes

**"docker: command not found"** → el paso 3 no se completó, o no cerraste/reabriste
la sesión SSH después de instalar Docker.

**Caddy no saca el candado HTTPS (error de certificado)** → el DNS del dominio
todavía no apunta al VPS, o tardó en propagarse. Espera 10-15 minutos y reinicia
Caddy: `docker compose restart caddy`.

**El panel carga pero no puede iniciar sesión / da error 500** → revisa que
`JWT_SIGNING_KEY` en `.env` no esté vacío ni sea el `CHANGE_ME` de ejemplo, y que el
contenedor `heliteb_api` esté `Up` (no reiniciando en bucle).

**El catálogo aparece vacío** → el catálogo se sincroniza desde un workflow de n8n
externo (no desde este VPS) — contacta a José Armando para correrlo.

**"Recursos" dice "no disponible"** → esto solo funciona en Linux (que es lo que
corre en el VPS). Si pasa en el VPS real y no en un entorno de prueba, revisa que
el contenedor `heliteb_api` tenga montado `/hostfs` (ya viene configurado en
`docker-compose.yml`, no debería faltar).

**Necesito ayuda que no está aquí** → contacta a José Armando Rodriguez
(jose.rodriguez@heliteb.co) con la salida completa de `docker compose logs` del
contenedor que está fallando.

---

## Desarrollo local del panel (para referencia técnica)

Estos comandos sí se corren dentro de `heliteb-panel/` (no en la raíz del repo),
y son para desarrollo, no para el despliegue en el VPS descrito arriba:

| Comando | Acción |
| :------ | :----- |
| `npm install` | Instala dependencias |
| `npm run dev` | Levanta el servidor de desarrollo en `localhost:4321` |
| `npm run build` | Compila para producción en `./dist/` |
| `npm run astro check` | Revisa tipos de TypeScript |
