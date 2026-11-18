# Review receipt — Commercial Journey reconciliation (documentation / product-evidence)

Date (UTC): 2026-11-18
Packet: `review-packets/REVIEW-PACKET-JOURNEY-RECONCILIATION-2026-11-18.md`
Primary document under review: `COMMERCIAL_JOURNEY_RECONCILIATION-2026-11-18.md`

## Verdict

**PASS WITH FOLLOW-UPS** — **0 blocking**, **6 follow-ups** (F1–F6). No claim was found that implementation, independent review, hosted verification or a business decision is further along than the evidence supports in a way that would mislead a gate decision. One hosted-verification cell (step 4) is stronger than its cited in-repo evidence and should be corrected or sourced (F1).

## Reviewer independence statement

I am a separate agent session from the integrator who wrote the reconciliation, Phase 0 corrections, decision cards and packets. I did not author or edit any file under review. I changed no product code, data, roles, env or deployments. The only file I wrote is this receipt. I did not read, print or copy any secret.

I did not inspect `~/.isalwa-secrets/**` verification JSONs (outside the workspace; credential-adjacent). Hosted PASS claims therefore rest on the in-repo receipts' own tables, not on those artifacts.

## Pins checked

| Pin | Packet / doc value | Reviewer result |
|---|---|---|
| Worktree / branch | `/Users/carmen/projects/isalwa-wt-v1-repairs` · `ct3/v1-repairs` | matches (`HEAD` = `8951b5e8…`) |
| Docs tip | `8951b5e86139b1f5e2e43a75fc20d531b4834ee7` | **confirmed**: object exists and equals `HEAD` |
| Hosted product source | `904cf24a7acd40ad4278a229e9f9fc8fc5d9f781` | **confirmed**: commit exists; log shows `904cf24a` is the parent of the docs tip |
| Hosted product tree | `8befbec21f33da631b24d239cf0a74de7038e8ca` | **confirmed**: `git rev-parse 904cf24a^{tree}` equals it |
| Railway API health | HTTP 200 liveness | **reproduced** by unauthenticated GET `/v1/health`: HTTP 200, `{"status":"ok","service":"os-api","check":"liveness"}` |
| Hosted web gate | logged-out `/clientes` gated | **reproduced**: HTTP 307 to `/login?next=%2Fclientes` |
| Vercel `dpl_E8wQPK77NNw3siDnyCXZVudfdL8S` READY / alias | cited | **not independently reproduced**: Vercel MCP returned 403 for the team scope. Relies on `EVALUATION-RAILWAY-CUTOVER-904cf24a.md` and the integrator's recheck claim |
| Docs-under-review state | "Phase 0 corrections" | **uncommitted**: working tree has modified reconciliation, worksheet and T04 packet. Untracked: provenance receipt, decision cards, feedback workflow, this packet, Phase 0 checkpoint (see F5) |

SHA-256 of the reviewed working-tree files (so the verdict binds to exact content):

| File | SHA-256 |
|---|---|
| `COMMERCIAL_JOURNEY_RECONCILIATION-2026-11-18.md` | `4f28c2af3b94106c48d081df2a5a5277877cbd9b3af350764ac5f0b7325d688f` |
| `receipts/T04-INDEPENDENT-REVIEW-PROVENANCE.md` | `9717f2451e491b39239ee1316ce812fc31961ee9683fb8d3eec23e73a7219431` |
| `review-packets/REVIEW-PACKET-T04-QUOTES.md` | `83d620eaa70d893c513eb5120b954994688a45ce9c3b333338b88be89e5955cb` |
| `review-packets/REVIEW-PACKET-JOURNEY-RECONCILIATION-2026-11-18.md` | `404ccac2c3ce8fdb1988ec1c4e861fe4e2b43c6cfcfe0ca380df4fed3de2755d` |
| `decision-cards/D1-D8-OPEN-DECISIONS.md` | `c0c2d3f7bf24c2bc137634892160cdae2a988444c731bd35de8333df92ece04c` |
| `EVALUATOR-FEEDBACK-WORKFLOW.md` | `8a39fe4c9990e49e845787394ae4c15202575607e0a94878b381862a809abc0d` |
| `EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md` | `ec8d02686d56d4588abea3796770402a3895683264e8ed48a704b0f0df373521` |

### Spot-check: cited artifacts exist

