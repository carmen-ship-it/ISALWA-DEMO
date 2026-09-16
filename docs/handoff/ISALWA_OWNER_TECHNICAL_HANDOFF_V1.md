# ISALWA — Owner / Technical Handoff Appendix (V1 draft)

**Audience:** Carmen + future engineer · **not** daily Isa/Álvaro reading  
**Status:** source draft · secret **names only** · never values  
**Date:** 2026-09-16  

---

## Section A — HUMAN-FACING DRAFT

*(This appendix is owner/engineer facing. Keep Section A factual and dry; Spanish owners can skip to the human package.)*

### Runtime pin

| Item | Value | Tag |
|---|---|---|
| FINAL RUNTIME SHA (web+API) | `23e50b0d7723040898f1c21ec06f014171ca8e24` | `[VERIFIED CURRENT FACT]` |
| WEB/API SAME | YES | `[VERIFIED CURRENT FACT]` |
| WEB deploy (receipt) | `dep-dalbkkrm8hqs7390b0l0` | `[VERIFIED CURRENT FACT]` |
| API deploy (receipt) | `dep-dalbm6v40ujc73dei7o0` | `[VERIFIED CURRENT FACT]` |
| Hosted web URL | https://os-web-staging.onrender.com | `[VERIFIED CURRENT FACT]` |
| Hosted API | https://os-api-staging.onrender.com | `[CURRENT HOSTED STATE]` |
| Branch (docs worktree) | `pre-pilot/company-os-pass` | `[CURRENT HOSTED STATE]` |
| Worktree | `.worktrees/wave2-remediation-integrate` | `[CURRENT HOSTED STATE]` |

### Topology

| Layer | Provider / name | Tag |
|---|---|---|
| os-web-staging | Render `srv-dajddb67bikc73bl42q0` | `[VERIFIED CURRENT FACT]` |
| os-api-staging | Render `srv-dajd64gae00c739gpk20` | `[VERIFIED CURRENT FACT]` |
| Business DB | Render Postgres `isalwa-os-staging` (`dpg-dajd3kh5efls738falcg-a`), PG16 | `[CURRENT HOSTED STATE]` |
| Auth | Supabase Auth `isalwa-os-auth-staging` ref `qbpxuywtoycjpitxoblo` · `sa-east-1` | `[CURRENT HOSTED STATE]` |
| SoR | `OS_DATABASE_URL` → managed Postgres only (Auth DB ≠ SoR) | `[PILOT POLICY]` |
| Outbox + Attention clock | Co-hosted inside os-api | `[CURRENT HOSTED STATE]` |
| Production OS stack | **NOT EVIDENCED** | `[VERIFIED CURRENT FACT]` |
| `render.yaml` | ABSENT — Dashboard/API control plane | `[VERIFIED CURRENT FACT]` |

### Providers (optional)

