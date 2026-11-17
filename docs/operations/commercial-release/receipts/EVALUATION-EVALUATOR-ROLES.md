# Evaluator roles prepared for Isa and Álvaro

Candidate product: `7ddf258b`. Invitation emails: **not known — do not guess**. Lack of emails does not block admin-hosted verification once deploy exists.

## Least-privileged profiles (two seats)

| Seat | Intended person | Org membership | Effective evaluation focus | Must **not** receive |
|---|---|---|---|---|
| **Asesor comercial** | One of Isa / Álvaro | Active member of the **synthetic evaluation** organization only | `/clientes` (own commercial slice), Cliente 360, `/conversaciones` (Registrar atención, Nota interna, attention states; Mensaje blocked), own `/compromisos`, quotes within own authority | `system.admin`, org-wide audit export, other tenants, `people.admin`, unrestricted `payments.confirm`, price-approve unless they already hold it in daily work |
| **Jefe comercial / cobertura** | The other | Same synthetic org | Manager range on Hoy/compromisos handover within team, customer coverage views, read across advisors in range | Technical admin, other companies, payment confirmation unless that is their real job, WhatsApp activation |

If both need the same day-to-day desk, both may be **Asesor** with different synthetic commercial-owner slices — still not admins.

## Invitation procedure (when emails exist)

1. Confirm Supabase Auth project for the **commercial** app (not Architect).
2. Invite each email into the synthetic evaluation org only.
3. Assign the seat’s role/scopes from the matrix above (reuse existing role grants; no new parallel permission system).
4. First login: hosted supabase session only — no Entrar (desarrollo).
5. Smoke: each can open `/inicio` and their allowed desks; forbidden desks fail closed.
6. Only then send the evaluation script (`EVALUATION-SCRIPT-ISA-ALVARO.md`).

## Not done

Invitations not sent. Hosted URL not available until deploy gates clear.
