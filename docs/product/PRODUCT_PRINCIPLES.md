# ISALWA OS — Product Principles
### How we decide what to build

**Status:** Binding product law (post–Milestone 3)  
**Audience:** Product + engineering  
**North star:** Software people remember — daily headquarters for ISALWA, not “another CRM.”

---

## Mission question

Every screen must answer:

> How do we help this company make better decisions, faster?

If it doesn’t, redesign or cut it.

---

## Eight gates (all required)

A feature ships only if it is:

1. **Beautiful** — intentional spacing, typography, motion; no temporary UI  
2. **Fast** — field-speed; critical paths feel instant  
3. **Intuitive** — owner understands without training  
4. **Useful** — changes a decision or action today  
5. **Believable** — data and copy feel like a living Bolivian manufacturer  
6. **Connected** — leads somewhere (no dead ends)  
7. **Production-quality** — real model, ports/adapters, typed contracts  
8. **Demo-worthy** — ready to show in an 8-minute room

Satisfy only one → redesign.

---

## Screen purpose checklist

Before any page:

1. Why would the owner open this?  
2. What decision is she making?  
3. What must she understand in ≤10 seconds?  
4. What can she do in one click?

Cannot answer → do not build.

---

## No dead ends

Preferred commercial spine:

**Pulso / Radar → Persona (dossier) → Cotización → Factura → Pago → Seguimiento / próxima oportunidad**

Every major surface must offer a natural next step.

---

## Living business

The product must feel like ISALWA has used it for years. KPIs, alerts, timelines, WhatsApp, visits, invoices, and relationships must make logical business sense. No decorative sample software.

---

## Memorable moments

Every major workflow needs one “wow”:

- Pulso opens with a human sentence  
- Dossier AI briefing with evidence  
- Last-price whisper on quote lines  
- Territory that feels spatial  
- Señal SLA that makes WhatsApp measurable  
- Comando mastery  

---

## Polish before features

Complete experiences beat unfinished breadth. A smaller polished OS beats a larger unfinished CRM.

---

## Quality bar (feel, not clone)

Borrow interaction quality from Apple, Stripe, Linear, Notion, Vercel, Arc, Figma, Uber, GitHub.  
Never imitate branding or layouts. ISALWA OS has its own identity (porcelain / kiln / glaze / copper).

---

## Building rules

- Never hardcode UI that should come from data  
- Never duplicate business logic  
- Keep adapters isolated  
- Keep components reusable  
- Update docs continuously  
- Keep every milestone deployable and GitHub-ready  

---

## Demo mode

Every completed milestone is presentation-ready: smooth motion, intentional spacing, elegant loading, educational empty states, charts that tell stories, maps that feel alive.

---

## Better ideas while building

Document → evaluate → implement if it improves the product without harming architecture; otherwise roadmap.
