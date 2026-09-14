# Wave 2 — Staging governance proposals (not registered)

Proposal only. Do **not** register, grant, or invent scope strings in product code from this document.

Do not use Cargo/title, `people.admin`, or `system.admin` as shortcuts.

Existing catalog proposals remain in `packages/os-contracts/src/governance-proposals.ts`.

---

## A. Quote actions — granular structure

**Current fact:** `COMMAND_REQUIRED_SCOPES` maps `CreateQuote`, `UpdateQuote`, `SubmitQuote`, `CreateOpportunity`, `CreateOrder` to `member_active`. Conversion uses owner match **or** `commercial.order.convert` / ownership rules via `canConvertQuoteToOrder`. `commercial.quote.convert.own` exists in operations scopes and must not be duplicated.

| Action | Read/Write | Why existing scopes insufficient | Narrowest recommended semantic | Own/team/org | Negative | Audit |
|---|---|---|---|---|---|---|
| Create quote | write | `member_active` is not a commercial write policy; convert scopes do not create | `commercial.quote.create` (name TBD — **do not register yet**) | own account/opportunity in session org | no foreign party; no convert; no accept | quote.created |
| Edit draft quote / lines | write | same | `commercial.quote.update` (draft only) | own (or explicit team-edit later) | no submit-by-edit; no foreign quote | line/quote update events |
| Submit (internal ready) | write | submit ≠ send ≠ accept | `commercial.quote.submit` | own | cannot accept; cannot convert | submitted |
| Send to customer | write | no OS send capability; apps/api has send paths with different gates | `commercial.quote.send` if product sends; else manual evidence only | own | not ledger; not WhatsApp invent | send evidence |
| Accept | write | no AcceptQuote in os-commercial command set; domain has `quote.accepted` historically | `commercial.quote.accept` only if OS owns acceptance | commercial authority / Jefe | not convert | accepted |
| Convert to order | write | **already canonical** | keep `commercial.order.convert` + owner shortcut in `canConvertQuoteToOrder`; keep `commercial.quote.convert.own` meaning aligned — **do not add a second convert** | own or convert scope | convert ≠ create | order created |

**V1 profiles:** Asesor (create/update/submit/send own); Jefe (accept / team visibility — separate reads already).

**Recommendation:** replace `member_active` as the long-term Create/Update/Submit gate with the split above after Carmen approval. Until then, product copy must not claim capability-shaped quote authority.

---

## B. Visit write

| Field | Content |
|---|---|
| Business action | Check in / record a customer visit |
| Direction | write |
| Resource | visit tied to party/location in session org |
| Considered | `commercial.team.read`, `operations.coordinator.record`, admin scopes |
| Why insufficient | Visit is not a read; coordinator.record does not name visits |
| Narrowest | visit check-in write only (name TBD) |
| Profiles | Asesor Comercial |
| Restrictions | own visits; org-scoped party/location |
| Separations | create visit ≠ update party ≠ location admin |
| Negatives | no people.admin shortcut; no implied commercial quote write |
| Audit | visit recorded event |

---

## C. Location detail read — `GET /locations/:id`

| Field | Content |
|---|---|
| Business action | Read one location card |
| Direction | read |
| Resource | one location in session org; foreign id → missing |
| Considered | `commercial.team.read`, `management.org.read`, master-data admin, membership |
| Why insufficient | Company/operating reads do not name location-detail; tenant membership ≠ location capability. Route today: tenant-scoped + **AUTHORIZATION_UNPROVEN** (member_active path) |
| Narrowest | location-detail read (name TBD) **or** confirm an existing master-data read if Carmen declares it canonical |
| Profiles | Asesor, Almacén, Auxiliar |
| Negatives | no write; no cross-tenant; admin ≠ location read |
| Audit | read audit optional; no mutation |

**Do not create** if Carmen maps an existing canonical master-data read. Until then keep **CROSS_LANE_CHANGE_REQUEST — LOCATION_DETAIL_READ**.

---

## D. Party detail / party locations read

| Routes | `GET /parties/:partyId`, `GET /parties/:partyId/locations` |
|---|---|
| Current | LOCAL_HTTP / AUTH_PATH verified; **AUTHORIZATION_UNPROVEN** (member_active + tenant) |
| Considered | `commercial.team.read`, `management.org.read`, party search member_active patterns |
| Recommendation | Explicit decision: either (1) declare party-detail read = commercial team/org read with documented semantics, or (2) new `party.detail.read` / `party.locations.read`. Search already uses member_active — detail may match **if** Carmen accepts that as V1 policy; otherwise keep CROSS_LANE. |
| Negatives | detail must not imply party write; locations list ≠ location admin write |

---

## E. Coordination decision read

| Field | Content |
|---|---|
| Write exists | `coordination.decision.record` |
| Board composed exceptions | `management.org.read` is the company operating gate used by coordination exception composition |
| Decision history / prior decisions | **not** implied by write; not unlocked by `operations.coordinator.record` |
| Recommendation | Keep **dedicated** coordination decision **read** for listing OsCoordinationDecision history (owner, due, linked case). Do **not** overload `management.org.read` to mean full decision-store read — that expands the management gate into a sensitive history authority. Board may show exception cards from other ports under `management.org.read` while prior-decision port stays closed until the dedicated read is approved. |
| Profiles | Auxiliar/Coordinación, Gerente |
| Negatives | record ≠ read; people.admin ≠ history; foreign org empty |

---

## Summary for Carmen

Approve or reject each proposal before registration. Nothing is granted in this pass.
