# ISALWA — Operación, costos y seguridad (borrador V1)

**Estado del documento:** borrador fuente para dueñas/os · no PDF · sin valores secretos  
**Fecha:** 2026-09-16  

---

## Section A — HUMAN-FACING DRAFT

### Cómo está armado el piloto (en palabras simples)

| Pieza | Qué es | Quién lo provee hoy |
|---|---|---|
| Aplicación web (pantallas) | Lo que abren en el navegador | Render · `[CURRENT HOSTED STATE]` |
| Motor / API | Reglas, guardados, recordatorios de fondo | Render · `[CURRENT HOSTED STATE]` |
| Base de datos del negocio | Clientes, cotizaciones, pedidos, historial | PostgreSQL administrado en Render · `[CURRENT HOSTED STATE]` |
| Acceso (login / invitaciones / sesiones) | Correo + contraseña por persona | Supabase Auth · **separado** de la base del negocio · `[CURRENT HOSTED STATE]` |
| Mapa (si queda en vivo) | Baldosas del mapa | Mapbox · solo si hay cierre LIVE · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| Asistencia IA (si queda en vivo) | Resúmenes / borradores limitados | OpenAI · solo si hay cierre LIVE · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |

El piloto corre en un ambiente de **staging / piloto**. Es usable de verdad, pero **no** es todavía el entorno de producción formal con dominio de empresa.  
`[CURRENT HOSTED STATE]` · `[PILOT POLICY]`

### Propiedad y recuperación (hoy)

Para esta primera etapa, la infraestructura del piloto sigue bajo cuentas administradas por Carmen. Eso es aceptable solo dentro de la **excepción firmada del piloto delgado** hasta **2026-09-30**.  
`[VERIFIED CURRENT FACT]` · `[PILOT POLICY]`

No es el modelo permanente. Si avanzan a producción formal, lo siguiente es: cuentas de la empresa, facturación de la empresa, **al menos dos personas** que puedan pagar y recuperar acceso, y copias de seguridad bajo control de la empresa.  
`[FUTURE RECOMMENDATION]` · `[BUSINESS DECISION REQUIRED]`

### Costos — verificado vs estimado

**Importante:** en el repositorio **no** hay totales de factura mensual verificados. Los montos de factura hay que **confirmarlos en cada panel de proveedor**.  
`[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` · `[VERIFIED CURRENT FACT]` *(ausencia de invoices en repo)*