| Provider | State | Tag |
|---|---|---|
| Mapbox | PENDING PROVIDER RECEIPT / EXTERNAL_CREDENTIAL_GATE at last Control Tower receipt; do not mark LIVE in human docs until MAP ACCEPTANCE PASS | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| OpenAI OS | PENDING PROVIDER RECEIPT; historically `AI_UNAVAILABLE` / keys absent; policy OFF unless `AI_ENABLED=true` | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` · `[PILOT POLICY]` |
| WhatsApp send | Intentionally deferred | `[PILOT POLICY]` |
| Transactional email OS | Not provisioned | `[VERIFIED CURRENT FACT]` |
| Sentry / uptime | Not integrated | `[VERIFIED CURRENT FACT]` |

### Tenants (do not mix)

| Tenant | ID | Tag |
|---|---|---|
| REAL | `01M2DV9F0V5DXS4G89AKF4D5SR` | `[VERIFIED CURRENT FACT]` |
| SYNTH | `01M2JKF77TXMJNDTKNCYNHH9G5` | `[VERIFIED CURRENT FACT]` |

### Ownership / billing / recovery

| Item | State | Tag |
|---|---|---|
| Staging ownership | Carmen personal Render / Supabase / GitHub evidenced | `[CURRENT HOSTED STATE]` |
| Company billing | NOT EVIDENCED | `[VERIFIED CURRENT FACT]` |
| Dual recovery Option A | NOT DONE | `[VERIFIED CURRENT FACT]` |
| Thin-pilot Option B | SIGNED 2026-09-16 → 2026-09-30 | `[VERIFIED CURRENT FACT]` |
| Invoice dollars in repo | NONE — VERIFY EXTERNALLY | `[VERIFIED CURRENT FACT]` |
| Planning band | ~USD 80–200/mo staging+prod excl WA/AI/maps | `[ESTIMATE / PLANNING BAND]` |
| AI spend policy if enabled | Hard cap USD 20/mo + usage limits | `[PILOT POLICY]` |

### Backup / restore

| Item | State | Tag |
|---|---|---|
| Runbook | `docs/operations/BACKUP_RESTORE_RUNBOOK.md` | `[CURRENT HOSTED STATE]` |
| Provider recovery | Historically `AVAILABLE` (2026-09-13) — re-VERIFY EXTERNALLY | `[UNVERIFIED / NEEDS EXTERNAL CONFIRMATION]` |
| Operator `pg_dump` path | Evidenced under operator vault path (names only) | `[CURRENT HOSTED STATE]` |
| Off-host R2 | Planned, not provisioned | `[VERIFIED CURRENT FACT]` |
| Prod PITR | NOT EVIDENCED | `[VERIFIED CURRENT FACT]` |
| Single-laptop risk | Yes | `[CURRENT HOSTED STATE]` |

### Auth / password

| Item | State | Tag |
|---|---|---|
| Current IdP | Supabase Auth | `[CURRENT HOSTED STATE]` |
| Invite / activate | Product path LIVE | `[CURRENT HOSTED STATE]` |
| In-app / hosted login Forgot password | **MISSING** on `/login` (2026-09-16 read-only) | `[VERIFIED CURRENT FACT]` |
| Future SSO / WorkOS / corporate IdP | Decision only if company requires — do not scare owners | `[FUTURE RECOMMENDATION]` · `[BUSINESS DECISION REQUIRED]` |

### Secret names only (never values)

os-api: `OS_DATABASE_URL`, `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, outbox/attention vars, `OS_AUTH_INVITE_REDIRECT_URL`  
os-web: `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
optional: `AI_ENABLED`, `OPENAI_ISALWA_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPS_PROVIDER`, Sentry DSN, email key, `R2_BACKUP_*`  

`[PILOT POLICY]` · [Source: owner infrastructure consolidated secrets]

### Developer takeover

Verdict: **PARTIAL / NOT READY** for sole engineer takeover without Carmen (access path undocumented; some runbooks missing in this worktree; root README legacy-oriented).  
`[CURRENT HOSTED STATE]` · [Source: `ISALWA_DEVELOPER_HANDOFF_GAP_MAP.md`]

### Deploy note

Live control plane = Render Dashboard/API. No Blueprint in repo. Staging ≠ production proof.  
`[CURRENT HOSTED STATE]`

### Wave posture

| Wave | State | Tag |
|---|---|---|
| A Admin continuity | Technical PASS; Option B signed | `[VERIFIED CURRENT FACT]` |
| B Issue memory | Hosted CONDITIONAL PASS; UA PENDING | `[VERIFIED CURRENT FACT]` |
| C | **NOT STARTED** (this lane must not start it) | `[VERIFIED CURRENT FACT]` |
| USER-ACCEPT | Not claimed | `[VERIFIED CURRENT FACT]` |

---

## Section B — EDITOR/OWNER NOTES

| Note | Tag | [Source] |
|---|---|---|
| Prefer control-tower tip SHA over older capability-map header SHA | VERIFIED CURRENT FACT | [Source: `control-tower-final-receipt.md` vs capability map `37a1ed7` drift] |
| ENVIRONMENT_MAP hosting “not provisioned” lines are stale vs Wave2 truth | UNVERIFIED / NEEDS EXTERNAL CONFIRMATION if reused blindly | [Source: owner map warning; ENVIRONMENT_MAP topology status] |
| Map/AI agents may still close after this draft — reconcile MASTER | UNVERIFIED / NEEDS EXTERNAL CONFIRMATION | [Source: Carmen briefing parallel lanes] |
| Missing runbooks in this worktree vs main | CURRENT HOSTED STATE | [Source: developer handoff gap map § Gaps vs main] |
| Do not paste service_role / DB URLs into chat | PILOT POLICY | [Source: owner outline §12] |

**Explicit non-claims:** no secret values; no production environment; no USER-ACCEPT; no Isa/Álvaro account creation from this lane.
