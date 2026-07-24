# ISALWA OS — Product Blueprint Completo
### Sistema Operativo Comercial Empresarial para ISALWA S.R.L.
**Versión:** 1.0 — Blueprint pre-desarrollo  
**Fecha:** 24 julio 2026  
**Audiencia:** Propietaria / Dirección General  
**Idioma de producto (UI):** 100% Español (Bolivia)  
**Estado:** Diseño y arquitectura — **sin código**

---

# 0. Investigación pública de ISALWA (fuentes verificables)

## 0.1 Hechos confirmados

| Dato | Valor | Fuente |
|------|--------|--------|
| Razón social | ISALWA S.R.L. | BoliviaHub, Trabajos Diarios |
| Tipo societario | Sociedad de Responsabilidad Limitada | BoliviaHub |
| NIT / Matrícula de Comercio | 328376020 | BoliviaHub |
| Ubicación registrada | Porongo Nro. S/N, Provincia Andrés Ibáñez | BoliviaHub |
| Operación comercial referida | Santa Cruz de la Sierra, Santa Cruz, Bolivia | Trabajos Diarios |
| Teléfonos públicos | 71348865, 76303481 | BoliviaHub |
| Sector | Industrial / fabricación | Trabajos Diarios |
| Actividad principal | Fabricación de productos cerámicos sanitarios (inodoros, urinarios, tanques, lavamanos, etc.) y tanques plásticos; comercialización; comercio exterior (importaciones/exportaciones) | BoliviaHub (rubro registrado) |
| Categorías comerciales | Fábricas de plástico y PVC; empresas importadoras/exportadoras; materiales de construcción | BoliviaHub |
| Modelo de fuerza de ventas (inferido de oferta laboral) | Asesores de ventas de campo: licencia de conducir, disponibilidad para viajar, experiencia preferible en construcción/sanitarios; horario L–V 08:00–18:00, sábados según requerimiento | Oferta “Asesor de ventas” (Trabajos Diarios) |
| Actividad importadora | Comprador boliviano con operaciones de comercio exterior documentadas en 2024 | 52wmb (datos aduaneros agregados) |
| Socios comerciales import (mencionados) | edesa s.a.; yeso ceramico s.a. | 52wmb |
| Orígenes de suministro observados | Chile, Ecuador, Perú (entre otros) | 52wmb |
| Bienes importados observados (ejemplos) | Línea de mezclado y moldeado Fanaloza; matrices/moldes; materiales refractarios (placas, barras, cazoletas); muestras/productos Fanaloza (lavamanos, tanque de agua para inodoro); matriz WC Oasis | 52wmb |

## 0.2 No encontrado en fuentes públicas (crítico para branding)

| Elemento | Estado |
|----------|--------|
| Sitio web oficial | **No encontrado** |
| Logo oficial | **No encontrado** → usar **placeholder tipográfico** hasta recibir logo oficial |
| Paleta de marca oficial | **No encontrada** → paleta propuesta abajo como *recomendación de producto*, sujeta a validación con la propietaria |
| Catálogo público de productos | **No encontrado** |
| Redes sociales oficiales verificables | **No encontradas** |
| Reseñas de clientes públicas | **No encontradas** |
| Imágenes corporativas oficiales | **No encontradas** |
| Lista pública de distribuidores | **No encontrada** |
| Relación con marcas comerciales de consumidor (p. ej. menciones secundarias no verificadas) | **No afirmar** sin evidencia primaria |

## 0.3 Premisas de diseño (declaradas explícitamente)

Estas **no** son hechos públicos; se asumen para diseñar el sistema y deben validarse con la propietaria:

1. El negocio es **B2B + distribución** hacia ferreterías, constructoras, tiendas de acabados, instaladores y mayoristas en Santa Cruz y regiones aledañas.
2. La venta se apoya en **asesores de campo** con visitas, cotizaciones, seguimiento WhatsApp y cobranzas.
3. Existen **3 números corporativos de WhatsApp** (solicitado por la propietaria).
4. Hay **inventario físico** de sanitarios cerámicos y tanques plásticos, con precios negociados por cliente.
5. La propietaria necesita **visión ejecutiva en tiempo real**, no solo un CRM de contactos.
6. La facturación boliviana (SIN / NIT / facturación electrónica) será relevante a mediano plazo; el demo puede simularla sin integración legal real al inicio.
7. El nombre de producto interno propuesto es **ISALWA OS** (nombre comercial a validar).

---

# 1. Product Vision

**ISALWA OS** es el sistema operativo comercial de la empresa: la capa digital donde vive cada cliente, cada visita, cada cotización, cada precio histórico, cada conversación de WhatsApp y cada peso boliviano de ingreso pendiente.

No es “otro CRM”. Es el **centro de comando** de una fábrica-distribuidora de sanitarios que opera en terreno, cierra por relación y WhatsApp, y necesita disciplina operativa sin perder velocidad comercial.

### Promesa de producto
> “Todo lo que hoy está en la cabeza de los asesores, en chats de WhatsApp y en Excel… aparece aquí, ordenado, medible y accionable — en español, para Bolivia, hecho para ISALWA.”

### Norte de diseño (referencias de sensación, no de copia)
- **Salesforce** → profundidad Customer 360, pipeline, roles
- **HubSpot** → timeline y comunicación unificada
- **SAP Fiori** → seriedad industrial enterprise, densidad útil
- **Linear** → velocidad, claridad, microinteracciones premium

### Principio rector
**Una sola verdad operativa por cliente.** Si el asesor, la oficina y la propietaria miran perfiles distintos, el producto falló.

---

# 2. Target Users

| Segmento | Quién | Necesidad primaria |
|----------|-------|-------------------|
| Dirección | Propietaria / Gerencia General | Control, confianza, KPIs, alertas |
| Comercial | Gerente de ventas / Supervisor | Pipeline, territorio, desempeño del equipo |
| Campo | Asesor de ventas | Clientes, rutas, visitas, cotizar, WhatsApp |
| Atención | Operadores WhatsApp (números corporativos) | Cola de mensajes, SLA, historial |
| Administración | Créditos / cobranzas / facturación | Facturas, saldos, promesas de pago |
| Operaciones | Almacén / despacho | Disponibilidad, pedidos, entregas |
| Finanzas (fase 2) | Contabilidad | Reportes, conciliaciones |
| Marketing (fase 3) | Comunicación comercial | Segmentos, campañas |

