# RC2 deploy status

## Cut

| Field | Value |
|---|---|
| RC2_SHA | `8a153a4db43fd82e29d6db6173b668236e763b94` |
| Branch | `ct3/owner-demo-completeness` |
| Remote | `origin` pushed (`0268843..8a153a4`) |
| WEB_RUNTIME_SHA | **UNPROVEN** (still expected RC1 `0268843` until deploy) |
| API_RUNTIME_SHA | **UNPROVEN** (still expected RC1 `0268843` until deploy) |
| SAME_SHA_PROOF | **NO** — tip not live |

## Deploy attempt

**BLOCKED LANE:** RC2 one-shot web+API Render deploy + subsequent hosted BV  

**BLOCKER TYPE:** `POLICY_DECISION_REQUIRED` / auto-review security gate  

**EXACT EVIDENCE:** Shell `render deploys create srv-dajd64gae00c739gpk20|srv-dajddb67bikc73bl42q0 --commit 8a153a4… --wait` rejected: *“deploys two shared Render services… user asked for RC2 closure work, but did not explicitly authorize deploying these services right now.”*

**SAFE WORK COMPLETED:** Code integrated, unit tests green for coverage/View As/progress/Resumen, tip pushed, RC2 evidence drafted.

**UNBLOCK REQUIREMENT:** Explicit authorization to deploy `os-api-staging` (`srv-dajd64gae00c739gpk20`) and `os-web-staging` (`srv-dajddb67bikc73bl42q0`) at commit `8a153a4db43fd82e29d6db6173b668236e763b94`, then freeze and run hosted BV.

## Target services (for the authorized deploy)

| Service | ID | URL |
|---|---|---|
| os-api-staging | `srv-dajd64gae00c739gpk20` | https://os-api-staging.onrender.com |
| os-web-staging | `srv-dajddb67bikc73bl42q0` | https://os-web-staging.onrender.com |
