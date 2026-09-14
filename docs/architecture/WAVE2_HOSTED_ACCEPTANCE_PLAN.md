# Wave 2 — hosted acceptance plan (`ef7eeab`) — PREPARED, NOT EXECUTED

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Gate C:** MIGRATED_AND_VERIFIED. **Do not execute until Carmen authorizes after application deploy of `ef7eeab`.**  
Purchase status workflow migration is **applied** on empty staging (no longer schema-HOLD). Hosted Compras still unproven until deploy + fixtures + browser.

## Sequence

### A. Security
- Trusted session only; client scopes ignored  
- Foreign tenant ids fail closed without existence leak  
- Cargo/title never authorize  

### B. Role homes
- Each synthetic fixture lands on intended home  
- Wrong-role surfaces show permission/unavailable — no dead “success”  

### C. Eight journeys
1. Vender — quote + convert (owner/coverage/order.convert)  
2. Atender un Pedido — truthful UNPROVEN/NO_FACT; no fake zeros  
3. Producción — entry/quema/loss/consumption persistence  
4. Cumplir Pedido — Listo receive ≠ allocate; partial/multiple allocate  
5. Entregar — exit ≠ delivery; partial/multiple; external number preserved; no invented numbering  
6. Resolver un problema — issue flow per available authority  
7. Coordinar — decision **write** works; prior-decision **read** shows closed/P1 limitation (not empty=no history)  
8. Gerencia — drillthrough; no dead KPI  

### D. Modo Guiado
- Continuar never claims live/official  
- Cumplir/Entregar truthful  
- Compras limitation visible while REWRITE HOLD  

### E. UI humiliation
- No giant unusable warehouse selects (SearchableSelect present)  
- No fake zero / silent disabled without reason  

### F. Isa business rules
- receive ≠ allocate ≠ outbound ≠ delivery  
- Production independent of Pedido  
- Factory delivery note still BUSINESS_ROLE_REQUIRES_MAPPING  

### G. Truthfulness / source coverage
- UNPROVEN ≠ NO_FACT  
- Missing ports labeled  

### H. Responsive / keyboard / focus
- Guide Escape/focus regressions  
- Forms operable  

### I. Synthetic tenant isolation
- Cross-org denial; no leak  

### J. Seven real customers
- Read-only integrity counts only  
- No mutation tests against them  

## Purchase limitation (expected)

Compras cannot perform Spanish status workflow transitions while  
`20260916140000_os_purchase_status_workflow` remains unapplied.  
UI must show unavailable/limited — not fake transitions.

- Blocks **full Isa pilot acceptance** for Compras journey  
- Does **not** by itself block technical staging deploy of other journeys **if** migrate window avoids silent `#14` apply  

## P1 gaps (must stay truthful)

| Gap | UX requirement |
|---|---|
| Coordination prior-decision read | Closed/unavailable — not empty history |
| CUSTOMER_INFORMED_OF_ORDER | Not inferred from conversation |
| Special order write | Closed — no invented scope |
