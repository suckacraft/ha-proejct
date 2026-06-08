# CLAUDE.md — Smarthome Platform

## Architecture Rules

1. Three-layer separation: ha-core (backend adapter), client-app (homeowner PWA), operator-app (installer dashboard). Never mix concerns across layers.
2. ha-core owns ALL Home Assistant communication. Frontends never connect to HA directly.
3. White-label config lives in `client.config.json` per client-app deployment. No hardcoded branding.
4. Multi-tenant by site ID. Every API call and WS message includes site context.
5. State management via Zustand stores. No prop drilling beyond one level.
6. All dependencies pinned to exact versions. No ^ or ~ in package.json.
7. Environment secrets managed via SOPS. Never commit .env files.
8. SQLite (better-sqlite3) for local persistence. No external DB dependency for single-site deployments.

## Aesthetic Rules

9. Tailwind CSS only. No custom CSS files beyond the Tailwind directives entry point.
10. Mobile-first, touch-optimised UI. Min tap target 44px. Design for wall-mounted tablets.

## Workflow Rules

11. All changes via feature branches. Never commit directly to main.
12. Tests required before merge. Use Vitest for all packages.
13. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
14. Docker Compose for local dev orchestration. All services must start with `docker compose up`.
15. Document decisions in PROGRESS.md with date and rationale.

## Common Commands

```bash
# Development
npm install                    # Install all workspace deps
npm run dev                    # Start all packages
npm run build                  # Build all packages

# Individual packages
npm run dev -w packages/ha-core
npm run dev -w packages/client-app
npm run dev -w packages/operator-app

# Testing
npm test -w packages/ha-core

# Docker
docker compose up              # Start all services
docker compose up ha-core      # Start single service
docker compose build           # Rebuild images
```
