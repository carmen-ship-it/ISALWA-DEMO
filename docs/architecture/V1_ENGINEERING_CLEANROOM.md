# V1 Engineering Clean-Room Matrix

Another engineer must rebuild confidence from the candidate SHA without Carmen tribal knowledge.

---

## Release requirements (codified)

| Req | Promise | This pass |
|---|---|---|
| CR-01 | Exact release SHA published in receipt | At commit |
| CR-02 | Clean checkout of that SHA | Required for release; worktree may be dirty only before commit |
| CR-03 | Committed lockfile | Prior pass; preserve |
| CR-04 | Deterministic `pnpm install` | Required |
| CR-05 | `pnpm -r build` | Required before calling Gate A ready on new SHA |
| CR-06 | web / api / os-api / catalog builds | Covered by workspace build |
| CR-07 | Prisma validate | When schema touched |
| CR-08 | Migration inventory listed; **none applied** by agent | `20260917120000_os_finished_goods_receipt`, `20260917140000_os_external_document_number` unapplied; Gate C purchase migration untouched |
| CR-09 | No stale generated source artifacts committed as junk | Prior cleanup preserved |
| CR-10 | No dirty main dependency | Work only on `wave2/candidate-unified` |
| CR-11 | No sibling-worktree dependency | Self-contained candidate |
| CR-12 | Integration pin unmoved | `316426f272bce29924ffd4991da88ffe7d421bbd` |
| CR-13 | Targeted tests for changed packages | os-contracts + os-delivery this pass |
| CR-14 | Deploy = NO | Locked |
| CR-15 | SAFE FOR ISA / ÁLVARO = NO until Gate D/E | Locked |

## Evidence map

| Claim | Artifact |
|---|---|
| Isa reconciliation (transcription-only) | `docs/architecture/ISA_DOCUMENT_RECONCILIATION_WAVE2.md` |
| Acceptance promises | `docs/architecture/V1_ACCEPTANCE_MANIFEST.md` |
| Feature states | `docs/architecture/V1_FEATURE_PROOF_MATRIX.md` |
| UI stress | `docs/architecture/V1_UI_HUMILIATION_ACCEPTANCE.md` |
| Business rules | `docs/architecture/V1_ISA_BUSINESS_RULE_REGRESSION.md` |
| Security | `docs/architecture/V1_SECURITY_ACCEPTANCE.md` |
| Mixed tenders | `packages/os-contracts/src/reported-operational-fact.ts` + test |
| External document number | `packages/os-contracts/src/delivery.ts`, `packages/os-delivery/*`, prisma fragment + unapplied migration |

## Clean-room verdict template

```
CANDIDATE_SHA:
BUILD: PASS|FAIL
TARGETED_TESTS: PASS|FAIL
PIN_UNMOVED: YES|NO
MIGRATIONS_APPLIED: NO
DEPLOYED: NO
SAFE_FOR_ISA_ALVARO: NO
OPEN_DECISIONS: DOCUMENT_NUMBERING, FACTORY_DELIVERY_NOTE_ROLE, CUSTOMER_INFORMED_OF_ORDER, COORDINATION_READ_AUTHORITY
EVIDENCE_SOURCE: Carmen transcription of Isa photographs (photos not inspected by engineering)
```
