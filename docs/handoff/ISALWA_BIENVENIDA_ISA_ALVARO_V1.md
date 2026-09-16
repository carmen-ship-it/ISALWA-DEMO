# ISALWA — Bienvenida para Isa y Álvaro (borrador V1)

**Estado del documento:** borrador fuente para edición humana senior · **no** es PDF · **no** es mensaje enviado · **no** es aceptación de usuaria/o  
**Fecha del borrador:** 2026-09-16  
**Runtime de referencia (piloto/staging):** `23e50b0d7723040898f1c21ec06f014171ca8e24`  
**URL del piloto:** https://os-web-staging.onrender.com  

---

## Section A — HUMAN-FACING DRAFT

Hola Isa, hola Álvaro.

Este texto es la **Versión 1** de una bienvenida honesta a ISALWA: el sistema operativo de la empresa para el trabajo comercial del día a día.

### Qué es ISALWA, en una frase

ISALWA reúne en un solo lugar a las personas, los clientes, las oportunidades, las cotizaciones, el trabajo pendiente, las aprobaciones, los compromisos, las incidencias y el historial de lo que va pasando — para que sea más fácil ver qué está pendiente, quién está a cargo y qué pasó antes.  
`[CURRENT HOSTED STATE]` · `[PILOT POLICY]`

### Por qué existe

Hoy mucha de esa verdad vive repartida entre conversaciones, planillas y memoria de cada persona. ISALWA no reemplaza el criterio de ustedes: busca que la empresa tenga una memoria compartida y permisos claros, sin inventar hechos.  
`[PILOT POLICY]`

### Qué significa “Versión 1”

Versión 1 significa: **ya se puede entrar y usarlo de verdad en el piloto**, pero todavía estamos aprendiendo cómo trabaja la empresa. No esperamos que ustedes se adapten a ISALWA. Queremos que ISALWA se adapte a ustedes.  
`[PILOT POLICY]`

Lo que ya está armado para el trabajo diario (clientes, cotizaciones, trabajo, aprobaciones, incidencias, compromisos, feedback del producto) está disponible en el ambiente de piloto.  
`[CURRENT HOSTED STATE]`

Algunas capacidades ya están en vivo en el piloto; otras todavía no.  
El mapa permite ver geográficamente los clientes cuya ubicación ya está confirmada. No inventa ubicaciones: si faltan coordenadas, el sistema lo muestra como pendiente. Hoy: **2 de 7** con coordenadas confirmadas.  
`[CURRENT HOSTED STATE]` · `[BROWSER-VERIFIED]` · *[Source: Mapbox hosted BV 23323f44]*

La asistencia de inteligencia artificial **no** está en vivo hoy para el mensaje a ustedes. Puede estar configurada en el servidor, pero la asistencia aún **no** está probada en vivo (falla pendiente de un ajuste técnico y re-verificación).  
`[CURRENT HOSTED STATE]` · `[NOT LIVE]` · `[HOSTED-UNPROVEN]` · `[PENDING]`

### Cómo es el acceso

Cada persona tendrá **su propio usuario** y su propia contraseña. Carmen **no** conoce ni guarda las contraseñas individuales.  
`[PILOT POLICY]`

Cuando corresponda, les llegará una invitación por correo para crear la contraseña.  
`[CURRENT HOSTED STATE]` · *(flujo de invitación existe en el producto; cuentas de Isa/Álvaro **aún no** creadas)*

Si olvidan la contraseña: **hoy no** hay un enlace visible de “olvidé mi contraseña” en la pantalla de ingreso del piloto. No inventamos esa ayuda en este borrador. Si más adelante aparece y se verifica, se actualizará este texto.  
`[VERIFIED CURRENT FACT]` · *(verificación read-only 2026-09-16: pantalla `/login` sin recuperación self-service)*

### Dónde corre el piloto

El sistema del piloto está en internet, en un ambiente de **piloto / staging** (no es todavía el “producción formal” con dominio de empresa). Es real y usable, pero lo mantenemos separado a propósito hasta que ISALWA apruebe el piloto y decida propiedad, facturación y recuperación.  
`[CURRENT HOSTED STATE]` · `[PILOT POLICY]`

Para esta primera etapa, Carmen mantiene la administración técnica del piloto. Si ISALWA decide avanzar a producción formal, el siguiente paso es pasar cuentas, facturación y recuperación a control de la empresa.  
`[PILOT POLICY]` · excepción firmada de recuperación delgada hasta **2026-09-30** · `[VERIFIED CURRENT FACT]`

### Qué les pedimos ahora

Entren, miren, usen lo que les sirva en el trabajo real, y digan con claridad qué suena raro, qué falta, qué sobra o qué harían distinto. Eso es exactamente lo que necesitamos en Versión 1.  
`[PILOT POLICY]`

