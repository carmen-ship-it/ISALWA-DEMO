# Product Feel Guide

How ISALWA should *feel* — the emotional and sensory contract.

---

## Feeling words (allowed)

Calm · Precise · Confident · Warm-professional · Instrument-grade · Quietly intelligent

## Feeling words (forbidden)

Playful-childish · Loud · Gimmicky · Gamified · “Startup purple” · Admin-template busy · Flashy

---

## The OS metaphor

ISALWA is not a website with modules. It is a **commercial operating system**:

- **Pulso** — system health (the breath)
- **Radar** — interrupt queue (attention)
- **Personas** — living accounts (relationships)
- **Territorio** — space (where work happens)
- **Señal** — channel (conversation)
- **Cierre** — commit (money in motion)
- **Memoria** — history (why numbers mean something)
- **Comando / ⌘K** — cortex (go anywhere, do anything)

Users inhabit instruments. They do not “open pages.”

---

## First 10 seconds

1. Brand breath (or instant Pulso if returning)
2. One Spanish sentence that states the business truth
3. Four vitals — nothing else competing
4. A single clear next step (Radar / focus)

If the first viewport looks like a dashboard wallpaper, we failed.

---

## Emotional moments (premium, not childish)

| Moment | Feeling | Expression |
|--------|---------|------------|
| First accepted quote | Quiet pride | Soft success flash + “Cotización aceptada” |
| VIP dossier open | Respect | Slightly stronger identity weight; copper accent sparingly |
| Collections recovered | Relief | Glaze pulse once; update Pulso sentence next load |
| Visit check-in | Presence | Map pin settle + success burst (existing) |
| SLA breach cleared | Release | Risk bar shrinks; color cools to glaze |
| Demo end | Desire | No banner — the absence of clutter *is* the wow |

Never: confetti, emoji rain, badge spam, achievement popups.

---

## AI personality

- Speaks **as the system** (Pulso sentence), not as a cartoon assistant
- Summarizes in Newsreader italic (`InsightCard`)
- Suggests; never blocks
- Summoned; never ambushes
- Spanish-first for ISALWA Bolivia; tone: colleague, not chatbot

---

## Critique panel (Mission 13 §17)

### What Apple / Linear / Stripe would praise
- Porcelain + kiln discipline
- Pulso “one sentence” product voice
- Radar risk-before-text
- Motion tokens with reduced-motion collapse
- Restraint vs typical CRM chrome

### What they would challenge
- Señal / Territorio still feel like a different dialect than Radar/Personas
- Intro is session-scoped, not true first-run memory
- Tour doesn’t remember completion; desktop-only FAB
- ⌘K is search, not a command OS
- Loading still often “wait then pop” vs skeleton choreography
- QuoteCanvas internal styles fight the design system
- Long dossier still densifies into CRM widgets below the fold

### Nielsen / a11y
- Kiln sidebar hint contrast needs audit
- Table rows should be fully keyboard operable
- Live regions missing for save/send
- Mobile tour absence leaves first-time phone users unsupported

### Enterprise CIO
- Needs: predictable motion, offline story later, audit of AI claims, no surprise audio
- Trust > delight; milestones must never feel like consumer gamification

### IDEO
- Journey is strong in demo script; product should encode the same emotional arc in empty states and onboarding, not only in live seed data

---

## 100 premium details (catalog)

Use as a checklist for future polish missions. Grouped; not all P0.

### Cursor & pointer
1. Default cursor calm; pointer on all hit targets ≥44px mobile  
2. Progress cursor only for >500ms blocking work  
3. Grab cursor on map drag  
4. Text caret glaze-tinted if engine allows  
5. Selection color = glaze mix (already in globals)  

### Hover timing
6. Hover feedback ≤140ms (`motion-fast`)  
7. Lift cards 0.5 translate + soft lift (Panel interactive)  
8. Nav hint fades in, never jumps  
9. Table row wash 4% glaze  
10. Delayed tooltip 400ms (avoid flicker)  

