# ISALWA OS — UX / Product Experience Review
### Obsessive redesign before a single line of code
**Status:** Approved blueprint → experience layer challenged and rewritten  
**Date:** 24 julio 2026  
**Rule:** No Salesforce. No HubSpot. No Zoho. No “enterprise CRM wallpaper.”  
**Ambition:** Apple × Stripe × Linear × Notion × Vercel × Arc × Rivian — for a Bolivian manufacturer-distributor.

---

# 0. The crime we must not commit

Most CRMs fail the same way:

They organize **software around databases**.  
Great products organize **software around human moments**.

A mediocre CRM asks: *Where do I click to see customers?*  
A world-class OS asks: *What is the most important thing happening to this business right now — and what should I do in the next 10 seconds?*

**ISALWA OS will not be a sidebar of modules.**  
It will be a **living command surface** for a factory that sells on the street and closes on WhatsApp.

---

# 1. Emotional north star

When the owner opens ISALWA OS, the feeling is not “tools.”  
It is:

> **Calm control.**  
> Like walking into a Rivian cabin: industrial confidence, quiet luxury, everything where your hand expects it.

### Emotional design principles

| Principle | Meaning in practice |
|-----------|---------------------|
| **Quiet power** | Dense when needed, never noisy. No badge spam. No rainbow charts. |
| **One truth** | Every person sees the same customer story — different depth, same spine. |
| **Speed as respect** | Field sales is the product’s VIP. If it takes >20s to log a visit, we failed. |
| **Beauty that earns trust** | Polish is not decoration; it signals “this company is serious.” |
| **Alive, not animated** | Motion only when state changes. Data should feel current. |
| **Spanish as craft** | Copy is product. Tone: clear, warm, precise. Never translated-English CRM speak. |

### The forbidden feelings
- “This looks like every SaaS template.”
- “I need training to use this.”
- “Where did that number come from?”
- “I’ll just WhatsApp the advisor instead.”

---

# 2. Kill the module mindset

## Old thinking (reject)
```
Clientes | Ventas | Campo | WhatsApp | Cobranza | Reportes | Ajustes
```

## New thinking (experiences)

| Experience | Human question | Product answer |
|------------|----------------|----------------|
| **Pulso** | ¿El negocio está sano ahora? | Owner pulse — 10-second health |
| **Radar** | ¿Quién necesita atención? | Living priority surface |
| **Personas** | ¿Quién es este cliente, de verdad? | Customer as a living dossier |
| **Territorio** | ¿Dónde está el dinero en el mapa? | Spatial commerce |
| **Señal** | ¿Qué está pasando en WhatsApp? | Communication nervous system |
| **Cierre** | ¿Cómo cotizo / cobro / confirmo sin fricción? | Effortless commercial acts |
| **Memoria** | ¿Qué pasó y por qué? | Story, not reports |
| **Comando** | ¿Cómo hago cualquier cosa en 2 teclas? | Raycast-grade control |

Navigation becomes **modes of attention**, not folders of features.

---

# 3. Core experience architecture (2026)

```
┌─────────────────────────────────────────────────────────────┐
│  ISALWA  ·  Pulso  ·  [ ⌘K Buscar o hacer… ]  ·  Señal  ·  ◉ │
└─────────────────────────────────────────────────────────────┘
         │
         ├── PULSO          Owner / role-aware home (not a dashboard dump)
         ├── RADAR          What needs me (ranked, living)
         ├── PERSONAS       Customers as dossiers (not rows)
         ├── TERRITORIO     Map-first commercial world
         ├── SEÑAL          WhatsApp + notifications as one nervous system
         ├── CIERRE         Quotes, orders, collections as flows
         └── MEMORIA        Stories / timelines / narratives behind numbers
```

**Shell inspiration:** Arc’s calm chrome + Linear’s keyboard gravity + Rivian’s spatial confidence.

**No fat sidebar of 14 icons.**  
A slim **mode rail** (5–6 experiences) + omnipresent **Command** + contextual **Inspector**.

---

# 4. Signature moments (design these first)

These are the scenes that make someone say *I’ve never seen software like this.*

### Moment 1 — “Diez segundos”
Owner opens app → **Pulso** breathes in.  
Four vital signs only. One sentence from the system. One recommended action.

### Moment 2 — “Encontrar sin buscar”
⌘K → type “ferre” → customer appears with **relationship score, debt chip, last visit, open WhatsApp**.  
Enter opens dossier. ⌘↵ starts quote. ⌥↵ opens map.