**Usuario primario del demo:** la propietaria.  
**Usuario diario del producto real:** el asesor de campo + operadores WhatsApp.

---

# 3. User Personas

### Persona A — “La Propietaria” (demo hero)
- Quiere ver **hoy**: ventas, cobranzas, visitas hechas, WhatsApp sin responder, clientes en riesgo.
- Odia pedir reportes y esperar “hasta el lunes”.
- Éxito = abrir ISALWA OS y **saber si el negocio está sano en 10 segundos**.

### Persona B — “Carlos, Asesor de Campo”
- Recorre Santa Cruz / provincias; licencia de conducir; cierra en obra y ferretería.
- Necesita: mapa, última visita, últimos precios, stock aproximado, cotizar rápido, registrar visita en 20 segundos.
- Éxito = no perder una venta porque “no recordaba el precio que le dimos en marzo”.

### Persona C — “María, Supervisora Comercial”
- Asigna territorios, revisa pipeline, coaching.
- Necesita: ranking de asesores, cumplimiento de visitas, conversión cotización→pedido.

### Persona D — “Andrea, Operadora WhatsApp”
- Atiende 1–3 líneas corporativas.
- Necesita: cola unificada, SLA de respuesta, vincular chat a cliente, escalar al asesor dueño.

### Persona E — “Luis, Cobranzas”
- Vive de saldos vencidos y promesas.
- Necesita: aging de cartera, historial de pagos, recordatorios WhatsApp con plantillas.

### Persona F — “Sofía, Almacén” (fase 2)
- Confirma disponibilidad y despachos.
- Necesita: pedidos confirmados, reservas, alertas de stock crítico.

---

# 4. Business Goals

### Metas de negocio (owner)
1. Centralizar la relación con cada cliente (ficha + GPS + historial).
2. Profesionalizar cotizaciones y precios (últimos precios, no improvisación).
3. Visibilidad de ventas, facturas y cobranzas.
4. Asignación clara de asesores y territorios.
5. Disciplina de visitas con evidencia en campo.
6. WhatsApp corporativo medible (3 líneas, tiempos de respuesta).
7. Timeline único por cliente.
8. Convertir ISALWA de “empresa que vende” a “empresa que opera con sistema”.

### Metas de producto (plataforma)
- Reducir tiempo de cotización.
- Aumentar tasa de seguimiento post-visita.
- Bajar tiempo medio de primera respuesta WhatsApp.
- Reducir cartera vencida.
- Aumentar cobertura de visitas a clientes A/B.
- Crear data asset propietario (años de historia comercial).

### Metas del demo
- Que la propietaria diga: **“Esto lo necesito.”**
- Que cada pantalla se sienta **producto real de años**, no prototipo.
- Datos realistas de Santa Cruz / Bolivia (BOB, NIT, zonas, productos sanitarios).

---

# 5. Information Architecture

```
ISALWA OS
├── Inicio (rol-aware)
├── Comercial
│   ├── Clientes (Customer 360)
│   ├── Pipeline / Oportunidades
│   ├── Cotizaciones
│   ├── Pedidos
│   ├── Productos & Precios
│   └── Metas & Forecast
├── Campo
│   ├── Visitas
│   ├── Mapa GPS
│   ├── Rutas del día
│   └── Check-in / Evidencia
├── WhatsApp Center
│   ├── Bandeja unificada (3 líneas)
│   ├── SLA & Tiempos de respuesta
│   ├── Plantillas
│   └── Asignaciones
├── Finanzas Comerciales
│   ├── Facturas
│   ├── Cobranzas / Cartera
│   ├── Pagos
│   └── Condiciones de crédito
├── Operaciones (fase 2+)
│   ├── Inventario
│   ├── Despachos
│   └── Devoluciones
├── Inteligencia
│   ├── Dashboards
│   ├── Reportes
│   ├── Segmentación
│   └── BI / Análisis
├── Trabajo
│   ├── Tareas
│   ├── Calendario
│   ├── Notificaciones
│   └── Chat interno
├── Contenidos
│   ├── Archivos / Document Center
│   └── Catálogo / Materiales de venta
└── Administración
    ├── Usuarios & Roles
    ├── Territorios
    ├── Integraciones
    ├── Auditoría
    └── Configuración
```

### Entidades centrales
`Cliente` · `Contacto` · `UbicaciónGPS` · `Asesor` · `Visita` · `ConversaciónWhatsApp` · `Producto` · `ListaPrecios` · `Cotización` · `Pedido` · `Factura` · `Pago` · `Tarea` · `Actividad` · `Documento`

---

# 6. Complete Navigation Tree (UI en español)

