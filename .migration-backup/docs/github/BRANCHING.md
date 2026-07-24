# Branching strategy

Recommended model for ISALWA OS (small senior team → growing squad).

## Long-lived branches

| Branch | Role |
|--------|------|
| `main` | Always deployable. Protected. Squash or rebase merge only. |
| `release/x.y` | Optional stabilization line for a cut (cherry-picks allowed). |

We **do not** use a permanent `develop` branch unless the team grows past ~8 concurrent contributors and needs an integration buffer.

## Short-lived branches

```
feat/<ticket-or-slug>     # new capability
fix/<ticket-or-slug>      # bug fix
chore/<ticket-or-slug>    # tooling / repo
docs/<ticket-or-slug>     # documentation
hotfix/<ticket-or-slug>   # urgent fix from main → main + release tag
elev/<slug>               # polish-only (product elevation)
```

Examples:

- `feat/authjs-credentials`
- `fix/quote-last-price-null`
- `docs/demo-journey-v2`

## Rules

1. Branch from latest `main`
2. Open PR early (draft OK)
3. Keep PRs focused; prefer < ~400 LOC
4. CI green required
5. Delete branch after merge
6. Never force-push `main`
7. Tags mark releases: `v0.1.0`, `v0.2.0`, …

## Environments

| Env | Source | Notes |
|-----|--------|-------|
| Preview | PR / agent cloud | Seeded demo DB; `ALLOW_MOCK_PROVIDERS=1` OK |
| Staging | `main` or `release/*` | Closer to prod credentials |
| Production | tagged release | Mocks forbidden unless break-glass audited |
