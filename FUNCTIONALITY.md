# Functionality Tracker

## Stage 0: Project Scaffolding

- [x] Monorepo structure with npm workspaces
- [x] ha-core package skeleton (Express + HA WebSocket adapter)
- [x] client-app package skeleton (React + Vite + Tailwind PWA)
- [x] operator-app package skeleton (React + Vite + Tailwind dashboard)
- [x] Docker Compose configuration
- [x] Development tooling (Prettier, Vitest, Nodemon)

## Stage 0b: End-to-end spike (validated, throwaway)

- [x] HA WebSocket authentication + connection proven against live HA
- [x] Service call toggles a real light (`light.bed_light`)
- [x] `state_changed` round-trips back to the browser via GET /state
- Note: lives on the `spike` branch only (6b0cc39); deliberately not part
  of the built system. Confirms the path before Stage 1 builds ha-core properly.
