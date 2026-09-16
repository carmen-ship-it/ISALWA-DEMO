# ISALWA — Handoff Master (Isa / Álvaro) V1

**Status:** source draft package for senior human editor · **FINAL DESIGNED PDF = NO**  
**Date:** 2026-09-16  
**Lane:** PARALLEL DOCS ONLY · no Wave C · no accounts · no invites · no USER-ACCEPT · no product code  

**Runtime pin (product baseline):** `23e50b0d7723040898f1c21ec06f014171ca8e24` (web+API same) · https://os-web-staging.onrender.com  
**Docs tip (this package):** worktree tip at commit of this docs pass · branch `pre-pilot/company-os-pass`

---

## Section A — HUMAN-FACING DRAFT

### Para qué es este paquete

Este es el **índice maestro** de la Versión 1 del handoff para Isa y Álvaro. Los textos humanos están pensados para calidez y claridad; los apéndices técnicos son para Carmen y quien opere después.

### Cómo leer el paquete

| # | Documento | Para quién | Qué contiene |
|---|---|---|---|
| 1 | `ISALWA_BIENVENIDA_ISA_ALVARO_V1.md` | Isa / Álvaro | Bienvenida, Versión 1, acceso, honestidad Map/AI |
| 2 | `ISALWA_QUE_PUEDE_HACER_HOY_V1.md` | Isa / Álvaro | Capacidades de hoy en una mirada |
| 3 | `ISALWA_OPERACION_COSTOS_SEGURIDAD_V1.md` | Dueñas/os | Hosting, costos verificado vs banda, seguridad, backups |
| 4 | `ISALWA_PRIMER_INGRESO_Y_FEEDBACK_V1.md` | Isa / Álvaro + Carmen | Primer ingreso, feedback, mensaje corto, checklist de cuentas (sin ejecutar) |
| 5 | `ISALWA_OWNER_TECHNICAL_HANDOFF_V1.md` | Carmen / ingeniería | Apéndice técnico sin valores secretos |
| 6 | `ISALWA_HANDOFF_MASTER_V1.md` | Editora/or senior | Este índice + checklist final |

Cada archivo tiene **Section A** (borrador humano) y **Section B** (notas de editoría con `[Source: …]`).

### Estado condensado (no colapsar)

| Tema | Estado | Tag |
|---|---|---|
| Piloto usable en staging | Sí | `[CURRENT HOSTED STATE]` |
| Producción formal | NOT EVIDENCED | `[VERIFIED CURRENT FACT]` |
| Wave A / B técnicos | Cerrados / condicionales según receipts | `[VERIFIED CURRENT FACT]` |
| Wave C | No iniciado | `[VERIFIED CURRENT FACT]` |
| Map en handoff | **NOT LIVE** · MAP ACCEPTANCE **FAIL** (blank basemap) · **PENDING** re-BV | `[CURRENT HOSTED STATE]` · `[HOSTED-UNPROVEN]` |
| AI en handoff | **NOT LIVE** · `AI_ENABLED` hosted YES · assist **FAIL** (luna `max_tokens` → needs `max_completion_tokens`) · **HOSTED-UNPROVEN** | `[CURRENT HOSTED STATE]` · `[HOSTED-UNPROVEN]` |
| Password reset en `/login` | **MISSING** | `[VERIFIED CURRENT FACT]` |
| Flujo invitación (producto) | Existe; Isa/Álvaro no invitados aún | `[CURRENT HOSTED STATE]` |
| Cuentas Isa / Álvaro | **NO** | `[VERIFIED CURRENT FACT]` |
| Costos factura | VERIFY EXTERNALLY · estimate unless invoice | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| Banda planificación | ~USD 80–200/mo excl WA/AI/maps | `[ESTIMATE / PLANNING BAND]` |
| Recuperación dual | Option B firmada hasta 2026-09-30 | `[VERIFIED CURRENT FACT]` |
| USER-ACCEPT | No reclamado | `[VERIFIED CURRENT FACT]` |