Con cariño,  
Carmen  

---

## Section B — EDITOR/OWNER NOTES

| Claim / frase | Tag | [Source] |
|---|---|---|
| Una frase de capacidad (clientes…historial) | CURRENT HOSTED STATE + PILOT POLICY | [Source: `docs/product/ISALWA_COMPANY_OS_CAPABILITY_MAP.md` Wave B + desks; `docs/operations/WAVE_B_ISSUE_MEMORY_ACCEPTANCE.md`; tono de briefing Carmen] |
| Ambiente piloto usable, no producción formal | CURRENT HOSTED STATE | [Source: `docs/operations/ISALWA_OWNER_INFRASTRUCTURE_MAP.md` — PRODUCTION NOT EVIDENCED; staging evidenciado] |
| URL `os-web-staging.onrender.com` | VERIFIED CURRENT FACT | [Source: `docs/operations/final-pre-pilot-2026-09-16/control-tower-final-receipt.md`] |
| Runtime SHA `23e50b0…` web+API same | VERIFIED CURRENT FACT | [Source: control-tower-final-receipt.md] |
| Map LIVE — frase corta Carmen | LIVE · BROWSER-VERIFIED | [Source: Mapbox hosted BV 23323f44] — WEB SHA `23e50b0…` LIVE; basemap YES; 2 confirmed / 7 active; invented ZERO; Playwright `carmen.staging` `/mapa` PASS |
| AI no vender como LIVE | NOT LIVE · HOSTED-UNPROVEN · PENDING | [Source: AI `AI_ENABLED` YES but assist FAIL luna `max_tokens`→needs `max_completion_tokens` re-BV PASS] |
| Cuentas Isa/Álvaro no creadas | VERIFIED CURRENT FACT | [Source: briefing DO NOT create accounts; capability map §10 constraints] |
| Contraseñas individuales; Carmen no las conoce | PILOT POLICY | [Source: briefing Carmen; owner outline §7] |
| Invite flow existe; no enviado a Isa/Álvaro | CURRENT HOSTED STATE | [Source: capability map Invite/Activate LIVE; briefing no invites] |
| Password reset self-service en `/login` ausente | VERIFIED CURRENT FACT | [Source: hosted `/login` HTML + `apps/os-web/components/auth/login-form.tsx` sin link; rutas `/auth/forgot-password` etc. redirigen a login; capability map AI § “In-app password reset INTENTIONALLY DEFERRED”] |
| Opción B recuperación delgada hasta 2026-09-30 | VERIFIED CURRENT FACT | [Source: `docs/operations/wave-a-admin-continuity-2026-09-15/thin-pilot-recovery-decision.md`] |
| Ownership Carmen personal del staging | CURRENT HOSTED STATE | [Source: `ISALWA_OWNER_INFRASTRUCTURE_MAP.md`; `PRODUCTION_OWNERSHIP_AND_COSTS.md`] |
| Transferencia a empresa = siguiente etapa | FUTURE RECOMMENDATION + BUSINESS DECISION REQUIRED | [Source: owner infrastructure map transfer checklist] |

**Editor gaps to keep visible**

- Map LIVE sentence: **include** Carmen-approved short sentence (current: **PASS** · BROWSER-VERIFIED · [Source: Mapbox hosted BV 23323f44]).  
- AI LIVE sentence: **omit** / keep **NOT LIVE · HOSTED-UNPROVEN** until assist hosted-proven (current: configured, assist **FAIL** pending `max_completion_tokens` re-BV).  
- Password-reset human line (“pueden recuperarla desde el ingreso”): **omit** until `PASSWORD_RESET_HOSTED = PASS` (current: **MISSING**).  
- QA / Ver Como: never in this welcome.  
- Do not claim USER-ACCEPTED.  
- Do not invent invoice dollars.  
- Do not collapse PLANNED→USER-ACCEPTED. Prefer higher evidence; flag conflicts in notes — no optimistic silent choice.

**EDITOR NOTES — conflicts**

- Older Control Tower “EXTERNAL_CREDENTIAL_GATE / PENDING PROVIDER RECEIPT” and interim FAIL blank basemap for Map are **superseded** by Mapbox hosted BV 23323f44 PASS. Publish Map **LIVE**.  
- Older AI EXTERNAL_CREDENTIAL_GATE superseded by HOSTED-UNPROVEN FAIL; keep AI **NOT LIVE**.  
- Coverage honesty (2 de 7) remains with LIVE basemap.

**Bounded product gap (Control Tower):** self-service password reset on hosted login = **MISSING** (provider Auth exists; OS UI does not expose Forgot password).