```
ISALWA OS
│
├── 🏠 Inicio
│
├── 👥 Clientes
│   ├── Todos los clientes
│   ├── Cuentas A / B / C
│   ├── Sin visitar (N días)
│   ├── En riesgo
│   ├── Mapa de clientes
│   └── [Cliente]
│       ├── Resumen
│       ├── Perfil & GPS
│       ├── Contactos
│       ├── Timeline
│       ├── WhatsApp
│       ├── Visitas
│       ├── Cotizaciones
│       ├── Pedidos
│       ├── Facturas
│       ├── Precios negociados
│       ├── Archivos
│       └── Notas
│
├── 📈 Ventas
│   ├── Pipeline
│   ├── Cotizaciones
│   │   ├── Borradores
│   │   ├── Enviadas
│   │   ├── Aceptadas / Rechazadas
│   │   └── Vencidas
│   ├── Pedidos
│   ├── Últimos precios (explorador)
│   └── Metas del mes
│
├── 📍 Campo
│   ├── Mis visitas de hoy
│   ├── Planificar ruta
│   ├── Mapa en vivo
│   ├── Historial de visitas
│   └── Optimización de ruta (fase 2)
│
├── 💬 WhatsApp
│   ├── Bandeja (Todas / Línea 1 / 2 / 3)
│   ├── Sin asignar
│   ├── Fuera de SLA
│   ├── Dashboard de respuesta
│   ├── Plantillas
│   └── Números corporativos
│
├── 🧾 Cobranza
│   ├── Cartera
│   ├── Vencidos
│   ├── Promesas de pago
│   ├── Facturas
│   └── Aging
│
├── 📦 Productos
│   ├── Catálogo
│   ├── Familias (Inodoros, Lavamanos, Bidés, Tanques, Accesorios…)
│   ├── Stock (fase 2)
│   └── Listas de precio
│
├── ✅ Trabajo
│   ├── Tareas
│   ├── Calendario
│   └── Mentions
│
├── 📊 Inteligencia
│   ├── Panel Ejecutivo
│   ├── Panel Comercial
│   ├── Panel WhatsApp
│   ├── Panel Campo
│   ├── Reportes
│   └── Segmentos
│
├── 📁 Documentos
│
├── 🔔 Notificaciones
│
└── ⚙️ Ajustes
    ├── Mi perfil
    ├── Equipo & roles
    ├── Territorios
    ├── Integraciones
    ├── Seguridad
    └── Preferencias
```

**Nota de densidad:** navegación primaria colapsable estilo Linear/SAP; búsqueda global `⌘K` / `Ctrl+K` con comandos en español.

---

# 7. Feature Inventory

## 7.1 Must-have (solicitud owner + demo)
- CRM / gestión de clientes
- Perfil de cliente completo
- GPS por cliente (mapa + coordenadas + dirección)
- Asignación de asesor
- Cotizaciones
- Historial de ventas
- Últimos precios por cliente/producto
- Historial de facturas
- Tracking de visitas
- WhatsApp (3 números corporativos)
- Dashboard de tiempos de respuesta
- Timeline del cliente

## 7.2 Should-have (diferenciación inmediata)
- Customer 360
- Pipeline de oportunidades
- Pedidos (aunque facturación sea mock al inicio)
- Cartera / cobranzas básicas
- Tareas y recordatorios
- Notificaciones inteligentes
- Segmentación A/B/C + “sin visitar”
- Panel ejecutivo + panel comercial
- Archivos por cliente (PDF cotización, fotos visita)
- Calendario de visitas
- Plantillas WhatsApp
- Búsqueda global
- Modo offline parcial para campo (fase demo visual / fase 2 real)

## 7.3 Could-have (plataforma enterprise)
- Optimización de rutas
- Inventario y reservas
- Marketing / campañas
- Gamificación de asesores
- Forecast y BI avanzado
- Chat interno
- AI Assistant
- Automatizaciones (workflows)
- Integración facturación electrónica Bolivia
- App móvil nativa
- Portal del cliente (fase 3)

## 7.4 Won’t (inicialmente — ver sección Screens que NO deben existir)
- ERP de producción/fábrica completo
- Contabilidad general completa
- RH / nómina
- eCommerce B2C público
- Red social interna tipo Facebook

---

# 8. Module Prioritization

### P0 — Demo impresionante (construir primero)
1. Panel Ejecutivo (owner)
2. Customer 360 + Timeline
3. Mapa GPS de clientes
4. WhatsApp Center + SLA
5. Cotizaciones + últimos precios
6. Visitas de campo
7. Panel Comercial / KPIs asesores

### P1 — Sistema usable diario
8. Pipeline
9. Facturas + cobranza básica
10. Productos / listas de precio
11. Tareas + notificaciones
12. Roles & permisos reales
13. Documentos

### P2 — Escala operativa
14. Inventario / despachos
15. Optimización de rutas
16. Automatizaciones
17. Reportes avanzados / BI
18. App móvil reforzada

### P3 — Plataforma de futuro
19. AI Assistant
20. Marketing & segmentos avanzados
21. Gamificación
22. Portal B2B cliente
23. Multi-empresa / SaaS white-label (si se decide comercializar)

---

# 9. Recommended Tech Stack

> Orientado a producto premium, demo rico, y evolución a SaaS multi-millón.

| Capa | Recomendación | Por qué |
|------|---------------|---------|
| Frontend web | **Next.js (App Router) + TypeScript + React** | UX premium, SSR/SPA híbrido, velocidad de producto |
| Estilos | **Tailwind CSS + Design Tokens + CSS variables** | Consistencia + velocidad |
| Componentes | Librería propia **ISALWA UI** sobre Radix/shadcn patterns | Control total del look enterprise |
| Estado cliente | TanStack Query + Zustand (puntual) | Server state limpio |
| Mapas | Mapbox GL o Google Maps | GPS clientes + rutas |
| Charts | Recharts o Visx + motion | Dashboards creíbles |
| Motion | Motion (Framer Motion) | Microinteracciones Linear-grade |
| Backend | **NestJS** o **Next.js Route Handlers + servicio Node** | Estructura enterprise |
| API | REST + tRPC o OpenAPI | Tipado extremo a extremo |
| DB | **PostgreSQL** | Relacional, geo (`PostGIS`), serio |
| ORM | Prisma o Drizzle | Velocidad + claridad |
| Auth | Auth.js / Clerk / Auth0 + RBAC propio | Seguridad |
| Files | S3-compatible (Cloudflare R2 / AWS S3) | Documentos y fotos |
| Realtime | WebSockets / Supabase Realtime / Ably | WhatsApp inbox live |
| WhatsApp | **WhatsApp Cloud API (Meta)** | 3 números, webhooks, plantillas |
| Jobs | BullMQ + Redis | SLA, recordatorios, sync |
| Search | PostgreSQL FTS → Meilisearch/Typesense | ⌘K enterprise |
| Observability | OpenTelemetry + Sentry | Calidad SaaS |
| Mobile | PWA primero → React Native/Expo después | Campo rápido sin retrasar demo |
| Infra | Vercel/Cloud Run + managed Postgres | Escala |
| Demo data | Seed scripts realistas (BOB, zonas SCZ) | Credibilidad |

