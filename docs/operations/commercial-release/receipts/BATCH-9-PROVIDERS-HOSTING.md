# Receipt — Batch 9: providers, AI and disconnected-channel honesty

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `fd11db98`. Authority: `CONTINUATION-2026-11-16.md` §14, §15, §17–§18, and the Batch 9 instruction (honesty, human gates, hosting prep; no push, no deploy, no paid call, no purchase).

Hosting prep is split into `VERCEL-HOSTING-PREP.md`.

## Evidence states (kept distinct)

| Dimension | State for Batch 9 |
|---|---|
| Disconnected-channel honesty (code) | **IMPLEMENTED + TESTED LOCALLY** (one defect found and fixed, below) |
| AI human-gate audit | **TESTED LOCALLY (existing tests) + SOURCE-AUDITED**; no new AI behavior |
| T12 WhatsApp adapter, webhook, outbox, media | **SPECIFIED only. NOT IMPLEMENTED.** Not started: see "Provider blockers" |
| T13 A01–A22 deterministic engine, handoff | **SPECIFIED only. NOT IMPLEMENTED** (only H08/H09 preview text exists in `os-contracts/payment-report.ts`) |
| T14 H01–H09 proposals, persistent quotas, stale/double-accept protection | **SPECIFIED only. NOT IMPLEMENTED** |
| Independent review | **NOT DONE.** No reviewer was run. Review pending is not review passed. |
| Deployment | **NOT DEPLOYED.** Nothing was pushed or hosted. |
| Provider activation | **NOT ACTIVATED.** No credential, line, template or provider call exists or was used. |
| Human acceptance | **NOT DONE.** Nothing here is owner accepted. |

## 1. WhatsApp disconnected honesty

Audit of every os-web, os-api and provider-package surface that can mention or imply WhatsApp, email or send:

| Surface | Finding | Action |
|---|---|---|
| `/conversaciones` thread (`conversation-thread.tsx`) | No composer, no send control (enabled or disabled), "WhatsApp no conectado" pill, `composerNotice`, "Registrar atención" is the only way to add to a thread. Test `batch5-attention` asserts no `Enviar`/`<textarea>`/`onSend`. | None needed. Added a second static assertion in `channel-health.test.ts` (no `<form>`, `type="submit"`, `sendMessage`). |
| `/mensajes` | "Mensajes todavía no está conectado" + "Canal no conectado"; manual record only. | None. |
| Conversation provider adapter (`lib/conversations/adapters.ts`) | `canSend:false`, `live:false`, `send()` returns `{sent:false, reason:'provider_not_connected'}`. | None. |
| os-api `customer-conversations.controller` | Advisor number stays `WHATSAPP_NUMBER_PENDING`, `providerConnected:false`; test forbids `Meta|Twilio|providerConnected: true|send(`. | None. |
| Quote "Registrar como enviada" (manual send) | Human declaration of an external send; copy says ISALWA does not send WhatsApp or email; test forbids provider symbols. | None. It records a person's declaration, not a delivery. |
| `packages/providers` registry | Always builds `MockMessagingProvider` and `MockEmailProvider`, whatever `MESSAGING_PROVIDER`/`EMAIL_PROVIDER` say. No WhatsApp, Meta or Twilio client exists in the repository. | Recorded. |
| **`/sistema` provider health (`system.admin`)** | **DEFECT.** Any non-`mock` `MESSAGING_PROVIDER` or `EMAIL_PROVIDER` value rendered "Funcionando" for WhatsApp/Email, although no adapter exists. A one-line env change would have shown a connected WhatsApp. The AI row also said "Funcionando … proveedor en vivo" from a credential alone. | **Fixed** (below). |

### Fix (safe code honesty)

- New pure module `apps/os-web/lib/system/channel-health.ts`:
  - WhatsApp and Email are always **"No conectado"**. A declared provider is described as a declaration: "Se declaró un proveedor … pero ISALWA no tiene un adaptador … activo ni autorización de activación. No envía ni recibe mensajes; use 'Registrar atención'."
  - AI with a credential is **"Configurada, sin verificar"** (neutral tone, no success tone), with "una persona decide y confirma"; mock is "Piloto (mock)" described as a test double; missing credential "Falta configurar"; otherwise "Desactivada".
- `app/(app)/sistema/page.tsx` uses it; the old `providerKind` helper and the inline rows were removed (no dead code).
- Tests `lib/system/channel-health.test.ts` (7). Mutation: making WhatsApp "Funcionando" for a declared provider fails the WhatsApp test (caught); source restored and hash verified (`1dbdfba6…`).

### Activation is blocked without provider credentials (documented)

WhatsApp can only be activated when **all** hold; none does today:

1. T12 adapter implemented, tested with explicit doubles, and independently reviewed.
2. A Meta/WhatsApp Business account, WABA, business number and Cloud API credentials supplied by the owner (not purchased or created here), with the current official documentation read, the API version pinned, and the service-window, template and price rules recorded. Meta's own documentation returned HTTP 429 during V2 preparation; T12 must re-check it. The archived legacy SDK is not an allowed dependency.
3. Webhook endpoint reachable from the hosted API (needs the API host decision, see `VERCEL-HOSTING-PREP.md`).
4. Per-line activation authority from the owner, an authorized recipient for the first real round trip, and the connection recorded server-side (tenant resolved from the trusted connection, never from the payload).
5. No real business-number migration without that specific authority.

Until then: `/conversaciones` stays manual ("Registrar atención"), no send control is rendered, and the state shown is "WhatsApp no conectado".

## 2. AI: human-confirmation gates and unavailable labels

Source audit of the existing assist pipeline. No code change was required except the `/sistema` label above.

