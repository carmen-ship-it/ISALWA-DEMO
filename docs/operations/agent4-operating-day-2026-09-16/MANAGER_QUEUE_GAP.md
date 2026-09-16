# MANAGER_QUEUE_GAP

Agent 4 does **not** use `people.admin` as a manager visibility shortcut.

## What exists (approved)

- Inicio manager lens: `commercial.team.read` or team leadership readiness → `visibility=team`
- Inicio owner lens: `management.org.read` or org leadership readiness → `visibility=org`
- Leadership sections: team/org open work + overdue lists (read-only)
- `resolveOwnerReadScope`: team/org require matching commercial scopes even if the actor has `people.admin`

## Gaps (not invented this lane)

1. **No overdue escalation policy** — overdue attention stays on the work owner (`memberId`), not auto-routed to a manager.
2. **No dedicated manager inbox** — team/org lists are leadership lenses, not an actionable manager queue with decide/reassign for every overdue row.
3. **No RescheduleWork command** — due date change is not a governed mutation; employees register a new follow-up with a chosen due date.

Unblock requires an approved business rule for escalation + optional `RescheduleWork` contract — outside Agent 4 unilateral authority.
