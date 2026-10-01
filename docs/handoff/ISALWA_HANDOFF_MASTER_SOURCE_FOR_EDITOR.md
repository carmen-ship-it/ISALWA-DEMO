# ISALWA — HANDOFF MASTER SOURCE FOR EDITOR

**Role:** Single factual master for senior human edit → ChatGPT audit / rewrite / PDF.  
**Not:** PDF · sent message · USER-ACCEPT · account creation.  
**Cleaned:** 2026-09-16 (serial final pre-user close · LANE 8)  
**Pilot URL:** https://os-web-staging.onrender.com  

**Proof vocabulary (do not collapse):**  
`PLANNED` → `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `PUSHED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED`

---

# 1. CURRENT VERIFIED SYSTEM STATE

| Item | Current claim | State | Evidence |
|---|---|---|---|
| **FINAL_RUNTIME_SHA** | WEB+API `29b6f3f37fcf848a4a16248f34e39eeb33d1e463` | HOSTED · **WEB/API SAME = YES** | Render LIVE · map-blank-fix-receipt |
| **Environment** | Staging pilot usable · production formal NOT EVIDENCED | CURRENT HOSTED STATE | owner infrastructure map |
| **USER-ACCEPT** | Not claimed | VERIFIED | Control Tower |
| **Isa / Álvaro accounts** | NOT created · first review = Carmen shared evaluation login (temporary) | VERIFIED | this access correction |
| **Carmen owner-evaluation profile** | **READY** · 20 BUSINESS scopes granted · Finanzas PASS · no `system.admin` shortcut | HOSTED BV | `carmen-owner-evaluation-access-receipt.md` |
| **Map** | **LIVE** · BROWSER-VERIFIED · Mapbox · 2/7 · porcelain paint fix | BROWSER-VERIFIED | `29b6f3f` · `map-blank-fix-receipt.md` · `mapa-fixed-1440.png` |
| **AI** | NOT LIVE | HOSTED-UNPROVEN | Fix on API `1472796`; credentialed re-BV blocked · LANE 6 |
| **Password reset UX** | BROWSER-VERIFIED · reaches Supabase recover | PARTIAL hosted | `bd034c2f` · partial-ingest receipt |
| **Password reset E2E / without Carmen** | UNPROVEN | UNPROVEN | recover **429** rate limit · no mailbox proof |
| **Enter-once loop (commercial spine)** | CONDITIONAL PASS | CODE + prior hosted | LANE 7 matrix |
| **Ops desks Almacén / Entregas / Compras loop** | LOOP_GAP / pilot boundary | — | LANE 7 |
| **QA / Ver Como** | Internal staging only · never user feature | BROWSER-VERIFIED internal | control-tower receipt |
| **Ownership** | Carmen-personal staging · Option B to **2026-09-30** | VERIFIED | thin-pilot-recovery-decision.md |
| **Wave C** | Not started | VERIFIED | — |

---

# 2. HUMAN WELCOME DRAFT — ISA / ÁLVARO

Hola Isa, hola Álvaro.

Este texto es la **Versión 1** de una bienvenida honesta a ISALWA: el sistema operativo de la empresa para el trabajo comercial del día a día.

ISALWA reúne en un solo lugar a las personas, los clientes, las oportunidades, las cotizaciones, el trabajo pendiente, las aprobaciones, los compromisos, las incidencias y el historial de lo que va pasando — para que sea más fácil ver qué está pendiente, quién está a cargo y qué pasó antes.

Versión 1 significa: **ya se puede entrar y usarlo de verdad en el piloto**, pero todavía estamos aprendiendo cómo trabaja la empresa. Queremos que ISALWA se adapte a ustedes.

Para esta primera revisión de Versión 1 van a entrar con un acceso único de evaluación para que puedan recorrer ISALWA completo y ver todas las áreas.

Este acceso compartido es solamente para esta etapa de revisión.

Cuando terminemos de ajustar ISALWA con su feedback y empiece el uso operativo del equipo, cada persona tendrá su propio usuario, contraseña y permisos según su función.

El mapa ya permite ver geográficamente los clientes con ubicación confirmada (**2 de 7** hoy). No inventa ubicaciones.

La asistencia de inteligencia artificial **no** está en vivo en este mensaje.

En el ingreso hay un enlace para pedir recuperación de contraseña. **Todavía no** afirmamos que el correo de recuperación llegue y complete el cambio sin ayuda de Carmen (falta prueba de buzón en el piloto).

El piloto corre en staging (no es producción formal con dominio de empresa).

Entren, usen lo que les sirva, y digan con claridad qué falta, qué sobra o qué harían distinto.

Con cariño,  
Carmen

---

# 3. WHAT ISALWA IS

ISALWA es el sistema operativo de la empresa para el trabajo comercial diario.

Ayuda a entender, en un solo lugar:

- qué está pasando  
- qué necesita atención  
- quién es responsable  
- qué pasó antes  
- qué está pendiente  

No es WhatsApp. No es una planilla compartida. No inventa hechos.

---

# 4. WHAT USERS CAN DO TODAY

| Área | Una línea | Publish? |
|---|---|---|
| Inicio | Ver lo que necesita atención según el rol | YES |
| Clientes / Cliente 360 | Buscar, abrir, ver historial | YES |
| Oportunidades / Cotizaciones | Seguir y trabajar según permisos | YES |
| Trabajo / Aprobaciones / Compromisos / Incidencias | Usar en el flujo diario | YES |
| Qué cambió / Atención / Salud de datos | Lecturas honestas según permiso | YES |
| Mapa | Baldosas Mapbox en vivo; 2/7 con coordenadas | YES — LIVE |
| AI | — | NO — NOT LIVE |
| QA / Ver Como | — | NO — internal |

**Enter-once (human):**  
Los datos se registran una vez y aparecen donde corresponden. El historial se conserva; el trabajo nuevo se agrega sin borrar lo anterior.  

*(Supported today for commercial spine + trabajo/aprobaciones/compromisos/incidencias + Cliente 360/search. Almacén / Entregas / Compras: wiring close in progress — do not claim ops closed-loop until sole-writer hosted BV PASS.)*

---

# 5. VERSION 1 — WHAT WE WANT FROM THEM

Trabajen normal. Reaccionen con honestidad:

- Esto sí me sirve.  
- Esto no lo entiendo.  
- Yo esto lo hago diferente.  
- Aquí me falta algo.  
- Esto debería ser más rápido.  
- Esto sobra.  

---

# 6. FIRST LOGIN / PASSWORDS

### CURRENT VERSION 1 ACCESS — FIRST REVIEW (TEMPORARY)

Para esta **primera revisión** de Versión 1 van a entrar con un **acceso único de evaluación** (el login de piloto de Carmen) para que puedan recorrer ISALWA completo y ver todas las áreas del producto de negocio.

Este acceso compartido es **solamente para esta etapa de revisión**.

Cuando terminemos de ajustar ISALWA con su feedback y empiece el uso operativo del equipo, **cada persona tendrá su propio usuario, contraseña y permisos según su función**.

**Importante (owner):**
- No es la arquitectura futura de seguridad ni el modelo de fuerza laboral.  
- Acciones durante la revisión quedan atribuidas a Carmen — preferir exploración; mutaciones exploratorias en SYNTH/test-safe; no alterar la verdad protegida de los siete clientes reales solo para demostrar flujos.  
- **No** se crean cuentas de Isa/Álvaro todavía (salvo que Carmen cambie esta decisión).  
- QA / Ver Como **no** forma parte de la evaluación de producto.  
- Controles de infraestructura / secretos / IdP / destrucción de tenant **fuera** del alcance de esta revisión.

### FUTURE INDIVIDUAL ACCESS (BEFORE REAL EMPLOYEE USE)

1. Invitación personal por correo (cuando Carmen autorice: email exacto + función de día 1 + scopes explícitos — sin inferir por cargo).  
2. La persona crea su propia contraseña.  
3. Carmen no conoce ni guarda la contraseña.  
4. No hay credenciales compartidas en operación real.  
5. El correo del piloto solo necesita: controlado por la persona, capaz de recibir invitación/recuperación, único y autorizado. **No** tiene que ser la identidad corporativa final.  
6. **Enlace de recuperación en `/login`:** sí (UX BROWSER-VERIFIED).  
7. **Self-service completo sin Carmen (correo + nueva contraseña + re-login):** UNPROVEN hasta E2E de buzón — no prometerlo todavía.

### FUTURE COMPANY IDENTITY OPTION

Más adelante, si ISALWA decide centralizar accesos con correos corporativos, SSO o una identidad administrada por la empresa, podemos hacerlo sin cambiar la forma en que trabajan dentro del sistema.

Eso es una **opción futura**, no un requisito para empezar el piloto, y **no** es un defecto de Versión 1.

**Owner note (not user-facing):** IdP actual = Supabase Auth (aceptable para piloto). No decir que es inseguro, temporal-roto, o que “necesitan WorkOS” para entrar.

---

# 7. MAP

### USER-FACING
El mapa está en vivo. Solo se trazan clientes con coordenadas confirmadas (**2 de 7**). No se inventan pines.

### OWNER/EDITOR
- Provider: Mapbox · LIVE / BROWSER-VERIFIED on `29b6f3f` (web+API SAME)  
- Fix: removed porcelain onLoad paint (`map-blank-fix-receipt.md` · `mapa-fixed-1440.png`)  
- Residual copy risk: some surfaces may still say “espera conexión del proveedor” — verify vs live basemap  
- MICRISTAL/TORREZ shared URL: BUSINESS DECISION REQUIRED  
- Cost: VERIFY EXTERNALLY  

---

# 8. AI

### USER-FACING
La asistencia de IA **no está en vivo** hoy.

### OWNER/EDITOR
- Provider OpenAI configured historically; client fix hosted on `1472796`  
- Credentialed assist re-BV: **NO** (SECURITY_GATE)  
- **AI_LIVE = NO** · keep out of launch message  

---

# 9. HOSTING / HOW IT RUNS

| Pieza | Hoy |
|---|---|
| Web / API | Render staging |
| DB | Render Postgres `isalwa-os-staging` |
| Auth | Supabase Auth staging |
| Mapa | Mapbox LIVE |
| AI | Configured · NOT LIVE for users |

Staging ≠ production formal.

---

# 10. CURRENT COSTS / ESTIMATES

No invoice totals in repo.  

| Service | Current verified cost | Pilot estimate | External verify? |
|---|---|---|---|
| Render web+API+Postgres | UNKNOWN | bands ~14–50 + ~7–20 | YES |
| Supabase Auth | UNKNOWN | ~0–25 | YES |
| Mapbox | UNKNOWN | ~0–50 band | YES |
| OpenAI | UNKNOWN | policy cap USD 20 (not invoice) | YES |
| Combined excl WA/AI/maps | — | ~USD 80–200/mo band | YES |

---

# 11. SECURITY / ACCESS

Cuentas: **primera revisión** = acceso único de evaluación (Carmen); **después** = individuales. Permisos por persona en operación · historial preservado · AI no ejecuta acciones de negocio · QA solo staging interno · secretos no en git.  
No afirmamos seguridad perfecta. No presentar el login compartido de revisión como arquitectura futura.

---

# 12. BACKUPS / RECOVERY

Partial posture: runbook + operator dumps + provider recovery historically noted.  
Not full production DR. Option B sole-recovery exception to **2026-09-30**. Dual recovery NOT DONE.

---

# 13. OWNERSHIP / PRODUCTION NEXT

Hoy: cuentas Carmen.  
Antes de producción formal: facturación empresa, cuentas proveedor, dos admins, recuperación dual, dominio cuando corresponda.

---

# 14. AUTH — CURRENT VERSION 1 vs FUTURE COMPANY IDENTITY

| | |
|---|---|
| **CURRENT VERSION 1 ACCESS (first review)** | Acceso único de evaluación (login piloto Carmen) — temporal · no arquitectura futura. |
| **FUTURE INDIVIDUAL ACCOUNTS** | Obligatorios antes del uso operativo real del equipo. |
| **FUTURE COMPANY IDENTITY OPTION** | Correos corporativos / SSO / IdP de empresa — solo si el negocio lo pide. No bloquea Versión 1. |

No enmarcar la identidad corporativa futura como defecto. No exigir SSO antes del piloto.

---

# 15. WHAT COMES LATER

Producción formal · propiedad empresa · recuperación dual · WhatsApp · email transaccional OS · AI LIVE · notificaciones · Almacén/Entregas/Compras closed-loop · lo que aprendan en la primera semana.

---

# 16. FIRST-WEEK PILOT SUGGESTION

**Día 1:** Inicio + Clientes.  
**Días 2–3:** Uso real.  
**Fin de semana:** Conversación corta de feedback.

---

# 17. SHORT WHATSAPP / EMAIL MESSAGE

> Hola Isa, hola Álvaro ❤️  
>  
> Les quiero compartir el primer paso de ISALWA (Versión 1).  
>  
> Ya reúne clientes, oportunidades, cotizaciones, trabajo, aprobaciones, compromisos, incidencias e historial.  
> Para esta primera revisión entran con un acceso único de evaluación (compartido solo para esta etapa).  
> El mapa ya muestra ubicaciones confirmadas (2 de 7; no inventamos el resto).  
> La asistencia de IA todavía no está en vivo.  
>  
> Si algo les parece raro, lento o lo harían distinto, díganmelo.  
> Cuando empiece el uso operativo del equipo, cada quien tendrá su propio usuario y permisos.  
>  
> ❤️ Carmen  

**Editor:** No promise “recuperar sin Carmen.” No claim AI live.

---

# 18. OWNER / FUTURE DEVELOPER FACTS

| Item | Value |
|---|---|
| Repo | `carmen-ship-it/ISALWA-DEMO` |
| FINAL_RUNTIME_SHA | `1472796a7e31c8660eb928d0655900c98cf29c29` |
| Web / API | os-web-staging / os-api-staging |
| Auth | Supabase `qbpxuywtoycjpitxoblo` |
| Deploy | Render Dashboard/API · no render.yaml |
| Developer takeover | PARTIAL / NOT READY |
| Secrets | names only · never values in docs |

---

# 19. CLAIM / EVIDENCE TABLE

| CLAIM | STATE | EVIDENCE | SAFE TO PUBLISH |
|---|---|---|---|
| Final SHA `1472796` web+API | HOSTED | Render deploys list | YES |
| Map LIVE | BROWSER-VERIFIED | `29b6f3f` · map-blank-fix-receipt · mapa-fixed-1440 | YES |
| AI LIVE | NO | LANE 6 | NO |
| Password UX link | BROWSER-VERIFIED | LANE 2 | YES |
| Recover without Carmen | NO | LANE 5 UNPROVEN | NO |
| Enter-once commercial spine | CONDITIONAL | LANE 7 matrix | YES with ops caveats |
| Isa/Álvaro have accounts | NO — first review uses Carmen evaluation login | — | NO as permanent model |
| Shared V1 evaluation login | APPROVED TEMPORARY PATTERN | this correction · §6 | YES if labeled temporary |
| USER-ACCEPTED | NO | — | NO |
| Invoice $ | UNKNOWN | — | NO as fact |
| Cost band ~80–200 | ESTIMATE | ownership docs | YES if labeled |

---

# 20. UNRESOLVED / VERIFY BEFORE PUBLICATION

1. Password-reset **email E2E** (mailbox for SYNTH or approved catch-all)  
2. AI **credentialed** assist re-BV  
3. Carmen **USER-ACCEPT**  
5. After feedback: Isa / Álvaro **individual** name + email + day-one function + scopes (before real employee use)  
6. Invoice dollars VERIFY EXTERNALLY  
7. Dual recovery / company ownership before calling production  
8. Almacén / Entregas / Compras enter-once LOOP_GAPs (pilot boundary honesty)  
9. MICRISTAL / TORREZ shared Maps URL confirmation  

---

# 21. FINAL EDITOR CHECKLIST

- [x] Map LIVE reconciled after porcelain-fix BV (`29b6f3f`)  
- [x] Map NOT LIVE interim (Carmen blank) superseded  
- [x] AI NOT LIVE once  
- [x] Password UX vs E2E separated once  
- [x] Final SHA `1472796` only in current state  
- [x] Staging vs production wording  
- [x] Backup claims partial only  
- [x] Isa/Álvaro not inferred  
- [x] No Wave C claimed  
- [x] Historical failures moved to § HISTORICAL below  
- [ ] Senior tone pass  
- [ ] Carmen fact sign-off  

---

# HISTORICAL / SUPERSEDED EVIDENCE

Do not use these as current user-facing truth.

| Topic | Old claim | Superseded by |
|---|---|---|
| FINAL_RUNTIME_SHA | `23e50b0…` (Control Tower receipt midday) | `1472796…` LIVE web+API |
| Map | EXTERNAL_CREDENTIAL_GATE · then Mapbox BV PASS / LIVE (`23323f44`) | **Carmen hosted blank 2026-09-16** · FAIL until `29b6f3f` deploy BV |
| AI assist | FAIL on `23e50b0` (`max_tokens` / luna) | Client fix hosted on `1472796`; **still NOT LIVE** until credentialed BV |
| Password reset | MISSING on `/login` | UX BROWSER-VERIFIED on `1472796`; E2E still UNPROVEN |
| SHA re-proof “UNPROVEN tip” | tip vs `23e50b0` | LANE 1 closed `1472796` SAME |

---

**READY FOR CHATGPT SENIOR EDIT:** YES (source)  
**READY TO SEND / CREATE ACCOUNTS:** NO  
**HANDOFF_MASTER_CLEAN:** YES