| Property | Where it holds |
|---|---|
| Off by default; exact `AI_ENABLED=true` required | `os-api ai.controller.assist` rechecks per request; `os-web/lib/ai/limits.ts`, `ai-provider-gateway.ts`; `hosted-state.ts` hides the controls. |
| No call without a credential | `createAiProvider` returns `MockAiProvider` unless `AI_PROVIDER` is `openai`/`openai-compatible` **and** a key is present. `modelCalled:false` for the mock. A key alone does not enable AI. Tests in `ai.controller.test.ts`, `ai-provider-gateway.test.ts`, `hosted-state.test.ts`. |
| AI cannot mutate | `AI_DENIED_MUTATION_FEATURES` rejects `approve, reject, convert, reassign, send, send_whatsapp, create_order, confirm_payment, register_delivery, move_stock, change_access, grant_role, resolve_issue, close_issue, terminate` with 403 before any work. Allowed features are summarize/explain/suggest only. |
| Client cannot choose the model | A `model` body field is refused (`AI_MODEL_NOT_ALLOWED`). Free text never widens evidence selectors. |
| Evidence is authorized and minimized | Packet built through the read authorizers, tenant-scoped, capped; audit row per assist. |
| UI labels | Panel footer: "Modo piloto sin llamada al proveedor en vivo. La IA no aprueba ni envía." Evidence review: "No se llamó a un modelo." / "No se llamó a WhatsApp." / "La extracción de compromisos no está en vivo." |
| Human confirmation | The evidence review panel only records a human decision ("Quedó como dato reportado. No confirma el cobro ni cambia un registro."); the contract refuses authoritative override and payment confirmation. H08/H09 are previews that always require a human review/send. |
| Spend | Soft budget breaker, per-member and per-org rate limits and concurrency, one retry maximum, all from server env. No call was made in this run. |

**Not built (honest labels, not claims):** A01–A22 deterministic public replies, H01–H09 reviewed proposals, durable handoff before "registered", persistent quotas, stale-proposal and same-proposal-accepted-twice protection, prompt-injection and cross-tenant test suite for proposals (V2 T13/T14). `lib/ai/limits.ts` caps (20/day, 300/month) and the os-api governance caps (6/min, 30/h, 250/day, USD 20 soft) are two separate configuration surfaces; reconciling them belongs to T14.

`/sistema` label state for AI after the fix: "Desactivada" by default; "Falta configurar" with `AI_ENABLED=true` and no key; "Piloto (mock)"; "Configurada, sin verificar" with a key.

## 3. Provider blockers (T12–T14), exact

| Item | Affected journey | Missing fact/action | Complete | Safe temporary behavior | Accountable role | Smallest unblocking decision |
|---|---|---|---|---|---|---|
| T12 WhatsApp Cloud API | Send/receive, status, media | Owner-supplied Meta/WABA credentials and number; authorization to activate; hosted webhook host; reviewed adapter; current docs/pricing check | Manual attention, honest labels, contracts for conversation evidence and a pending-number state | Manual "Registrar atención"; manual-send declaration for quotes | Owner (Carmen) + integrator | Authorize a Meta test number and a first authorized recipient, after the API host exists |
| T12 media/private storage | Attachments, PDFs to customers | No file storage in code; no malware-inspection service chosen; no storage provider | Private evidence for payments exists (Batch 6) | Quarantine-by-default design; PDFs downloaded and sent by a person | Owner / integrator | Choose a storage provider and inspection approach (cost decision) |
| T13 A01–A22 engine | Automated first replies | Needs T12 plus approved published public knowledge (hours, address, catalog document) which do not exist; no approved prices | Exact texts are specified in V2/A1 | None sent; humans answer | Commercial owner | Publish approved hours/address and the catalog PDF |
| T14 proposals/quotas | AI drafts and candidates | Model selection, budget, key; persistent quota tables; reviewed accept/ignore commands | Read-only assist with deny list and mock | AI off; manual flow complete | Owner (budget/model) | Choose model and monthly cap; none was spent here |
| Email sender | Notifications by email | Sender domain and recipients authorization | In-product notices only | In-product only | Owner | Authorize a sender domain |

No paid or provider call was made. No credential was read, requested or created.

## 4. Checks (exact final source, this tree plus the uncommitted Batch 9 change set)

| Check | Result |
|---|---|
| `os-web` tests, `--test-concurrency=1`, `tsx --test "lib/**/*.test.ts" "components/**/*.test.ts"` | **1443/1443 pass, 0 fail** (the 7 new tests are included; the Batch 8 receipt recorded the same total, so its count likely predates part of the suite — no assertion was weakened) |
| `channel-health.test.ts` + `batch5-attention` + `conversaciones-shell` | 26/26 |
| Mutation (WhatsApp "Funcionando" for declared provider) | caught (6 pass / 1 fail), restored, hash verified |
| `os-web` `tsc --noEmit` | exit 0 |
| `os-web` `next build` | completed, route table emitted |
| Not run | os-api / Postgres suites (no API change); browser (no UI structure change, only `/sistema` row text for `system.admin`) |

Test runner note: `tsx` needs a Unix socket that the default sandbox refuses; the suite was run outside the sandbox. No server was started and no database used.

## 5. Known limits

1. `/sistema` is visible only to `system.admin`; the row text change is **not browser-verified**.
2. The two AI cap surfaces (`lib/ai/limits.ts` vs os-api governance) are unreconciled.
3. `packages/providers` still exports `MockMessagingProvider`, `MockEmailProvider` and `MESSAGING_PROVIDER`/`EMAIL_PROVIDER` env switches that do nothing live; left in place (extend before replacing).
4. The A01–A22/H01–H09 engine and the T12 adapter do not exist; this receipt does not complete T12–T14.
5. Not independently reviewed. Not pushed, not deployed.
