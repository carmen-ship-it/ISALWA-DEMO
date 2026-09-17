# Deployment policy — release train (from 2026-09-17)

## Rule

**NO MICRO-DEPLOYS DURING NORMAL FEATURE CORRECTION.**

Deploy only at bounded milestones:

1. **RC1** — first reconciled `V1_OWNER_REVIEW_RC_SHA`
2. **RC2** — only if RC1 hosted BV finds defects requiring code correction
3. **FINAL** — owner-accepted candidate (after Carmen / Isa / Álvaro acceptance)

## Required sequence

```
parallel implementation (one writer per collision boundary)
→ worker receipts
→ integrate on control-tower branch
→ dependency reconciliation
→ local / unit / integration / security tests
→ clean candidate SHA (no unexplained dirty implementation files)
→ push
→ ONE coordinated web + API deployment (same SHA)
→ migrations if required
→ SYNTH seed if required
→ hosted BV against frozen SHA
→ release receipt
```

If hosted BV fails: fix locally → **new** candidate SHA → redeploy. Never modify code under an active BV.

## Exceptions (only)

- Security emergency
- Data integrity repair
- Deployment-specific defect requiring isolated proof

## Anti-patterns (banned)

- Deploying each small commit to “make progress”
- Inferring `HEAD == live` from timing
- Collapsing LOCAL / COMMITTED / PUSHED / DEPLOYED / HOSTED_PROVEN / OWNER_ACCEPTED
- Marking View As complete from sidebar/label changes alone
