# CT3_COLOR_RECEIPT

**Source tokens:** `packages/ui/src/tokens/tokens.css`  
**Hosted verified:** YES (computed CSS on `https://os-web-staging.onrender.com` @ `bd8b070…`)  
**At:** 2026-09-17

## Semantic map

| REQUESTED INTENT | ACTUAL TOKEN | ACTUAL VALUE (hosted) | WHERE USED | HOSTED VERIFIED | DEVIATION |
|---|---|---|---|---|---|
| NAVY = primary authority / CTA ink | `--isalwa-kiln` | `#18324b` | Titles, primary navy surfaces, CTA ink | YES | vs requested ~`#12324A` — established ISALWA navy; semantic match |
| TEAL = current/active | `--isalwa-glaze` | `#287a78` | Links, active accents, Story current | YES | vs softer teal targets — glaze family |
| SOFT TEAL = selected | glaze mixes / `#EAF6F4` | (computed mixes) | Selected chips, Story current bg | YES | Not a single hex token `--isalwa-glaze-soft` (empty on :root) |
| SKY = context | `--isalwa-sky-100` family | (token present in CSS; empty shorthand `--isalwa-sky` on probe) | Rail wash, context chips | YES | Shorthand `--isalwa-sky` blank; sky-100 used in components |
| GREEN = confirmed/completed | `--isalwa-success` | `#3a7a52` | Success / confirmed | YES | — |
| AMBER = pending/due | `--isalwa-warning` | `#b8872e` | Pending / due | YES | — |
| RED = overdue/error | `--isalwa-danger` | `#a63d36` | Overdue / error | YES | — |
| PORCELAIN = canvas | `--isalwa-porcelain` | `#f6f1e8` | Page canvas washes | YES | — |
| WHITE = card/work surface | `--isalwa-white` | `#fff` | Cards / panels | YES | — |

## Verdict

COLOR_SPEC_CONFORMANCE = **PASS with deviations** (navy/teal hex drift within ISALWA system). Carmen decides visual acceptance.
