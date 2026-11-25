# CARMEN HANDOFF — WHAT I NEED TO KNOW

**Generated:** 2026-11-25 (overnight writer continuation)  
**Parent outcome:** **PARTIAL** — builder-tested on AWS disposable; independent recheck not returned; hosted preview not deployed  
**Writer:** `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` (sole writer)

---

## 1. Completed / tested / fixed overnight (this continuation)

| Work | Result |
| --- | --- |
| A1 two-connection disposable-Postgres concurrency | **VERIFIED** 2/2 — competing unlinked Salida (one wins lock); linked Salida + unlinked past-cap rollback |
| CreateOrder → projection Pedido indicators | **VERIFIED** browser 1440/390 — Nota/Salida/Entrega marked + persist after reload |
| Pedido delivery-doc auth matrix | **VERIFIED** HTTP 7/7 |
| Dossier vs PDF for commercial viewer | **VERIFIED** unit 2/2 + browser `notaPdf` links present on CreateOrder Pedido |
| Elapsed 15m / 60m / 48h | **VERIFIED** unit 6/6 + live catch-up 1/1 |
| Campana Enterado | **BUILDER-TESTED** desktop/mobile acknowledge + reopen (`afterAckLabel≥1`) |
| People admin | **VERIFIED** mutations ChangeRole/Suspend (+ B1 Invite) HTTP; **BUILDER-TESTED** UI admin OK / sales denied |
| Canonical commercial→delivery spine | **VERIFIED** HTTP 9/9 same-customer path |
| API TypeScript build | **VERIFIED** `pnpm --filter @isalwa/os-api run build` exit 0 |
| Q-DEPLOY-01 package / cost / Auth reuse | **PREPARED** — not deployed |

## 2. Independent-review findings → disposition

| Finding (on `eb8c6428`) | Disposition | Evidence |
| --- | --- | --- |
| API rootDir / seed build | **FIXED** | build green on tip |
| CreateOrder Pedido indicators | **FIXED** | seed + browser results |
| Spine fixture labels | **FIXED** | spine 9/9 |
| Dossier omits note | **FIXED** | unit + browser PDF links |
| Auth matrix | **VERIFIED** | pedido-docs 7/7 |
| A1 two-connection PG | **VERIFIED** | a1-concurrency-7.log |
| Clock boundaries + Campana | **VERIFIED** / **BUILDER-TESTED** | unit+live; browser-proof |
| People-admin invite/role/suspend | **VERIFIED** HTTP; UI gate browser; full UI mutation click-path **NOT VERIFIED LIVE** |

## 3. Same-customer commercial→delivery

Spine HTTP **9/9** on disposable AWS: opportunity → quote → CreateOrder (no duplicate) → projection → delivery-ops → Work → Nota/linked Salida/Entrega/signature → payment report (not accounting) → timeline/conversation. Browser Pedido strip proved for a separate CreateOrder-seeded order (`01M88X24P695KERMG0M65KQQK0`).

## 4. Exact pins

| Field | Value |
| --- | --- |
| Repo | `carmen-ship-it/ISALWA-DEMO` (check visibility before any publish) |
| Branch | `wip/overnight-handoff-20261125` |
| HEAD | `556591d77e089b1ccb29773933d8c5949af5a4fe` |
| Tree | `bb616b74e7818f17104a3a29923ec1458e5419ba` |
| Prior review candidate | `eb8c6428793c11cef094ffd76888ea86da343241` |
| Recheck target | `556591d7…` — packet `09-INDEPENDENT-RECHECK-PACKET.md` |
| Writer / task | `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` |
| AWS checkout | `/home/ubuntu/projects/isalwa-wt-overnight-20261125` |
| Working tree (AWS) | clean vs origin + writer lock file untracked |
| Mac worktree | `/Users/carmen/projects/isalwa-wt-v1-repairs` (idle; dirty only docs + local junk) |
| Disposable DB | `isalwa_overnight_20261125_disposable` via runtime `env.sh` |
| Runtime | API `:4001`, web `:3200` |

