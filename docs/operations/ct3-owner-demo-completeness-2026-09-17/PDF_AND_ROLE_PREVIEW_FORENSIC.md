# PDF + ROLE PREVIEW (forensic excerpts)

## T. PDF

| Field | Value |
|---|---|
| QUOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DELIVERY_NOTE_PDF_SCOPE | **NORMAL PRODUCT** |
| DEMO_USES_SAME_PDF_IMPLEMENTATION | **YES** |
| QUOTE_UI | quote detail CTA Ver/Descargar |
| QUOTE_API_ROUTE | `apps/os-web/app/api/quotes/[quoteId]/pdf/route.ts` → os-api |
| DN_API_ROUTE | `apps/os-web/app/api/delivery-notes/[id]/pdf/route.ts` → os-api |
| HOSTED_PROVEN | HTTP 200 PDF (PF-8); button click UX not fully BV’d |

## U. Vista de evaluación

| Field | Value |
|---|---|
| AUTHENTICATED_ACTOR (owner obs) | Carmen Staging |
| TRUE_MEMBER | `507febfb-59e6-4cd1-9a02-362be66dc5ee` on REAL Staging org |
| VIEW_PREVIEW | UI-only nav scope overlay (`effectiveNavScopes` / `rolePreviewBlocksMutations`) |
| PRODUCCIÓN in shell | Preview persona label — **does not switch tenant** |
| CHANGES DATA FILTERING? | Nav visibility / mutation block — **not** Demo party invent |
| CAN CAUSE DEMO TO DISAPPEAR? | Indirectly (capability-gated pages) — **primary empty Clientes cause is org+Demo filter**, not preview |

`canUseOwnerDemo` === `canUseRolePreview` (`app-shell.tsx`) — Demo toggle available to same owners who get Vista de evaluación.
