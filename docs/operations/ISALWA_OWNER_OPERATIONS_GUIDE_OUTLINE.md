# ISALWA Owner Operations Guide — Outline

**Date:** 2026-09-15  
**Audience:** Isa, Álvaro, and company owners (nontechnical)  
**Sources:** `company-os-recon-2026-09-15/agent-11-infra-owner-cost.md`, `company-os-recon-2026-09-15/agent-12-developer-handoff.md`  
**Status:** Outline only — not the full permanent guide yet.

This document is written in plain language. It does not tell anyone how to change code or servers.

---

## 1. What ISALWA is

- ISALWA is the company’s operating system for daily commercial work: people, customers, quotes, orders, approvals, and follow-ups in one place.
- It is **not** WhatsApp, **not** a shared spreadsheet, and **not** a personal chat tool.
- Employees sign in with their own accounts. The system remembers who did what.
- Staging (practice / pilot host) exists today. A separate full production company address is **not** confirmed live yet.

---

## 2. What services run it

| Piece | What owners should picture | Provider (today) |
|-------|----------------------------|------------------|
| Website employees open | The screens people use every day | Hosting on Render (`os-web-staging`) |
| Application server | The engine behind those screens (rules, saves, background reminders) | Render (`os-api-staging`) |
| Business database | The lasting record of customers, quotes, orders, history | Render managed database (`isalwa-os-staging`) |
| Login service | Sign-in, invites, password reset — **separate** from the business database | Supabase Auth (`isalwa-os-auth-staging`) |
| Source code & change history | Where the product’s files and reviews live | GitHub (`carmen-ship-it/ISALWA-DEMO` today) |

Optional later (mostly **not** turned on for OS today): company email for quotes, maps, AI helpers, WhatsApp sending, error/uptime watch tools.

---

## 3. What you pay for

- **Required for the pilot host:** hosting (website + application server), business database, login service, and (usually) GitHub seats.
- **Optional later:** email sending from ISALWA, maps, AI, WhatsApp, error monitoring, extra backup storage, a company domain.
- **WhatsApp** is a separate business decision and is **not** in the current cost register as a must-pay item.
- Planning ranges in internal docs (~USD 80–200/month staging+production combined, excluding WhatsApp/AI/maps) are **budget bands only**, not verified invoices.
- **Current verified monthly bill totals are unknown in the repo** — confirm real charges in each provider’s billing screen.

---

## 4. Where billing lives

- Each provider has its own dashboard and invoices (Render, Supabase, GitHub, domain registrar, and any later vendors).
- Do **not** treat planning bands or spreadsheet estimates as the bill.
- Confirm: who pays, which card or company account is charged, and where invoices are emailed.
- Today, billing for the live staging stack is evidenced as **Carmen’s personal accounts** — company billing is the desired end state, not yet proven complete.

---

## 5. Who owns each account today vs who should

| Account | Who owns it today (evidenced) | Who should own it |
|---------|-------------------------------|-------------------|
| Hosting (Render website + server + database) | Carmen personal | Company team; **two** people who can pay and recover access |
| Login (Supabase Auth) | Carmen personal org / email | Company org; two admins |
| GitHub repository | Carmen’s GitHub user | Company organization; two owners |
| Domain / DNS | Unset / undocumented for a company brand URL | Company registrar + DNS; two admins when a domain exists |
| Password vault / break-glass copies | Informal folder on Carmen’s machine | Company vault; **two** trusted humans |
| Optional AI / maps / email | Not set up for OS | Company accounts before turning on |

**Rule owners enforce:** no single person should be the only one who can pay, invite, or recover access.

---

## 6. Domain / web address

- Current pilot address is a Render hostname (`os-web-staging.onrender.com`), not a final company brand URL.
- A company domain (and renewals) is required before calling the public address “production.”
- Until then, pilot on the provider hostname can be an accepted exception if owners write that down.
- Renewals: registrar + DNS — calendar reminder; two people who can renew.

---

## 7. How employees are invited

- An admin invites a person by email from Administración (people admin permission).
- Each person has their **own** password. No shared logins.
- Job title / cargo is **not** the same as what the system allows them to do.
- Login mail comes from the login service; that is separate from any future “quote email” product.

---

## 8. How access is suspended or removed

- **Suspend:** stop someone from signing in without treating them as fully gone from company history.
- **Leave the company:** end membership; history stays; work must be reassigned.
- Only designated admins may change roles and access.
- Title changes do not automatically grant or remove system permissions — those are separate actions.

---

## 9. What happens when someone leaves

- Past quotes, orders, and decisions remain in the business record.
- Open work must be reassigned to someone still active.
- Login must stop the same day (suspend or leave — owners decide the path with an admin).
- Do not keep “temporary shared passwords” for covering absences.

---

## 10. Backups