### Moment 3 — “El cliente vivo”
Open a customer → not tabs of death.  
A **single scrollable dossier** with a sticky “spine” (identity + score + next action) and chapters that reveal on intent.

### Moment 4 — “Cotizar con memoria”
Add product → system whispers: *Último precio a este cliente: Bs 185 · hace 42 días · margen estimado…*  
One tap reuses. Quoting feels like continuing a conversation, not filling a form.

### Moment 5 — “Check-in hermoso”
In the field: big soft button **Estoy aquí**.  
Map pin settles. Haptic (mobile). Photo slot blooms. Three outcome chips. Done in under 20s. Undo available.

### Moment 6 — “Señal en calma”
WhatsApp is not a chat clone.  
It’s a **triage runway**: urgency, customer context docked right, SLA as a quiet ring — not a screaming red badge farm.

### Moment 7 — “La historia”
Instead of “Reportes”, open **Memoria**:  
“Este mes crecieron las ferreterías del norte; la cartera vencida bajó porque Luis cerró 12 promesas; Carlos perdió ritmo en visitas A.”  
Numbers with narrative.

### Moment 8 — Empty states that recruit
Empty is not blank.  
Empty is a stage: illustration of porcelain/form, one sentence, one action, one sample demo path.

---

# 5. Pulso — business health in under 10 seconds

### Reject
Classic dashboard: 12 cards, 4 charts, filters, date pickers, “welcome back!”

### Redesign
**Pulso** is a single composition — like Stripe’s clarity with Rivian’s instrument calm.

#### Layout (desktop first viewport)
```
[ Sentence ]  “Hoy el negocio está estable — con 2 puntos de fricción.”
[ Vital 1 ][ Vital 2 ][ Vital 3 ][ Vital 4 ]
[ Focus strip — 3 things that need a human ]
[ Living map thumbnail | Señal thumbnail ]
```

#### The only four vitals (owner)
1. **Dinero entrante** — cobrado vs meta (live counter)
2. **Dinero en riesgo** — cartera vencida (with trend)
3. **Motor comercial** — visitas hechas / plan + pipeline value
4. **Respuesta** — % WhatsApp dentro de SLA

#### The sentence (system-written, editable rules later)
Examples:
- “3 clientes A sin visita en 20+ días.”
- “Línea WhatsApp 2 está lenta desde las 11:40.”
- “Cartera 61–90 subió esta semana; Luis ya tiene 5 promesas hoy.”

#### Inspiration
Stripe Dashboard (truth) + Linear Home (focus) + Rivian driver display (vitals, not widgets)

#### Interaction quality
- Count-up once on load, then settle
- Hover vital → mini story + sparkline + “ver origen”
- Click vital → **not a report page** → a **filtered Radar** already ranked
- Soft ambient refresh; no full-page spinners

---

# 6. Radar — making “what needs me” magical

### Reject
Static lists, saved filters, “My tasks”

### Redesign
**Radar** is a living priority feed — half Linear triage, half air-traffic control.

Each row is an **Attention Object**:
- Why it surfaced (reason chip)
- Who (customer / conversation / invoice)
- Stakes (Bs / SLA / relationship)
- Recommended action (primary)
- Snooze / assign / open

### Ranking intelligence (explainable, not black box)
Signals combine:
- Money at risk
- Relationship decay (no visit / no purchase)
- SLA breach proximity
- Quote aging
- Promise-to-pay due today
- Owner pin (“quiero ver esto”)

### Magic
- Undo snooze
- Keyboard j/k navigate, e escalate, c close/resolve
- Every item links into dossier / señal / cierre without losing place

**Inspiration:** Linear Issues + Arc Spaces peeks + hospital triage boards (clarity under pressure)

---

# 7. Personas — finding a customer, redesigned

### Reject
“Customer List” as a spreadsheet with 18 columns.

### Ask instead
*How do we make finding a customer magical?*

### Answer: three ways in, zero friction

#### A) Command (primary)
Raycast-grade: fuzzy name, NIT, phone, neighborhood, product bought, “deuda”, “sin visita”.

#### B) Personas gallery (secondary)
Not a grid of cards for vanity.  
A **density-toggle surface**:
- **Focus** — large rows with score, last touch, next action
- **Scan** — compact table with mini-sparklines and hover previews
- **Map** — jumps to Territorio with same filter state

#### C) Relational entry
From WhatsApp, invoice, visit, map pin — always land in the same dossier.

