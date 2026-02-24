# AGENTS.md

## Cursor Cloud specific instructions

**Nostr Relay Center** is a client-side React + Vite + TypeScript PWA (no backend, no database). All commands are documented in the README `Scripts` table.

### Quick reference

- Dev server: `npm run dev` (port 3000, HMR enabled)
- TypeScript check: `npx tsc --noEmit`
- Production build: `npm run build` (runs `tsc && vite build`, output in `dist/`)
- No linter configured beyond TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`)
- No automated test framework is set up in this project

### Caveats

- The app requires an **external Nostr relay** (WebSocket) at runtime to be fully functional. Without one, only the login screen and theme toggle are usable. No relay is bundled or started from this repo.
- No `.env` file is required for local development. `.env.example` contains only optional variables (`VITE_DEFAULT_RELAY_URL`, `VITE_CONTACT_NPUB`, `VITE_LIGHTNING_URL`).
- Vite is configured with `open: true` in `vite.config.ts`; in headless environments the browser auto-open will fail silently -- this is expected.
- The PWA service worker (`vite-plugin-pwa`) is only generated during `npm run build`, not in dev mode.
