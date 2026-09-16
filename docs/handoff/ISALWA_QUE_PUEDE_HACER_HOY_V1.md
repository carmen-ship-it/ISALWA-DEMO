# ISALWA — Qué puede hacer hoy (borrador V1)

**Estado del documento:** borrador fuente para edición humana senior · no PDF · no aceptación de usuaria/o  
**Fecha:** 2026-09-16  
**Runtime de referencia:** `23e50b0d7723040898f1c21ec06f014171ca8e24`  
**URL:** https://os-web-staging.onrender.com  

---

## Section A — HUMAN-FACING DRAFT

### La idea en una frase

Hoy ISALWA ya sirve para trabajar con **clientes, oportunidades, cotizaciones, trabajo, aprobaciones, compromisos e incidencias**, y para dejar memoria de lo que va pasando — con permisos por persona, sin inventar ubicaciones ni “ingresos” falsos.  
`[CURRENT HOSTED STATE]` · `[PILOT POLICY]`

### Lo que sí pueden usar en el piloto (Versión 1)

| Área | Qué pueden hacer, en lenguaje humano | Tag |
|---|---|---|
| **Inicio** | Ver lo que necesita atención según su rol (trabajo atrasado, aprobaciones, etc.). | `[CURRENT HOSTED STATE]` |
| **Clientes** | Buscar y abrir clientes; ver historial y datos del cliente (Cliente 360). | `[CURRENT HOSTED STATE]` |
| **Comercial** | Seguir oportunidades, cotizaciones y pedidos según permisos; PDF de cotización cuando aplique. | `[CURRENT HOSTED STATE]` |
| **Trabajo** | Ver y actualizar trabajo / seguimientos asignados. | `[CURRENT HOSTED STATE]` |
| **Aprobaciones** | Aprobar o rechazar con motivo cuando les toque. | `[CURRENT HOSTED STATE]` |
| **Compromisos** | Registrar promesas del tipo “te llamo el viernes” (distinto de una tarea genérica). | `[CURRENT HOSTED STATE]` |
| **Incidencias** | Reportar un problema (“Reportar problema”), seguir resolución y antecedentes — sin inventar la causa raíz. | `[CURRENT HOSTED STATE]` |
| **Feedback del producto** | Decirle al equipo de ISALWA qué duele en la herramienta (esto **no** es una incidencia de negocio). | `[CURRENT HOSTED STATE]` |
| **Administración** (si tienen permiso de personas) | Invitar, suspender, reasignar trabajo antes de dar de baja, revisar acceso — con cuidado. | `[CURRENT HOSTED STATE]` |
| **Sistema / salud** | Ver honestidad de estado del sistema (no es un panel de facturas). | `[CURRENT HOSTED STATE]` |
| **Mapa** | Ver cobertura honesta de ubicaciones (cuántos tienen coordenadas). Baldosas en vivo: **NOT LIVE** (aceptación FAIL — basemap en blanco). | `[CURRENT HOSTED STATE]` · `[NOT LIVE]` · `[PENDING]` |
| **Asistencia IA** | Opcional y limitada (resumir / preguntar / borrador). **No** aprueba, convierte, reasigna ni envía sola. Hoy: **NOT LIVE / HOSTED-UNPROVEN** (configurada, asistencia FAIL pendiente de patch). | `[PILOT POLICY]` · `[NOT LIVE]` · `[HOSTED-UNPROVEN]` · `[PENDING]` |

### Datos del piloto (mapa — honestidad)

De los clientes cargados para este piloto: **2 de 7** tienen coordenadas para mapa; **5** tienen solo enlace de procedencia. No se inventan puntos. MICRISTAL y TORREZ comparten un enlace: eso requiere confirmación de ustedes, no corrección automática.  
`[VERIFIED CURRENT FACT]` · `[BUSINESS DECISION REQUIRED]`

### Lo que todavía no es “el día a día completo”

Estas cosas existen en distintos grados de avance, o están a propósito fuera del piloto delgado. No son fallas de ustedes:

