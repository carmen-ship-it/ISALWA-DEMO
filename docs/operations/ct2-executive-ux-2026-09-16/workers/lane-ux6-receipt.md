# LANE UX-6 — Auditoría search, filters, drawer receipt

**When:** 2026-09-17  
**Branch:** `ct2/lane-ux6-audit`  
**Base tip:** `1244d84ef75142d973c8f7aa44caeadd66361768` (CT2 handoff live SHA)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux6-audit`  
**Lane:** Auditoría viewer — search, Fecha/Persona/Cliente/Tipo/Acción, human labels, detail drawer, server pagination, AI ask stub (gated off)  
**Deploy:** NO · **REAL_SEVEN_MUTATED:** NO

---

## Mission outcomes

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Searchable `/auditoria` with date, persona, cliente, tipo, acción filters | **IMPLEMENTED** |
| 2 | Spanish human labels (no raw keys as primary copy) | **IMPLEMENTED** · **TESTED** |
| 3 | Detail drawer with before/after snapshots when `id` fetch | **IMPLEMENTED** |
| 4 | Server-backed cursor pagination (`meta.hasMore` / `nextCursor`) | **IMPLEMENTED** · **TESTED** (API cursor unit) |
| 5 | AI “preguntar sobre registro” stub gated off | **IMPLEMENTED** |

---

## Proof matrix (do not collapse)

| Capability | IMPLEMENTED | TESTED | INTEGRATED | DEPLOYED | HOSTED | BROWSER-VERIFIED |
|------------|-------------|--------|------------|----------|--------|------------------|
| Audit list filters + URL state | yes | yes (unit) | branch | no | no | no |
| Cursor pagination API | yes | yes (unit) | branch | no | no | no |
| Detail drawer + snapshots via `?id=` | yes | logic | branch | no | no | no |
| AI ask stub (off) | yes | n/a | branch | no | no | no |

---

## Key paths

- `apps/os-web/app/(app)/auditoria/page.tsx`
- `apps/os-web/components/audit/**`
- `apps/os-web/lib/audit/**`
- `apps/os-api/src/audit.controller.ts` (additive query: `q`, `cursor`, `resourceId`, `id` + snapshots)
- `apps/os-api/src/audit-cursor.ts`

---

## Tests run

```text
cd apps/os-web && pnpm exec tsx --test \
  lib/audit/humanize.test.ts \
  lib/audit/url-state.test.ts \
  lib/audit/filter-options.test.ts \
  lib/audit/format-snapshot.test.ts
→ 11 pass / 0 fail

cd apps/os-api && pnpm exec tsx --test src/audit.controller.test.ts
→ 2 pass / 0 fail
```

---

## Residual (honest)

1. **Hosted BV:** admin `/auditoria` with filters and drawer not browser-verified on this lane commit.
2. **Search `q`:** server matches action/resource/correlation fields only; persona/cliente display names are not full-text indexed server-side.
3. **Export:** still no bulk export (by design).
