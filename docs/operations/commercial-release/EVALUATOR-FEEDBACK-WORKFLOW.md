# Evaluator feedback workflow (Isa / Álvaro → Carmen → integrator)

Phase 1 stability companion. Does not change product rules, Recorrido labels, roles, or deployments.

## Purpose

Capture what matches commercial reality, what is missing, what must change, and which open decision blocks progress — without treating screenshots or fixtures as completed journeys.

## Where to record

Primary worksheet: `EVALUACION_ISA_ALVARO_DECISIONES_Y_FEEDBACK.md`
Evidence matrix: `COMMERCIAL_JOURNEY_RECONCILIATION-2026-11-18.md`
Guion: reconciliation Phase E (no credentials in docs)

## Capture fields (every note)

| Field | Meaning |
|---|---|
| Journey step # + title | Canonical 20-step title only |
| Screen / URL | e.g. `/clientes`, `/cotizaciones` |
| Role used | Shared seat or named role Carmen assigned |
| What matches reality | Concrete commercial practice |
| What is missing / wrong | Gap, mismatch, or authority problem |
| Decision id | D1–D8 if applicable, else “—” |
| Who must decide | Isa / Álvaro / Carmen / Contabilidad / external |
| Evidence | Screenshot path or short quote; no secrets |
| Follow-up owner | integrator / Carmen / reviewer |
| Status | `open` · `recorded` · `decided` · `deferred` |

## Carmen routing

1. Annotate worksheet row; leave Recorrido copy unchanged unless a reviewed batch + hosted proof authorizes a label change.
2. If note is a **business decision**, open/update the matching decision card under `decision-cards/` — do not invent the answer in engineering docs.
3. If note is a **verified product defect** on hosted evaluation, queue integrator repair with Journey step + acceptance test.
4. If note is “fixture visible but Recorrido still says proposal,” treat as **known intentional lag** unless Carmen authorizes honesty-sync (Batch R1) — not an automatic upgrade.

## Never infer from evaluation

Meta/WhatsApp connected · bank confirmation · approved catalog PDF/prices · Mapbox · production customer data · Emitida = sent · payment report = paid · coverage = ownership transfer.

## Stability monitors (integrator, Phase 1)

| Check | Target | Action if fail |
|---|---|---|
| Railway `/v1/health` | HTTP 200 liveness | Report; do not restore Mac/tunnel |
| Vercel production alias | Ready; tip still `904cf24a…` until reviewed promote | Stop; do not deploy unreviewed source |
| Railway spend | Soft alert $5; no hard cap; no added paid resources | If estimate > $5/month, stop and report |
| Tenant | `isalwa-eval-demo-v1` only | Never recommend global `datos=demo` |