### Hover as product
Hover a customer in Scan mode:
- Floating glass preview: score, AI summary (2 lines), last 3 events, debt, advisor avatar
- Actions: WhatsApp · Cotizar · Visitar · Abrir

### Filters that feel human
Replace “advanced filter builder” with **chips of intent**:
- `A en silencio`
- `Con deuda`
- `Cotización abierta`
- `Hoy en ruta`
- `WhatsApp sin respuesta`

**Inspiration:** Notion databases (fluid views) + Linear (density) + Raycast (invoke)

---

# 8. The Living Dossier (Customer 360 reborn)

### Reject
Horizontal tabs: Resumen | Timeline | WhatsApp | Visitas | Cotizaciones | Facturas | Archivos…

Tabs are where CRM dreams go to die.

### Redesign — one dossier, one spine, chapters

#### Sticky spine (always visible)
```
[ Name · NIT · Segment ]   Score 86  ·  Crédito OK  ·  Owner: Carlos
AI: “Compra cada ~38 días. Prefiere inodoros línea X. Deuda ligera. Visitar antes del día 12.”
Next best action: [ Cotizar reposición ]  [ Agendar visita ]  [ Abrir WhatsApp ]
```

#### Chapters (scroll / jump)
1. **Pulso del cliente** — trends, favorite products, predicted next order window  
2. **Memoria** — cinematic timeline (not a dump)  
3. **Relación** — visits + map + photos  
4. **Comercio** — quotes → orders → invoices → payments as one chain  
5. **Señal** — WhatsApp threads linked  
6. **Archivo** — documents as a gallery, not a file manager clone  

#### Relationship graph (tasteful)
A small constellation: contacts, related accounts, advisor, last influencers — **not** a hairball “social CRM network.”

#### Everything connected (required fields of life)
History · Maps · Photos · Visits · Quotes · Invoices · Products · Conversations · Tasks · Relationship score · Purchase trends · Predicted next order · Favorites · Growth · Credit · AI summary · Recent activity

### Inspiration
Linear issue page (spine + activity) + Notion page (depth) + Apple Health summary (vitals) + GitHub profile energy without the clutter

### Micro-moments
- Timeline items expand with physics-light motion
- Photo visit opens lightbox with map pin context
- Price history appears as a quiet sparkline beside product chips
- “Cadena comercial” animates quote→invoice path when hovering an amount

---

# 9. Territorio — maps as a product, not a widget

### Reject
A Google Map embedded under “Clientes” with pins.

### Redesign
**Territorio** is a full experience mode — Uber Fleet calm + Apple Maps clarity + commercial meaning.

#### Layers (toggle, not clutter)
- Heat of revenue
- Visit coverage
- Debt pressure
- Today’s route
- WhatsApp-active customers

#### Pin design
Pins carry state: score ring, debt tick, SLA glow (subtle), advisor color thread.

#### Route craft
Advisor sees a **day ribbon**: stop 1…n, ETA, purpose, one-tap navigate, reorder with drag, auto-suggest “insert this A-account nearby.”

#### Owner view
God-mode calm: where activity is happening *right now* — check-ins blooming live.

**Inspiration:** Uber Fleet + Rivian route intelligence feeling + Strava heat (tasteful)

---

# 10. Señal — WhatsApp as nervous system

### Reject
WhatsApp Web inside an iframe mentality. Chat list + bubbles + pray.

### Redesign
**Señal** = communications command.

#### Tri-pane, but elevated
1. **Runway** — conversations ranked by urgency (not recency alone)  
2. **Thread** — messages with ISALWA context chips inline (quote cards, invoice cards)  
3. **Dock** — living dossier peek (score, debt, last price, owner, tasks)

#### SLA as instrument, not alarm clock spam
A thin arc around the conversation — fills as time remains. Turns warm, then critical. No seizure-inducing pulses unless breached.

#### Three corporate lines
As **channels you can focus**, not three separate products. Unified runway with line filters.

#### Operator joy
- Assign with keyboard
- Suggested replies that cite last price / stock tone (human sends)
- Convert thread → task / visit / quote without leaving

**Inspiration:** Arc’s focus peeks + Intercom quality + Linear urgency without chaos + iMessage craft for bubbles

---

# 11. Cierre — quoting until it feels effortless

### Reject
Multi-step “New Quote” wizard with 11 fields before line items.

### Ask
*How does quoting become almost effortless?*