**No recomendar al inicio:** monolito PHP genérico, Sheets como backend, WhatsApp Web scraping (frágil e inseguro).

---

# 10. UI Component Library — “ISALWA UI”

### Fundamentos
- `Button`, `IconButton`, `ButtonGroup`
- `Input`, `Textarea`, `Select`, `Combobox`, `DatePicker`, `TimePicker`
- `Checkbox`, `Radio`, `Switch`, `Slider`
- `Badge`, `Tag`, `StatusPill` (estados de negocio)
- `Avatar`, `AvatarGroup`
- `Tooltip`, `Popover`, `DropdownMenu`, `ContextMenu`
- `Modal` / `Dialog`, `Drawer` / `Sheet`, `Toast` / `Sonner`
- `Tabs`, `SegmentedControl`
- `Table` (densidad enterprise) + `DataGrid` (filtros, sort, bulk)
- `EmptyState`, `Skeleton`, `Spinner`, `Progress`
- `Card` **solo** para contenedores interactivos (no decorativos)
- `CommandPalette` (`Buscar en ISALWA…`)
- `PageHeader`, `Breadcrumb`, `Sidebar`, `Topbar`
- `KPI Stat`, `TrendDelta`, `Sparkline`
- `Timeline`, `ActivityItem`
- `MapMarker`, `RoutePolyline`
- `ChatBubble`, `InboxRow`, `SLATimer`
- `QuoteLineEditor`, `PriceHistoryChip`
- `PermissionGate`

### Patrones de pantalla
- List + Detail split
- Customer 360 header sticky
- Dashboard mosaic (no “card soup”)
- Inbox tri-pane (lista / conversación / contexto cliente)

---

# 11. Design Language

### Personalidad
**Industrial-premium · Cerámica · Precisión · Calma operativa**

Sensación: porcelana bajo luz de showroom + sala de control de fábrica. Nada “startup púrpura”. Nada “template SaaS genérico”.

### Principios visuales
1. **Una composición por viewport** (especialmente Inicio Ejecutivo).
2. **Marca ISALWA presente** en login y shell (logo oficial cuando exista; tipografía wordmark mientras tanto).
3. **Densidad útil**, no vacíos decorativos.
4. **Jerarquía tipográfica fuerte**; números grandes solo para KPIs críticos.
5. **Superficies con atmósfera sutil** (gradientes de profundidad / textura cerámica muy ligera), no fondos planos muertos.
6. **Cero emojis** en UI de producto.
7. **Motion con propósito**: entrada de datos, cambios de estado, confirmaciones.
8. Español impecable (vosotros no; español latinoamericano neutro-boliviano: “usted” en copy formal, “tú” solo si se define tono cercano).

### Analogía de producto
Si Salesforce es un aeropuerto y Linear es un bisturí, ISALWA OS es una **sala de control industrial con la elegancia de un showroom de sanitarios de alta gama**.

---

# 12. Animations

| Momento | Animación | Intención |
|---------|-----------|-----------|
| Login → shell | Fade + leve rise del layout | Entrada “producto serio” |
| Cambio de módulo | Crossfade 120–180ms | Continuidad |
| KPI al cargar | Count-up + sparkline draw | Credibilidad de dato vivo |
| Apertura Customer 360 | Stagger de secciones | Premium |
| Nueva visita check-in | Pulse del pin en mapa + toast | Feedback de campo |
| Mensaje WhatsApp entrante | Slide row + badge bounce contenido | Urgencia controlada |
| SLA en rojo | Soft pulse del timer | Alerta sin histeria |
| Cotización enviada | Progress checklist animado | Ritual de cierre |
| Empty → data | Skeleton → content morph | Profesionalismo |

**Reglas:** respetar `prefers-reduced-motion`; nada de parallax excesivo; duración típica 120–240ms; easing `ease-out`.

---

# 13. Microinteractions

- Hover de filas de tabla: highlight sutil + affordance de acciones
- Focus rings accesibles (teclado)
- Drag para reordenar etapas del pipeline
- Swipe en móvil: “Completar visita” / “Llamar” / “WhatsApp”
- Copiar NIT / teléfono con feedback “Copiado”
- Pin GPS arrastrable en edición de ubicación
- Autocomplete de productos en cotización con preview de último precio
- Checkbox “Registrar visita” → expande campos de evidencia (foto, nota, resultado)
- Asignar conversación WhatsApp → avatar del asesor “entra” al hilo
- Favoritos de clientes A con estrella persistente

---

# 14. Color Palette

> **No hay paleta oficial pública.** Lo siguiente es **propuesta de producto** hasta recibir brand guidelines.

### Concepto
Porcelana · Carbón de horno · Esmalte verde-gris · Acento cobre industrial

| Token | Hex (propuesta) | Uso |
|-------|-----------------|-----|
| `--isalwa-porcelain` | `#F7F5F2` | Fondo base cálido-neutral (no cream “AI default”) |
| `--isalwa-white` | `#FFFFFF` | Superficies elevadas |
| `--isalwa-kiln` | `#1C2430` | Texto primario / sidebar |
| `--isalwa-slate` | `#3D4A5C` | Texto secundario |
| `--isalwa-mist` | `#E6EAF0` | Bordes / divisores |
| `--isalwa-glaze` | `#2F6F68` | Primario de marca (verde esmalte) |
| `--isalwa-glaze-deep` | `#1F4F4A` | Hover / énfasis |
| `--isalwa-copper` | `#B08A5B` | Acento premium (CTAs secundarios, highlights) |
| `--isalwa-success` | `#2F7D4A` | Estados OK |
| `--isalwa-warning` | `#C48A1A` | Atención |
| `--isalwa-danger` | `#B42318` | SLA roto / vencido |
| `--isalwa-info` | `#2E5A8C` | Información |

**Evitar deliberadamente:** púrpura/índigo SaaS, glow neon, dark mode por defecto (ofrecer dark como opción fase 2).

**Logo:** placeholder wordmark **ISALWA** en `kiln` + punto `glaze` hasta logo oficial.

---

# 15. Typography

