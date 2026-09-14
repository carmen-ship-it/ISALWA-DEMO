# P0 member selector inventory — Wave 2

Exact candidate work on member pickers.

## Classification

| Surface | Was | Class | Action |
|---|---|---|---|
| Opportunity create owner | `<select>` + admin list 50 | P0_LARGE_DATASET_SELECTOR | `ServerMemberTypeahead` (active search) |
| Opportunity assign owner | `<select>` + admin list | P0_LARGE_DATASET_SELECTOR | `ServerMemberTypeahead` |
| Quote/order approver | `<select>` + active-options 100 | P0_LARGE_DATASET_SELECTOR | `ServerMemberTypeahead` |
| Reassign commercial owner | client `MemberTypeahead` over preloaded list | P0_LARGE_DATASET_SELECTOR | `ServerMemberTypeahead` |
| Admin manager / delegate | `<select>` + listMembers 100 | P0_LARGE_DATASET_SELECTOR | `ServerMemberTypeahead` mode=admin |
| Admin dept / primary role / additional role / delegation scope | small enums | SAFE_SMALL_ENUM | unchanged |
| Invite form role/dept | small enums | SAFE_SMALL_ENUM | unchanged |
| Customer create kind | small enum | SAFE_SMALL_ENUM | unchanged |
| Production category | small enum | SAFE_SMALL_ENUM | unchanged |
| Warehouse product/pedido | memory desk lists | P1_IMPROVEMENT | left (journey BLOCKED on live writer) |
| Clientes list owner labels | fetched full active-options | P0 fetch-all for labels | `resolveMemberLabels` by id |

## Server search

- `GET /members/active-options?q=` → `searchActiveMembers` (member_active, org first, name contains, limit ≤ 50)
- Without `q` (≥2 chars): returns `{ items: [], hasMore: false }` — no capped full roster dump
- Admin mode uses `listMembers?q=` (people.admin; may match email)
- No raw IDs as primary labels

## Status

Giant member `<select>` P0 on commercial/admin pickers: **FIXED locally (TESTED)**. HOSTED / BROWSER-VERIFIED: not claimed.
