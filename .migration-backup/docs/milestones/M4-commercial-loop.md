# Milestone 4 — Commercial Loop (Cierre)

**Status:** ✅ Complete — awaiting approval  
**Completed:** 24 julio 2026  
**Version:** `0.1.0-m4`

## Goal

Make the money path feel inevitable — **quote → invoice → payment → follow-up** — as a polished, demo-worthy experience on production architecture.

## Why

M3 made the Demo Journey walkable; Minute 4 was still a whisper. Product principles demand **no dead ends** and a complete commercial spine.

**Owner decision:** “What price do I give this customer — and can we close without inventing numbers in WhatsApp?”

## Delivered

| Surface | Detail |
|---------|--------|
| Quote canvas | Create lines, **last-price whisper**, send (mock PDF), accept → order + invoice |
| Quote detail | `/cierre/cotizaciones/[id]` with send/accept actions |
| Invoice + payment | `/cierre/facturas/[id]` · balance · record payment |
| Visit check-in | `POST /v1/visits/check-in` from dossier |
| Connected CTAs | Dossier ↔ Cierre ↔ Factura ↔ Seguimiento |
| Product principles | `docs/product/PRODUCT_PRINCIPLES.md` |

### API

- `GET /v1/products`
- `GET /v1/accounts/:id/products/:productId/last-price`
- `GET|POST /v1/quotes`, `POST /v1/quotes/:id/send|accept`
- `GET /v1/invoices/:id`, `POST /v1/invoices/:id/payments`
- `POST /v1/visits/check-in`

## Verification (Carmen Cursor XL)

| Check | Result |
|-------|--------|
| `pnpm --filter @isalwa/api build` | ✅ |
| `pnpm --filter @isalwa/web build` | ✅ |
| Create → send → accept → pay → check-in | ✅ smoked |
| Web `/cierre`, quote, invoice, dossier | ✅ 200 |
| Preview API `:4000` / Web `:3010` | ✅ `0.1.0-m4` |

## Preview

```bash
ssh -L 3010:127.0.0.1:3010 -L 4000:127.0.0.1:4000 carmen-aws-dev
# http://localhost:3010/cierre   (defaults to Negocia Ya hero)
```

## Opportunities discovered (roadmap)

1. Prefer catalog rows that already have price memory for the open account (stronger first whisper).  
2. Auth.js + RBAC so quote ownership is the signed-in advisor (P0 remainder).  
3. WhatsApp “send quote PDF” via messaging adapter after Meta credentials.  
4. Partial payment + promise-to-pay UI in one step for collections drama.  
5. Quote PDF preview pane (still mock bytes — show a styled HTML preview).  

## Stop

**Do not start Milestone 5 until approved.**