### Mensaje guía para la editora/or

Editar con tono humano en español. No embellecer con marketing. **No confiar en etiquetas PASS sin evidencia.** No inventar LIVE de mapa/IA/costos/reset. Preferir **NOT LIVE / PENDING / HOSTED-UNPROVEN / MISSING**. Después de un re-BV PASS real, reconciliar **todos** los docs del paquete en el mismo commit editorial.

---

## Section B — EDITOR/OWNER NOTES

### Mandatory proof vocabulary (do not collapse)

Keep these states **separate** for every claim:

`PLANNED` → `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `PUSHED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED`

Also use honesty tags: `VERIFIED CURRENT FACT` · `CURRENT HOSTED STATE` · `HOSTED-UNPROVEN` · `NOT LIVE` · `PENDING` · `IMPLEMENTED` · `ESTIMATE / PLANNING BAND` · `PILOT POLICY` · `FUTURE RECOMMENDATION` · `BUSINESS DECISION REQUIRED` · `UNVERIFIED / NEEDS EXTERNAL CONFIRMATION`  
Gaps: **VERIFY EXTERNALLY** / **NOT EVIDENCED** / **MISSING**.

### Evidence priority (prefer higher)

1. Hosted / browser verification  
2. Provider / runtime config (env present, provider response)  
3. DB / runtime behavior  
4. Deployed SHA  
5. Automated tests  
6. Code existence  
7. Docs / receipts  
8. Agent summary (lowest — never sole proof of LIVE)

Do **not** promote a claim to user-facing TODAY using only a lower-priority source when a higher one already FAILs or is missing.

### User-facing TODAY rules (only if hosted state supports)

| Claim | Publish LIVE / “ya en vivo” only if… | Current truth (2026-09-16) |
|---|---|---|
| **MAP LIVE** | Basemap browser-verified PASS | **NOT LIVE** — MAP ACCEPTANCE **FAIL** blank basemap (`basemapOk:false`) |
| **AI LIVE** | Provider response hosted-proven (assist returns usable evidence-backed text) | **NOT LIVE / HOSTED-UNPROVEN** — `AI_ENABLED` YES but luna assist **FAIL** pending `max_completion_tokens` patch |
| **Password reset** | Hosted `/login` UX verified | **MISSING** |
| **QA / Ver Como** | Never a user feature | **Internal only** — never coach Isa/Álvaro |
| **Costs** | Invoice / dashboard verified | **Estimate** unless invoice |
| **Backups** | Verified posture only | Disclose verified paths + known gaps; no “full DR proven” |

### Contradiction handling

If sources disagree: prefer higher evidence; label **UNPROVEN / NOT LIVE / IMPLEMENTED / HOSTED-UNPROVEN**; flag the conflict in **EDITOR NOTES**; **no optimistic silent choice**.

**Known conflicts to keep visible**

| Topic | Older / lower evidence | Newer / higher evidence | Publish as |
|---|---|---|---|
| Map | Control Tower earlier: `EXTERNAL_CREDENTIAL_GATE` / PENDING PROVIDER RECEIPT | Hosted MAP ACCEPTANCE **FAIL** blank basemap (`~/.isalwa-secrets/_verifier-mapbox-out/mapbox-acceptance-fresh.json`) | **NOT LIVE** · **PENDING** re-BV |
| AI | Control Tower earlier: keys absent / `AI_UNAVAILABLE` | Runtime: `AI_ENABLED` YES + key present; assist **FAIL** (`max_tokens` vs `max_completion_tokens` for `gpt-5.6-luna`) | **NOT LIVE** · **HOSTED-UNPROVEN** · **PENDING** product patch + re-BV |
| Capability map header SHA `37a1ed7` | Doc table may lag | Prefer tip/runtime `23e50b0` for hosted truth | Prefer tip; note drift |

### Package sources

| Item | Tag | [Source] |
|---|---|---|
| Package file list | VERIFIED CURRENT FACT | [Source: this worktree `docs/handoff/*`] |
| Runtime SHA tip (product pin) | VERIFIED CURRENT FACT | [Source: `docs/operations/final-pre-pilot-2026-09-16/control-tower-final-receipt.md` + Render live] |
| Map FAIL blank basemap | CURRENT HOSTED STATE · NOT LIVE | [Source: `~/.isalwa-secrets/_verifier-mapbox-out/mapbox-acceptance-fresh.json` verdict FAIL `basemapOk:false`] |
| AI configured / assist FAIL | CURRENT HOSTED STATE · HOSTED-UNPROVEN · NOT LIVE | [Source: OpenAI staging configure agent receipt — `AI LIVE HOSTED FAIL`; luna rejects `max_tokens`] |
| Capability truth (core desks) | CURRENT HOSTED STATE | [Source: `docs/product/ISALWA_COMPANY_OS_CAPABILITY_MAP.md` + Wave A/B acceptance — watch SHA drift] |
| Ownership / costs | MIXED tags | [Source: `ISALWA_OWNER_INFRASTRUCTURE_MAP.md`, `PRODUCTION_OWNERSHIP_AND_COSTS.md`] |
| Developer gaps | CURRENT HOSTED STATE | [Source: `ISALWA_DEVELOPER_HANDOFF_GAP_MAP.md`] |
| Owner outline tone | PILOT POLICY | [Source: `ISALWA_OWNER_OPERATIONS_GUIDE_OUTLINE.md`] |
| Backup honesty | CURRENT HOSTED STATE | [Source: `BACKUP_RESTORE_RUNBOOK.md`] |
| Prior draft tone | PILOT POLICY | [Source: `ISA_ALVARO_HANDOFF_DRAFT.md` — absorb warmth, not stale LIVE claims] |

---

## FINAL EDITOR CHECKLIST

Use before any send / PDF design / account creation.  
**Rule:** do not trust PASS labels without evidence matching the priority list above.

### Externally shared claims matrix (mandatory)

For **every** claim that leaves the building (welcome, WhatsApp, owner cost sheet, etc.), fill:

| CLAIM | EVIDENCE TYPE | EVIDENCE LOCATION | CURRENT STATE | SAFE TO PUBLISH YES/NO |
|---|---|---|---|---|
| Piloto usable (clientes / cotizaciones / trabajo / aprobaciones / compromisos / incidencias / feedback) | hosted + Wave B BV | Wave B acceptance + control-tower product intelligence on `23e50b0` | CURRENT HOSTED STATE | **YES** (as pilot usable — not “producción formal”) |
| Producción formal lista | — | owner infrastructure map | NOT EVIDENCED | **NO** |
| Map LIVE / baldosas en vivo | hosted/browser | `mapbox-acceptance-fresh.json` FAIL blank basemap | **NOT LIVE** · PENDING | **NO** |
| AI LIVE / asistencia en vivo | provider + hosted assist | AI configure receipt: `AI_ENABLED` YES, assist FAIL `max_tokens` | **NOT LIVE** · HOSTED-UNPROVEN · PENDING patch | **NO** |
| Password reset self-service | hosted UX | `/login` read-only 2026-09-16 | MISSING | **NO** |
| QA / Ver Como for owners | — | product QA surfaces | internal only | **NO** (never user feature) |
| Invoice dollar amounts | invoice / dashboard | none in repo | VERIFY EXTERNALLY | **NO** as fact |
| Planning band ~USD 80–200 excl WA/AI/maps | estimate docs | ownership costs | ESTIMATE / PLANNING BAND | **YES** if labeled estimate |
| AI policy cap USD 20 | policy | `AI_PILOT_BOUNDARY.md` | PILOT POLICY | **YES** as cap, not invoice |
| Backups “full DR proven” | hosted/drill | backup runbook + gaps | partial posture | **NO** as full DR |
| Option B to 2026-09-30 | decision receipt | thin-pilot-recovery-decision.md | VERIFIED CURRENT FACT | **YES** |
| Isa/Álvaro already have accounts | — | briefing / no invites | NO accounts | **NO** |
| USER-ACCEPTED | human sign-off | none | not claimed | **NO** |

### Provider / hosted re-proof

- [ ] Map: MAP ACCEPTANCE **PASS** with basemap tiles **or** keep **NOT LIVE / PENDING** everywhere (current: **FAIL** blank basemap)  
- [ ] AI: live assist **PASS** proven **or** keep **NOT LIVE / HOSTED-UNPROVEN** everywhere (current: configured, assist **FAIL** pending `max_completion_tokens`)  
- [ ] No Map/AI “LIVE” / “ya en vivo” sentence in welcome / WhatsApp unless PASS  
- [ ] Reconcile all six files after any provider/product close (no stale placeholders)  
- [ ] Conflicting older Control Tower “EXTERNAL_CREDENTIAL_GATE” lines superseded — do not silently revive PASS

### Costs

- [ ] Invoice dollars still labeled VERIFY EXTERNALLY unless dashboards checked  
- [ ] Planning bands labeled ESTIMATE / PLANNING BAND only (~80–200 excl WA/AI/maps)  
- [ ] AI USD 20 = policy cap, not invoice  
- [ ] Do not mix outdated band sets without period/environment note  
- [ ] Do not claim OpenAI “$0 because off” while `AI_ENABLED` hosted YES — say estimate / VERIFY EXTERNALLY until invoice

### Password / invite

- [ ] `PASSWORD_RESET_HOSTED` re-checked on https://os-web-staging.onrender.com/login  
- [ ] If still MISSING: do **not** coach self-service reset from login  
- [ ] Invite flow coaching OK; accounts still gated on Carmen decisions  
- [ ] Bounded gap escalated to Control Tower if reset still MISSING and owners need self-service

### Isa / Álvaro access

- [ ] Exact Isa name / email / day-one function  
- [ ] Exact Álvaro name / email / day-one function  
- [ ] Carmen USER-ACCEPT  
- [ ] Explicit access decision (scopes from known catalog — not cargo)  
- [ ] **No** account creation until checklist complete  
- [ ] REAL vs SYNTH tenant decision recorded  
- [ ] QA / Ver Como never mentioned as their feature

### Placeholders & honesty

- [ ] Production still NOT EVIDENCED unless new evidence  
- [ ] Option B expiry 2026-09-30 visible to owners  
- [ ] WhatsApp / email send / vanity “Ingresos” not claimed  
- [ ] 2 de 7 map coverage + shared URL confirmation still honest (coverage ≠ LIVE basemap)  
- [ ] USER-ACCEPT not claimed by docs lane  
- [ ] Proof states not collapsed (PLANNED…USER-ACCEPTED)

### Owner-only

- [ ] Technical appendix reviewed (secret **names** only)  
- [ ] Dual-recovery / company transfer still FUTURE / BUSINESS DECISION  
- [ ] Backup single-laptop risk still disclosed  
- [ ] Developer takeover still PARTIAL / NOT READY unless gap map updates  
- [ ] **FINAL DESIGNED PDF = NO** until senior human edit signs off  
- [ ] Source drafts only — no DOCX/PPT/marketing layout from agents

### Sign-off (human)

- [ ] Senior editor: language tone OK  
- [ ] Carmen: facts OK vs latest receipts (Map NOT LIVE · AI NOT LIVE / HOSTED-UNPROVEN)  
- [ ] Externally shared claims matrix completed above  
- [ ] Ready to send message / create accounts: **YES / NO** _______

---

## READY FOR SENIOR HUMAN EDIT

**YES** — source draft package updated 2026-09-16 with evidence-gated Map/AI (**NOT LIVE**), mandatory proof vocabulary, evidence priority, TODAY publish rules, contradiction notes, and externally shared claims matrix.

**Still blocked for send / accounts / PDF:** Map LIVE, AI LIVE, password-reset coaching, invoice dollars, USER-ACCEPT, Isa/Álvaro identities, Wave C (out of scope).
