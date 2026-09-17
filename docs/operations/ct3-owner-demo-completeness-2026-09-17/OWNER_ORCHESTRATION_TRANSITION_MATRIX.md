# OWNER ORCHESTRATION — TRANSITION MATRIX (ENGINEERING)

**Authority:** Forensic artifacts + existing code. No invented company policy.  
**Status:** Living matrix — update as lanes close cascades.

Legend for UNKNOWN: `NOT EVIDENCED` | `BUSINESS_DECISION_REQUIRED`

---

## How to read a row

TRIGGER → PRECONDITIONS → AUTHORIZED ACTOR → RECORD CHANGED → RELATED → BUSINESS EVENT → WORK/ATTENTION → WHO NEXT → CTA → C360 / LISTS / DOCS / CONV / AUDIT / MGMT → NEGATIVE → UNKNOWN RULES

---

### CLIENT CREATED
| Field | Value |
|---|---|
| TRIGGER | Agregar cliente (commercial create) |
| AUTHORIZED ACTOR | scopes already on commercial create |
| RECORD | party |
| WORK | none unless evidenced |
| NEXT CTA | Ver cliente |
| UNKNOWN | assignment of commercial owner if not entered — **NOT EVIDENCED** auto-assign |

### OPPORTUNITY CREATED / QUALIFIED
| Field | Value |
|---|---|
| TRIGGER | create opportunity |
| NEXT CTA | Crear cotización (`opportunityNextStep`) |
| UNKNOWN | “qualified” stage definitions beyond stored status — use stored status only |

### QUOTE CREATED / SENT / FOLLOW-UP
| Field | Value |
|---|---|
| TRIGGER | create / manual send evidence / follow-up work |
| WORK | follow-up work when scheduled (existing) |
| NEXT | from `quoteNextStep` |
| UNKNOWN | SLA for follow-up due — **NOT EVIDENCED** |

### APPROVAL REQUESTED
| Field | Value |
|---|---|
| TRIGGER | requestCommercialApproval |
| WORK/ATTENTION | pending for approver (existing approval desk) |
| NEXT for requester | wait / Ver aprobación |
| DOES NOT | create Pedido |

### APPROVAL APPROVED / REJECTED
| Field | Value |
|---|---|
| TRIGGER | decideCommercialApproval |
| RECORD | approval status; **does not** auto-accept quote or create order (**evidenced**) |
| WORK | pending attention should clear for approver |
| NEXT CTA (required UX) | Ver cotización; Convertir a Pedido **only if** quote eligible **and** actor has convert scope |
| NEGATIVE | cancelled quote → explain; no Convertir |
| UNKNOWN | which discount thresholds require approval — **NOT EVIDENCED** (do not invent) |

### QUOTE ACCEPTED / ELIGIBLE / CONVERTED → PEDIDO
| Field | Value |
|---|---|
| TRIGGER | client accepted path / Convertir a Pedido (explicit) |
| AUTHORIZED | commercial convert scopes |
| RECORD | quote accepted + order created |
| CASCADE must include | Pedidos index, Cliente360, audit/history, no silent skip of convert |
| UNKNOWN | auto-accept from conversation — **NOT EVIDENCED** (suggestion only) |

### PEDIDO → OPS / DN / SALIDA / ENTREGA
| Field | Value |
|---|---|
| TRIGGER | existing ops commands |
| UNKNOWN | production SLAs, stock availability claims — **NOT EVIDENCED**; show recorded facts only |

### ISSUE / COMMITMENT
| Field | Value |
|---|---|
| TRIGGER | create/resolve/complete as existing |
| WORK | when assigned/due as existing model |
| UNKNOWN | default assignee — **NOT EVIDENCED** |

### CONVERSATION SUGGESTS *
| Field | Value |
|---|---|
| TRIGGER | durable conversation + deterministic suggestion rules (existing smart-context) |
| MUST NOT | auto-create opp/quote/issue without human |
| UNKNOWN | provider WhatsApp send — out of scope / no fake live |

---

## Ownership / coverage / handoff triggers (addendum)

| TRIGGER | WORK CREATED? | OWNER CHANGE? | UNKNOWN COMPANY POLICY |
|---|---|---|---|
| Client owner assigned | no | yes (canonical) | default when blank — **BUSINESS_DECISION_REQUIRED** |
| Client owner reassigned | review open Work | yes (explicit) | who may reassign — **BUSINESS_DECISION_REQUIRED** |
| Temporary coverage assigned | optional delegated Work | **NO** (owner remains) | convert via coverage grant only if configured |
| Temporary coverage removed | resolve helper Work | **NO** | — |
| Quote follow-up scheduled | yes (due date required) | no | no invented SLA |
| Approval requested | attention for approver | no (approver ≠ owner) | threshold matrix |
| Approval decided | approver attention clears | no | — |
| Quote accepted | no auto Pedido | no | — |
| Quote converted | Pedido; order keeps quote owner provenance | no silent owner rewrite | — |
| Production / Warehouse / Purchasing review requested | yes | no | when obligatory — **BUSINESS_DECISION_REQUIRED** |
| Production / Warehouse fact recorded | may resolve related Work | no | — |
| Delivery Note / Salida / Entrega | separate explicit facts | no | no cascade inference |
| Issue / Commitment confirmed | if assigned/due | no | default assignee |
| Work reassigned | preserves ORIGINAL→NEW | assignee only | — |
| Conversation suggestion confirmed | depends on confirmed type | no auto | — |

**Negatives locked:** OTHER_ADVISOR_AUTOMATIC_TAKEOVER=NO · Pedido⇏auto Production/Warehouse/Purchasing · OVERDUE auto-escalation=NO · UNOWNED random assign=NO

---

## Cascade checklist (every closed transition)

- [ ] Domain record
- [ ] Status
- [ ] Related records
- [ ] Documents if any
- [ ] BusinessEvent / history
- [ ] Work/Attention if human action required
- [ ] Responsibility evidenced
- [ ] Next safe CTA
- [ ] Cliente360
- [ ] Lists/search
- [ ] Management if applicable
- [ ] Conversation context if applicable
- [ ] Audit
- [ ] Story Mode if represented
- [ ] Demo/Real company context correct

## Counts (update at close)

| Metric | Value |
|---|---|
| TRANSITIONS_AUDITED | 24 listed |
| TRANSITIONS_CLOSED_END_TO_END | 0 (correction in progress) |
| TRANSITIONS_PARTIAL | — |
| TRANSITIONS_BLOCKED_BY_BUSINESS_DECISION | 0 hard blocks yet |
| INVENTED_BUSINESS_RULES | **0** |
