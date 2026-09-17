# FINAL_V1_SUPERSEDED_CLAIM_AUDIT

Historical receipts remain on disk. This audit marks supersession only.

| Prior claim | Classification | Current truth at `02688431b9290b818c8fb245d68c086379363b3f` |
|---|---|---|
| Carmen SYNTH scopes = REAL minus only system/integration.admin (kept people.admin/qa) | MATERIAL_OVERCLAIM → SUPERSEDED | Forbidden set includes people.admin, master_data.admin, qa.access, system.admin |
| Role preview = full resource projection everywhere | PARTIAL / OVERCLAIM | Wired on many pages; **not** Inicio/Aprobaciones/Compromisos/Incidencias |
| Role preview required system.admin | SUPERSEDED | management.org.read OR people.admin |
| Live tip forever = e5f6d3a / 4900634 / 8e24b7f | SUPERSEDED | Live = `02688431b9290b818c8fb245d68c086379363b3f` |
| `6c0262e` is owner-review RC | INCORRECT / SUPERSEDED | WEB build_failed; RC = `02688431b9290b818c8fb245d68c086379363b3f` |
| AI_OWNER_REVIEW_READY | UNPROVEN / OVERCLAIM if YES | **NO** |
| Conversations JSON-only SoT | SUPERSEDED | 5 durable DB rows; UI prefers API |
| convert.own unwired | SUPERSEDED (post CR-3 fix) | Wired into CreateOrder; coverage≠convert |
| Coverage fully productized | PARTIAL / OVERCLAIM if YES | Enforce on convert YES; grant UI NO |
| REAL staff logins ready | INCORRECT | PERSON_ID/login/membership NOT_PROVEN |
| Visual system fully proven mobile | PARTIAL | Desktop screenshots at RC; mobile UNPROVEN |
| Cliente360 Resumen densified | PARTIAL | Screenshot showed 0 metrics despite seeded IDs |

Sources: `../SUPERSEDED_CLAIM_REGISTER.md`, CT3 receipts, RC closure notes.
