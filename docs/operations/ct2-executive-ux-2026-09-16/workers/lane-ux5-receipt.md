# LANE UX-5 — NOTIFICATIONS + ANTICIPATION + TRAINING

| Field | Value |
|---|---|
| WORKER | UX-5 |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux5-notif` |
| BRANCH | `ct2/lane-ux5-notifications` |
| BASE | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| SHELL | **NOT MODIFIED** (drawer/bell exported for UX-1 mount) |

## Delivered

- In-product notification center + drawer host projecting **Attention/Work read models** (`lib/notifications/project.ts`).
- Due-soon labels from `dueAt` (24h / 2h emphasis) — product reminder, not SLA.
- Read ≠ complete Work copy; honest `not_persisted` persistence port unchanged.
- Anticipation: due timing bands, pattern insights, order prep card + governed `CreateWorkItem` review payloads.
- Training: role quickstarts, contextual micro-tips, walkthrough exports.
- Shell exports: `NotificationDrawerHost`, `NotificationBellTrigger`, `NotificationDrawer`.

## Tests (lane)

```
lib/notifications/notifications.test.ts
lib/anticipation/anticipation.test.ts
lib/walkthrough/training-quickstart.test.ts
lib/commercial/order-prep.test.ts
```

Result: **12/12 PASS** (local `tsx --test` after `@isalwa/os-contracts` build).

## Proof states

| Capability | IMPLEMENTED | TESTED | INTEGRATED | HOSTED |
|---|---|---|---|---|
| Notification drawer export | YES | YES | NO | UNPROVEN |
| Attention projection inbox | YES | YES | NO | UNPROVEN |
| Order prep card | YES | YES | NO | UNPROVEN |
| Role quickstart / micro-tips | YES | YES | NO | UNPROVEN |

## Negatives asserted in tests

- No email/WhatsApp/push in persistence port.
- Mark read does not mutate source Work `readAt` on contract objects.
- Order prep does not call `CompleteWork` / notification read completion.

## Integrator notes

- Mount `NotificationDrawerHost` or `NotificationBellTrigger` from `@/components/notifications` in shell (UX-1).
- Mount `OrderPrepCard` on post–Quote→Pedido success surfaces with `onRequestReview` wired to `executeWorkCommand`.
- Notification DB table exists; web port remains honestly stubbed until API lane wires persistence.
