-- =============================================================================
-- HELITEB SAS – Esquema PostgreSQL
-- Basado en el esquema oficial del PDF del reto técnico.
-- Extendido con normalización correcta y campos de compatibilidad con Odoo.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- TABLAS DE CATÁLOGO (normalización de marca y categoría)
-- Relación Odoo: res.partner (proveedor) y product.category
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marcas (
    id_marca     SERIAL PRIMARY KEY,
    nombre       VARCHAR(50)  UNIQUE NOT NULL,
    odoo_partner_id INT                          -- ID en res.partner de Odoo (proveedor)
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria  SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    id_padre      INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    UNIQUE (nombre, id_padre)
    -- Relación Odoo: product.category (categ_id)
);

-- -----------------------------------------------------------------------------
-- 1. TABLA DE PRODUCTOS Y ESPECIFICACIONES
-- Esquema base del PDF + normalización de marca/categoría + campos Odoo
-- Relación Odoo: product.template / product.product
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS productos (
    codigo_sap        VARCHAR(50)  PRIMARY KEY,
    id_marca          INT          REFERENCES marcas(id_marca),
    id_categoria      INT          REFERENCES categorias(id_categoria),
    linea             VARCHAR(100),
    serie             VARCHAR(100),
    sub_serie         VARCHAR(100),
    modelo            VARCHAR(100) NOT NULL,
    parametro_1       TEXT,
    parametro_2       TEXT,
    parametro_3       TEXT,
    descripcion       TEXT,
    modelo_etiqueta   VARCHAR(100),
    activo            BOOLEAN      DEFAULT TRUE,
    -- Campos de sincronización Odoo
    odoo_product_id   INT,                       -- product.template.id en Odoo
    odoo_default_code VARCHAR(50),               -- internal_reference en Odoo
    fecha_creacion    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    -- Embedding semántico (bge-m3, 1024 dim) para búsqueda multilingüe ES/EN del agente
    embedding         vector(1024)
);

CREATE INDEX IF NOT EXISTS idx_productos_embedding
  ON productos USING hnsw (embedding vector_cosine_ops);

-- Embedding generado con Gemini (gemini-embedding-001, forzado a 1024 dim para
-- coincidir con el mismo tipo de columna) - convive con el de Ollama/bge-m3 para
-- poder comparar cuál da mejores resultados de búsqueda antes de decidir cuál usar
-- en producción. Cuál de las dos columnas lee el agente lo decide Embeddings:Provider
-- en appsettings.json (ver ProductRepository).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS embedding_gemini vector(1024);