### Press & focus
11. Button `active:scale(0.98)`  
12. Focus ring = `--isalwa-shadow-focus` only  
13. Focus never removed for “clean look”  
14. Skip link first in tab order  
15. Modal focus trap (palette, drawer)  

### Depth & surface
16. Soft shadow default; lift on intent  
17. No multi-layer neon glow  
18. Mist borders, never heavy black rules  
19. Panel radius 16 continuous  
20. Porcelain page vs white card hierarchy  

### Typography
21. Kickers uppercase + tracking  
22. Titles Newsreader italic light  
23. Body Plus Jakarta  
24. Metrics IBM Plex Mono tabular  
25. One sentence max in hero subtitles  

### Motion
26. Enter deliberate 520ms  
27. Stagger ≤40ms steps, cap 12  
28. No bounce except map pin spring  
29. Success burst once, not loop  
30. Alive-dot breathe only for “live” status  

### Feedback
31. Copy → quiet toast “Copiado”  
32. Save → whisper check, not modal  
33. Error → soft danger, inline  
34. Undo window 5s for reversible actions  
35. Optimistic list insert with whisper-in  

### Lists & tables
36. Inbox priority rail  
37. Empty list teaches  
38. Sticky header on long tables desktop  
39. Mobile cards instead of wide tables  
40. Keyboard row activation  

### Forms
41. Field height 40  
42. Focus border glaze + ring  
43. Labels calm slate  
44. Validation after blur, not keysmash  
45. Search debounce ~90–120ms  

### Map
46. Hero pin pulse glaze  
47. Risk pin danger pulse  
48. Cluster expand purposeful  
49. Filter chips = Chip primitive  
50. Selected account card whisper-in  

### Señal
51. Priority bar before text  
52. Channel color as 7px dot, not rainbow UI  
53. Suggested replies as chips  
54. Composer sticky thumb zone  
55. SLA warning typographic, not emoji-first (replace ⚠ long-term)  

### Cierre
56. Last-price memory callout glaze  
57. Line add scale-in  
58. Total tick tabular  
59. Sticky submit on mobile  
60. History row = inbox cousin  

### Loading
61. Skeleton matches final layout  
62. No full-page spinner  
63. Progressive vitals  
64. Catalog shimmer rows  
65. Map tiles fade, pins enter  

### Empty
66. Title = honest state  
67. Description = why it matters  
68. One primary CTA  
69. Optional secondary link  
70. Dashed panel, not grey void  

### Onboarding
71. Intro ≤7s  
72. Skip always  
73. Remember forever after complete  
74. Tour replay from help  
75. No forced voice  

### ⌘K
76. Open <100ms perceived  
77. Recent locally remembered  
78. Grouped results  
79. AI ask as last group  
80. Esc always closes  

### Accessibility
81. Reduced motion = 0ms tokens  
82. Contrast AA body  
83. Kiln hints ≥3:1 or lighten  
84. Aria live for sends  
85. Landmark main per view  

### Mobile
86. Drawer from left kiln  
87. Thumb primary actions bottom  
88. No hover-only affordances  
89. Swipe back Señal → list  
90. Safe-area padding  

### AI
91. InsightCard only for narrative AI  
92. Never fake “thinking…” theater >1.2s without skeleton  
93. Cite evidence chips when available  
94. Suggestions dismissible  
95. No chat bubble mascot  

### Brand
96. Wordmark tracking restrained  
97. Alive-dot = system heartbeat  
98. Copper rare (timeline / VIP)  
99. Demo journey emotion = product emotion  
100. When in doubt, remove  

---

## Scalability (verticals)

The feel grammar ports to construction, healthcare, automotive, distribution, manufacturing, retail by swapping:

- Domain nouns (cuenta → obra / paciente / unidad)
- Seed/demo cast
- Map layers / channel names

**Not** by inventing a new chrome, motion dialect, or AI mascot per vertical.
