# Review packet — P0 evaluation fixture + quote status wording

Prepared 2026-11-17 by the integrator. Reviewer must be distinct from the integrator.

## Scope

1. Idempotent evaluation fixture package (`packages/os-database/src/evaluation-fixture/**`) targeting org `isalwa-eval-demo-v1` on DB host marker `eimvhirmaezssnevefly` only.
2. Shared reviewer scope composition (no people/system/master_data admin, no `payments.confirm`, no self `commercial.price.approve`).
3. Synthetic Jefatura approver + covering advisor (`.invalid` emails, local-dev auth).
4. Quote lifecycle UI wording: stored `submitted` displays **Emitida**, not **Enviada** (send evidence remains separate).
5. `@isalwa/ui` `statusToneFromLabel('Emitida')` → `in_progress` (not success-green).

## Not in this packet

- Catalog lane merge / approved PDF/prices
- Mapbox provider token
- Meta WhatsApp
- Vercel promotion of UI wording (frozen deploy remains `5e7131cc` until explicit promote)

## Evidence

- Seed run 1 + idempotent run 2: `created:0 reused:56` on second pass; totals parties 4, quotes 4, orders 1, conversations 4, commitments 3, coverage 1, payment report 1
- Hosted browser with shared login: **PASS** (`hosted-populated-eval-verify.json` under secrets dir)
- Guard unit tests: pass
- Quote label unit tests: pass after `@isalwa/ui` rebuild

## Questions for reviewer

a. Are shared-reviewer scopes the minimum for commercial demonstration without admin?
b. Is fixture tooling that persists conversations/commitments via admit+prisma (owner-demo pattern) acceptable vs HTTP-only?
c. Is “Emitida” the correct Spanish for `submitted` when issue ≠ send?
d. Any tenant-boundary risk in the seed guards?

## Verdict format

PASS / PASS WITH FOLLOW-UPS / FAIL. Write receipt under `docs/operations/commercial-release/receipts/`.