| Artifact | Present |
|---|---|
| `receipts/EVALUATION-FIXTURE-SEED.md` | yes (counts match reconciliation: parties 4, opportunities 4, quotes 4 = draft 2 / submitted 1 / accepted 1, orders 1, conversations 4, commitments 2, paymentReports 1, coverageGrantsActive 1, locationsWithCoordinates 4; approvals approved 2 / pending 1) |
| `receipts/EVALUATION-PROMOTE-904cf24a-VERCEL.md` | yes (tip, tree, Emitida wording, no invented catalog, honest Mapa, logged-out gate) |
| `receipts/EVALUATION-RAILWAY-CUTOVER-904cf24a.md` | yes (`dpl_E8wQPK77…`, Railway health, session pooler `aws-1`, Hobby $5 soft alert, no hard cap, Mac/tunnel stopped) |
| `receipts/ACCEPTANCE-LANE-B-T03-CUSTOMER-UI.md` | yes (states local integration, "Not hosted"; consistent with "implemented, hosted partial") |
| `receipts/BATCH-3-T04-QUOTES.md`, `BATCH-3B-PDF-HASH-PIN.md`, `T04-LOCAL-VERIFY-2026-11-17.md` | yes (historical "not independently reviewed" wording still present; acknowledged in reconciliation conflict #5) |
| `receipts/RECORRIDO-DUAL-LAYER-EVALUATION.md` | yes |
| `receipts/BATCH-4-CATALOG-BLOCKED.md`, `BATCH-2-CUSTOMER-ENTRY.md`, `BATCH-5/5B`, `BATCH-6`, `BATCH-7`, `BATCH-9`, `T03-*` family | yes |
| `receipts/REVIEW-T04-QUOTES.md` | **absent**, as the provenance receipt states |
| `apps/os-web/lib/journey/story-steps.ts` (+ `story-steps.test.ts`) | yes |

`story-steps.ts` statuses by step, read from the file: 1 available · 2 partial · 3 partial · 4–7 available · 8 partial · 9–11 proposal · 12 decision · 13 proposal · 14 external · 15–17 proposal · 18 partial · 19 proposal · 20 external. Every "Recorrido says…" claim in the reconciliation matches this, with the wording caveat in F4. The Phase 0 pass did not change these labels.

## Checklist 1–10 (packet order)

| # | Item | Result | Notes |
|---:|---|---|---|
| 1 | Honest source vs hosted per step; fixture visibility ≠ create/refuse/authority proof | **Confirmed** (one cell overstated) | Phase A classification rules state it. Phase B uses "hosted partial" for steps 2, 3, 5–8, 10–19 and states limitations. **Step 4** is marked "hosted and verified (open + navigate)" but cited hosted evidence only shows `/clientes` list/contexts. See F1. |
| 2 | T04 not "review not started"; external PASS WITH FOLLOW-UPS + absent formal receipt explicit | **Confirmed** | Stated in Phase A (T04 row), Phase C chain D, conflict #3, provenance receipt, and `REVIEW-PACKET-T04-QUOTES.md` line 30 ("Do not treat as not started"). No file labels T04 "not started" as current status. Provenance receipt does not invent reviewer identity or findings. External review itself cannot be reproduced; it rests on the program mandate cited in the provenance receipt (accepted as mandated). |
| 3 | Catalog (step 9) blocked / proposal; no invented PDF, SKU, prices | **Confirmed** | Step 9 = proposal-only / not hosted; D3 open; fixture lines labeled symbolic BOB 1.00, "no es precio de catálogo" (seed receipt), promote verify "no invented catalog price/SKU". |
| 4 | Emitida ≠ Enviada ≠ accepted ≠ WhatsApp delivery; payment report ≠ bank confirm; coords ≠ Mapbox | **Confirmed** | Phase A classification rules; steps 13, 14, 16, 19; Phase E "Nunca inferir…"; `EVALUATOR-FEEDBACK-WORKFLOW.md` "Never infer". |
| 5 | D1–D8 remain undecided; no silent resolution | **Confirmed** | `decision-cards/D1-D8-OPEN-DECISIONS.md`: all eight `Status | open`. Reconciliation "Open ISALWA decisions" numbering #1–#8 maps one-to-one to D1–D8 and step/chain/queue references use the right numbers. Synthetic fixture approvers are never described as real holders. |
| 6 | Recorrido lag (10–17, 19) preserved as conservatism, not "fixed" | **Confirmed** (wording imprecise) | Conflict #1 and Batch R1 keep labels unchanged and require Carmen's explicit authorization. Workflow routing item 4 repeats this. `story-steps.ts` unchanged. Wording issue: F4. |
| 7 | Chains A–H first missing links consistent with evidence | **Confirmed** | A: Meta/WhatsApp. B: hosted multi-role refusal proof. C: grantor seat (shared seat scopes in seed receipt lack `commercial.account.reassign`; Jefatura member has it). D: named approvers/thresholds. E: Contabilidad/instructions/D5. F: scheduler after hours decision. G: D7 then provider. H: corporate WhatsApp + content/budget. No invented Meta/bank/map connection. |
| 8 | R2–R7 gated; no gated implementation claimed complete | **Confirmed** | Each batch lists decision prerequisites and a Stop condition. R1 is explicitly docs/copy only after authorization. Phase 0 checkpoint §9 non-claims match. |
| 9 | No secrets / connection strings / passwords / evaluator credentials in docs under review | **Confirmed** | Pattern scan over all docs under review plus the Phase 0 checkpoint and companion receipt: no passwords, tokens, keys, URIs with credentials, or JWT-shaped strings. Matches were prose only (e.g. "no token", "Secrets printed: no"). Phase E tells evaluators to obtain the login "fuera de este documento". Observation (not a finding on the docs under review): older receipts name the shared seat's login email and the path of a local secrets directory; neither is a secret value. |
| 10 | Hosted claims match Railway health + Vercel pin evidence (or marked unproven) | **Confirmed** (partly reproduced) | Railway health and login gate reproduced. Commit/tree pins verified in git. The Vercel deployment ID and READY state were not independently reproducible here (403); they match the Railway cutover receipt. Architecture and label ("TEMPORARY HOSTED EVALUATION — NOT DURABLE / NOT LAUNCH READY") match both receipts. |

## Findings

### Blocking

None.

### Follow-ups (docs corrections; none require product code)

**F1 — Step 4 hosted claim exceeds cited evidence** (Phase B, row 4; Phase B compact table row 4; `PHASE0-CHECKPOINT-2026-11-18.md` §4 item 4)
Row 4 says "hosted and verified (open + navigate)" citing "promote/cutover clientes PASS". The in-repo promote and cutover receipts record `/clientes` list with the four EVALUACIÓN contexts. They do not record opening a Cliente 360 or navigating its tabs. `ACCEPTANCE-LANE-B-T03-CUSTOMER-UI.md` is local-only and says "Not hosted". Either (a) downgrade step 4 to "hosted partial (list verified; Cliente 360 open not recorded in cited receipts)" or (b) cite an artifact showing a hosted 360 open, and then keep "read" scope only. Step 1 ("hosted and verified (read/shell)") is adequately supported by "Inicio populated" in both receipts.

**F2 — Internal contradiction about the worksheet** (Conflicts #2 vs #7)
Conflict #2 says the worksheet "still says Journey is NOT HOSTED … stale". Conflict #7 says the intro was corrected. I verified the worksheet intro no longer contains "NOT HOSTED" and now distinguishes hosted visibility, implemented locally, live-journey verified and proposal/blocked. Remove or rewrite conflict #2 as resolved.

**F3 — T04 packet / provenance describe a state that has since been edited** (Conflicts #3; `T04-INDEPENDENT-REVIEW-PROVENANCE.md` "What exists in-repo" row 1; `REVIEW-PACKET-T04-QUOTES.md` lines 11 and 40)
Both the reconciliation and provenance receipt say the T04 packet "still shows" **NOT STARTED**. The working-tree packet (line 30) now carries the corrected status. Update those two statements to "was stale; corrected in Phase 0". In the packet, line 11 still presents `5e7131cc…` as "Frozen evaluation deploy SHA" without the historical label that line 31 adds, and the known-gaps bullet about the "Enviada" pill (line 40) is superseded by the promote-hygiene "Emitida" fix. Mark both as historical. The three historical builder receipts (`BATCH-3`, `BATCH-3B`, `T04-LOCAL-VERIFY`) still say "not independently reviewed"; leaving them unedited is acceptable per conflict #5.

**F4 — Range wording for Recorrido lag** (Conflict #1; packet checklist item 6; Batch R1 "Journey steps 9–17, 19")
"Steps 10–17, 19 … propuesta" is not exact: in `story-steps.ts` step 12 is `decision` and step 14 is `external`; step 9 is also `proposal`. The matching receipt (`RECORRIDO-DUAL-LAYER-EVALUATION.md` line 75) says "proposal / decision / external" for 9–17 and 19. Align wording; do not change labels.

**F5 — Review target is uncommitted** (Pins; Phase A "Docs tip")
The docs tip `8951b5e8` is `HEAD`, but the Phase 0 corrections (modified reconciliation, worksheet, T04 packet; untracked provenance receipt, decision cards, feedback workflow, review packet, Phase 0 checkpoint) are not committed. The verdict above binds to the SHA-256 values in this receipt. After applying F1–F4, commit as docs-only and record the new docs SHA. Keep the hosted product pin at `904cf24a…` (docs commits do not move it). Leave the unrelated dirty paths listed in Phase A untouched.

**F6 — External T04 review remains unverifiable in-repo** (`T04-INDEPENDENT-REVIEW-PROVENANCE.md`)
The mandated status is correctly recorded and no follow-up text is invented. The provenance receipt itself already lists the remaining action: Carmen or the original reviewer deposits `receipts/REVIEW-T04-QUOTES.md` when recovered. Until then, R3 ("Complete `REVIEW-PACKET-T04-QUOTES.md` first") can't be demonstrated from the repo; keep that gate wording as is.

## Rule confirmations requested by the parent

- T04 is not labeled "review not started" anywhere as current status; external PASS WITH FOLLOW-UPS with absent formal receipt is the stated status.
- Recorrido labels were not auto-upgraded because of fixtures: `story-steps.ts` is unchanged by this work and every doc routes any upgrade through Carmen and Batch R1.
- D1–D8 all remain `open`.
- No secrets in this receipt or in the docs under review.

## Out of scope (respected)

No implementation, no Recorrido label change, no deploy or promote, no D1–D8 answers chosen.
