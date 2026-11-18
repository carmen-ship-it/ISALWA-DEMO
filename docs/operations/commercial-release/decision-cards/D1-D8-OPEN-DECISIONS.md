# Decision cards — D1–D8 (open stop gates)

Engineering must not invent answers. Each card lists only options already supported by product docs / source contracts. Update status when Isa / Álvaro / Carmen decide; deposit authority in the worksheet and contracts.

Status legend: `open` · `recorded` · `decided` · `deferred`

---

## D1 — Named holders of `commercial.price.approve`

| Field | Content |
|---|---|
| Question | Who specifically receives `commercial.price.approve` for live evaluation / pilot? |
| Documented options | Role intent: Jefatura Comercial and/or Gerencia (V2/A1/Isa relay). Source already enforces scope + no self-approval; synthetic holders exist in evaluation fixture only. |
| What each changes | Named people/role grants activate real approval queues; without names, only synthetic/fixture approval paths. |
| Who decides | Isa / Álvaro (commercial authority); Carmen records grants |
| Engineering can continue | Keep T04 lifecycle stable; refuse self-approve; document honest “synthetic approver” limits |
| Blocked | Phase 3 approval activation for real seats; live exception decisions on evaluation with non-synthetic authority |
| Status | open |

---

## D2 — Approval thresholds

| Field | Content |
|---|---|
| Question | What thresholds require approval (discount %, quote amount, product context, combination, or all manual prices)? |
| Documented options | Exception approval for price/discount specials (established). Range modelling is OPEN in source (any scope holder may approve today). Catalog contexts: Showroom, Más de 10, Calidad Segunda, Viajes/Trópico. |
| What each changes | Server-enforced range vs “all manual prices need approval” interim rule |
| Who decides | Isa / Álvaro; Carmen records |
| Engineering can continue | Preserve unbound-range honesty in docs; no invented thresholds |
| Blocked | Phase 3 threshold enforcement; “real price” quote workflow claims |
| Status | open |

---

## D3 — Approved catalog source of truth

| Field | Content |
|---|---|
| Question | What is the approved catalog PDF, price matrix by context, Contabilidad SKU mapping, and exception policy? |
| Documented options | SKUs originate in Contabilidad; four commercial contexts required; show “Precio por confirmar” when no approved price; Lane A catalog candidate exists but must not be merged blindly without approved materials + review |
| What each changes | Journey 9/11/13 become implementable with real prices; without materials, catalog stays proposal/blocked |
| Who decides | Isa / Álvaro / Contabilidad (materials); Carmen supplies files to integrator |
| Engineering can continue | Honest empty/pending `/productos`; symbolic fixture quote lines labeled non-catalog; Phase 0/1 docs |
| Blocked | Phase 2 catalog + price basis (first major commercial implementation batch) |
| Status | open |

---

## D4 — WhatsApp line policy

| Field | Content |
|---|---|
| Question | Corporate WhatsApp per advisor vs one shared line; Meta account ownership; access model; hours; escalation? |
| Documented options | Intended direction: corporate WhatsApp associated with advisors; FAQ + human escalation; human confirm before permanent save. No Meta connection exists. Evaluation conversations must state no Meta connection. |
| What each changes | Inbound identity, send evidence, ownership of chats |
| Who decides | Isa / Álvaro / Carmen (ops); Meta account owner |
| Engineering can continue | Manual conversation / disclaimer honesty; no fake Connected |
| Blocked | Phase 6 provider connection; real send/delivery claims |
| Status | open |

---

## D5 — Payment-before-dispatch and exception authority

| Field | Content |
|---|---|
| Question | Is verified payment required before dispatch? Who authorizes exceptions? |
| Documented options | Payment report ≠ confirmation; known example split QR + cash is not a generalized policy; Contabilidad verifies reported funds (A1). Dispatch/delivery need evidence when activated. |
| What each changes | Order → dispatch eligibility gates |
| Who decides | Isa / Álvaro / Contabilidad; Carmen records |
| Engineering can continue | Keep report vs confirm distinct; fixture pending reports |
| Blocked | Phase 4 dispatch eligibility automation |
| Status | open |

---

## D6 — Cancel order / convert another advisor’s quote

| Field | Content |
|---|---|
| Question | Who may cancel an order? May a manager convert another advisor’s quote? |
| Documented options | Advisors convert own quotes when server authorization permits; coverage convert only with explicit `quote.convert` + actor permission (T04). Gerencia broader authority only where explicitly granted. |
| What each changes | Cancel command grants; team convert grants |
| Who decides | Isa / Álvaro; Carmen records |
| Engineering can continue | Preserve ownership/coverage convert rules already coded; no silent expand |
| Blocked | Phase 4 cancel/team-convert activation beyond current scopes |
| Status | open |

---

## D7 — GPS confirmation before confirmed map pin

| Field | Content |
|---|---|
| Question | When may a customer appear as confirmed on the map (imported GPS vs human review)? |
| Documented options | Stored coordinates alone ≠ confirmed geographic workflow; no Mapbox claim until provider + policy. Honest empty/pending canvas is correct today. |
| What each changes | Confirmed vs pending map lists; provider integration |
| Who decides | Isa / Álvaro / Carmen; provider choice may need Carmen budget |
| Engineering can continue | Store/review locations by authority; honest map UI |
| Blocked | Phase 5 Mapbox (or chosen provider) integration |
| Status | open |

---

## D8 — WhatsApp/AI operating policy and budget

| Field | Content |
|---|---|
| Question | Hours, escalation owners, FAQ source, human-save confirmation, retention, AI budget? |
| Documented options | Human control before permanent record; FAQ assistance with visible escalation; no Meta; evaluation must not claim automation |
| What each changes | Scheduler/hours, AI spend, FAQ publish path |
| Who decides | Isa / Álvaro / Carmen; budget owner |
| Engineering can continue | Disconnected honesty; commitment UI without auto-WhatsApp |
| Blocked | Phase 6 AI/WhatsApp adapters; commitment auto-notify via WhatsApp |
| Status | open |
