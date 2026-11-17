# Independent review packet — Evaluation candidate `7ddf258b`

Prepared 2026-11-17 by the integrator in `/Users/carmen/projects/isalwa-wt-v1-repairs`. **The integrator is not the reviewer.** No independent review of this final candidate has occurred. Review pending is not review passed. Deployment of the evaluation environment remains gated on a non-blocking-or-PASS verdict for this packet (owner may accept PASS WITH FOLLOW-UPS for synthetic evaluation only).

## Source pins (frozen for review)

| | |
|---|---|
| Product candidate | `ct3/v1-repairs` @ `7ddf258bab696e3fa3a0767d9205a03f42a46af5` |
| Tree | `9c42e782ab362d858601134e71ce2e28db7d38c0` |
| Docs tip (inventory/export note only; not in allowlisted export) | `813e170df2ff4bd1887289b8f8ba53ddd8b11332` / tree `a573ccb20e4fd7aed55b1e8cfbdda0bdb79710e7` |
| Parent before Stage A work | `aada53963fce921a51faf22ed0b1230e436b45d9` |
| Allowlisted export | `/Users/carmen/projects/isalwa-transfer-readiness/export/isalwa-source-7ddf258b.tar.gz` |
| Export SHA-256 | `f945d0e311b14c6772e5b3f0ec24ab68fd19205295e24342144bf1cfb9cd2eaf` |
| Export file count / migrations | 1868 files · 45 Prisma migration dirs |
| Diff vs `aada5396` (all paths) | 354 files, +137075 / −76664 (dominated by regenerated Prisma client) |
| Diff excluding `**/generated/**` | 347 files, +26365 / −1904 |
| Diff excluding docs + generated | 306 files, +20319 / −1903 |

Do **not** review or deploy GitHub `main`, `7fe8772`, or export `44958998`. Do **not** push `ct3/v1-repairs` history.

## Governing authority

- `CONTINUATION-2026-11-16.md`
- `COMMERCIAL_RELEASE_V2.md` + A1/A2 + `REUSE_MAP.md` §12/§13
- Evaluation inventory `receipts/EVALUATION-INVENTORY-CANDIDATE.md`
- Transfer rules `TRANSFER_CLEARANCE.md` (export allowlist; no project-memory / evidence / secrets)

## Scope the reviewer must cover

1. **Stage A / T03 finishing** (`11e4f38b`) — archive/former/legal-name/forms/corrections/coverage/bulk follow-up.
2. **Batch 2** customer create gate + §5.4 + import paste.
3. **Batch 3 / 3B** quote lifecycle + issued-document hash pin on PDF download.
4. **Batch 4** — confirm still **blocked** / not falsely presented as live catalog share.
5. **Batch 5 / 5B** conversations: attention log, claim, Mensaje blocked, Nota interna Solo equipo, attention states, automation-pause recording only.
6. **Batch 6** payments report/verify/allocate; no fake payment-instruction publish.
7. **Batch 7** commitments + notices; no invented 48h scheduler.
8. **Batch 8 / 8B** shell/map honesty + Cliente 360 status header.
9. **Batch 9** `/sistema` honesty; T12–T14 not activated.
10. **Evaluation notice** gating (`NEXT_PUBLIC_OS_EVALUATION_NOTICE=1` / profile `evaluation`).
11. **Auth boundary** for any proposed hosted profile: no `Entrar (desarrollo)` when `OS_AUTH_MODE=supabase`.
12. **Export contents** match pins; no `.env`, docs/project-memory, or secrets.

## Known limits (verify honesty, not “finish them”)

- Catalog PDF / approved prices missing; Mapbox token absent; WhatsApp/email adapters absent.
- Payment instructions unpublished; price-approve range unmodelled; real approver identity not invented.
- 48h follow-up / due scheduler / opt-in sound not built.
- Batch 5B: inbound reopen rule uncalled; no release/reassign of held conversations; not browser-verified.
- Batches 2–9 / 5B / 8B / 3B: **NOT INDEPENDENTLY REVIEWED** before this packet.
- Prior independent reviews that do **not** cover this candidate: Lane B T03 customer UI (PASS WITH FOLLOW-UPS), Lane B T10 demo removal — earlier SHAs only.

## Integrator local evidence (mechanical; not a review)

Aggregate from batch receipts against their implementation SHAs (not a single re-run of the whole monorepo on `7ddf258b` in this checkpoint):

| Area | Claimed local result | Receipt |
|---|---|---|
| Stage A | HTTP 20/20; os-web 1340; tsc; next build; browser ok | `STAGE-A-CUSTOMER-FINISHING.md` |
| Mutation party-filter | Deliberate defect **caught** (6 pass / 1 fail); source restored | same + `.tmp/stage-a-verify/mutation-party-filter.txt` |
| Batch 5B | os-api 412; os-web 1471; contracts 261; database 315; next build; HTTP 11/11; mutations caught for CAS/holder | `BATCH-5B-CONVERSATIONS.md` |
| Batches 2–9, 3B, 8B | TESTED LOCALLY per respective receipts | checkpoint ledger |

**Not claimed:** a single green re-run of every suite on tip `813e170d` after 5B; hosted verification; browser verification of 5B/8B.

## Reviewer output expected

Receipt `receipts/REVIEW-EVALUATION-7ddf258b.md` with:

- Reviewer identity and independence statement (not the integrator, not the Batch 5B/8B builders acting as self-review).
- Pins reviewed (SHA/tree/export hash).
- Each scope item: confirmed / refuted / follow-up / **blocking**.
- Verdict: **PASS** / **PASS WITH FOLLOW-UPS** / **BLOCKING**.

Blocking defects: fix on a follow-up commit from `7ddf258b`, retest affected suites, rebuild export, then re-review. Do not deploy while BLOCKING remains open.

## Deploy gate (evaluation)

After PASS or owner-accepted PASS WITH FOLLOW-UPS for synthetic evaluation only:

- Deploy web from allowlisted export only.
- API/worker/Postgres/Supabase must have compatible destinations; web-only is not “deployed”.
- No purchase, no real data, no WhatsApp/email/payment effects, no Render deletion, no `dev` auth on hosted.
