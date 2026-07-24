# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.1.x` | ✅ |
| unreleased `main` | ✅ (best effort) |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

Email or message the repository owners privately (GitHub Security Advisories preferred when the repo is on GitHub).

Include:

1. Description of the issue
2. Steps to reproduce
3. Affected component (`apps/api`, `apps/web`, provider, etc.)
4. Potential impact

You should receive an acknowledgement within **72 hours**. We will coordinate a fix and disclosure timeline.

## Hardening expectations (current stage)

- Never commit `.env`, keys, or PEM files
- Prefer ports/adapters for external vendors
- Mock providers are blocked in `NODE_ENV=production` unless `ALLOW_MOCK_PROVIDERS=1` (audited break-glass)
- Money handled as integer centavos
- AuthZ / AuthN hardening is scheduled post–elevation (see Engineering Master Plan P0/P1)

## Secrets in this repository

If you accidentally commit a secret:

1. Rotate the credential immediately
2. Remove it from git history (`git filter-repo` / BFG) before or immediately after first push
3. Notify maintainers