### Redesign — Quote Canvas
- Starts from customer context (always)
- Line entry is search-first (Raycast inside the canvas)
- Each line shows: last price to *this* customer, list price, margin band (role-gated), stock whisper
- Smart defaults: validity, payment terms from customer credit profile
- Send destinations: WhatsApp / PDF / both — one gesture
- After send: stays in a **watch state** on Radar (“cotización envejeciendo”)

### Price memory is the hero
The emotional peak is seeing the system **remember the relationship commercially**.

**Inspiration:** Stripe Checkout clarity + Linear compose + Notion slash commands for adding lines

---

# 12. Memoria — the story behind the numbers

### Reject
“Reports” module with export-to-Excel as the climax.

### Redesign
**Memoria** produces **narratives** you can interrogate.

#### Story cards
- “Por qué bajó la conversión esta semana”
- “Qué asesores están cubriendo el territorio”
- “De dónde sale la cartera vencida”

Each story = claim + evidence charts + implicated customers + suggested actions.

#### Classic analytics still exist — but nested under stories
Stripe-like charts when you drill, not as the homepage of meaning.

**Inspiration:** Stripe Sigma/Dashboard explanations + Observable notebooks energy (without nerd-flex) + Notion AI summary discipline

---

# 13. Comando — floating command center

### The product’s spine shortcut
⌘K / Ctrl+K opens **Comando ISALWA**.

Capabilities:
- Go to customer / open dossier
- Start quote / visit / payment promise
- Jump to Pulso / Radar / Territorio / Señal
- Ask: “clientes A sin visita 30 días”
- Show keyboard cheatsheet
- Theme density / quiet mode

**Inspiration:** Raycast + Linear Command Menu + Vercel cmdk craft

This is not a feature.  
This is how power users **live** in the OS — and how the owner feels mastery in week one.

---

# 14. Visual language redesign (beyond the blueprint palette)

The blueprint palette (porcelain / kiln / glaze / copper) remains directionally right.  
Experience layer upgrades:

### Surfaces
- **Base:** soft porcelain atmosphere (very subtle depth — not flat gray SaaS)
- **Elevated:** white / glass panels for inspectors & command
- **Ink:** kiln charcoal for typography
- **Signal color:** glaze used sparingly for primary acts
- **Money color:** restrained; copper for premium accents, not Halloween orange

### Glass (use with restraint)
Glass for: Command, hover previews, dossier inspector, map controls.  
Not for every card — otherwise 2018 “glassmorphism theme pack.”

### Typography hierarchy
- Display serif only for Pulso sentence & login emotion
- UI sans for work
- Tabular numbers everywhere money appears
- Never decorate with emoji in product chrome

### Spacing philosophy
More whitespace in Pulso.  
Tighter density in Scan tables and Señal runway.  
**Density is a mode**, not a compromise.

### Motion doctrine
| Do | Don’t |
|----|-------|
| 120–200ms state changes | Parallax playgrounds |
| Shared-element dossier open | Random bounce |
| Skeleton → content morph | Spinners for every fetch |
| Undo toasts with timer | Modal confirmations for safe acts |

### Sound / haptics (mobile)
Optional soft tick on check-in success. Silence by default elsewhere.

---

# 15. Screen-by-screen benchmarks (borrow quality, never copy)

| Screen / Experience | Best-on-earth quality bar | What we borrow |
|---------------------|---------------------------|----------------|
| Pulso | Stripe Dashboard + Rivian instruments | Few vitals, absolute clarity |
| Radar | Linear Issues | Keyboard triage, priority honesty |
| Search / Comando | Raycast | Instant invoke, verbs + nouns |
| Personas Scan | Notion DB + Linear | Density toggling, previews |
| Living Dossier | Linear + Notion + Apple Health | Spine, depth, calm summary |
| Timeline / Memoria chapter | GitHub activity + Stripe | Event meaning, not log vomit |
| Territorio | Uber Fleet + Apple Maps | Operational map, not tourist map |
| Señal | Arc + iMessage + Intercom | Focus, craft, context dock |
| Quote Canvas | Stripe + Linear compose | Effortless capture |
| Notifications | Arc Browser | Quiet, grouped, respectful |
| Empty states | Linear + Apple | Emotional, actionable |
| Loading | Vercel / Next craft | Skeletons with structure |
| Tables | Stripe lists | Mini charts, precise columns |
| Mobile field | Rivian phone companion energy | Big primary acts, offline trust |
| Login | Apple + Rivian | Brand presence, almost ceremonial |