| Rol | Familia propuesta | Notas |
|-----|-------------------|-------|
| Display / Brand | **Fraunces** o **Newsreader** (serif expresiva, no “terracotta brochure”) | Solo login, títulos hero ejecutivos |
| UI Sans | **Satoshi** o **Geist** / **Plus Jakarta Sans** | Producto diario |
| Números / KPIs | **IBM Plex Mono** o **Tabular Satoshi** | Alineación financiera |
| Fallback | system-ui stack documentado | Resiliencia |

**Escala:** 12 / 13 / 14 / 16 / 18 / 24 / 32 / 40  
**Pesos:** 400, 500, 600, 700  
**Regla:** nunca Inter/Roboto/Arial como voz de marca.

---

# 16. Spacing Rules

- Base unit: **4px**
- Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Densidad tabla: row height 40–44px desktop; 48px touch
- Page padding: 24px desktop / 16px mobile
- Sidebar: 240px expandida / 72px icon rail
- Max content width dashboards: 1440–1600px
- Gap entre KPI strip y contenido: 24px
- Radios: 6px controles, 10px paneles, **evitar rounded-full pills** salvo avatares

---

# 17. Iconography

- Set: **Lucide** o **Phosphor** (línea 1.5–1.75)
- Estilo: geométrico, industrial, consistente
- Tamaños: 16 / 20 / 24
- No icon packs mixtos
- Iconos de negocio propios: `Inodoro`, `Lavamanos`, `Tanque` solo si aportan; preferir abstracciones claras (`Package`, `MapPin`, `MessageCircle`)
- Estados de visita: iconografía semántica (planeada / hecha / fallida / reprogramada)

---

# 18. Dashboard Strategy

### Principio
Cada dashboard responde **una pregunta de negocio**, no “muestra widgets”.

### A) Panel Ejecutivo (propietaria) — pregunta: *¿El negocio está sano hoy?*
- Ventas del mes vs meta (BOB)
- Cartera vencida + % sobre total
- Cotizaciones abiertas / valor pipeline
- Visitas planificadas vs cumplidas (hoy/semana)
- WhatsApp: % dentro de SLA + conversaciones críticas
- Top 5 clientes en riesgo (sin compra / sin visita)
- Mapa calor de actividad comercial (Santa Cruz)

### B) Panel Comercial — *¿El equipo está vendiendo?*
- Ranking asesores (ventas, visitas, conversión)
- Embudo cotización → pedido → factura
- Ticket promedio / mix de productos
- Clientes nuevos vs reactivados

### C) Panel WhatsApp — *¿Estamos respondiendo a tiempo?*
- Primera respuesta mediana / p90
- Por línea (3 números)
- Por operador / por asesor
- Cola actual + fuera de horario
- Temas frecuentes (tags)

### D) Panel Campo — *¿Estamos en la calle?*
- Cobertura de clientes A/B
- Km / visitas / efectividad
- Check-ins fuera de geocerca (fraude suave)
- Rutas del día

### E) Panel Cobranzas — *¿Entra la plata?*
- Aging 0–30 / 31–60 / 61–90 / 90+
- Promesas de hoy
- Recuperación vs meta

**Datos del demo:** series de 12 meses, estacionalidad creíble (construcción), nombres de clientes bolivianos, montos en BOB con formato `Bs 12.450,00`.

---

# 19. Mobile Experience

**Usuario clave:** asesor + operador WhatsApp.

### Prioridades móvil
1. Check-in de visita + foto + nota
2. Ficha rápida de cliente + últimos precios
3. WhatsApp deep-link / inbox ligero
4. Cotización rápida (pocas líneas)
5. Navegación GPS al cliente (Apple/Google Maps)
6. Tareas del día

### UX móvil
- Bottom nav: Inicio · Clientes · Campo · WhatsApp · Más
- Acciones primarias con pulgar
- Offline: cola de visitas para sync
- Cámara nativa para evidencia
- Tipografía legible bajo sol (contraste alto)

---

# 20. Tablet Experience

**Usuario clave:** supervisora en sala / propietaria en reunión / showroom.

- Split view: lista clientes + detalle
- Pipeline kanban cómodo
- Mapa a pantalla casi completa
- Cotizador con teclado externo
- Presentación de Panel Ejecutivo en landscape (modo reunión)

---

# 21. Desktop Experience

**Usuario clave:** oficina, cobranza, análisis, configuración.

- Densidad alta, atajos de teclado
- Multi-panel WhatsApp
- Data grids con exportación
- Comparativos y reportes
- Administración de roles/territorios
- Command palette como músculo diario

**Atajos sugeridos:**  
`G luego C` → Clientes · `G luego W` → WhatsApp · `N luego V` → Nueva visita · `N luego Q` → Nueva cotización

---

# 22. Data Architecture

### Principios
- **Customer 360** como agregado de lectura
- Eventos de dominio append-only para Timeline (`activity_events`)
- Separar **datos operativos** (OLTP Postgres) de **analíticos** (vistas materializadas / warehouse liviano después)
- Multi-número WhatsApp como canales ligados a conversaciones
- Geo: `geography(Point, 4326)` con PostGIS
- Precios: historial inmutable (`price_observations`) — nunca overwrite silencioso
- Multi-tenant ready (aunque arranque single-tenant ISALWA): `organization_id` desde día 1 si hay visión SaaS

### Flujos de datos clave
1. Visita creada → timeline + KPIs campo  
2. Cotización aceptada → pedido (opcional) → factura  
3. WhatsApp inbound → match cliente por teléfono → cola → SLA clock  
4. Pago registrado → actualiza cartera + timeline  

### Privacidad
- Mensajes WhatsApp = datos sensibles
- Retención configurable
- Encriptación en tránsito (TLS) y en reposo
- Auditoría de accesos a fichas y chats

---

# 23. Suggested Database Structure (alto nivel)

> Esquema conceptual — no implementación.

### Core
- `organizations`
- `users`, `roles`, `permissions`, `user_roles`
- `territories`, `territory_users`
- `sales_reps` (perfil comercial ligado a `users`)

