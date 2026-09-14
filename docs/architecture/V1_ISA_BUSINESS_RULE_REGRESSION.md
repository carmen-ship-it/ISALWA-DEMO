# V1 Isa Business-Rule Regression

Frozen assertions from Isa operating practice + Carmen transcription of three real forms.

A = automated test exists on candidate · M = manifest/manual until HOSTED · B = both

| ID | Rule | Proof |
|---|---|---|
| BR-01 | Production independent from Pedido | A/M |
| BR-02 | Covering advisor ≠ shared ownership | M |
| BR-03 | Product ID is cross-department join | M |
| BR-04 | SKU nullable / not invented | M |
| BR-05 | PriceList/PriceEntry only from governed source | M (historical Capri/Cádiz prices must not write PriceList) |
| BR-06 | Pedido Especial explicit / no numeric threshold | M |
| BR-07 | Customer committed date ≠ production internal target | A/M |
| BR-08 | Risk explicit / not inferred | M |
| BR-09 | Customer informed separate | A partial; general informed-of-order FOUNDATION_GAP |
| BR-10 | Listo = FinishedGoodsReceipt | A |
| BR-11 | Finished Goods ≠ allocation | A |
| BR-12 | Receive ≠ allocate | A |
| BR-13 | Partial/multiple allocation | M/A as implemented |
| BR-14 | Partial/multiple delivery | A/M |
| BR-15 | Nota de Salida ≠ Nota de Entrega | A |
| BR-16 | Nota de Entrega de Fábrica distinct until mapped | A constants + M | BUSINESS_DECISION_REQUIRED |
| BR-17 | DeliveryNote cannot predate Delivery | A |
| BR-18 | External document number preserved; not generated without rule | A (`007189` pattern) | DOCUMENT_NUMBERING open |
| BR-19 | Mixed payment methods supported | A (`007472` 1070+200) |
| BR-20 | Payment evidence ≠ ledger truth | A |
| BR-21 | Payment not universal gate for delivery | A |
| BR-22 | Quema multi-product | M/A prior |
| BR-23 | Consumption does not decrement authoritative stock | M/A |
| BR-24 | Loss quantity/%/reason/product/step/time/actor | M/A |
| BR-25 | Purchase status labels exact | M/A | Gate C HOLD on migrate |
| BR-26 | Cargo/title grant no authority | M + security |
| BR-27 | people.admin not business-manager shortcut | M + security |
| BR-28 | Read ≠ write | A/M |
| BR-29 | Client tenant/scope data not authority | A |
| BR-30 | UNPROVEN ≠ zero | A reader + M UI |
| BR-31 | NO_FACT ≠ unavailable source | A reader + M UI |

**Count:** 31 rules.  
**Automated on this pass delta:** BR-18, BR-19 (plus prior delivery/payment/Listo tests covering BR-10–17, BR-20–21).  
**Manifest-only / hosted:** remainder until browser proof.

Failure of tenant isolation or ledger boundary → stop Gate. Other BR failures park the owning journey only.
