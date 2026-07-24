# Known limitations (living)

## Milestone 2

- Schema + seeded universe live on **Carmen Cursor XL** Postgres (`isalwa`)
- PostGIS geography not enabled yet (lat/lng decimals)
- Catalog SKUs/prices are synthetic until client provides real list
- Tax/fiscal lines are 0 in seed
- Auth/RBAC not enforced in API yet (roles seeded only)
- Provider adapters still mock-only
- Dark mode / PWA not started
- Laptop should SSH-tunnel to cloud DB — do not install local Postgres by default