## 5. Build / tests / browser (evidence paths on AWS runtime)

| Check | Result | Path |
| --- | --- | --- |
| os-api build | pass | `os-api-build-overnight.log` |
| A1 concurrency | 2/2 | `a1-concurrency-7.log` |
| Pedido docs HTTP | 7/7 | `pedido-docs.log` |
| Elapsed unit | 6/6 | `elapsed-clock-unit.log` |
| Elapsed live | 1/1 | `elapsed-live-3.log` |
| Admin mutations | 12/12 | `admin-mutations.log` |
| Invite B1 | 3/3 | `invite-b1.log` |
| Spine | 9/9 | `spine-canonical.log` |
| Dossier unit | 2/2 | `dossier-viewer.log` |
| Browser Pedido/Campana | pass | `browser-proof/results.json` + `evidence/` |
| Dossier browser | notaPdf=2 | `browser-proof/dossier-browser.log` |
| Admin UI | admin OK / sales denied | `browser-proof/admin-results.json` |

## 6. Independent recheck

**Status:** **NOT VERIFIED** (packet ready; no return yet)  
**Reviewed candidate requested:** `556591d77e089b1ccb29773933d8c5949af5a4fe`  
Packet: `09-INDEPENDENT-RECHECK-PACKET.md`

## 7. Preview / Q-DEPLOY-01

**Not deployed.** Package + cost + Auth-reuse prep in `08-Q-DEPLOY-01-PREVIEW-PACKAGE.md` and vault `~/.isalwa-secrets/overnight-preview-20261125/`.  
**Gates remaining:** independent PASS + Carmen **yes** on Railway soft-cap (~$5/mo workspace) for **new** API+Postgres project. Evaluation stack untouched.

## 8. Durable vs vault / rollback

| What | Where |
| --- | --- |
| Code + sanitized docs | GitHub branch tip `556591d7` |
| Evidence logs / screenshots / session cookies | AWS runtime only (not GitHub) |
| Preview export / Auth prep / cost receipt | Operator vault |
| Rollback | `git reset --hard eb8c6428` (review baseline) or prior tip; **do not** force-push main |

## 9. Decisions / blockers for Carmen

1. **Independent recheck** of `556591d7` — required before hosted deploy.  
2. **Authorize Railway soft-cap spend** for a **new** overnight preview project (API + Postgres). Historical $5 soft alert verified; no hard cap. Exact expected: stays ~$5/mo workspace if sized like evaluation.  
3. **Optional:** rotate evaluation DB password (earlier Railway var print — not in GitHub).  
4. **Do not** need Carmen for routine tool approvals overnight (direction received); if Cursor UI blocked a click-only prompt, none blocked this continuation’s AWS/Git path.

### Claim labels

| Claim | Label |
| --- | --- |
| Review findings fixed on tip | **BUILDER-TESTED** / **VERIFIED** (disposable) |
| Independent acceptance | **NOT VERIFIED** |
| Hosted preview journey | **BLOCKED** (gates) |
| Carmen product acceptance | **NOT VERIFIED** |

---

## Restart capsule (paste-ready)

```
Repo carmen-ship-it/ISALWA-DEMO · branch wip/overnight-handoff-20261125
HEAD 556591d77e089b1ccb29773933d8c5949af5a4fe · tree bb616b74e7818f17104a3a29923ec1458e5419ba
AWS /home/ubuntu/projects/isalwa-wt-overnight-20261125 · runtime /home/ubuntu/test-runtime/isalwa-overnight-20261125
Disposable DB isalwa_overnight_20261125_disposable · API :4001 · web :3200 · OS_AUTH_MODE=dev
Writer b6a344b1-1bdb-4b47-be28-1a0cab32bca6 · evaluation UNTOUCHED
Next: independent recheck of 556591d7; on PASS + Carmen soft-cap yes → Q-DEPLOY-01 new Railway+Vercel; else continue remaining UI admin click-path + Hoy/Cliente360 browser if needed.
```
