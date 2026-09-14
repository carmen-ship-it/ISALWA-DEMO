# V1 UI Humiliation / Stress Acceptance

Force failure when the model or UI is incomplete. “Looks fine” without the negative attempt is UNPROVEN, not PASS.

Isa paper evidence used in cases is Carmen transcription only.

---

## Categories and cases

### H1 Dataset / search

| ID | Case | Must | Reject |
|---|---|---|---|
| H1.1 | Large customer/product lists | Searchable typeahead; incremental load | Giant dropdown; fetch-all |
| H1.2 | Zero results | Explicit empty | Blank page / spinner forever |
| H1.3 | Long names | Truncate with full accessible name | Layout break; raw ID as primary label |
| H1.4 | Pagination | Stable pages/cursors | Nested scroll trap |

### H2 Table / layout

| ID | Case | Must | Reject |
|---|---|---|---|
| H2.1 | Narrow viewport | Primary action reachable | Horizontal trap; clipped CTA |
| H2.2 | Wide tables | Horizontal strategy without losing row action | Unusable columns |
| H2.3 | Filters/sort | Results match; clear filters | Dead filter |

### H3 Overlay / focus

| ID | Case | Must | Reject |
|---|---|---|---|
| H3.1 | Drawer/modal close | Close control + backdrop policy | Stuck overlay |
| H3.2 | Escape | Closes top layer | Focus lost to page |
| H3.3 | Keyboard nav | Tab order sensible | Inaccessible control |
| H3.4 | Focus visible + return | Return to opener | Focus dump to body |

### H4 Network / state

| ID | Case | Must | Reject |
|---|---|---|---|
| H4.1 | Loading / slow | Explicit pending | Action with no feedback |
| H4.2 | API error | Recoverable message | Fake success |
| H4.3 | Permission denied | No mutation; clear deny | Soft success |
| H4.4 | Stale/conflict | Conflict path | Silent overwrite |
| H4.5 | Unsaved changes | Warn or preserve | Silent discard without cue |
| H4.6 | Refresh / browser back | Resume honestly | Fake completed Guided step |

### H5 Truth / coverage

| ID | Case | Must | Reject |
|---|---|---|---|
| H5.1 | Incomplete source | UNPROVEN / NO_FACT / FOUNDATION_GAP | Dead KPI zero |
| H5.2 | Missing finished-goods port | UNPROVEN | `0` as stock fact |
| H5.3 | Receive vs allocate | Distinct actions | Receive allocates |
| H5.4 | Salida vs Entrega vs Fábrica | Distinct | Auto-map Fábrica |
| H5.5 | Entrega external `007189` | Shows source number | Invented NE- sequence |
| H5.6 | Mixed tender 1070+200 | Both methods; pending | Ledger confirmed |
| H5.7 | Tender sum mismatch | Validation error | Silent coerce |
| H5.8 | Empty authorized stock | NO_FACT | “sin inventario” as absolute warehouse truth if ambiguous |

### H6 Locale

| ID | Case | Must | Reject |
|---|---|---|---|
| H6.1 | Spanish copy | Consistent ES | Mixed orphan EN |
| H6.2 | BOB / Bs | Correct currency display | Silent USD assume |
| H6.3 | Bolivia date display | dd/mm clarity where product standard | Ambiguous US parse |

### H7 Schema / anti-patterns

| ID | Case | Must | Reject |
|---|---|---|---|
| H7.1 | Forms | Task-shaped fields | Schema-form dump |
| H7.2 | Empty major screen | ¿Qué hago ahora? | Meaningless blank |
| H7.3 | Dead button | Removed or disabled with reason | Clickable no-op |

**Case count:** 28 across 7 categories.

Hosted proof: PLANNED. Local dry-run allowed with fixtures.