---

# 16. Forms, tables, filters — craft rules

### Forms
- One idea per step when stakes are high; otherwise inline edit
- Smart defaults > empty fields
- Destructive actions require clarity, not bureaucracy
- Labels in human Spanish (“Promesa de pago”, not “Payment commitment entity”)

### Tables
- Mini sparklines for trend columns
- Row hover reveals actions
- Column discipline: if it isn’t decided in 2 seconds, it doesn’t belong by default
- Freeze identity column; everything else optional

### Filters
- Intent chips first
- Power builder hidden behind “Más filtros”
- Saved views as named lenses (“Mi ruta de jueves”, “Cobranza caliente”)

---

# 17. Device experiences (redesigned)

### Desktop — “Control room”
- Modes rail + Comando + Inspector
- Señal tri-pane
- Pulso cinematic
- Multi-task without multi-window hell (peek drawers)

### Tablet — “War room / showroom”
- Split Personas + Dossier
- Territorio almost full-bleed
- Owner meeting mode: Pulso landscape, chrome minimized

### Mobile — “Street companion”
Bottom experiences: **Radar · Personas · Territorio · Señal · Más**  
Primary floating act changes by context:
- On Territorio → **Estoy aquí**
- On Personas → **Cotizar**
- On Señal → **Responder**

Offline: visit queue with crystal-clear sync states (“Guardado en el teléfono · se enviará…”).

---

# 18. AI — presence without cringe

AI is a **whisper**, not a mascot.

Where it appears:
- Dossier spine summary
- Radar ranking explanations (“porque…” )
- Quote price memory suggestions
- Señal reply drafts
- Memoria story generation
- Predicted next order window

Where it does **not** appear:
- A giant chat taking 40% of every screen
- Fake “Hi, I’m ISALWA Bot 🤖”
- Autonomic price changes without human confirmation

**Tone:** analyst sitting beside you — never intern shouting insights.

---

# 19. Accessibility & inclusion (non-negotiable for “premium”)

Premium that excludes is cosplay.

- Contrast AA+ on porcelain surfaces
- Focus rings respected (keyboard is a first-class citizen)
- `prefers-reduced-motion` honored
- Hit targets ≥44px on mobile
- Don’t encode meaning in color alone (debt = icon + text + color)
- Screen reader labels for vitals and SLA arcs
- Spanish clarity > jargon

---

# 20. What we delete from the original blueprint (courage)

| Blueprint tendency | Verdict |
|--------------------|---------|
| Module-heavy nav tree | **Replace** with experience modes |
| Tabbed Customer 360 | **Replace** with Living Dossier |
| Classic “Reports” | **Replace** with Memoria stories |
| Widget dashboards | **Replace** with Pulso vitals + sentence |
| Feature inventory as UX | **Demote** — features serve moments |
| Gamification early | **Cut** from v1 emotion (patronizing) |
| Internal chat early | **Defer** — Señal + tasks first |
| Too many equal dashboards | **Collapse** into Pulso + role lenses |

Keeping from blueprint (still correct):
- Spanish-first
- WhatsApp as core
- GPS / visits as core
- Last prices as religion
- Owner as demo hero
- P0 sequencing spirit (but expressed as moments)

---

# 21. Experience-first roadmap (still no code)

### Craft sequence (what to design/prototype first)
1. **Comando** + search results quality  
2. **Pulso** 10-second composition  
3. **Living Dossier** spine + memoria chapter  
4. **Quote Canvas** with price memory  
5. **Check-in moment** mobile  
6. **Señal** runway + dock  
7. **Territorio** day ribbon  
8. **Radar** triage  
9. Empty / loading / undo system  
10. Motion & sound discipline pass  

If these ten feel magical, the company feels magical.  
Everything else is expansion.

---

# 22. Self-critique panel (force the work to level up)

## Panel members (simulated)
Senior Product Designers · UX Researchers · Enterprise Architects · Accessibility Experts · Sales Managers · CEO

---

### Round 1 — attacks on this redesign

**CEO:** “Beautiful. Will my advisors actually use it in the sun with bad data signal?”  
→ **Fix:** Mobile offline is not a phase-2 footnote; it’s part of the check-in moment definition. Design sync truth states now.

**Sales Manager:** “Relationship score sounds fake. If advisors don’t trust it, they’ll ignore Radar.”  
→ **Fix:** Score must be **explainable in one tap** (components: recency, frequency, monetary, debt, response). No mysterious 0–100 cult.