| Servicio | Para qué sirve | Cómo cobra | Costo actual verificado | Estimado / límite piloto | Qué podría cambiar después |
|---|---|---|---|---|---|
| Render (web + API) | Pantallas + motor | Plan de hosting | **VERIFY EXTERNALLY** · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` | Banda de cómputo staging ~USD 14–50 (planificación) · `[ESTIMATE / PLANNING BAND]` | Producción formal ~USD 25–50 · `[ESTIMATE / PLANNING BAND]` |
| Render Postgres | Verdad del negocio | Plan de base de datos | **VERIFY EXTERNALLY** | Staging ~USD 7–20 · `[ESTIMATE / PLANNING BAND]` | Prod + PITR ~USD 20–50 · `[ESTIMATE / PLANNING BAND]` |
| Supabase Auth | Login / invitaciones | Free/Pro según volumen | **VERIFY EXTERNALLY** | ~USD 0–25 / ambiente · `[ESTIMATE / PLANNING BAND]` | Auth de producción empresa · `[FUTURE RECOMMENDATION]` |
| GitHub | Código y revisiones | Asientos / org | **VERIFY EXTERNALLY** | No fijado en register OS · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` | Org de empresa · `[FUTURE RECOMMENDATION]` |
| Mapbox | Baldosas mapa | Uso / plan | **VERIFY EXTERNALLY** si se compra | Banda Architect ~USD 0–50 · `[ESTIMATE / PLANNING BAND]` | Solo si mapa LIVE aprobado |
| OpenAI | Asistencia limitada | Uso | **$0 evidenciado** mientras esté apagado · `[CURRENT HOSTED STATE]` | Tope de política **USD 20 / mes** si se enciende · `[PILOT POLICY]` | Proyecto de empresa + alertas · `[FUTURE RECOMMENDATION]` |
| WhatsApp envío | Mensajes automáticos | — | No en registro de costo OS · `[PILOT POLICY]` | Diferido · `[FUTURE RECOMMENDATION]` | Decisión de negocio |
| Email transaccional OS | Cotizaciones por mail | — | **$0** (no provisionado) · `[VERIFIED CURRENT FACT]` | Futuro ~USD 10–50 · `[ESTIMATE / PLANNING BAND]` | Cuando aprueben envío |
| Monitoreo (Sentry etc.) | Errores / uptime | — | **$0** (no integrado) · `[VERIFIED CURRENT FACT]` | Confirmar al abrir · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` | Org empresa antes de encender |

**Banda combinada de planificación** (staging + producción juntos, **excluye** WhatsApp / AI / maps): ~**USD 80–200 / mes**. Es **banda**, no factura.  
`[ESTIMATE / PLANNING BAND]`

### Seguridad — en lenguaje humano

- Los datos de la organización están separados por permisos; cada persona ve y hace según su acceso. `[PILOT POLICY]` / `[CURRENT HOSTED STATE]`
- Cuentas individuales; no hay clave compartida del equipo. `[PILOT POLICY]`
- El historial de negocio se preserva; no se “borra” a una persona del pasado al salir. `[PILOT POLICY]`
- Si algún día hay IA, **no** puede saltarse permisos ni ejecutar acciones de negocio solas. `[PILOT POLICY]`
- Las herramientas de prueba de Carmen (QA / Ver Como) son de **staging**, no son autoridad normal de usuaria/o final. `[CURRENT HOSTED STATE]`
- Los secretos del sistema no viven en el código que ve el navegador. `[PILOT POLICY]`

No afirmamos “seguridad perfecta”. Afirmamos controles serios para esta etapa.  
`[PILOT POLICY]`

### Copias de seguridad — honestidad

Hoy existen caminos de respaldo del Postgres del piloto (recuperación del proveedor + copias lógicas `pg_dump` del operador) y un runbook.  
`[CURRENT HOSTED STATE]`

Todavía **no** está evidenciado un desastre completo de producción (PITR de producción, almacenamiento off-host de empresa, segunda persona en el drill). Parte del break-glass sigue en un solo operador / laptop — riesgo conocido.  
`[VERIFIED CURRENT FACT]` · `[FUTURE RECOMMENDATION]`

Restaurar no es un botón del producto: es una acción de ingeniería **aprobada por dueñas/os**.  
`[PILOT POLICY]`

### Acceso — cómo lo describimos

El acceso actual es individual y seguro para esta etapa piloto. Cada persona tiene su propio usuario y permisos.

Más adelante, si ISALWA decide centralizar accesos de toda la empresa, usar inicio de sesión corporativo o agregar controles de identidad más avanzados, podemos hacerlo sin cambiar la forma en que trabajan dentro del sistema.  
`[PILOT POLICY]` · `[FUTURE RECOMMENDATION]` · `[BUSINESS DECISION REQUIRED]`

*(Nota interna, no para el cuerpo diario: IdP actual = Supabase Auth. SSO / WorkOS / otro = decisión futura por requisito de empresa — no comprometemos migración sin necesidad.)*

### Decisiones para la siguiente etapa (no “defectos”)

- Ambiente de producción formal  
- Propiedad y facturación de la empresa  
- Recuperación dual y backups más fuertes  
- Posible login corporativo / SSO si lo piden  
- WhatsApp, email transaccional, IA más profunda, notificaciones, inteligencia de gestión, coach de SOPs  
- Todo lo que aprendan en la primera semana de uso real  

`[FUTURE RECOMMENDATION]` · `[BUSINESS DECISION REQUIRED]`

---

## Section B — EDITOR/OWNER NOTES

| Tema | Tag | [Source] |
|---|---|---|
| Service topology staging | CURRENT HOSTED STATE | [Source: `ISALWA_OWNER_INFRASTRUCTURE_MAP.md`; control-tower hosts] |
| Production NOT EVIDENCED | VERIFIED CURRENT FACT | [Source: owner infrastructure map Verdict] |
| No invoice $ in repo | VERIFIED CURRENT FACT | [Source: ownership map Cost truth; `PRODUCTION_OWNERSHIP_AND_COSTS.md`] |
| Band USD 80–200 excl WA/AI/maps | ESTIMATE / PLANNING BAND | [Source: `PRODUCTION_OWNERSHIP_AND_COSTS.md` combined band; owner outline §3] |
| AI hard cap USD 20 | PILOT POLICY | [Source: `AI_PILOT_BOUNDARY.md`; ownership register OpenAI row] |
| Option B to 2026-09-30 | VERIFIED CURRENT FACT | [Source: thin-pilot-recovery-decision.md] |
| Backup path + single-laptop risk | CURRENT HOSTED STATE | [Source: `BACKUP_RESTORE_RUNBOOK.md`; owner infrastructure Backup section] |
| R2 off-host planned not provisioned | VERIFIED CURRENT FACT | [Source: owner infrastructure map] |
| Monitoring not integrated | VERIFIED CURRENT FACT | [Source: owner infrastructure Monitoring] |
| Auth wording (no scare “must replace”) | PILOT POLICY | [Source: Carmen briefing §8] |
| ENVIRONMENT_MAP topology partially stale | UNVERIFIED / NEEDS EXTERNAL CONFIRMATION for old lines | [Source: owner map says prefer Wave2/backup receipts over stale ENVIRONMENT_MAP hosting claims] |

**Secret rule:** names only in technical appendix — **never values** in this owner doc either.