CREATE INDEX IF NOT EXISTS idx_productos_embedding_gemini
  ON productos USING hnsw (embedding_gemini vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- 2. TABLA DE PRECIOS (Nivel Usuario Final / MSRP)
-- Relación Odoo: product.pricelist.item
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS precios (
    id_precio           SERIAL PRIMARY KEY,
    codigo_sap          VARCHAR(50)    REFERENCES productos(codigo_sap) ON DELETE CASCADE,
    precio_msrp_cop     NUMERIC(15, 2) NOT NULL,
    -- Campos de sincronización Odoo
    odoo_pricelist_id   INT,                     -- product.pricelist.id en Odoo
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (codigo_sap)
);

-- -----------------------------------------------------------------------------
-- 3. TABLA DE BODEGAS / SUCURSALES
-- Relación Odoo: stock.warehouse / stock.location
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bodegas (
    id_bodega         SERIAL PRIMARY KEY,
    codigo_bodega     VARCHAR(10)  UNIQUE NOT NULL, -- Ej: "01", "03", "25"
    nombre_sucursal   VARCHAR(100) NOT NULL,
    ciudad            VARCHAR(50),
    activo            BOOLEAN      DEFAULT TRUE,
    -- Campos de sincronización Odoo
    odoo_warehouse_id INT,                          -- stock.warehouse.id en Odoo
    odoo_location_id  INT                           -- stock.location.id en Odoo
);

-- -----------------------------------------------------------------------------
-- 4. TABLA DE INVENTARIO (Stock por Bodega)
-- Relación Odoo: stock.quant
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventario (
    id_inventario       SERIAL PRIMARY KEY,
    codigo_sap          VARCHAR(50) REFERENCES productos(codigo_sap) ON DELETE CASCADE,
    id_bodega           INT         REFERENCES bodegas(id_bodega)    ON DELETE CASCADE,
    cantidad_disponible INT         DEFAULT 0,
    -- Campos de sincronización Odoo
    odoo_quant_id       INT,                        -- stock.quant.id en Odoo
    fecha_actualizacion TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (codigo_sap, id_bodega)
);

-- -----------------------------------------------------------------------------
-- ÍNDICES – rendimiento en búsquedas del agente
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_productos_modelo     ON productos USING gin(to_tsvector('spanish', modelo));
CREATE INDEX IF NOT EXISTS idx_productos_descripcion ON productos USING gin(to_tsvector('spanish', coalesce(descripcion, '')));
CREATE INDEX IF NOT EXISTS idx_productos_marca       ON productos(id_marca);
CREATE INDEX IF NOT EXISTS idx_productos_categoria   ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_inventario_sap        ON inventario(codigo_sap);
CREATE INDEX IF NOT EXISTS idx_inventario_bodega     ON inventario(id_bodega);

-- -----------------------------------------------------------------------------
-- 5. COTIZACIONES — generadas por el agente, PDF alojado en Cloudinary
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cotizaciones (
    id               SERIAL PRIMARY KEY,
    folio            VARCHAR(40) UNIQUE NOT NULL,
    cliente          VARCHAR(200) NOT NULL,
    cliente_email    VARCHAR(200),
    asesor           VARCHAR(200),
    subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0,
    iva              NUMERIC(14,2) NOT NULL DEFAULT 0,
    total            NUMERIC(14,2) NOT NULL DEFAULT 0,
    productos_count  INT NOT NULL DEFAULT 0,
    productos_json   JSONB,
    pdf_url          TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_created_at ON cotizaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precios_sap           ON precios(codigo_sap);

-- -----------------------------------------------------------------------------
-- VISTA CONSOLIDADA – usada por el agente de IA para responder en una sola query
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vista_catalogo AS
SELECT
    p.codigo_sap,
    m.nombre                          AS marca,
    c.nombre                          AS categoria,
    p.linea,
    p.serie,
    p.sub_serie,
    p.modelo,
    p.parametro_1,
    p.parametro_2,
    p.parametro_3,
    p.descripcion,
    p.modelo_etiqueta,
    pr.precio_msrp_cop
FROM productos p
JOIN    marcas     m  ON p.id_marca     = m.id_marca
JOIN    categorias c  ON p.id_categoria = c.id_categoria
LEFT JOIN precios  pr ON p.codigo_sap   = pr.codigo_sap
WHERE p.activo = TRUE;

CREATE OR REPLACE VIEW vista_stock AS
SELECT
    p.codigo_sap,
    m.nombre                          AS marca,
    p.modelo,
    b.codigo_bodega,
    b.nombre_sucursal,
    b.ciudad,
    i.cantidad_disponible,
    pr.precio_msrp_cop
FROM inventario  i
JOIN productos   p ON i.codigo_sap  = p.codigo_sap
JOIN marcas      m ON p.id_marca    = m.id_marca
JOIN bodegas     b ON i.id_bodega   = b.id_bodega
LEFT JOIN precios pr ON p.codigo_sap = pr.codigo_sap
WHERE i.cantidad_disponible > 0
ORDER BY p.modelo, b.codigo_bodega;

-- -----------------------------------------------------------------------------
-- DATOS SEMILLA – Bodegas (extraído de los encabezados del Excel)
-- -----------------------------------------------------------------------------

INSERT INTO bodegas (codigo_bodega, nombre_sucursal, ciudad) VALUES
    ('01', 'STOCK-A. OBRERO',        'Montería'),
    ('03', 'STOCK-A. CENTRO',        'Montería'),
    ('04', 'STOCK-A. MONTERIA',      'Montería'),
    ('08', 'STOCK-A. RIOHACHA',      'Riohacha'),
    ('09', 'STOCK-A. BARRANQUILLA',  'Barranquilla'),
    ('11', 'STOCK-A. CARTAGENA',     'Cartagena'),
    ('17', 'STOCK-A. SANTA MARTA',   'Santa Marta'),
    ('21', 'STOCK-A. SINCELEJO',     'Sincelejo'),
    ('25', 'STOCK-A. BOGOTA',        'Bogotá'),
    ('26', 'STOCK-BODEGA BQUILLA',   'Barranquilla')
ON CONFLICT (codigo_bodega) DO NOTHING;

-- Notas/reglas de negocio para el agente de IA, editables sin tocar código.
-- Se inyectan en el system prompt en cada turno; permiten dar feedback al bot
-- (ej. "siempre menciona la garantia de 1 año") desde el panel, no desde el código.
CREATE TABLE IF NOT EXISTS agente_notas (
  id          SERIAL PRIMARY KEY,
  contenido   TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuración de la aplicación (SMTP y otros ajustes persistentes, key-value)
CREATE TABLE IF NOT EXISTS app_config (
  clave       VARCHAR(50) PRIMARY KEY,
  valor       JSONB NOT NULL,
  actualizado TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asesores comerciales y autenticación por código (OTP) para cotizar por WhatsApp
CREATE TABLE IF NOT EXISTS asesores (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  telefono      VARCHAR(20)  NOT NULL UNIQUE,
  -- Login del panel: PBKDF2 serializado (ver Pbkdf2PasswordHasher).
  -- NULL = el asesor existe para el bot pero aun no puede entrar al panel.
  password_hash VARCHAR(255),
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_asesores_email ON asesores (LOWER(email));

-- Asesor administrador del panel: se siembra en una instalación nueva para que
-- siempre haya alguien que pueda ingresar sin tener que crearlo a mano por API.
-- Rotar esta contraseña inmediatamente tras el primer ingreso a producción,
-- vía POST /api/auth/cambiar-password.
INSERT INTO asesores (nombre, email, telefono, password_hash, activo) VALUES
    ('Jose Armando Rodriguez', 'jose.rodriguez@heliteb.co', '573104157712',
     'pbkdf2$210000$AeO6fjI6lU8PTOprI06+bg==$Bj15n/SNdSNGqTErFpDvw3UaBxmJeIOjFggaCDuQJQo=', TRUE)
ON CONFLICT (telefono) DO NOTHING;

CREATE TABLE IF NOT EXISTS asesor_auth (
  telefono          VARCHAR(20) PRIMARY KEY,
  asesor_id         INT REFERENCES asesores(id) ON DELETE CASCADE,
  codigo            VARCHAR(10),
  codigo_expira     TIMESTAMPTZ,
  intentos          INT NOT NULL DEFAULT 0,
  verificado_hasta  TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- Memoria conversacional del agente .NET (reemplaza memoryBufferWindow + rotación
-- de sesión por static data que hacía el nodo "Parsear Mensaje" en n8n)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversacion_sesion (
  telefono          VARCHAR(20) PRIMARY KEY,
  generacion        INT NOT NULL DEFAULT 1,
  ultimo_mensaje_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre_contacto   VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS conversacion_mensaje (
  id          BIGSERIAL PRIMARY KEY,
  telefono    VARCHAR(20) NOT NULL,
  generacion  INT NOT NULL,
  role        VARCHAR(20) NOT NULL, -- user | assistant | tool
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversacion_mensaje_sesion
  ON conversacion_mensaje(telefono, generacion, created_at);

-- -----------------------------------------------------------------------------
-- INFORMACIÓN DE NEGOCIO — contactos, sedes, medios de pago y garantías.
-- Se consultan bajo demanda desde herramientas del agente (no se inyectan fijas
-- en el system prompt como agente_notas) para no inflar tokens en cada turno.
-- Fuente: carpeta InformacionEmpresa/ (ListaResponsables.xlsx, TABLA DE SEDES.xlsx,
-- MEDIOS DE PAGO HELITEB.pdf, POLITICAS DE GARANTIAS.pdf), reconciliada 2026-07-17.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contactos_empresa (
  id        SERIAL PRIMARY KEY,
  area      VARCHAR(100) NOT NULL,
  cargo     VARCHAR(150),
  nombre    VARCHAR(200) NOT NULL,
  correo    VARCHAR(200),
  telefono  VARCHAR(50),
  nota      TEXT
);

INSERT INTO contactos_empresa (area, cargo, nombre, correo, telefono, nota) VALUES
    ('Comercial / Asesores',            'Coordinador de Asesores',                    'Mario Rios',           'mario.rios@heliteb.co',        '3186527013', NULL),
    ('Logística',                       'Auxiliar Operativo de Compras y Logística',  'Carlos Fernandez',     'carlos.fernandez@heliteb.co',  '315 0800007', 'Encargado actual del área; cambiará con la contratación del Coordinador Logístico.'),
    ('Cartera',                         'Crédito y Cartera',                          'Mario Muñoz',          'mario.munnoz@heliteb.co',      '317 2185359', NULL),
    ('Contabilidad',                    'Contador',                                    'Andrea Hernández',     'andrea.hernandez@heliteb.co',  '315 5828749', NULL),
    ('Garantías',                       'Soporte de Garantías',                        'Jose Alejandro Avila', 'soporte.garantias@heliteb.com.co', '3113671126', NULL),
    ('Talento Humano',                  'Recursos Humanos',                           'Ingris Carrasquilla',  'ingris.carrasquilla@heliteb.co', '3154222420', NULL),
    ('Gestión Organizacional',          'Coordinador Administrativo y SST',           'Aura Guerra',          'aura.guerra@heliteb.co',        '3186711764', NULL),
    ('Compras y Abastecimiento',        'Gerente de Producto Senior',                 'Bleydis Ramirez',      'leydis.ramirez@heliteb.co',     '3180721458', NULL),
    ('Marketing',                       'Head Marketer',                              'Carolina Ramirez',     'e-commerce@heliteb.co',         '318 5984332', NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sedes (
  id         SERIAL PRIMARY KEY,
  ciudad     VARCHAR(100) NOT NULL,
  direccion  TEXT NOT NULL,
  telefono   VARCHAR(100)
);

INSERT INTO sedes (ciudad, direccion, telefono) VALUES
    ('Bogotá',       'Calle 22 No. 8-09, Edificio Yale P.H., Local comercial No. 3',                      '318 3732450 - 3181584610'),
    ('Cartagena',    'Cll. 32 #C10A - 21, Local 2',                                                        '3135817428 - 3178938355'),
    ('Santa Marta',  'Cl. 14 #6-81',                                                                       '3160248351 - 3155924453'),
    ('Riohacha',     'Cl. 7 #10-53, Local 2',                                                              '3177640842'),
    ('Montería',     'Cl. 29 #4-27, Local 1 y 2',                                                          '3158983526 - 3174402656'),
    ('Valledupar',   'Cra. 12 #N 13B-02, Barrio Obrero',                                                   '3167327445'),
    ('Valledupar',   'Cra. 11 #16a-60, Local 1, Centro',                                                   '3165233282 - 3152687363'),
    ('Sincelejo',    'Cl. 27 #19-35, Local 101, La María',                                                 '3243373019 - 3154329458'),
    ('Barranquilla', 'Carrera 43 N° 50-51, Centro Comercial Parque Central, Local A19',                    '3156029690 - 3160545393'),
    ('Barranquilla', 'Carrera 43 N° 50-51, Centro Comercial Parque Central, Local L185',                   '3150215892 - 3156084478')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS medios_pago (
  id           SERIAL PRIMARY KEY,
  medio        VARCHAR(100) NOT NULL,
  canal        VARCHAR(150),
  observacion  TEXT,
  validacion   TEXT
);

INSERT INTO medios_pago (medio, canal, observacion, validacion) VALUES
    ('Efectivo',                              'Punto físico',              'Disponible únicamente en las sedes.',                                                  'Validación inmediata con el asesor de ventas.'),
    ('Datáfono (débito y crédito)',           'Punto físico',              'Disponible únicamente en las sedes.',                                                  'Validación inmediata con el asesor de ventas.'),
    ('Código QR',                             'Punto físico y digital',    'El cliente puede escanear el código en la sede o recibirlo por medios digitales.',     'Validación inmediata con el asesor de ventas.'),
    ('Transferencia por Llave (Bre-B)',       'Digital',                   'Permite transferir usando la Llave registrada por la empresa, sin conocer el número de cuenta.', 'Requiere validación con tesorería (1-3 días hábiles si es desde otra entidad financiera).'),
    ('Transferencia bancaria – Bancolombia',  'Digital',                   'Transferencia directa a la cuenta Bancolombia de la empresa.',                          'Requiere validación con tesorería (1-3 días hábiles si es desde otra entidad financiera).'),
    ('Transferencia bancaria – Scotiabank Colpatria', 'Digital',           'Transferencia directa a la cuenta Scotiabank Colpatria de la empresa.',                 'Requiere validación con tesorería (1-3 días hábiles si es desde otra entidad financiera).'),
    ('Consignación bancaria – Bancolombia',   'Oficina bancaria o corresponsales', 'Consignación directamente a la cuenta Bancolombia de la empresa.',              'Requiere validación con tesorería.'),
    ('PSE',                                   'Página web',                'Pago desde cualquier entidad financiera mediante PSE.',                                 'Según confirmación de la plataforma financiera.'),
    ('Link de Pago OpenPay',                  'Digital',                   'Se genera a solicitud del cliente; permite pagar por PSE o tarjeta de crédito.',        'Según confirmación de la plataforma financiera.'),
    ('ADDI',                                  'Punto físico y página web', 'Pago financiado, sujeto a aprobación por parte de ADDI.',                               'Según confirmación de la plataforma financiera.'),
    ('Mercado Pago',                          'Landing page',              'Pago a través de la plataforma Mercado Pago.',                                          'Según confirmación de la plataforma financiera.'),
    ('Contraentrega',                         'Servientrega y Envía',      'Pago al momento de recibir el producto, sujeto a cobertura de la transportadora.',      'Al momento de la entrega.')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS garantias (
  id             SERIAL PRIMARY KEY,
  familia        VARCHAR(100) NOT NULL,
  marca          VARCHAR(100) NOT NULL,
  tipo_producto  VARCHAR(100) NOT NULL,
  meses          INT,
  observacion    TEXT
);

INSERT INTO garantias (familia, marca, tipo_producto, meses, observacion) VALUES
    -- FAMILIA CCTV
    ('CCTV', 'Hikvision', 'Cámara', 12, NULL),
    ('CCTV', 'Hikvision', 'DVR', 12, 'Excepción: DVR Serie 8/9 = 24 meses.'),
    ('CCTV', 'Hikvision', 'IP', 12, NULL),
    ('CCTV', 'Hikvision', 'Acceso', 12, NULL),
    ('CCTV', 'Hikvision', 'Alarmas', 12, NULL),
    ('CCTV', 'Hikvision', 'Cable', 24, NULL),
    ('CCTV', 'Hikvision', 'NVR Serie 8/9', 24, 'Excepción sobre el estándar de 12 meses.'),
    ('CCTV', 'Hikvision', 'PTZ', 24, 'Excepción sobre el estándar de 12 meses.'),
    ('CCTV', 'Hilook', 'Cámara', 12, NULL),
    ('CCTV', 'Hilook', 'DVR', 12, NULL),
    ('CCTV', 'Hilook', 'IP', 12, NULL),
    ('CCTV', 'EZVIZ', 'Cámara', 12, NULL),
    ('CCTV', 'EZVIZ', 'DVR', 12, NULL),
    ('CCTV', 'EZVIZ', 'Alarmas', 12, NULL),
    -- FAMILIA EQUIPOS ACTIVOS DE REDES
    ('Equipos Activos de Redes', 'TP-Link', 'Mercusys', 36, NULL),
    ('Equipos Activos de Redes', 'TP-Link', 'Accesorios y hogar inteligente', 6, NULL),
    ('Equipos Activos de Redes', 'TP-Link', 'Routers WISP', 24, NULL),
    ('Equipos Activos de Redes', 'TP-Link', 'Productos SMB', 12, NULL),
    ('Equipos Activos de Redes', 'TP-Link', 'Switch administrable y no administrable', 24, NULL),
    ('Equipos Activos de Redes', 'TP-Link', 'Switch POE', 24, NULL),
    ('Equipos Activos de Redes', 'Linksys', 'Toda la línea', 12, NULL),
    ('Equipos Activos de Redes', 'Aruba', 'Toda la línea', NULL, 'Garantía vitalicia siempre que el modelo no haya salido de producción.'),
    ('Equipos Activos de Redes', 'Ubiquiti', 'Toda la línea', 8, NULL),
    -- FAMILIA BATERIAS Y UPS
    ('Baterías y UPS', 'POWEST', 'UPS Online', 12, NULL),
    ('Baterías y UPS', 'POWEST', 'UPS Interactiva', 18, NULL),
    ('Baterías y UPS', 'POWEST', 'Baterías', 6, NULL),
    ('Baterías y UPS', 'POWEST', 'Reguladores', 6, NULL),
    ('Baterías y UPS', 'POWEST', 'Multitomas', 3, NULL),
    ('Baterías y UPS', 'POWEST', 'PDU', 12, NULL),
    ('Baterías y UPS', 'Newline', 'UPS Online', 12, NULL),
    ('Baterías y UPS', 'Newline', 'UPS Interactiva', 6, NULL),
    ('Baterías y UPS', 'Newline', 'Baterías', 6, NULL),
    ('Baterías y UPS', 'Newline', 'Reguladores', 3, NULL),
    ('Baterías y UPS', 'Newline', 'Multitomas', 1, NULL),
    ('Baterías y UPS', 'Mercury', 'Toda la línea', 1, NULL),
    ('Baterías y UPS', 'Unitec', 'Toda la línea', 6, NULL),
    -- FAMILIA DISCO DURO
    ('Disco Duro', 'Western Digital Purple', 'Disco duro', 24, NULL),
    ('Disco Duro', 'Toshiba', 'Disco duro', 3, NULL),
    ('Disco Duro', 'Western Digital Green/Gray/Blue/Black', 'Disco duro', 3, NULL),
    ('Disco Duro', 'Seagate', 'Disco duro', 3, NULL),
    -- FAMILIA EQUIPOS DE TELECOMUNICACIONES
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Cable', 12, NULL),
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Patch Cord', 12, NULL),
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Face Plate', 12, NULL),
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Jack', 12, NULL),
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Patch Panel', 12, NULL),
    ('Telecomunicaciones', 'Powest / Siemon / AMP / Panduit', 'Rack', 12, NULL),
    ('Telecomunicaciones', 'Draka', 'Cable Cat 5/6 (100% cobre)', 12, NULL),
    ('Telecomunicaciones', 'Miokke', 'Cable', 12, NULL),
    ('Telecomunicaciones', 'Miokke', 'Patch Cord', 6, NULL),
    ('Telecomunicaciones', 'Miokke', 'Jack', 6, NULL),
    ('Telecomunicaciones', 'Miokke', 'Patch Panel', 6, NULL),
    ('Telecomunicaciones', 'Miokke', 'Rack', 6, NULL),
    ('Telecomunicaciones', 'Fibra Óptica', 'Cable', 12, NULL),
    ('Telecomunicaciones', 'Fibra Óptica', 'Accesorios', 3, NULL),
    -- FAMILIA EQUIPOS ACCESORIOS CCTV
    ('Accesorios CCTV', 'General', 'Adaptador 12v (1.5Ah/2Ah/3Ah/5Ah/8Ah)', 3, 'Cambio inmediato, salvo evidencia de que el producto fue forzado, cortado o quemado.'),
    ('Accesorios CCTV', 'General', 'Video Balum', 1, 'Cambio inmediato, salvo evidencia de que el producto fue forzado, cortado o quemado.'),
    ('Accesorios CCTV', 'General', 'Bornera', 1, 'Cambio inmediato, salvo evidencia de que el producto fue forzado, cortado o quemado.'),
    ('Accesorios CCTV', 'General', 'Pulpo', 1, NULL),
    ('Accesorios CCTV', 'General', 'Conector RJ45', 1, 'Cambio inmediato, salvo evidencia de que el producto fue forzado, cortado o quemado.'),
    ('Accesorios CCTV', 'General', 'Cable BNC', 1, NULL),
    -- FAMILIA EQUIPOS SCI-SI-CE
    ('SCI-SI-CE', 'Kidde', 'Toda la línea', 24, NULL),
    ('SCI-SI-CE', 'DSC', 'Toda la línea', 12, NULL),
    ('SCI-SI-CE', 'Lynks', 'Toda la línea', 6, NULL),
    ('SCI-SI-CE', 'Linseg', 'Toda la línea', 12, 'Sensores de humo/calor: si la falla es por suciedad/polvo, quedan exentos de garantía (diagnóstico del depto. técnico de Heliteb).'),
    -- FAMILIA TUBOS Y CANALETAS
    ('Tubos y Canaletas', 'General', 'Tubos y canaletas', NULL, 'Garantía inmediata si: mantiene empaque original, color original y no está rayado.'),
    -- OTRAS FAMILIAS
    ('Otras', 'General', 'Computadores nuevos', 12, NULL),
    ('Otras', 'General', 'Computadores de segunda', 3, NULL),
    ('Otras', 'General', 'Impresoras', 12, NULL),
    ('Otras', 'General', 'Accesorios (mouse, teclado, diadema, microSD, USB, parlantes, cables VGA/HDMI)', 3, NULL)
ON CONFLICT DO NOTHING;

-- Asesor comercial de referencia en cada sede física — a quién debe acercarse el
-- cliente presencialmente (distinto del directorio de responsables por área).
CREATE TABLE IF NOT EXISTS asesores_sede (
  id        SERIAL PRIMARY KEY,
  sede_id   INT NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre    VARCHAR(200) NOT NULL,
  cargo     VARCHAR(150),
  correo    VARCHAR(200),
  telefono  VARCHAR(50)
);

INSERT INTO asesores_sede (sede_id, nombre, cargo, correo, telefono) VALUES
    (6,  'Erika Arias',        'Asesor Comercial',                        'ventas4@heliteb.com.co',        '3167327445'),
    (6,  'Erika Arias',        'Asesor Comercial',                        NULL,                            '3183355127'),
    (7,  'Marelvis Arias',     'Asesor Comercial',                        'ventas3@heliteb.com.co',        '3165233282'),
    (7,  'Yureinis Mora',      'Asesor Comercial',                        'yureinis.mora@heliteb.com.co',  '3152687363'),
    (4,  'Guimarys Cantillo',  'Asesor Comercial',                        'ventas17@heliteb.com.co',       '3177640842'),
    (3,  'Keidys Mercado',     'Asesor Comercial',                        'ventas8@heliteb.com.co',        '3155924453'),
    (9,  'Nubia Amaranto',     'Asesor Comercial',                        'ventas10@heliteb.com.co',       '3156029690'),
    (10, 'Angie Maldonado',    'Asesor Comercial Integral de Cuentas',    'angie.maldonado@heliteb.com.co', '3156084478'),
    (10, 'Giovanny Bastidas',  'Asesor Comercial',                        'ventas9@heliteb.com.co',        '3150215892'),
    (8,  'Luis Alberto Capachero', 'Asesor Comercial',                    'ventas19@heliteb.com.co',       '3243373019'),
    (5,  'Neiver Pulgar',      'Asesor Comercial',                        'ventas5@heliteb.com.co',        '3158983526'),
    (5,  'Roberto Acosta',     'Asesor Comercial',                        'ventas6@heliteb.com.co',        '3174402646'),
    (1,  'Cristian Bonilla',   'Asesor Comercial Integral de Cuenta',     'cristian.bonilla@heliteb.com.co', '3183732450'),
    (2,  'Karolay Castellano', 'Asesor Comercial',                        NULL,                            '3135817428')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS garantia_politicas (
  id         SERIAL PRIMARY KEY,
  categoria  VARCHAR(80) UNIQUE NOT NULL,
  contenido  TEXT NOT NULL
);

INSERT INTO garantia_politicas (categoria, contenido) VALUES
    ('condiciones_generales', 'El periodo de garantía inicia desde la fecha de elaboración de la factura. No existen excepciones sobre los tiempos estipulados. La devolución del dinero solo aplica bajo las condiciones específicas del documento de políticas. Los productos con descuento, rebaja o carácter promocional también están sujetos a estas reglas.'),
    ('que_cubre', 'La garantía cubre daños o mal funcionamiento por defectos de fábrica dentro del periodo de garantía.'),
    ('que_no_cubre', 'No cubre: productos con garantía expirada; accidentes o golpes; manipulaciones no autorizadas de hardware/software; exposición a ambientes corrosivos o extremos; daños eléctricos por sobretensión/sobrecarga/cortocircuito; fuerza mayor o caso fortuito; instalación, uso o mantenimiento inadecuado; reparaciones por personal no autorizado; transporte inadecuado; intrusión de agua, polvo, arena, insectos o roedores; virus o malware; mal servicio del operador de Internet; apertura de sellos de seguridad.'),
    ('plazos_atencion', 'Heliteb tiene 48 horas para diagnosticar el producto e iniciar el trámite formal ante la casa matriz. Si la compra fue hace menos de 48 horas y el daño es defecto de fábrica (no mal uso), se hace cambio inmediato — esto NO exime del plazo de 48 horas para la respuesta formal. Una vez tramitada la garantía, la casa matriz tiene hasta 15 días hábiles para responder. El desbloqueo de un producto (si aplica) es gratuito una sola vez durante la garantía vigente.'),
    ('devoluciones_cambios', 'El cliente tiene hasta 30 días calendario después de la entrega/factura para solicitar devolución de dinero o cambio de producto. No se aprueban devoluciones de productos de requerimiento puntual (encargados para un pedido específico, sin stock propio), salvo que la entrega demore más del plazo establecido (no inferior a 15 días), caso en el cual sí procede la devolución del dinero. Si no hay stock físico para reponer un producto en garantía y el cliente elige uno de menor precio, el excedente se devuelve solo si se reclama dentro de los 3 días hábiles siguientes a la aprobación de la Nota Crédito (NC); pasado ese plazo, queda como saldo a favor. No es obligatorio presentar factura para solicitar devolución o cambio.'),
    ('exoneracion_devolucion', 'No aplica devolución/cambio si: el tiempo de cobertura venció; el producto fue usado; se abrieron los sellos de seguridad; falta el empaque original. Video Balum, RJ45, Borneras, Adaptadores 12v-1Ah y cable UTP/Fibra Óptica ya usado NO aplican para devolución o cambio. Borneras y RJ45 solo se devuelven en cantidades mayores a 20 unidades, no por unidad individual. No se aceptan devoluciones de productos en promoción o remate.'),
    ('motivos_devolucion', 'Motivos válidos para solicitar devolución o cambio: el cliente se arrepiente de la compra; el producto no cumple con sus funciones.'),
    ('excepciones_garantia', 'Si la falla se repite, el cliente puede elegir entre una nueva reparación, devolución total/parcial del dinero, o cambio parcial/total por un producto de la misma especie o características similares (nunca inferiores). A un mismo producto no se le pueden hacer más de 2 reparaciones por la misma falla — en ese caso procede Nota Crédito o devolución total/parcial del dinero. Las partes/repuestos usados en una reparación pueden ser de igual o mejor calidad, no necesariamente idénticos a los originales.'),
    ('importante_general', 'Si el producto ya no tiene garantía vigente y el cliente quiere repararlo, asume todos los costos (fletes, reparación, cambio de partes). La verificación del estado físico/empaques/accesorios en la entrega es responsabilidad del vendedor. Toda factura debe llevar el serial del producto sin excepción; si falta, los costos asociados (fletes, traslados) los asume el asesor comercial. Las demoras internas en el trámite de garantía son responsabilidad de quien las causó, quien debe asumir los costos asociados.'),
    ('constancias_procedimiento', 'Todo ingreso de producto a garantía requiere: constancia de recibido firmada por el cliente, bitácora por sede (consistente con la del depto. de garantías) por hasta 3 años, y el formato oficial de garantías diligenciado (fecha de ingreso, diagnóstico inicial, descripción de reparación, fecha de cierre, número y fecha de factura, serial). Responsables: información del cliente = asesor comercial; verificación logística = Jefe de Logística; verificación técnica = departamento técnico; verificación con casa matriz = departamento de garantías.')
ON CONFLICT (categoria) DO NOTHING;

-- Monitoreo de recursos del VPS: muestras periódicas de RAM/disco/carga de CPU,
-- tomadas por un servicio en segundo plano dentro de Heliteb.Api (ver
-- SystemResourcesSampler), para poder ver consumo histórico por hora en el panel
-- ("Recursos") y en el reporte diario que llega por correo a las 8:15 AM.
CREATE TABLE IF NOT EXISTS recursos_muestra (
  id              SERIAL PRIMARY KEY,
  medido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ram_total_mb    INT,
  ram_usado_mb    INT,
  disco_total_gb  NUMERIC(10,2),
  disco_usado_gb  NUMERIC(10,2),
  cpu_load_1m     NUMERIC(6,2)
);
CREATE INDEX IF NOT EXISTS idx_recursos_muestra_medido_en ON recursos_muestra (medido_en);

-- Una fila por cada llamada real a un proveedor de embeddings (Ollama, gratis y
-- local; Gemini, de pago) - registrada por el cliente correspondiente
-- (GeminiEmbeddingClient/OllamaEmbeddingClient) para poder comparar cuánto se llamó
-- cada uno y estimar el costo real de Gemini antes de decidir cuál dejar en
-- producción. costo_estimado_usd siempre es 0 para "ollama" (self-hosted, sin
-- facturación por uso); tokens_estimados es una aproximación (caracteres/4), no el
-- conteo exacto que factura Google - la API de embeddings de Gemini no devuelve el
-- conteo real de tokens en la respuesta.
CREATE TABLE IF NOT EXISTS embedding_uso (
  id                  SERIAL PRIMARY KEY,
  proveedor           VARCHAR(20)  NOT NULL,
  caracteres          INT          NOT NULL,
  tokens_estimados    INT          NOT NULL,
  costo_estimado_usd  NUMERIC(10,6) NOT NULL DEFAULT 0,
  creado_en           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_embedding_uso_creado_en ON embedding_uso (creado_en);
CREATE INDEX IF NOT EXISTS idx_embedding_uso_proveedor ON embedding_uso (proveedor);