### Clientes
- `accounts` (clientes empresa)
- `contacts`
- `account_addresses`
- `account_locations` (GPS, geocerca radio)
- `account_assignments` (asesor owner + historial)
- `account_segments` / `tags`

### Catálogo
- `product_families`
- `products` (SKU, atributos sanitarios)
- `price_lists`
- `price_list_items`
- `account_price_overrides`
- `price_observations` (histórico de precios vendidos/cotizados)

### Comercial
- `opportunities` + `opportunity_stages`
- `quotes` + `quote_lines`
- `orders` + `order_lines`
- `invoices` + `invoice_lines`
- `payments`
- `payment_promises`
- `credit_terms`

### Campo
- `visits` (planificada/hecha, resultado, notes, photos)
- `visit_routes` / `route_stops`
- `gps_checkins`

### WhatsApp
- `wa_numbers` (3 corporativos)
- `wa_conversations`
- `wa_messages`
- `wa_assignments`
- `wa_templates`
- `wa_sla_policies` + `wa_sla_events`

### Colaboración
- `tasks`, `task_links` (polimórfico a account/quote/etc.)
- `calendar_events`
- `notifications`
- `internal_threads` / `internal_messages` (fase 2)
- `files` + `file_links`
- `notes`

### Sistema
- `activity_events` (timeline universal)
- `audit_logs`
- `automation_rules` + `automation_runs`
- `kpi_snapshots` (materializado diario)
- `feature_flags`

### Índices críticos
- teléfono normalizado Bolivia (`+591…`)
- NIT
- `account_id + created_at` en eventos
- geo index en locations
- `wa_conversations.status + sla_due_at`

---

# 24. Future AI Features

1. **Asistente ISALWA** — “¿Qué clientes A no se visitaron en 30 días?”
2. **Resúmenes de WhatsApp** — briefing diario por cliente
3. **Sugerencia de próximo precio** según historial y margen
4. **Predicción de churn / cliente en riesgo**
5. **Forecast de ventas** por asesor/territorio
6. **Borrador de cotización** desde nota de visita o chat
7. **Clasificación automática de intents** WhatsApp (precio, stock, reclamo, cobranza)
8. **Coaching del asesor** — insights semanales
9. **Extracción de datos** desde fotos de pedidos/notas manuscritas
10. **Respuesta sugerida** con tono ISALWA (humano aprueba)

**Regla ética:** AI sugiere; humanos deciden precios y créditos.

---

# 25. Future Automation Opportunities

| Trigger | Acción |
|---------|--------|
| Cliente A sin visita 21 días | Crear tarea + avisar asesor/supervisor |
| Cotización sin respuesta 5 días | Recordatorio WhatsApp plantilla + task |
| Factura a 7 días de vencer | Secuencia cobranza |
| SLA WhatsApp por romper (2 min) | Escalate a supervisor |
| Check-in fuera de radio GPS | Flag de revisión |
| Pedido confirmado | Reserva stock + tarea despacho |
| Pago recibido | Cerrar promesa + mensaje de gracias |
| Nuevo lead WhatsApp | Crear account borrador + asignar por territorio |
| Meta mensual < 70% a día 20 | Alerta ejecutiva |
| Stock crítico SKU top | Notificar comercial |

Motor: reglas + colas; UI de automatizaciones “si/entonces” en español.

---

# 26. Suggested Integrations

### Fase Demo (simuladas)
- WhatsApp mock inbox con datos realistas
- Mapas
- Export CSV/PDF

### Fase 1 Producto
- WhatsApp Cloud API (3 números)
- Google Maps / Mapbox
- Calendarios (Google)
- Email transaccional (Resend/SendGrid)
- Storage de archivos

### Fase 2 Bolivia-critical
- Facturación electrónica / integración contable local (según proveedor que use ISALWA)
- Pasarelas / conciliación bancaria (si aplica)
- SMS backup

### Fase 3
- Meta Lead Ads
- BI externo (Power BI / Metabase)
- ERP/producción (si se industrializa más)
- Telephony (click-to-call)

---

# 27. Security Considerations

- SSO opcional + MFA para dirección
- RBAC + ABAC (territorio / ownership)
- Encriptación TLS + at-rest
- Secretos en vault (nunca en repo)
- Hardening WhatsApp webhooks (firmas Meta)
- Rate limiting y anti-abuso
- Backup y disaster recovery
- Políticas de retención de chats
- Auditoría: quién vio cartera / chats / precios
- Cumplimiento razonable con protección de datos personales (Bolivia + buenas prácticas)
- Separación ambientes: demo / staging / prod
- Prevención de fuga: watermark en exports sensibles (opcional)

---

# 28. Permissions Model

### Modelo
**RBAC** (rol) + **scopes** (territorio, propios vs equipo vs global) + **object ACLs** puntuales.

### Permisos ejemplo (gramática)
`accounts.read` · `accounts.write` · `accounts.export`  
`quotes.approve` · `prices.view_cost` · `invoices.read` · `collections.manage`  
`wa.inbox` · `wa.assign` · `wa.templates.manage`  
`visits.checkin` · `reports.executive` · `admin.users`

### Reglas de oro
- Asesor ve **sus** clientes + conversaciones asignadas
- Supervisor ve **su territorio**
- Cobranzas ve dinero, no necesariamente todos los chats
- Propietaria ve **todo**
- Costos/márgenes: solo dirección y roles autorizados

---

# 29. Roles

| Rol | Descripción |
|-----|-------------|
| `Propietaria` | Acceso total, Paneles Ejecutivos |
| `Gerente Comercial` | Ventas, equipo, metas, reportes |
| `Supervisor de Zona` | Territorio, coaching, aprobaciones |
| `Asesor de Ventas` | Campo, clientes propios, cotizar |
| `Operador WhatsApp` | Inbox, SLA, asignación |
| `Cobranzas` | Cartera, promesas, follow-up |
| `Facturación` | Emisión/gestión facturas |
| `Almacén` | Stock, despachos (fase 2) |
| `Marketing` | Segmentos/campañas (fase 3) |
| `Auditor / Solo lectura` | Compliance |
| `Admin Sistema` | Usuarios, integraciones, seguridad |

