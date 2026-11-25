# Locked decisions — do not re-ask Carmen

Confirmed during November 2026 overnight / ACTIVE ENGINEERING EXECUTION.

| ID | Decision |
| --- | --- |
| **Director** | Carmen directs. No CCA/Rose as product authority. |
| **Q-DEPLOY-01** | Hosted work uses a **new** Vercel preview project. Never alter `https://isalwa-os-web-evaluation.vercel.app`. No `vercel --prod` / promote against evaluation. Do not link this worktree to evaluation. Do not expose disposable local DB. Hosted auth = Supabase (not `os_dev_session`). If separate target/API/DB/identities cannot be verified safe → hosted readiness stays **UNPROVEN**. |
| **Q-LOGIN-01** | Separate synthetic identities (Gerencia General, Jefe Comercial, Asesor Comercial). No shared admin. No client impersonation that grants API rights. Credentials not in public code/URLs. Do not click login “Entrar” (`devBootstrapAction` creates a new admin org). |
| **Q-PUR-01** | Stored status key stays `pedido_preparandose`. UI label exactly **Pedido y preparándose**. No split migration. No payment-before-dispatch gate. No new paywall. |
| **Q-HOURS-01** | Do not invent business hours, prices, or dates. Unverified prices → **Precio por confirmar**. |
| **WhatsApp** | Simulated and clearly labeled. Real Cloud API/WABA blocked without Meta credentials + owner authority. Never fabricate delivery. |
| **Conversation ownership** | One owner per conversation. |
| **UI language** | Spanish BO UI (Bolivian). |
| **VISUAL FREEZE** | Keep current palette/typography/nav/tokens. No forest-green replacement redesign. Targeted usability only. Reuse `@isalwa/ui` + tokens. |
| **Role preview** | Labeled preview must **not** grant server permissions. Cargo/job title never grants alone. |
| **Write SoT** | Orders: `os_orders` / `os_order_lines`. Warehouse must not treat manually copied `os_order_read_models` as CreateOrder proof. |
| **A1 physical goods** | Linked salida = same goods as nota. Unlinked salida = **adds** physical goods and must respect ADR 0003 cumulative cap vs order line qty. |
| **Production** | Use approved plant Work / CreateWorkItem updates. Do **not** invent Order→ProductionRun stage machine. |
| **Payment** | Payment **report** ≠ payment **confirm**. |
| **Evaluation receipts** | Nov 18 evaluation docs on recovery history supersede older freezes for hosted evaluation narrative; formal reviewer report still missing. Local WIP does not replace evaluation project. |

## Evidence ladder (keep separate)

`SPECIFIED` · `IMPLEMENTED` · `TESTED LOCALLY` · `BROWSER VERIFIED LOCALLY` · `INTEGRATED` · `HOSTED` · `HOSTED JOURNEY VERIFIED` · `OWNER ACCEPTED`

## Instruction quality bar (for the new agent)

For each task define: exact screen/state; stays/changes/disappears; CTA text; route/mutation/SoT; post-success state; where outcome reappears; permissions; retry/idempotency; refresh/Back; loading/error/empty; mobile; non-goals; tests + hosted proof; final receipt ending **`CARMEN HANDOFF — WHAT I NEED TO KNOW`**.
