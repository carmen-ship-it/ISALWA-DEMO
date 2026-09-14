# Overdue attention clock

Open work becomes `overdue_work` when `dueAt` is in the past, even if no later business event is written.

This is not a new attention type, SLA, due-soon rule, notification, or score. It re-runs the existing attention derivation (`dueAt < now` on open work) on a wall-clock tick.

---

## How it runs

The clock is a timer inside `os-api`, next to the existing outbox worker. It starts when the API process starts and a database is configured. No cron provider, no Render/Vercel scheduler, and no manual command.

| Piece | Behavior |
|-------|----------|
| Process | `apps/os-api` (`AttentionClock`) |
| Interval | `OS_ATTENTION_CLOCK_MS`, default **60 seconds** (minimum 1000) |
| Rule | Existing derivation: open work with `dueAt < now` → `overdue_work` |
| Write | Same per-organization attention rebuild the work projection consumer uses |
| Events | None. The clock does not append business events or claim outbox rows |
| Idle | A tick that finds nothing writes nothing |

`OS_OUTBOX_WORKER=0` does **not** stop the clock. Aging does not depend on a later work mutation.

On each tick the clock:

1. Finds organizations whose stored attention disagrees with the due-date rule (missing overdue, or overdue on work that is no longer open and past due).
2. Rebuilds that organization's attention from current work and approval read models.
3. Serializes with event-driven rebuilds (`pg_advisory_xact_lock`) so a completion cannot be overwritten by a stale overdue snapshot.

Completed or cancelled work is not overdue. A later tick removes a leftover `overdue_work` row if completion already updated the work read model. Owner (`memberId`) and tenant stay those of the work read model. Attention types and keys are unchanged, so Inicio grouping (CC-1) and due ordering (CC-3) still apply.

---

## How to diagnose

```bash
curl -s http://HOST:4001/v1/health/ready
```

Read `attentionClock`:

| Field | Healthy |
|-------|---------|
| `enabled` | `true` (unless intentionally disabled) |
| `running` | `true` |
| `lastError` | `null` |
| `lastSuccessAt` | Recent (within a couple of intervals after start) |
| `lastRefreshedOrganizations` | `0` when nothing newly crossed due; `> 0` after a catch-up |

Readiness includes check `attentionClock`. If it is enabled and not running, `/v1/health/ready` is `503`.

Logs are JSON on stdout, `component: "attention-clock"`:

- `attention clock started` — process began polling
- `attention clock refreshed overdue attention` — one or more organizations rebuilt
- `attention clock refresh failed` — tick error; next tick retries
- `attention clock stopped` — process shutting down

The clock does not require an authenticated ops call. It is not a Carmen CLI.

---

## How to restart

Restart the `os-api` process. The clock starts on module init with the process. The first tick runs immediately, then every interval.

Disable only for an incident:

```bash
OS_ATTENTION_CLOCK=0
```

Redeploy or restart, fix, then remove the variable and restart. Default is on. Do not leave it off to "refresh aging later."

---

## After downtime

Nothing is scheduled in an external queue, so downtime does not drop windows.

On the next successful tick after restart, every open work item with `dueAt < now` that lacks `overdue_work` is refreshed. The predicate is the wall clock, not "time elapsed since the last tick." A host that was down across the due instant catches up on the first tick. Repeating the tick does not insert a second overdue row (`attentionKey` is `work:overdue:{workItemId}`; rebuild replaces the organization's attention).

If the database was down, ticks fail, `lastError` is set, and the following successful tick performs the catch-up. No replay command is required.
