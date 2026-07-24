# Changelog

All notable changes to **ISALWA OS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
for tagged releases.

## [Unreleased]

### Planned

- Authentication (Auth.js) and RBAC / territory scopes
- Production messaging, maps, and PDF adapters
- Broader field workflows and Memoria stories engine

## [0.1.0] - 2026-07-24

First public-ready repository cut after Milestone 4 and the Product Elevation Sprint.

### Added

- Monorepo foundation (pnpm + Turborepo, Next.js web, NestJS API)
- Design system tokens and UI primitives (`@isalwa/ui`)
- Provider ports with audited mock adapters
- Full commercial Prisma schema + deterministic demo seed universe
- Demo Journey experiences: Pulso, Radar, Personas/Dossier, Territorio, Señal, Cierre, Comando
- Commercial loop: quote → send → accept → invoice → payment → visit check-in
- Product principles, Demo Journey, and Product Elevation documentation
- CI workflow (build + typecheck)

### Security

- Production boot refuses mock providers unless `ALLOW_MOCK_PROVIDERS=1`
- `.env` and secret patterns excluded via `.gitignore`

[Unreleased]: https://github.com/carmen-ship-it/ISALWA-DEMO/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/carmen-ship-it/ISALWA-DEMO/releases/tag/v0.1.0
