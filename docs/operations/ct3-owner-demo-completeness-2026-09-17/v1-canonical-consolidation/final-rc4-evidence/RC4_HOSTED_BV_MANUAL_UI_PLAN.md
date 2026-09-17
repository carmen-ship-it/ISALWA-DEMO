# RC4 hosted BV — human manual UI acceptance plan

Required layers for next hosted BV (not auto-PASS at cut). Harness: `harness/rc4-hosted-bv*.mjs`.

## Mandatory human/manual proof items

| Item | Meaning |
|------|---------|
| MANUAL_DATA_ENTRY_HOSTED | Isa/Álvaro-style entry of realistic fields in visible forms |
| FRESH_UI_CREATED_JOURNEY | Create Opportunity → Quote → lines → Pedido via normal UI (no deep-link only) |
| QUOTE_PDF_HUMAN_DOWNLOAD | Click PDF control in product UI |
| QUOTE_PDF_BYTES_VALID | Response is application/pdf with non-trivial bytes |
| NOTA_PDF_HUMAN_DOWNLOAD | Create Nota path + download control |
| NOTA_PDF_BYTES_VALID | Nota PDF bytes valid |
| USER_CREATED_DATA_CROSS_PAGE_SYNC | Fresh records appear in Cliente360 / desks / search / Pedidos index under same actor+datos |
| SEED_DEPENDENCY_PRODUCT_GAPS | Record if a step only works on seed IDs and fails on fresh UI creates |
| HUMAN_FORM_USABILITY_BLOCKERS | Missing labels, dead CTAs, wrong selectors, View As false failures |

## Human journey checklist (owner-eval Demo)

- Enter realistic test data manually  
- Use visible normal forms/buttons  
- Create Opportunity  
- Create Quote  
- Enter Quote lines  
- Download Quote PDF  
- Progress to Pedido  
- Approved operational actions (incl. OrderPrep reviews when assignees present)  
- Create Nota; download Nota PDF  
- Enter Issues / Commitments / Conversations  
- Find records again via nav/search/Cliente360  

No CLI/API/test-helper substitute for human UI proof.

## Taxonomy

Every automated check: `PASS` | `PRODUCT_FAIL` | `HARNESS_FAIL` | `BLOCKED` | `UNPROVEN`.  
HARNESS_FAIL must not become PRODUCT_FAIL.
