# FINAL_ROLE_RESOURCE_MATRIX (scaffold — fill from CR gaps)

**Authority:** Canonical V1 §4 + §58  
**State legend:** NO_ACCESS | SUMMARY | WORK_RELEVANT | FULL_BUSINESS | APPROVAL_AUTHORITY | MUTATION_AUTHORITY  

Cells are **intent**; IMPL column filled after gap workers. Resource narrowing notes required.

| Surface | ASESOR | JEFE COMERCIAL | GERENTE GENERAL | PRODUCCIÓN | ALMACÉN | COMPRAS | COORDINACIÓN | FINANZAS | CARMEN OWNER EVAL (SYNTH) |
|---|---|---|---|---|---|---|---|---|---|
| Clientes | FULL_BUSINESS owned/covered only | FULL_BUSINESS company | FULL_BUSINESS company | WORK_RELEVANT authorized Pedido clients | WORK_RELEVANT | WORK_RELEVANT | WORK_RELEVANT delivery | WORK_RELEVANT finance | FULL_BUSINESS SYNTH (bounded scopes) |
| Cliente360 | role-narrowed | commercial+ | management+ | ops subset | warehouse subset | purchasing subset | delivery subset | finance subset | management-like business |
| Oportunidades | own/covered | company | company | NO_ACCESS default | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS |
| Cotizaciones + amounts | own/covered | company | company | NO_ACCESS default | NO_ACCESS | NO_ACCESS | NO_ACCESS | SUMMARY where needed | FULL_BUSINESS |
| Pedidos | own commercial flow | commercial follow-up | company | authorized ops | authorized | authorized | authorized | authorized | FULL_BUSINESS |
| Production | SUMMARY progress only | SUMMARY | FULL_BUSINESS progress | FULL_BUSINESS authorized | SUMMARY | SUMMARY | SUMMARY | SUMMARY | FULL_BUSINESS |
| Warehouse | SUMMARY | SUMMARY | FULL_BUSINESS | SUMMARY | FULL_BUSINESS auth | SUMMARY | WORK_RELEVANT | SUMMARY | FULL_BUSINESS |
| Purchasing | NO_ACCESS default | NO_ACCESS | SUMMARY | NO_ACCESS | NO_ACCESS | FULL_BUSINESS auth | NO_ACCESS | SUMMARY | FULL_BUSINESS |
| Delivery | SUMMARY | SUMMARY | FULL_BUSINESS | SUMMARY | WORK_RELEVANT | NO_ACCESS | FULL_BUSINESS | WORK_RELEVANT | FULL_BUSINESS |
| Finance | NO_ACCESS | NO_ACCESS | FULL_BUSINESS ops | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | FULL_BUSINESS ops | FULL_BUSINESS ops |
| Mi Trabajo | own | team commercial | company | production | warehouse | purchasing | delivery | finance | company (SYNTH) |
| Approvals | requested by self | APPROVAL_AUTHORITY commercial exception | escalate queue only if assigned | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | commercial.price.approve present (eval) |
| Issues/Commitments | authorized clients | commercial | company | ops-relevant | ops-relevant | ops-relevant | delivery-relevant | finance-relevant | FULL_BUSINESS |
| Conversations | authorized clients | commercial oversight | broader | work-necessary only | work-necessary | work-necessary | delivery-relevant | NO_ACCESS default | FULL_BUSINESS |
| Documents | authorized | commercial | management | ops-required | ops-required | ops-required | delivery | finance | FULL_BUSINESS |
| History/Audit | authorized | commercial | management | ops-authorized | ops-authorized | ops-authorized | delivery | finance | FULL_BUSINESS |
| Map | own clients | commercial company | company | NO general | NO general | NO general | delivery locations | NO general | company SYNTH |
| Gerencia metrics | NO_ACCESS | commercial metrics | factual company | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | NO_ACCESS | factual |
| Search | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered | auth-filtered SYNTH |
| Jarvis/AI | authorized universe | commercial | management | ops | ops | ops | delivery | finance | SYNTH business; View As narrows |

IMPL status: pending CR workers.
