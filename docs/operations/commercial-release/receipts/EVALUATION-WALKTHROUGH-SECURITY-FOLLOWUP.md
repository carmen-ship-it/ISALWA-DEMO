# Receipt — Evaluation walkthrough security follow-up

Parent: `6c7d43708462bc5ffa7b499d60c5f3fd7c1a7dcc`  
Branch: `ct3/v1-repairs`

## Fixes

1. **Ignore `?next=` in evaluation** — `signInAction` returns `ignoreClientNext: true`; login form honors it; middleware login redirects omit `next`.
2. **Server-only runtime profile** — `isEvaluationRuntimeProfile()` reads only `OS_RUNTIME_PROFILE` (not `NEXT_PUBLIC_*`).
3. **Allowlist server-only** — `evaluator-allowlist.ts` imports `server-only`; env is `ISALWA_EVALUATOR_EMAILS` only.
4. **Write/replay closed** — `/evaluacion` GET/HEAD only (405 otherwise); mutating operational methods 405 with no redirect; `/auth/sign-out` for logout.
5. **Narrow static passthrough** — `_next/`, `favicon.ico`, `robots.txt`, `sitemap.xml` only; dotted ops paths (e.g. `/clientes.json`) stay gated.

## Re-review scope

- `apps/os-web/middleware.ts`
- `apps/os-web/lib/evaluation/walkthrough-*.ts`
- `apps/os-web/lib/evaluation/evaluator-allowlist*.ts`
- `apps/os-web/lib/auth/actions.ts` (sign-in ignoreClientNext + endWebSession)
- `apps/os-web/components/auth/login-form.tsx`
- `apps/os-web/app/auth/sign-out/route.ts`
- `apps/os-web/app/evaluacion/**` (sign-out link)
- Tests under `lib/evaluation/*boundary*` / `*middleware.integration*`

Gate: **IMPLEMENTED LOCALLY / NOT HOSTED / NOT INVITE-READY**
