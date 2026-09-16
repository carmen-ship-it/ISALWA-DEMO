# ISALWA — Handoff Master (Isa / Álvaro) V1

**Status:** source draft package for senior human editor · **FINAL DESIGNED PDF = NO**  
**Date:** 2026-09-16  
**Lane:** PARALLEL DOCS ONLY · no Wave C · no accounts · no invites · no USER-ACCEPT · no product code  

**Runtime pin:** `23e50b0d7723040898f1c21ec06f014171ca8e24` (web+API same) · https://os-web-staging.onrender.com  

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
| Map en handoff | **PENDING PROVIDER RECEIPT** | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| AI en handoff | **PENDING PROVIDER RECEIPT** | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| Password reset en `/login` | **MISSING** | `[VERIFIED CURRENT FACT]` |
| Flujo invitación (producto) | Existe; Isa/Álvaro no invitados aún | `[CURRENT HOSTED STATE]` |
| Cuentas Isa / Álvaro | **NO** | `[VERIFIED CURRENT FACT]` |
| Costos factura | VERIFY EXTERNALLY | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| Banda planificación | ~USD 80–200/mo excl WA/AI/maps | `[ESTIMATE / PLANNING BAND]` |
| Recuperación dual | Option B firmada hasta 2026-09-30 | `[VERIFIED CURRENT FACT]` |
| USER-ACCEPT | No reclamado | `[VERIFIED CURRENT FACT]` |

### Mensaje guía para la editora/or

Editar con tono humano en español. No embellecer con marketing. No inventar PASS de mapa/IA/costos/reset. Preferir placeholders honestos. Después de los receipts de proveedor, reconciliar **todos** los docs del paquete en el mismo commit editorial.

---

## Section B — EDITOR/OWNER NOTES

| Item | Tag | [Source] |
|---|---|---|
| Package file list | VERIFIED CURRENT FACT | [Source: this worktree `docs/handoff/*`] |
| Runtime SHA tip | VERIFIED CURRENT FACT | [Source: `docs/operations/final-pre-pilot-2026-09-16/control-tower-final-receipt.md`] |
| Capability truth | CURRENT HOSTED STATE | [Source: `docs/product/ISALWA_COMPANY_OS_CAPABILITY_MAP.md` + Wave A/B acceptance — watch SHA drift] |
| Ownership / costs | MIXED tags | [Source: `ISALWA_OWNER_INFRASTRUCTURE_MAP.md`, `PRODUCTION_OWNERSHIP_AND_COSTS.md`] |
| Developer gaps | CURRENT HOSTED STATE | [Source: `ISALWA_DEVELOPER_HANDOFF_GAP_MAP.md`] |
| Owner outline tone | PILOT POLICY | [Source: `ISALWA_OWNER_OPERATIONS_GUIDE_OUTLINE.md`] |
| Backup honesty | CURRENT HOSTED STATE | [Source: `BACKUP_RESTORE_RUNBOOK.md`] |
| Prior draft tone | PILOT POLICY | [Source: `ISA_ALVARO_HANDOFF_DRAFT.md` — absorb warmth, not stale LIVE claims] |

**Claim vocabulary (mandatory in edits):**  
`VERIFIED CURRENT FACT` · `CURRENT HOSTED STATE` · `ESTIMATE / PLANNING BAND` · `PILOT POLICY` · `FUTURE RECOMMENDATION` · `BUSINESS DECISION REQUIRED` · `UNVERIFIED / NEEDS EXTERNAL CONFIRMATION`  
Gaps: **VERIFY EXTERNALLY** / **NOT EVIDENCED**.

---

## FINAL EDITOR CHECKLIST

Use before any send / PDF design / account creation.

### Provider receipts

- [ ] Map: MAP ACCEPTANCE **PASS** receipt found **or** keep **PENDING PROVIDER RECEIPT** everywhere  
- [ ] AI: live assist **PASS** proven **or** keep **PENDING PROVIDER RECEIPT** everywhere  
- [ ] No Map/AI “LIVE” sentence in welcome / WhatsApp message unless PASS  
- [ ] Reconcile all six files after provider close (no stale placeholders)

### Costs

- [ ] Invoice dollars still labeled VERIFY EXTERNALLY unless dashboards checked  
- [ ] Planning bands labeled ESTIMATE / PLANNING BAND only (~80–200 excl WA/AI/maps)  
- [ ] AI USD 20 = policy cap, not invoice  
- [ ] Do not mix outdated band sets without period/environment note

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

### Placeholders & honesty

- [ ] Production still NOT EVIDENCED unless new evidence  
- [ ] Option B expiry 2026-09-30 visible to owners  
- [ ] WhatsApp / email send / vanity “Ingresos” not claimed  
- [ ] 2 de 7 map coverage + shared URL confirmation still honest  
- [ ] USER-ACCEPT not claimed by docs lane

### Owner-only

- [ ] Technical appendix reviewed (secret **names** only)  
- [ ] Dual-recovery / company transfer still FUTURE / BUSINESS DECISION  
- [ ] Backup single-laptop risk still disclosed  
- [ ] Developer takeover still PARTIAL / NOT READY unless gap map updates  
- [ ] **FINAL DESIGNED PDF = NO** until senior human edit signs off  
- [ ] Source drafts only — no DOCX/PPT/marketing layout from agents

### Sign-off (human)

- [ ] Senior editor: language tone OK  
- [ ] Carmen: facts OK vs latest receipts  
- [ ] Ready to send message / create accounts: **YES / NO** _______
