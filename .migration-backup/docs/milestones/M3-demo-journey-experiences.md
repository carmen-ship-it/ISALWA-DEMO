# Milestone 3 — Demo Journey Experiences

**Status:** ✅ Approved  
**Goal:** Make the 8-minute Demo Journey runnable on real architecture + living data.

## Dual goals

1. Production API/UI for Pulso, Radar, Personas/Dossier, Territorio, Señal, Cierre (quote spine), Comando  
2. Unforgettable owner presentation path (see `docs/product/DEMO_JOURNEY.md`)

## Non-goals

- Full auth productization (demo may use open read APIs behind network trust on preview)  
- Live Meta WhatsApp / Google Maps credentials  
- Memoria AI stories engine (briefings use stored `ai_summary` from seed)

## Delivered

| Artifact | Path / endpoint |
|----------|-----------------|
| Official Demo Journey | `docs/product/DEMO_JOURNEY.md` |
| Hero cast in seed | `HERO_ACCOUNTS` → codes `H-VIP-001` … `H-NEG-001` |
| Pulso | `GET /v1/pulse` · `/pulso` |
| Radar | `GET /v1/radar/items` · `/radar` |
| Personas + dossier | `GET /v1/accounts`, `/v1/accounts/:id` · `/personas`, `/personas/[id]` |
| Territorio | `GET /v1/territorio/points` · `/territorio` |
| Señal | `GET /v1/conversations` · `/senal` |
| Cierre (last price) | dossier `priceMemory` · `/cierre` |
| Comando | `GET /v1/search` · ⌘K (hero-boosted ranking) |
| Cloud preview | API `:4000` · Web `:3010` on Carmen Cursor XL |

## Acceptance

1. ✅ Demo Journey minutes 1–8 executable without placeholders  
2. ✅ All numbers/customers from DB  
3. ✅ Hero cast present after seed (`pnpm seed:validate`)  
4. ✅ Deployable preview on Carmen Cursor XL (`scripts/dev/preview-cloud.sh`)  
5. ✅ `pnpm --filter @isalwa/web build` + `@isalwa/api build` pass  

## Preview access (laptop)

```bash
ssh -L 3010:127.0.0.1:3010 -L 4000:127.0.0.1:4000 carmen-aws-dev
# then open http://localhost:3010/pulso
```

Requires `ALLOW_MOCK_PROVIDERS=1` while messaging/maps/AI remain mock (audited break-glass per master plan).

## Stop

**Do not start Milestone 4 until this milestone is approved.**
