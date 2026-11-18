# Evaluación Isa / Álvaro — Decisiones y feedback

Worksheet for Carmen to collect feedback during Recorrido review.
Filling this sheet does **not** change production configuration, roles, workflow, or hosted behavior. Evaluators annotate; Carmen records outcomes.

Hosting context (evaluation, 2026-11-18): the Journey UI and synthetic fixture content are **hosted** at https://isalwa-os-web-evaluation.vercel.app (product source tip `904cf24a…`, Railway API). That does **not** mean every step is live-journey verified.

Recorrido status labels in `story-steps.ts` remain the on-product authority. Do **not** auto-upgrade “Vista de propuesta” / “Decisión pendiente” merely because fixture records are visible. Treat distinctions as:

- **hosted visibility** (fixture/read shell on evaluation URL);
- **implemented locally** (source + tests; may lack hosted create/refuse proof);
- **live journey verified** (intended role completed the path on hosted evaluation);
- **proposal / blocked** (needs decision, source material, or provider).

Authority for on-product copy: `apps/os-web/lib/journey/story-steps.ts` (Recorrido guiado, 20 steps).
Living contract: update this worksheet whenever a Journey step’s status, CTA, decision or external requirement changes in a **reviewed, hosted** release batch — not when local code alone advances.

## How to use

For every proposed, decision or external step, evaluators note:

- qué refleja bien el trabajo real;
- qué debería cambiar;
- qué dato o regla falta;
- qué persona debe decidirlo.

Status column values: `open` · `recorded` · `decided` · `deferred`.

---

## Feedback grid (20 Journey steps)

| step | title | Journey status | what matches reality | what should change | decision needed | responsible person | evidence/source | follow-up owner | status |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Empieza con lo que requiere atención | Disponible para probar | | | — | | | | open |
| 2 | Atiende una conversación o registra una atención | Disponible parcialmente | | | — (WhatsApp external) | | | | open |
| 3 | Busca o registra al cliente | Disponible parcialmente | | | — | | | | open |
| 4 | Consulta Cliente 360 | Disponible para probar | | | — | | | | open |
| 5 | Corrige datos con trazabilidad | Disponible para probar | | | — | | | | open |
| 6 | Gestiona teléfonos y contactos | Disponible para probar | | | — (WhatsApp pending sends) | | | | open |
| 7 | Da apoyo temporal sin cambiar al responsable | Disponible para probar | | | — | | | | open |
| 8 | Mantén el cliente al día | Disponible parcialmente | | | — (payments/orders/commitments for archive rules) | | | | open |
| 9 | Consulta el catálogo de productos | Vista de propuesta | | | Catálogo PDF aprobado + lista de precios vigente, o persona autorizada para excepciones | | | | open |
| 10 | Organiza la oportunidad y el próximo paso | Vista de propuesta | | | — | | | | open |
| 11 | Prepara la cotización | Vista de propuesta | | | — (catalog + price rules external) | | | | open |
| 12 | Solicita la aprobación necesaria | Decisión pendiente de ISALWA | | | Quién aprueba excepciones de precio/descuento y quién tendrá esa autoridad | | | | open |
| 13 | Emite el documento exacto | Vista de propuesta | | | — (issuer public data + commercial terms) | | | | open |
| 14 | Comparte la cotización y registra la aceptación | Requiere configuración externa | | | Número corporativo por asesor vs línea compartida | | | | open |
| 15 | Crea el pedido de forma explícita | Vista de propuesta | | | Quién cancela pedidos; si gerencia puede convertir cotizaciones del equipo | | | | open |
| 16 | Reporta y verifica pagos | Vista de propuesta | | | Si pago validado es requisito antes de despacho; quién autoriza excepción | | | | open |
| 17 | Cumple compromisos y resuelve problemas | Vista de propuesta | | | Horarios, responsables de escalamiento, reglas de seguimiento | | | | open |
| 18 | El equipo continúa sin perder contexto | Disponible parcialmente | | | — | | | | open |
| 19 | Revisa clientes y seguimiento en el mapa | Vista de propuesta | | | GPS importadas = confirmadas vs revisión humana | | | | open |
| 20 | Conecta WhatsApp e IA con control humano | Requiere configuración externa | | | Línea WhatsApp, horario, ubicación, FAQ, escalamiento, presupuesto IA | | | | open |

---

## Notes for Carmen

- Recorrido never auto-applies feedback to config.
- When a decision is resolved, replace only the decision block in `story-steps.ts` with the approved outcome and record authority/source here.
- When a feature is hosted and verified, move the step to **Disponible para probar** and refresh this row.
- Do not change the already-deployed evaluation Journey when main-branch work advances until that evaluation is intentionally refreshed.
