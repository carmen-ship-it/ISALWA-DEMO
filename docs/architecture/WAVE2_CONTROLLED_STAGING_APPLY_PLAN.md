# Wave 2 — controlled staging apply plan (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Branch:** `wave2/candidate-unified`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (must not move)  
**Gate C this pass:** **BLOCKED_DB_STATE_UNKNOWN** (live read not obtained)  
**Execute apply/deploy:** **NO** until Carmen authorizes after Gate C evidence

Staging DB labels: `isalwa-os-staging` · `dpg-dajd3kh5efls738falcg-a` · `isalwa_os_staging`  
Previously observed PITR availability label: `2026-09-13T18:20:13Z` — **not** permission to migrate.

---

## PHASE 0 — Recovery / PITR verification

1. Confirm Render Postgres service id `dpg-dajd3kh5efls738falcg-a` and database name `isalwa_os_staging`.
2. Confirm PITR / snapshot window still covers pre-apply time.
3. Record restore method: Render PITR to **new** instance (preferred) or snapshot restore.
4. Confirm off-host dump option if available (optional for staging).
5. **Rollback trigger later:** unexpected data loss, failed migrate mid-way, app incompatible with schema, seven-customer count drift.

**Status this pass:** PITR label known historically; **live verification NOT re-proven** from this environment.

---

## PHASE 1 — Pre-migration read-only baseline

1. From allow-listed operator host, run `docs/operations/GATE_C_READ_ONLY_EVIDENCE.sql`.
2. Capture outputs (no PII):
   - DB identity + PG version
   - full `_prisma_migrations`
   - table presence/counts
   - purchase status/history distributions + unmapped values
   - seven-customer integrity counts
3. Fill baseline worksheet:

| Fact | Pre value |
|---|---|
| organizations | |
| parties (seven customers) | |
| contacts | |
| locations | |
| opportunities | |
| quotes | |
| orders | |
| order lines | |
| purchase requests | |
| production trace entries | |
| finished goods receipts | |
| allocations | |
| warehouse exits | |
| deliveries | |
| coordination decisions | |
| payment evidence | |
| coverage grants | |

Where table missing: `NOT_PRESENT_PRE_MIGRATION`.

**Do not** write synthetic adversarial rows into the real seven-customer tenant.

---

## PHASE 2 — Apply approved additive migrations (exact order)

Only after Phase 1 evidence reviewed and Carmen authorizes.

```bash
# From clean worktree at ef7eeab
export OS_DATABASE_URL='<staging internal URL — never commit>'
pnpm --filter @isalwa/os-database migrate:deploy
```

**Apply set:** see `GATE_C_MIGRATION_INVENTORY.md` §C  
**Excluded:** `20260916140000_os_purchase_status_workflow`

If Prisma tries to apply the blocked migration because it is next in folder order: **stop**. Resolve by either (a) Carmen clearing purchase REWRITE after evidence, or (b) temporarily parking that migration under an explicit change request — do **not** improvise status strings in app code.

Practical control: confirm `_prisma_migrations` and decide whether purchase base `#11` is applied while `#14` remains unapplied; Prisma migrate deploy applies **all** pending in order — so if `#11` is pending, `#14` will follow unless removed/hold strategy is explicit.

### Critical operational note

`prisma migrate deploy` applies **every** unapplied migration in timestamp order, including the purchase REWRITE if it is pending after `#11`.

Therefore, until Gate C clears `#14`, Carmen must authorize one of:

1. **HOLD all applies** that would reach `#14` (if `#11` not yet applied and `#14` sits after it), **or**
2. Apply only migrations **after** confirming `#11` and `#14` are both already handled (e.g. `#11` present, `#14` intentionally not), using a controlled mechanism that does **not** silently run `#14`, **or**
3. Clear `#14` with a separate REWRITE decision.

**Safest path while `#14` is HOLD:** apply additive migrations whose timestamps are **before** `#14` only if `#11` is already applied OR apply migrations **after** `#14` only when earlier pending set does not include `#14`. If both `#11` and `#14` are unapplied, **do not run `migrate deploy` until purchase REWRITE is resolved or an explicit engineering hold procedure is approved.**

Recommended first apply windows (examples — Gate C must choose based on live `_prisma_migrations`):

- Window A (if foundation…`20260915170000` pending and `20260915180000`+ not pending): apply through allocation/FG/delivery as present without crossing `#14`.
- Window B (if everything through `#13` applied, `#14` unapplied, `#15+` pending): apply `#15`–`#18` only via an approved selective procedure — **default Prisma deploy cannot skip `#14`**.

**Engineering follow-up if skip required:** `MIGRATION_CHANGE_REQUEST` — selective apply tooling or purchase REWRITE resolution. Do not invent status remaps in application code.

---

## PHASE 3 — Prisma / application compatibility

1. `OS_DATABASE_URL=… pnpm --filter @isalwa/os-database exec prisma validate`
2. Boot `os-api` against staging DB (staging profile) — health only.
3. Confirm schema client matches applied migrations (no drift).

---

## PHASE 4 — Post-migration row / integrity validation

Re-run evidence SQL counts. Expect:

- New tables: presence PRESENT, counts `0` unless intentionally seeded
- Existing commercial/party counts: **unchanged**
- Seven-customer party count: **unchanged**
- Purchase statuses: **unchanged** if `#14` excluded
- No fabricated coverage/payment/production rows for real customers

---

## PHASE 5 — Deploy exact application SHA

Deploy **only** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` (or a newer tip that still pins this candidate after Gate C fix commits).

Targets:

- web: `https://os-web-staging.onrender.com`
- api: `https://os-api-staging.onrender.com`

No auto-deploy from dirty main. Pin `wave2/integrate` remains unmoved until intentional integration.

---

## PHASE 6 — Hosted health / auth / data smoke

1. `GET /v1/health` on os-api
2. Auth session resolve (Supabase) — trusted member context
3. Tenant smoke on synthetic fixture org (not seven-customer mutation)
4. Read-only seven-customer integrity counts

---

## PHASE 7 — Adversarial hosted acceptance

Execute `docs/architecture/WAVE2_HOSTED_ACCEPTANCE_PLAN.md` (prepared; not run this pass).

---

## Decision gate for “READY_TO_EXECUTE_CONTROLLED_STAGING_APPLY”

Requires **all**:

- [ ] Gate C live DB evidence obtained
- [ ] Recovery/PITR verified live
- [ ] Additive migrations classified from SQL (done in inventory)
- [ ] Exact apply sequence known **and** compatible with Prisma deploy vs `#14` HOLD
- [ ] Purchase REWRITE excluded or separately resolved
- [ ] No destructive unknown migration in planned window
- [ ] Exact candidate clean/build proven (`ef7eeab`)

**This pass:** Gate C evidence **not** obtained → **BLOCKED_BEFORE_STAGING_APPLY**
