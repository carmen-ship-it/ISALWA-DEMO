# PF8_33_ASSERTION_BREAKDOWN

**Source:** `/tmp/ct3-bv/pf8-results.json` + `pf8-delta-bv.mjs`  
**Actor:** `w2.people-admin@isalwa.demo` (SYNTH) · DN: `w2.coordinacion@isalwa.demo`  
**Tip claimed:** `e5f6d3aaabf95c49d5358caee5dba9058d97197f`  
**Method:** Headless Playwright; nearly every navigation uses explicit `?datos=demo` deep links — **not** Carmen Staging · **not** sidebar-only persistence.

Legend: TRUE_USER_INTERACTION = click/type beyond goto+read; CONTENT = asserted DEMO record names/ids (not merely banner/HTTP 200).

| # | TEST_NAME | URL / action | DATA_SCOPE | TRUE_USER | CONTENT | WHAT_IT_PROVES | WHAT_IT_DOES_NOT_PROVE |
|---|---|---|---|---|---|---|---|
| 1 | people_admin_login | /login | SYNTH session | YES | NO | Login works for people-admin | Carmen Staging path |
| 2 | demo_banner | /inicio?datos=demo | demo query | NO | NO | Banner string present | Lists populated |
| 3 | demo_toggle | same | demo | NO | NO | Toggle labels exist | Cookie-only nav |
| 4 | story_mode_launcher | same | demo | NO | NO | Launcher visible | Full 20-step walk |
| 5 | story_mode_open | ?story=1 | demo | PARTIAL | NO | Controls Siguiente/Anterior/Salir | Step→record parity |
| 6 | old_walkthrough_removed | 6 pages ?datos=demo | demo | NO | NO | No "Mostrar recorrido" | Micro-tours absent |
| 7–21 | coverage_* (15) | each desk ?datos=demo | demo | NO | **WEAK** | HTTP 200 + demoCue (banner OR DEMO name OR toggle) | Named client rows; org=Carmen; sidebar nav |
| 22 | demo_data_visible_any_page | aggregate | demo | NO | WEAK | ≥3 pages with cue | Clientes list non-empty for Carmen |
| 23 | coherence_cliente360_maderas | seeded href +datos | demo | NO | YES | DEMO MADERAS on deep link | List→detail nav |
| 24 | coherence_quote | seeded quote href | demo | NO | YES | Q-000002 + DEMO MADERAS | Accepted filter list |
| 25 | quote_pdf_cta | quote page | demo | NO | NO | CTA text present | Click download UX |
| 26 | coherence_pedido | seeded order | demo | NO | YES | O-000002 + DEMO MADERAS | Pedidos index |
| 27 | coherence_docs | documentos tab | demo | NO | WEAK | PDF-ish labels | Full dossier |
| 28 | quote_pdf_http | GET quote pdf | session | YES | NO | 200 application/pdf | UI button click |
| 29 | coord_login | login | SYNTH | YES | NO | Coordinacion login | Carmen |
| 30 | dn_pdf_http | GET DN pdf | session | YES | NO | 200 application/pdf | UI click |
| 31 | real_seven_mutated_artifact | seeded-ids.json | n/a | NO | NO | Artifact says NO | Live REAL seven audit |
| 32 | seeded_org_is_synth | seeded-ids | n/a | NO | NO | Org id SYNTH | Session org |
| 33 | maderas_ids_present | seeded-ids | n/a | NO | NO | IDs exist in JSON | Hosted list visibility |

## How 33/33 coexisted with owner failures

1. **Wrong actor/org:** PF-8 = SYNTH people-admin; Carmen = REAL Staging S.R.L. (0 DEMO parties).
2. **demoCue ≠ populated list:** coverage checks pass on banner/toggle alone (`hasDemoCue` regex).
3. **Deep links with `?datos=demo`:** never tested sidebar drop of `datos` nor cookie-only path as primary.
4. **No Clientes row assertion:** `coverage_Clientes` does not require "DEMO MADERAS" in list body.
5. **Q-000015 / approvals / Trabajo empty:** never in PF-8 matrix.
6. **Approval≠Pedido:** never asserted; product correctly does not create Pedido.

**PF8_TRUE_USER_INTERACTIONS ≈ 5/33** (login×2, pdf GETs, optional story click)  
**PF8_ACTUAL_CONTENT_ASSERTIONS ≈ 4/33** (MADERAS c360/quote/pedido + weak docs)
