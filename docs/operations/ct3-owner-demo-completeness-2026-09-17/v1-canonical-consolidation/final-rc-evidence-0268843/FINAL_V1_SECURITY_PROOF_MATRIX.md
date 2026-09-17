# FINAL_V1_SECURITY_PROOF_MATRIX

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`

| Resource | Auth same-co | Unauth same-co | Cross-company | Direct URL | Search | API | View As |
|---|---|---|---|---|---|---|---|
| Client | membership+scopes | Asesor other-client blocked (unit) | org scoping | Cliente360 gate | org-scoped | parties.controller | filterByCommercialOwner |
| Opportunity | owner/visibility | list fail-closed | org | opp routes | PARTIAL | commercial query | commercialListQueryFromProjection |
| Quote | owner/visibility | convert deny cross-owner | PDF NOT_FOUND | quote+PDF | PARTIAL | CreateOrder/PDF | docs/history strip ops |
| Pedido | order auth | cross-owner | org | pedido page | PARTIAL | orders | desk allow-list |
| Work | queues | — | org | /trabajo | — | work APIs | /trabajo evaluation |
| Approval | assignee | decide deny non-assignee | org | /aprobaciones | — | DecideApproval | page **not** projection-wired |
| Conversation | org+client | — | org findMany | /conversaciones | — | customer-conversations | Asesor party filter |
| Document | PDF auth | — | PDF NOT_FOUND | /api/.../pdf | — | quote-pdf.http.test | filterDocumentLinksForProjection |
| History | timeline | Asesor B blocked unit | org | ?tab=historial | — | events | filterTimelineItemsForProjection |
| Audit | management.org.read | AccessDenied | org | /auditoria | — | listAudit | filterAuditItemsForProjection |
| Map | demo/real filter | — | org | /mapa | — | parties | mapa evaluation |
| AI | org+resource | hidden evidence blocked unit | certainty drops x-tenant | assist | — | ai.controller.test | no AI-specific View As; hosted **UNPROVEN** |

Evidence: `evaluation-history-filter.test.ts`, `role-preview.test.ts`, `quote-pdf.http.test.ts`, `tenant-isolation.test.ts`, `commercial-authority.test.ts`, `commercial-approval.test.ts`, `customer-conversations.controller.test.ts`, `ai.controller.test.ts`, `carmen-owner-bv-results.json`, `v1-rc-viewas-bv.json`.