---

# 30. Future Roadmap

### Horizonte 0 — Blueprint & Brand (ahora)
- Validar supuestos con propietaria
- Recibir logo/colores oficiales
- Definir catálogo real y territorios
- Aprobar alcance del demo

### Horizonte 1 — Demo Premium (4–8 semanas concepto)
- Shell + Design system
- Panel Ejecutivo
- Customer 360 + mapa
- WhatsApp Center (mock o sandbox)
- Cotizaciones + últimos precios
- Visitas
- Seed data creíble

### Horizonte 2 — Piloto interno (1 equipo comercial)
- Auth real + roles
- WhatsApp Cloud API producción
- Cotizaciones → pedidos
- Cobranzas básicas
- App móvil PWA campo

### Horizonte 3 — Operación completa
- Inventario/despachos
- Automatizaciones
- Facturación Bolivia
- BI

### Horizonte 4 — Plataforma
- AI Assistant
- Portal B2B
- Posible empaquetado SaaS para otras manufactureras/distribuidoras LATAM

---

# ENTREGABLES ADICIONALES DE DISEÑO

## Missing opportunities (oportunidades no pedidas pero de alto valor)

1. **Crédito y límite por cliente** — crítico en distribución B2B.
2. **Promesas de pago con disciplina** — cierra el loop comercial.
3. **Geocercas de visita** — confianza en field force.
4. **Historial de precios inmutable** — arma secreta contra erosión de margen.
5. **Modo Reunión Ejecutiva** — dashboard a pantalla completa para la propietaria.
6. **Score de salud del cliente** — visita + compra + deuda + WhatsApp.
7. **Kit de venta digital** — fichas técnicas PDF por SKU en la ficha.
8. **Control de muestras** — común en sanitarios.
9. **Devoluciones / roturas** — cerámica se rompe; el sistema debe saberlo.
10. **Knowledge base interna** — objeciones, instalación, garantías.

## Risks

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Scope creep “ERP completo” | Demo diluido | Congelar P0 |
| WhatsApp API / compliance Meta | Bloqueo inbox | Sandbox + plan B mock |
| Sin logo/brand real | Menos “mío” para la owner | Placeholder + sesión de brand ASAP |
| Datos demo poco creíbles | Pierde magia | Research de catálogo real con la empresa |
| Resistencia de asesores | Adopción baja | Mobile-first campo + beneficio claro |
| Doble carga (Excel + sistema) | Fracaso | Migración y apagado de Excel por módulo |
| Permisos mal diseñados | Fuga de precios/márgenes | RBAC estricto desde día 1 |
| GPS fraud / desconfianza | Conflicto laboral | Transparencia + geocerca razonable |
| Integración fiscal Bolivia compleja | Retrasos | Diferir a fase 2 con mock |

## Suggested improvements

- Nombrar el producto con la propietaria (ISALWA OS vs. otra marca interna).
- Workshop de 1 día: mapa de territorios + top 50 clientes reales (anonimizados en demo si hace falta).
- Definir SLA WhatsApp realista (ej. 5 min horario laboral).
- Definir taxonomía de productos real (familias/SKU).
- Acordar si el demo usa datos ficticios o realistas anonimizados.

## Screens that SHOULD exist (demo + producto)

1. Login / Welcome ISALWA  
2. Panel Ejecutivo  
3. Panel Comercial  
4. Lista de Clientes + filtros inteligentes  
5. Mapa de Clientes  
6. Customer 360 (Resumen)  
7. Timeline del Cliente  
8. Edición / ficha GPS  
9. Cotizador  
10. Historial de precios  
11. Detalle de cotización PDF preview  
12. Pipeline Kanban  
13. Visitas de hoy  
14. Detalle de visita + evidencia  
15. Planificador de ruta  
16. WhatsApp Inbox tri-pane  
17. Dashboard SLA WhatsApp  
18. Cartera / Aging  
19. Detalle de factura  
20. Catálogo de productos  
21. Metas del mes  
22. Tareas  
23. Notificaciones  
24. Configuración de equipo y roles  
25. Command Palette  

## Screens that should NOT exist (evitar en v1/demo)

- Feed social tipo muro
- Módulos HR/nómina
- MRP/producción de horno completo
- Contabilidad general de doble partida
- Tienda pública B2C
- Settings infinitos tipo enterprise bloat
- “AI chat” vacío sin acciones de negocio
- Dashboards genéricos con 20 cards sin narrativa
- Pantallas de gamificación infantil tempranas
- Multi-idioma UI (el producto es español; no gastar en i18n prematuro)

## User flows (principales)

### Flow A — Propietaria: “¿Cómo vamos?”
Login → Panel Ejecutivo → drill-down Cartera vencida → Cliente X → Timeline → Acción (asignar tarea cobranza).

### Flow B — Asesor: visita de campo
Inicio móvil → Mis visitas → Navegar → Check-in GPS → Nota + foto → Crear cotización → Enviar por WhatsApp → Marcar resultado.

### Flow C — WhatsApp inbound
Mensaje entra Línea 2 → Match por teléfono → Si hay owner, asignar → Timer SLA → Respuesta → Log en timeline → Si pide precio, abrir últimos precios.

### Flow D — Cotización → dinero
Cotización aceptada → Pedido → Factura → Promesa de pago → Pago → Cierre.

### Flow E — Cliente en riesgo
Regla detecta 45 días sin compra → Alerta supervisora → Tarea visita → Visita → Reactivación.

## Customer journey (cliente de ISALWA)

1. **Descubrimiento** — asesor visita / feria / recomendación / WhatsApp  
2. **Primera cotización** — precios, plazos, stock  
3. **Primera compra** — pedido + factura + despacho  
4. **Relación** — visitas periódicas, precios preferenciales  
5. **Servicio** — consultas WhatsApp, reclamos, reposición  
6. **Crédito** — condiciones, cobranza humana y sistemática  
7. **Lealtad / Expansion** — nuevas líneas (tanques, nuevos modelos)  
8. **Riesgo** — silencio, deuda, competencia → playbook de rescate  

