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
16. Model selection -- cannot be switched programmatically. Always tell the
    user what to type and wait for confirmation before proceeding.

    Default is claude-sonnet-4-6. At the start of every session, tell the user:
    "Please type /model claude-sonnet-4-6 to set the session default,
    then type go to begin."

    When Opus 4.8 is needed, tell the user:
    "This stage needs the most capable model. Please type
    /model claude-opus-4-8 then type go to continue."
    Use Opus 4.8 for: Stage 2 entity normalisation, Stage 6.5 authentication,
    Stage 11 provisioning, any decision hard to reverse, any unresolved bug
    after two Sonnet attempts.

    When returning to Sonnet after Opus, tell the user:
    "Opus stage complete. Please type /model claude-sonnet-4-6
    then type go to continue."

    When Haiku is needed, tell the user:
    "Please type /model claude-haiku-4-5 then type go to continue."
    Use Haiku only for: single-line config edits, file renames, and
    purely mechanical tasks with zero reasoning required.

    Never switch models silently.
17. Effort level -- cannot be set programmatically. Always tell the user
    what to type and wait for confirmation before proceeding.

    Default is high, set permanently via .claude/settings.json. No command
    needed for high -- it applies automatically every session.

    When xhigh is needed, tell the user:
    "This stage needs deeper reasoning. Please type /effort xhigh
    then type go to continue."
    Use xhigh for: Stage 2 entity normalisation, Stage 6.5 authentication,
    any unresolved bug after two attempts at high.

    When medium is needed, tell the user:
    "Switching to lighter effort for this task. Please type /effort medium
    then type go to continue."
    Use medium for: updating FUNCTIONALITY.md, PROGRESS.md, SESSION_STATE.md,
    CLAUDE.md, and any other documentation-only task with no logic involved.

    When returning to high after medium, tell the user:
    "Documentation done. Please type /effort high then type go to continue."

    When low is needed, tell the user:
    "Please type /effort low then type go to continue."
    Use low only for: simple config edits, renaming files, single-line
    fixes where no reasoning is required.

    Never change effort silently.
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
