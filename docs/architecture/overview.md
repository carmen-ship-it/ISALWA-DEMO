# Architecture overview (Milestone 1)

```
apps/web (Next.js) ──HTTP──▶ apps/api (NestJS)
                                │
                                ├── @isalwa/providers (mock|live)
                                └── @isalwa/database (Prisma / Postgres)
```

Experiences (routes): `/pulso` `/radar` `/personas` `/territorio` `/senal` `/cierre` `/memoria`

See Engineering Master Plan for the full target architecture.
