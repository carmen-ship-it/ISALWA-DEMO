# CT3_COPY_RECEIPT

User-facing strings as coded in integrated source. **HOSTED render UNPROVEN.**

| Surface | Exact copy (source) | File / symbol |
|---|---|---|
| Cliente360 next-step empty | `No hay una próxima acción registrada.` | `lib/cliente/copy.ts` → `noNextAction` |
| Quote PDF action | `Descargar PDF` | `lib/commercial/quote-pdf-ready.ts` → `download` |
| Quote send action | `Registrar como enviada` | `lib/commercial/quote-manual-send.ts` → `action` |
| Quote follow-up | Programar seguimiento (UI after send — see Quote envío section) | `quote-envio-section` / follow-up flows |
| Conversation demo badge | `DEMO·WHATSAPP` | `lib/conversations/model.ts` → `DEMO_WHATSAPP_BADGE` |
| Conversation demo banner | `Hilo de demostración. WhatsApp no está conectado. No es un canal en vivo.` | `DEMO_WHATSAPP_BANNER` |
| Conversaciones channel closed | `Canal no conectado. Nada se envía ni se recibe desde ISALWA.` | `lib/conversations/copy.ts` |
| Conversaciones description | `Registros de lo hablado con clientes. WhatsApp no está conectado; un mensaje es evidencia, no un envío.` | `CONVERSATIONS_COPY.description` |
| Suggested response heading | `RESPUESTA SUGERIDA` | `lib/conversations/recommended-reply.ts` |
| Certainty labels | `CONFIRMADO` · `PENDIENTE DE CONFIRMAR` · `NO REGISTRADO` | `lib/certainty/model.ts` |
| Ask format headings | `LO CONFIRMADO` · `PENDIENTE DE CONFIRMAR` · `NO REGISTRADO` (+ RECOMENDACIÓN / A QUIÉN PREGUNTAR / FUENTES) | `lib/certainty/ask-format.ts` |
| Who-to-ask empty | `Aún no hay una persona responsable asignada.` | `lib/certainty/who-to-ask.ts` → `absent` |
| Pedido known-state headings | CT3-F aborted — **not integrated**; CT2 OrderPrep remains | — |
| Demo story heading | `Recorrido completo de ISALWA` | `lib/demo/story-mode-steps.ts` → `STORY_MODE_TITLE` |
| Demo fictitious badge | `DEMO · DATOS FICTICIOS` | `lib/demo/owner-demo-identity.ts` → `DEMO_FICTITIOUS_BADGE` |
| Inicio owner demo card | `Un recorrido guiado con datos DEMO · ficticios. No altera clientes reales.` | `components/demo/inicio-owner-demo-card.tsx` |
| Finance boundary | unchanged CT2 concise finance — F polish aborted | finance page |
| Map revenue boundary | no Revenue wording in integrated CT3 (G aborted; CT2 map preserved) | — |
| Compromisos nav | route `/compromisos` (not `/inicio`) | `lib/navigation/nav-config.ts` |
