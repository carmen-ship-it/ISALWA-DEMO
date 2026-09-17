# FINAL_V1_ROLE_BEHAVIOR_MATRIX

**RC:** `02688431b9290b818c8fb245d68c086379363b3f`  
**Legend:** NO_ACCESS | SUMMARY | WORK_RELEVANT | FULL_BUSINESS | APPROVAL_AUTHORITY | MUTATION_AUTHORITY  
**Note:** Cells describe **intended product + View As projection when Carmen evaluates**. Real employee logins for the five REAL staff remain NOT_PROVEN (Cargo ≠ login).

| Surface | Asesor | Jefe Comercial | Gerente General | Producción | Almacén | Compras | Coordinación | Finanzas | Carmen Owner Eval |
|---|---|---|---|---|---|---|---|---|---|
| Inicio | WORK_RELEVANT own | FULL_BUSINESS commercial lens | FULL_BUSINESS company | WORK_RELEVANT ops | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS SYNTH |
| Clientes | FULL_BUSINESS owned/covered | FULL_BUSINESS company | FULL_BUSINESS | WORK_RELEVANT pedido clients | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Cliente360 | role-narrowed tabs | commercial+ | management+ | ops subset | warehouse subset | purchasing subset | delivery subset | finance subset | FULL_BUSINESS |
| Oportunidades | FULL_BUSINESS own/covered | FULL_BUSINESS | FULL_BUSINESS | NO_ACCESS default | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS |
| Cotizaciones | FULL_BUSINESS own/covered | FULL_BUSINESS | FULL_BUSINESS | NO_ACCESS / stripped | NO_ACCESS / stripped | NO_ACCESS | NO_ACCESS | SUMMARY | FULL_BUSINESS |
| Pricing | MUTATION_AUTHORITY own rules | APPROVAL_AUTHORITY exceptions | APPROVAL_AUTHORITY if assigned | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS eval |
| Pedidos | FULL_BUSINESS own flow | FULL_BUSINESS follow-up | FULL_BUSINESS | WORK_RELEVANT auth | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Producción | SUMMARY progress | SUMMARY | FULL_BUSINESS progress | FULL_BUSINESS + MUTATION when not View As | SUMMARY | SUMMARY | SUMMARY | SUMMARY | FULL_BUSINESS |
| Almacén | SUMMARY | SUMMARY | FULL_BUSINESS | SUMMARY | FULL_BUSINESS + MUTATION | SUMMARY | WORK_RELEVANT | SUMMARY | FULL_BUSINESS |
| Compras | NO_ACCESS default | NO_ACCESS | SUMMARY | NO_ACCESS | NO_ACCESS | FULL_BUSINESS + MUTATION | NO_ACCESS | SUMMARY | FULL_BUSINESS |
| Entregas | SUMMARY | SUMMARY | FULL_BUSINESS | SUMMARY | WORK_RELEVANT | NO_ACCESS | FULL_BUSINESS + MUTATION | WORK_RELEVANT | FULL_BUSINESS |
| Finanzas | NO_ACCESS | NO_ACCESS | FULL_BUSINESS ops | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS ops | FULL_BUSINESS ops |
| Mi Trabajo | WORK_RELEVANT own | WORK_RELEVANT team | FULL_BUSINESS company | production queue | warehouse queue | purchasing queue | delivery queue | finance queue | FULL_BUSINESS |
| Aprobaciones | SUMMARY requested | APPROVAL_AUTHORITY | APPROVAL_AUTHORITY if assigned | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | APPROVAL_AUTHORITY (eval scopes) |
| Incidencias | WORK_RELEVANT auth clients | FULL_BUSINESS commercial | FULL_BUSINESS | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Compromisos | WORK_RELEVANT | FULL_BUSINESS | FULL_BUSINESS | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Conversaciones | FULL_BUSINESS auth clients | FULL_BUSINESS | FULL_BUSINESS | WORK_RELEVANT necessary | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | NO_ACCESS default | FULL_BUSINESS |
| Documentos | FULL_BUSINESS auth | FULL_BUSINESS | FULL_BUSINESS | WORK_RELEVANT ops docs | WORK_RELEVANT DN | WORK_RELEVANT | WORK_RELEVANT DN | WORK_RELEVANT | FULL_BUSINESS |
| Historial | WORK_RELEVANT auth | FULL_BUSINESS commercial | FULL_BUSINESS | WORK_RELEVANT ops events | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Auditoría | WORK_RELEVANT filtered | FULL_BUSINESS commercial | FULL_BUSINESS | WORK_RELEVANT filtered | WORK_RELEVANT filtered | WORK_RELEVANT filtered | WORK_RELEVANT | WORK_RELEVANT | FULL_BUSINESS |
| Mapa | FULL_BUSINESS own clients | FULL_BUSINESS company | FULL_BUSINESS | NO_ACCESS general | NO_ACCESS | NO_ACCESS | WORK_RELEVANT delivery | NO_ACCESS | FULL_BUSINESS SYNTH |
| Gerencia | NO_ACCESS | SUMMARY commercial metrics | FULL_BUSINESS factual | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS factual |
| Search | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered SYNTH |
| Jarvis | authorized universe | commercial | management | ops | ops | ops | delivery | finance | SYNTH; **hosted UNPROVEN** |

## Resource-level narrowing (implementation)

- **View As active:** `getEvaluationProjection()` + `commercialListQueryFromProjection` + `evaluationAllowsDesk` + `filterDocumentLinksForProjection` / `filterTimelineItemsForProjection` / `filterAuditItemsForProjection`; mutations blocked via `assertRolePreviewAllowsMutation`.
- **Identity:** always Carmen when using Vista de evaluación (not Ver-como QA).
- **Gaps:** `/inicio`, `/aprobaciones`, `/compromisos`, `/incidencias` do **not** call `getEvaluationProjection` (nav/scopes may still change; list SSR not fully narrowed).
- **Asesor subject:** fail-closed without `subjectMemberId` on desks that require it.
