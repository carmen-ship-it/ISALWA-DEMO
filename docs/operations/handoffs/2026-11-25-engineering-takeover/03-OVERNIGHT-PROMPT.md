# ISALWA — ACTIVE ENGINEERING EXECUTION (takeover, 2026-11-25)

## Complete the missing business spine. Do not stop at the audit.

You are Carmen’s **new engineering agent**. GitHub is your source of truth. The Mac is optional and slow — do not wait on it.

The completeness audit is accepted as remaining-work truth. Prior local repairs are preserved **on this branch**.

You are the active engineering writer. Do not merely generate another plan, checklist, audit, or progress summary.

## MANDATORY FIRST READ

On branch `wip/overnight-handoff-20261125`, open:

`docs/operations/handoffs/2026-11-25-engineering-takeover/00-START-HERE.md`

Then locked decisions, engineer status, sanitized spine IDs, evidence, file inventory, and the October master archive.

## CURRENT PIN

| Field | Value |
| --- | --- |
| Repo | `git@github.com:carmen-ship-it/ISALWA-DEMO.git` |
| Branch | `wip/overnight-handoff-20261125` |
| Prior Mac HEAD before WIP | `09cfedfb4842274e521b7b569fd482d0fa3fa9e9` |
| Packet | `docs/operations/handoffs/2026-11-25-engineering-takeover/` |
| Parent outcome | **PARTIAL** |
| Evaluation URL | **FORBIDDEN to alter** — `https://isalwa-os-web-evaluation.vercel.app` |

Verify pin before changing anything. One active writer. No reset/clean/discard of protected WIP. No production deploy. No evaluation project changes.

## EXECUTION RULE

Queue stays OPEN until safe authorized work is exhausted and verified.

After each item: verify persistence → run applicable tests → browser journey where applicable → record evidence → continue.

A blocked item does not stop unrelated work.

## LOCKED DECISIONS (do not re-ask)

See `01-LOCKED-DECISIONS.md`. Summary: Carmen directs; Q-DEPLOY-01 new preview only; Q-LOGIN-01 synthetic identities; Q-PUR-01 `pedido_preparandose` → **Pedido y preparándose**; Q-HOURS-01 no invented hours/prices/dates; WhatsApp simulated/labeled; one conversation owner; Spanish BO UI; VISUAL FREEZE; role preview must not grant server perms; payment report ≠ confirm; production = CreateWorkItem plant path not invented Order→ProductionRun.

## PRIORITY 0 — RECOVER + RELOAD

1. Confirm this branch and packet on GitHub.  
2. If running local disposable stack: reload os-api onto **this** tree (prior PID 42680 was stale relative to A1 + elapsed notices).  
3. Re-run:
   - A1 dispatch / cumulative tests (expect 37/37 on matching tree)
   - `apps/os-api/src/spine-canonical.http.test.ts` (expect 9/9) **or** re-seed spine and update evidence
4. Do **not** treat order `P-WH-N30G8Z` / `01M868ZQYY…` as CreateOrder proof.

## PRIORITY 1 — HOLD THE CANONICAL SPINE

Same synthetic customer end-to-end (already proven once; re-prove after API reload):

Cliente → Oportunidad → Cotización → PDF → simulated follow-up → **CreateOrder** → Producción → Almacén → Nota → Salida linked → Entrega → Finanzas (report ≠ confirm) → Cliente 360.

Rules:

- Canonical IDs; no manual copy between tables to fake integration.  
- Warehouse via delivery-ops + `os_orders` SoT.  
- A1: unlinked salida adds physical goods; must not exceed line qty cumulatively.  
- Preserve `Precio por confirmar` when price unverified.  
- WhatsApp remains labeled simulated.

**Known gap to fix next:** Pedido UI empty circles for Nota / Salida / Entrega despite persisted spine rows.

## PRIORITY 2 — CLOSE FUNCTIONAL GAPS

1. Elapsed notices 48h / 60m / 15m — unit done; prove live catch-up after API reload.  
2. Campana — button exists; prove drawer + acknowledgment.  
3. Hoy — already showed spine commitment; keep correct.  
4. people.admin — sales_rep correctly blocked; prove authorized admin seat journeys.  
5. Mobile 390 / desktop 1440 — targeted overflow/usability only (VISUAL FREEZE).

## PRIORITY 3 — EXTERNAL (do not stop local work)

- Real WhatsApp: blocked without Meta/WABA + owner authority.  
- Separate hosted preview only after local completeness: new Vercel project + hosted API + dedicated DB + Supabase identities. Never evaluation URL. Never disposable DB.

## VERIFICATION STANDARD

PASS requires: revision, environment, synthetic identity/role, canonical IDs, actions, before/after persistence, tests, browser evidence where relevant.

Keep statuses separate. Do not collapse ladders. Agent PASS ≠ OWNER ACCEPTED.

## INSTRUCTION STYLE (when Carmen or a planner gives you work)

For each task specify: exact screen; stays/changes/disappears; CTA; route/mutation/SoT; post-success; reappearance; auth; idempotency; refresh/Back; empty/error; mobile; non-goals; tests; receipt ending **`CARMEN HANDOFF — WHAT I NEED TO KNOW`**.

## FINAL CHECKPOINT (only when queue exhausted)

- Repo, branch, full SHA  
- Dirty inventory  
- Spine IDs + verified transitions  
- Modules fixed  
- Tests + outputs  
- Browser evidence  
- Persistence/outbox/projection evidence  
- Security/tenant/role evidence  
- Remaining gaps + owner dependencies  
- Hosted status  
- Next concrete action  

Parent outcome remains **PARTIAL** until full workflow proven and hosted acceptance independently completed.

**START:** recover pin from this packet, reload runtime onto this branch, re-prove A1 + spine, then fix Pedido Nota/Salida/Entrega indicators. Do not stop at another audit.
