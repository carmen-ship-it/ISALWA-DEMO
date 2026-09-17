# COLLISION CHECK — UX-1 vs INTEGRATOR

**At:** 2026-09-16 CT2 continue  
**Check:** ONE WRITER PER COLLISION BOUNDARY (shell/nav/role-preview)

| Writer | Product edits on UX-1 boundary? |
|---|---|
| Integrator `ct2-exec-ux-intel` | **NO** — clean working tree; no commits under `components/shell`, `lib/navigation`, `lib/shell`, `lib/role-preview`, `resolve-nav`, command-palette |
| UX-1 `ct2-lane-ux1-shell` | **YES** — dirty: `nav-config.ts`, `resolve-nav.ts`, `shell-context-drawer-host.tsx`, `lib/role-preview/` |

## Decision

**NO OVERLAP.**  
Keep UX-1 as sole writer on shell/nav/role-preview.  
Integrator stays docs-only / merge-only for this boundary until UX-1 SHA lands.  
Any planned integrator nav implementation is **cancelled** (never written).

Useful uncommitted work: all on UX-1 worktree — preserve there; do not copy-edit on integrator.
