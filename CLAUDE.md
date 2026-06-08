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
16. Model selection -- apply automatically at the start of each stage,
    no prompting needed. Announce the switch with one line before proceeding.

    Use claude-opus-4-8 for:
    - Section 1 kickoff (architecture and monorepo setup)
    - Stage 2 entity normalisation (data shape decisions affect everything downstream)
    - Stage 6.5 authentication (security architecture -- hard to fix later)
    - Stage 11 provisioning (business-critical, real credentials involved)
    - Any stage where a decision is hard to reverse
    - Any bug unresolved after two attempts on Sonnet
    - Any mid-build architecture tradeoff requiring deep reasoning

    Use claude-sonnet-4-6 for everything else:
    - All component and UI stages (4, 5, 6, 7, 7.5, 8)
    - REST endpoints, YAML, Docker config, documentation
    - Whitelabel validation, mechanical stages with clear test gates

    Switch with: claude config set model claude-opus-4-8
              or: claude config set model claude-sonnet-4-6

    Always start a session on Sonnet:
    claude config set model claude-sonnet-4-6

    Announce every switch:
    "Switching to Opus 4.8 -- [reason]"
    "Staying on Sonnet 4.6 -- [reason]"
17. Effort level -- set automatically per task type, no prompting needed.
    Announce the change with one line before proceeding.

    Use xhigh effort for:
    - Stage 2 entity normalisation
    - Stage 6.5 authentication
    - Any unresolved bug after two attempts at high effort
    - Any architectural decision affecting multiple downstream stages
    Command: /effort xhigh

    Use high effort (default) for:
    - All other build stages
    - This is already the default -- no command needed at session start

    Use medium effort for:
    - Updating documentation files only
    - Config file edits with no logic involved
    - FUNCTIONALITY.md and PROGRESS.md updates
    Command: /effort medium

    Always restore high effort after medium tasks:
    /effort high

    Announce every change:
    "Setting effort to xhigh -- [reason]"
    "Restoring effort to high"
18. Context discipline -- apply every session:
    Run /clear between unrelated tasks -- never carry stale context
    into a new stage. Run /rename before clearing to preserve the
    session for later. Run /compact when context fills, with:
    /compact Focus on code structure, API contracts, and test results.
    Never on documentation or comments.
    Cap subagents at 3 running simultaneously. Never leave a subagent
    chain running unattended.
19. CLAUDE.md discipline:
    Keep this file under 200 lines at all times.
    If a new rule is added, an existing rule must be trimmed or removed.
    Document decisions only -- never aspirations or things Claude
    already does by default. Audit this file at the start of Stage 5,
    Stage 8, and Stage 11 and remove anything that is no longer needed.
20. Context window management -- automatic, no prompting needed:
    Monitor context usage continuously. When context reaches 70%
    full, automatically run:
    /compact Focus on code structure, API contracts, test results,
    and architectural decisions. Exclude docs and comments.
    When context reaches 85% full, stop the current task, update
    PROGRESS.md with exact state, commit everything with message
    "checkpoint: context limit approaching -- [current stage]",
    then tell me:
    "CONTEXT CHECKPOINT -- session is nearly full.
    Everything is saved. Start a new session and paste the
    context reset prompt from onboarding/staff/CLAUDE_CODE_WORKFLOW.md"
    Never silently lose progress by hitting the context limit.
    Never start a new stage if context is above 60% full.

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
