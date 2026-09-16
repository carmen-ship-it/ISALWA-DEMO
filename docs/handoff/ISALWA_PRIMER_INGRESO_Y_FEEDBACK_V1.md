# ISALWA — Primer ingreso y feedback (borrador V1)

**Estado del documento:** borrador fuente · no enviado · no crea cuentas  
**Fecha:** 2026-09-16  

---

## Section A — HUMAN-FACING DRAFT

### Antes de entrar (checklist para Carmen — no es trabajo de Isa/Álvaro aún)

1. Carmen USER-ACCEPT del paquete / piloto. `[BUSINESS DECISION REQUIRED]`  
2. Nombre + correo + función de día 1 de **Isa**. `[BUSINESS DECISION REQUIRED]`  
3. Nombre + correo + función de día 1 de **Álvaro**. `[BUSINESS DECISION REQUIRED]`  
4. Roles/scopes desde catálogo conocido (no inventar `roleKey`). `[PILOT POLICY]`  
5. Invitar desde Administración (permiso de personas) → correo de invitación del servicio de login. `[CURRENT HOSTED STATE]`  
6. Cada persona crea **su** contraseña. Carmen no la conoce. `[PILOT POLICY]`  
7. Completar activación de invitación en el flujo del producto. `[CURRENT HOSTED STATE]`  

**Cuentas Isa/Álvaro hoy:** **no creadas** · **invites no enviados**.  
`[VERIFIED CURRENT FACT]`

### Recuperación de contraseña (honestidad)

Verificación read-only del ingreso alojado (2026-09-16): la pantalla **Iniciar sesión** muestra correo + contraseña y **no** muestra “Olvidé mi contraseña” / recuperación self-service.  
`[VERIFIED CURRENT FACT]`

Por eso **no** les decimos todavía: “pueden recuperarla ustedes desde el ingreso”. Cuando eso exista y se verifique PASS, se actualiza este borrador y el mensaje corto.  
`[PILOT POLICY]`

Mientras tanto: si alguien se bloquea, avisar a Carmen / admin de personas para el camino de recuperación del proveedor — sin compartir contraseñas por chat.  
`[FUTURE RECOMMENDATION]` / procedimiento operativo · `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` *(detalle exacto del panel Supabase no re-verificado en este lane)*

### Primera semana (sugerencia liviana)

**Día 1** — Entrar. Mirar **Inicio** y **Clientes**. No hay examen.  
`[PILOT POLICY]`

**Días 2–3** — Usarlo en el trabajo real: lo que ya harían en planilla o WhatsApp, intentar verlo o registrarlo en ISALWA cuando tenga sentido.  
`[PILOT POLICY]`

**Fin de la primera semana** — Conversación corta:

- ¿Qué les ayudó?  
- ¿Qué los frenó?  
- ¿Qué falta?  
- ¿Qué cambiarían?  

`[PILOT POLICY]`

### Feedback — cómo pedirlo

No traten de adaptarse a ISALWA todavía. ISALWA debe adaptarse a cómo trabaja la empresa.

Marquen, sin protocolo:

- palabras que suenan mal  
- pasos que faltan  
- demasiados clics  
- datos que no encuentran  
- cosas que siguen en Excel / WhatsApp / fuera del sistema  
- áreas que sobran  
- permisos que se sienten incorrectos  
- pantallas confusas  
- cualquier cosa que haría su trabajo más rápido  

`[PILOT POLICY]`

En el producto hay un canal de **feedback del producto** (distinto de “Reportar problema” de negocio). Úsenlo cuando quieran dejar una nota al equipo de construcción.  
`[CURRENT HOSTED STATE]`

### Mensaje corto (WhatsApp / correo) — borrador

> Hola Isa, hola Álvaro ❤️  
>  
> Les quiero compartir el primer paso de ISALWA.  
>  
> Ya tenemos una Versión 1 lista para que entren, la usen y nos ayuden a terminar de adaptarla a cómo ustedes realmente trabajan.  
>  
> ISALWA ya empieza a reunir clientes, oportunidades, cotizaciones, trabajo, aprobaciones, compromisos, incidencias y el historial de lo que va pasando, para que sea más fácil entender qué está pendiente, quién está a cargo y qué pasó antes.  
>  
> Pero es Versión 1 😅  
>  
> Así que si algo les parece raro, confuso, lento, innecesario o simplemente lo harían diferente, díganmelo. Eso es exactamente lo que queremos descubrir ahora.  
>  
> No quiero que ustedes aprendan a trabajar “como ISALWA quiere”. Quiero que ISALWA aprenda cómo trabaja la empresa.  
>  
> *(Mapa / IA: solo agregar una frase aquí si el recibo del proveedor dice LIVE — hoy omitido.)*  
>  
> Les va a llegar una invitación a su correo para crear su propia contraseña.  
> *(No afirmamos recuperación self-service desde el ingreso hasta PASS verificado.)*  
>  
> No necesitan aprenderse todo de una vez. Entren, úsenlo como usarían cualquier herramienta de trabajo y me van contando qué sienten.  
>  
> ❤️ Carmen  

`[PILOT POLICY]` · frases de producto `[CURRENT HOSTED STATE]` · Map/AI omitidos `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]`

---

## Section B — EDITOR/OWNER NOTES

| Tema | Tag | [Source] |
|---|---|---|
| No accounts / no invites yet | VERIFIED CURRENT FACT | [Source: briefing §19; control-tower SAFE FOR ISA/ÁLVARO = NO at receipt time] |
| Invite + complete-invite path | CURRENT HOSTED STATE | [Source: capability map B; ENVIRONMENT_MAP invite notes] |
| Password reset hosted UI MISSING | VERIFIED CURRENT FACT | [Source: hosted `/login` + `login-form.tsx`; no i18n forgot strings] |
| Product Feedback ≠ Issue | CURRENT HOSTED STATE | [Source: Wave B acceptance; organizational memory model] |
| First-week cadence | PILOT POLICY | [Source: Carmen briefing §16] |
| Feedback prompts | PILOT POLICY | [Source: Carmen briefing §15] |
| WhatsApp/email message tone | PILOT POLICY | [Source: Carmen briefing §17] |
| Map/AI optional sentences | UNVERIFIED / NEEDS EXTERNAL CONFIRMATION | [Source: control-tower; briefing placeholders] |

**Account-creation checklist (prepare only — do not execute in this lane)**

- [ ] Isa: legal name, email, day-one function → roleKey from known set  
- [ ] Álvaro: legal name, email, day-one function → roleKey from known set  
- [ ] Tenant = REAL pilot org (not SYNTH) per Carmen decision  
- [ ] people.admin actor available to invite  
- [ ] Confirm Auth redirect allowlist includes invite complete URL  
- [ ] After invite: verify login once each; do **not** store passwords  
- [ ] Re-check password-reset UX before coaching self-service  
- [ ] Update MAP/AI lines from provider receipts before send  

**Bounded gap for Control Tower:** `PASSWORD_RESET_HOSTED = MISSING` (OS login UI). Invite-set-password via provider mail remains the first-password path.
