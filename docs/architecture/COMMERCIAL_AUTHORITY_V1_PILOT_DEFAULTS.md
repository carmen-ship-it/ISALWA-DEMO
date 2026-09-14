# Commercial authority — provisional V1 pilot defaults

**Status:** provisional pilot defaults. Not final Isa/Álvaro company policy.  
**Date:** 2026-09-13

These rules exist so Isa and Álvaro can use a coherent Commercial V1. They are reversible: omit the explicit capability assignment and the extra authority disappears. Do not treat this document as a closed business decision.

## What is enforced now

1. A submitted quote may be converted to an order only by the current quote owner, or by a member holding `commercial.order.convert`.
2. A human may request approval of a submitted quote or an open order by choosing an active member in the same organization. The approver, or an active delegate with `approval.act`, may approve or reject. Approval records the decision only.
3. A commercial-account owner may be reassigned only by a member holding `commercial.account.reassign`.

`people.admin`, `commercial.team.read`, `commercial.org.read`, Cargo, and title do not grant any of these actions.

## Capabilities to assign later

Do not auto-assign these to ASESOR DE VENTA, JEFE COMERCIAL, GERENTE GENERAL, `people.admin`, or imported staff.

| Capability | Provisional effect |
|---|---|
| `commercial.order.convert` | Convert another member's submitted quote to an order |
| `commercial.account.reassign` | Change the single commercial-account owner |

The quote owner can convert their own submitted quote without `commercial.order.convert`. The account owner cannot reassign the account without `commercial.account.reassign`.

## Business decisions still open

Isa and Álvaro can change all of the following after review:

1. Who may convert quotes to orders.
2. Who may request commercial approval.
3. Who normally approves.
4. Whether approvals later become mandatory by amount, discount, or credit.
5. Who may reassign customer ownership.
6. Whether shared ownership is ever needed.

RD-02 remains open. This slice does not add thresholds, automatic approvers, shared ownership, invoices, payments, delivery, or warehouse checks.