ISALWA OS debe instrumentar **cada etapa** con datos y acciones.

## Recommended build order

1. Design tokens + shell + navegación  
2. Seed data + modelo Account/Product  
3. Customer 360 + Timeline  
4. Mapa GPS  
5. Cotizaciones + price history  
6. Visitas  
7. Panel Ejecutivo + Comercial  
8. WhatsApp Center (mock → API)  
9. Facturas + cobranza  
10. Roles  
11. Tareas/notificaciones  
12. Pulido motion / demo script  

## What should be developed first
**Customer 360 + Panel Ejecutivo + Visitas + Cotizaciones + WhatsApp SLA.**  
Eso es lo que hace decir “lo necesito”.

## What should wait
Inventario profundo, AI, portal cliente, gamificación, contabilidad, producción, marketing automation avanzado, app nativa (si PWA cubre campo).

## What would make this world-class

1. **Último precio siempre visible** en cotizar (obsesión de margen).  
2. **WhatsApp como sistema nervioso**, no como silo.  
3. **Campo con GPS honesto y UX de 20 segundos**.  
4. **Timeline que cuenta una historia humana del cliente**.  
5. **Panel de propietaria cinematográfico pero sobrio**.  
6. **Datos bolivianos creíbles** (BOB, NIT, zonas SCZ, rubro sanitarios).  
7. **Automatizaciones silenciosas** que ahorran seguimiento.  
8. **Permisos que protegen el margen**.  
9. **Sensación de producto “ya vivido”**: empty states, auditorías, historiales largos, detalles de borde.  
10. **Respeto por el tiempo de la gente de calle**.

---

# CRÍTICA DEL COMITÉ SENIOR DE PRODUCTO (auto-revisión)

## Veredicto
El blueprint es ambicioso y correctamente orientado a un **operating system comercial**, no a un CRM genérico. Es adecuado como norte. **No es aún un plan de ejecución cerrado**: falta validación con la propietaria, brand real y un corte brutal de alcance para el primer demo.

## Fortalezas
- Ancla el diseño en hechos públicos de ISALWA (fábrica de sanitarios, Santa Cruz/Porongo, fuerza de ventas de campo, importaciones industriales).
- Prioriza la emoción de la propietaria sin olvidar al asesor.
- WhatsApp + GPS + precios históricos es un tridente diferenciador localmente relevante.
- Declara honestamente lo que no se encontró (logo, web, catálogo).

## Debilidades / agujeros antes de implementar

1. **Brand gap:** sin logo/colores oficiales, el “premium” puede sentirse prestado. Riesgo alto de rechazo emocional.
2. **Catálogo desconocido:** sin SKUs reales, el demo puede oler a fake. Necesitamos lista de productos de la empresa.
3. **Modelo comercial no validado:** % ferretería vs constructora vs distribuidor; plazos de crédito; frecuencia de visita — todo asumido.
4. **WhatsApp es el riesgo técnico #1:** compliance, costos, calidad de sync, multi-número. El blueprint lo celebra; la ejecución puede doler.
5. **Exceso de módulos en visión:** puede seducir a construir demasiado. El comité exige un **Demo Script de 8 minutos** con solo 7 pantallas core.
6. **Falta métrica de éxito del piloto:** ¿qué número debe mejorar en 60 días? (ej. tiempo de respuesta, % clientes A visitados).
7. **Offline de campo subespecificado:** en Bolivia el dato móvil falla; sin estrategia offline real, la adopción de asesores cae.
8. **Cobranza puede ser más importante que pipeline** en una manufactura/distribución; el blueprint la pone bien, pero el demo a veces la subestima frente a “ventas bonitas”.
9. **Legal/datos personales:** chats y GPS de empleados requieren política interna clara antes de producción.
10. **Posicionamiento SaaS multi-millón vs herramienta interna:** si es solo para ISALWA, simplificar multi-tenant; si será producto, invertir en arquitectura desde el día 1 — hoy está a medias.
11. **No hay costeo del build:** un comité pediría orden de magnitud (demo vs MVP vs plataforma).
12. **Dependencia de “datos realistas sintéticos”:** sin workshop de datos, el wow se diluye.

## Condiciones para aprobar paso a implementación
- [ ] Logo oficial o autorización explícita de placeholder
- [ ] Validación de supuestos de negocio (1 sesión con propietaria)
- [ ] Lista real de familias de producto (aunque sea parcial)
- [ ] Definición de los 3 números WhatsApp y proceso actual de atención
- [ ] Alcance congelado P0 para demo
- [ ] Demo script de 8 minutos aprobado
- [ ] Criterios de éxito del piloto

## Recomendación del comité
**Aprobar la visión. No aprobar aún un build amplio.**  
Autorizar únicamente el **Horizonte 1 (Demo Premium P0)** tras cerrar brand + catálogo mínimo + script de demostración.

---

# ANEXO A — Guion corto del demo (propuesto)

1. Login — marca ISALWA  
2. Panel Ejecutivo — “hoy el negocio está así”  
3. Drill a cliente en riesgo en el mapa  
4. Customer 360 — timeline, deuda, últimos precios  
5. WhatsApp — conversación realista + SLA  
6. Cotización en 30 segundos con precio histórico  
7. Visita de campo registrada  
8. Cierre: “Todo esto, en un solo sistema.”

---

# ANEXO B — Naming

| Opción | Notas |
|--------|-------|
| **ISALWA OS** | Clara, enterprise (recomendada internamente) |
| ISALWA Central | Más cálida |
| ISALWA Control | Muy “sala de mando” |
| Orbita ISALWA | Más producto SaaS |

Validar con la propietaria.

---

# ANEXO C — Fuentes consultadas

- https://boliviahub.com/empresa/isalwa-srl-qrx  
- https://bo.trabajosdiarios.com/empresa/isalwa-srl  
- https://bo.trabajosdiarios.com/trabajo/3013835/asesor-de-ventas-en-santa-cruz  
- https://en.52wmb.com/buyer/62388328  

---

*Fin del Product Blueprint v1.0 — listo para revisión con la propietaria. Sin código.*