- Copies of the business database are made (provider recovery + operator copies).
- Restore is an **owner-approved** engineering action, not a casual click in the product.
- Off-site company storage for copies is still incomplete; today much of the break-glass path sits with one operator’s machine — that is a business risk owners should close.
- Product screens under “Controles del sistema” do **not** replace backup ownership.

---

## 11. Who gets outage alerts

- Alerts must **not** go to only one person.
- Until a formal watch tool is set up, owners should agree who checks: Is the site up? Does the login page open?
- Error monitoring / uptime tools are **not** integrated yet — treat “we will know immediately” as unproven.
- Escalate: named company roles once filled (see §19).

---

## 12. Who can deploy changes

- Only engineering may publish changes to the hosted system.
- Production (when it exists) needs explicit owner/engineering approval — not silent auto-publish.
- Owners do **not** paste passwords, keys, or database links into chat, email, or tickets.
- Staging and production are different; practice host proof is not production proof.

---

## 13. Provider renewals

Keep a simple calendar for:

- Hosting (Render)
- Business database
- Login service (Supabase)
- GitHub (if paid seats)
- Domain / DNS (when owned)
- Optional later: AI, maps, email, monitoring

Pause rules: AI (and similar add-ons) can be paused without stopping customers, quotes, and orders — if they were never turned on, there is nothing to pause.

---

## 14. How to replace a developer

- Require a written handoff manual (technical + this owner guide completed).
- Give the least access needed; start on staging before any production actions.
- Dual ownership of accounts before anyone is sole admin.
- Confirm: access path, vault, backups, and who gets outage alerts — **before** the old developer’s last day.
- Do not rely on Cursor chat history as the company’s memory.

---

## 15. What access to revoke when a developer leaves

Revoke the same day (checklist):

- [ ] GitHub (repo and org)
- [ ] Hosting dashboard (Render)
- [ ] Business database access
- [ ] Login admin (Supabase)
- [ ] Password vault / break-glass copies
- [ ] Laptop and personal copies of keys or dumps
- [ ] Any personal API keys used for the company
- [ ] Billing cards or “payer” role if they had one

---

## 16. What company accounts should own

These should sit under the **company**, with two named people:

1. Hosting (Render) — website, application server, database  
2. Login service (Supabase Auth)  
3. GitHub organization (repository + protections)  
4. Domain and DNS (when in use)  
5. Company password vault  
6. Billing cards / payer contacts for each provider  
7. Future: monitoring, email, maps, AI — create under company **before** enabling  

Personal developer accounts are temporary risk, not the long-term model.

---

## 17. Data rules owners enforce

- No invented map points or fake coordinates.
- The spreadsheet is not the system of truth once ISALWA holds the record.
- Keep real customers separate from test/demo data.
- Do not ask anyone to “undo” a real data import casually.
- AI (if ever enabled) may summarize or draft — it must **not** take business actions on its own.

---

## 18. Costs calendar

| Phase | What owners should expect |
|-------|---------------------------|
| Pilot / staging | Hosting + database + login (+ GitHub). Exact invoice dollars: verify externally. |
| Later production | Separate production services (not evidenced yet) + company domain + stronger backup/monitoring. |
| Can pause later | AI, maps, WhatsApp send, extra email — without stopping core commercial work. |
| Do not confuse | Budget bands in docs ≠ paid invoices. |

---

## 19. Escalation directory

Fill names when roles are assigned (template):

| Role | Name | Contact | Covers |
|------|------|---------|--------|
| Business owner / payer | | | Bills, renewals, vendor identity |
| Second payer / recovery | | | Same if first person unavailable |
| Product admin (invites / roles) | | | Employee access |
| Engineering lead | | | Outages, deploys, restores |
| Outage alert inbox / phone | | | First notice when site or login fails |

Until filled, assume single-person risk remains.

---

## 20. Glossary

| Term | Plain meaning |
|------|----------------|
| Staging | Practice / pilot hosted system — not the final production brand address |
| Production | The live company system for real daily work (not evidenced as fully set up yet) |
| Login service | Where passwords and invites live — separate from the business database |
| Business database | Lasting company records (customers, quotes, orders, history) |
| Permission | What the system allows a person to do |
| Job title / cargo | What you call the role at work — not automatically the same as permission |
| Owner | Person who can pay, recover, or approve vendor access |
| Developer | Person who changes and publishes the product — not a substitute company owner |

---

## Related internal sources (for whoever writes the full guide)

- `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md`
- `docs/operations/company-os-recon-2026-09-15/agent-11-infra-owner-cost.md`
- `docs/operations/company-os-recon-2026-09-15/agent-12-developer-handoff.md`
- `docs/operations/ISALWA_DEVELOPER_HANDOFF_GAP_MAP.md` (technical gaps; not for owners day-to-day)