- Notificaciones por correo o WhatsApp desde ISALWA → **no** en este canal todavía. `[PILOT POLICY]` / `[FUTURE RECOMMENDATION]`
- WhatsApp como “ingresos” → **nunca**. Lo cotizado y lo pedido no se llaman Ingresos. `[PILOT POLICY]`
- Cobranza / despacho / inventario como módulos activos → no presentarlos como listos si no están conectados. `[CURRENT HOSTED STATE]` / `[FUTURE RECOMMENDATION]`
- Bandeja de notificaciones internas → aún no es el centro del piloto. `[CURRENT HOSTED STATE]`
- Producción formal (dominio de empresa, cuentas de empresa, recuperación dual completa) → **no evidenciada** aún. `[VERIFIED CURRENT FACT]`

### Cómo leer “parcial”

Si algo se ve, pero el texto dice “en preparación” o “no configurado”, créanle al texto. Preferimos una pantalla honesta a un mapa inventado.  
`[PILOT POLICY]`

---

## Section B — EDITOR/OWNER NOTES

| Tema | Tag | [Source] |
|---|---|---|
| Wave B Issue / Commitment / Feedback HOSTED BV | CURRENT HOSTED STATE | [Source: `WAVE_B_ISSUE_MEMORY_ACCEPTANCE.md` CONDITIONAL PASS; control-tower PRODUCT INTELLIGENCE HOSTED PASS on `23e50b0`] |
| Wave A admin continuity technical close | CURRENT HOSTED STATE | [Source: `WAVE_A_ADMIN_CONTINUITY_ACCEPTANCE.md`] |
| Map tiles LIVE | NOT LIVE · PENDING | [Source: `~/.isalwa-secrets/_verifier-mapbox-out/mapbox-acceptance-fresh.json` verdict FAIL `basemapOk:false` — blank basemap; coverage honesty still shown] |
| AI live assist | NOT LIVE · HOSTED-UNPROVEN · PENDING | [Source: AI configure receipt — `AI_ENABLED` HOSTED YES; assist FAIL; `gpt-5.6-luna` rejects `max_tokens` (needs `max_completion_tokens`)] |
| 2 de 7 coordenadas; 5 provenance | VERIFIED CURRENT FACT | [Source: `MAP_GEO_BOUNDARY.md`; capability map Z; draft Isa/Álvaro] |
| Shared URL MICRISTAL/TORREZ | BUSINESS DECISION REQUIRED | [Source: `MAP_GEO_BOUNDARY.md`] |
| No inventar pins / heatmaps | PILOT POLICY | [Source: `MAP_GEO_BOUNDARY.md`] |
| AI allowlist summarize/ask/draft; deny approve/convert/send | PILOT POLICY | [Source: `AI_PILOT_BOUNDARY.md`] |
| WhatsApp deferred; not revenue | PILOT POLICY | [Source: ownership costs exclusions; capability V notifications] |
| Production NOT EVIDENCED | VERIFIED CURRENT FACT | [Source: owner infrastructure map] |
| Capability map older SHA `37a1ed7` | ESTIMATE / PLANNING BAND for doc drift | [Source: capability map header vs control-tower tip `23e50b0` — **prefer tip for runtime**; map tables may lag] |

**Editor rules (bake into every edit)**

- Keep `PLANNED` / `IMPLEMENTED` / `TESTED` / `INTEGRATED` / `PUSHED` / `DEPLOYED` / `HOSTED` / `BROWSER-VERIFIED` / `USER-ACCEPTED` separate.  
- Evidence priority: hosted/browser → provider/runtime config → DB/runtime → deployed SHA → tests → code → docs/receipts → agent summary.  
- User-facing TODAY: MAP LIVE only after basemap BV PASS; AI LIVE only after provider response hosted-proven; password reset only if hosted UX verified; QA/Ver Como = internal never; costs = estimate unless invoice; backups = verified posture only.  
- Contradictions → `UNPROVEN` / `NOT LIVE` / `IMPLEMENTED` / `HOSTED-UNPROVEN`; flag in EDITOR NOTES; no optimistic silent choice.  
- After Map PASS receipt: change Mapa row to LIVE and add one warm sentence in welcome/message.  
- After AI PASS: add bounded assist sentence; keep deny-list.  
- Do not collapse USER-ACCEPTED.  
- Keep REAL vs SYNTH separate in any internal coaching (not needed in this human table).

**EDITOR NOTES — conflicts:** older EXTERNAL_CREDENTIAL_GATE labels superseded by Map FAIL / AI HOSTED-UNPROVEN FAIL; publish **NOT LIVE**.