**UX Research:** “Owner may love Pulso, but operators live in Señal. Don’t romanticize only the owner demo.”  
→ **Fix:** Two hero loops in the demo: Owner Diez Segundos + Operator Runway Calm.

**Accessibility:** “Glass panels and thin SLA arcs will fail contrast.”  
→ **Fix:** Glass only over solid scrims; SLA arc paired with text timer; test in sunlight mode.

**Enterprise Architect:** “Alive means realtime. Realtime means cost and complexity.”  
→ **Fix:** Define “alive tiers”: critical realtime (Señal, check-ins), neartime (Pulso vitals 30–60s), daily (Memoria stories).

**Senior Designer:** “Too many metaphors (Pulso/Radar/Señal) can become cute branding that confuses.”  
→ **Fix:** Dual labeling in UI: **Pulso** with subtitle “Inicio”; allow plain-language mode. Metaphors must earn their keep in testing.

**CEO again:** “Don’t let AI summaries feel like lies.”  
→ **Fix:** AI always cites 2–3 evidence chips; “generado” timestamp; easy dismiss.

---

### Round 2 — replacements (mediocre → stronger)

| Mediocre idea | Stronger idea |
|---------------|---------------|
| “Animated KPI cards” as spectacle | Vitals that **explain themselves** on hover |
| Relationship graph as visual flex | Tiny constellation only when it answers “who influences this account” |
| Floating command center always visible | Command invisible until invoked — Arc calm |
| Predicted next order as a date claim | Predict as a **window + confidence** (“en 1–2 semanas · confianza media”) |
| Photo gallery for vanity | Photos as **evidence in timeline**, not Instagram |
| More dashboards for roles | One Pulso with **lenses** (Owner / Sales / Collections / Field) |

---

### Round 3 — final quality bar check

Ask of every proposed moment:

1. Does it create emotion without losing clarity?  
2. Does it reduce time-to-action for street sales?  
3. Would Stripe/Linear be embarrassed to ship the interaction quality?  
4. Does it still work in Spanish, on mobile, with imperfect connectivity?  
5. Can we demo it in 8 minutes and make the owner say *lo necesito*?

If any answer is no → redesign again.

---

# 23. Weaknesses that remain (honest)

Even after redesign, these are still soft spots:

1. **Brand vacuum** — without official ISALWA logo/color, emotion leans on craft alone.  
2. **Score trust** — needs real calibration workshop with advisors.  
3. **WhatsApp API constraints** — may limit how “alive” Señal can be initially (design mock-faithful + progressive enhancement).  
4. **Metaphor learning curve** — must validate naming with the owner.  
5. **Narrative Memoria** — hard to do well; risk of AI slop if rushed.  
6. **Field photo culture** — advisors may resist evidence capture; UX must feel helpful, not surveillance.  
7. **Density modes** — easy to underspecify; needs explicit design tokens for Focus vs Scan.

---

# 24. The sentence we want the market to say

Not: “It’s a CRM with WhatsApp and GPS.”

This:

> “Of course… why doesn’t every company system show you the health of the business in one breath, remember every customer’s last price, and let you run the day from a command bar — while the map and WhatsApp feel like part of the same organism?”

---

# 25. Decision log (experience layer)

| Decision | Choice |
|----------|--------|
| IA model | Experiences, not modules |
| Home | Pulso (4 vitals + sentence + focus) |
| Customer | Living Dossier (no tab farm) |
| Lists | Personas with Focus/Scan/Map |
| Prioritization | Radar |
| Maps | Territorio as a mode |
| WhatsApp | Señal nervous system |
| Quotes | Quote Canvas + price memory |
| Reports | Memoria stories |
| Global control | Comando (Raycast-grade) |
| Aesthetic | Quiet industrial premium; glass restrained |
| Motion | State-driven, reducible |
| AI | Whisper with evidence |
| Demo heroes | Owner Pulso + Field check-in + Quote memory + Señal calm |

---

# 26. What “world-class” means for ISALWA specifically

World-class here is not Silicon Valley cosplay.

It is:

- A Santa Cruz advisor finishing a visit before the engine cools  
- An operator clearing Señal without drowning  
- An owner understanding money, risk, and motion before coffee cools  
- A quote that respects history  
- Software that feels like it was carved for **this** company — manufacturing + distribution + street + WhatsApp — in **2026**

---

*End of UX / Product Experience Review. No code. Ready for critique → freeze experience principles → then visual prototypes.*
