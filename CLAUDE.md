# LEVER

Biomechanics-based lift comparison tool. Pure client-side — no backend, no database, no auth.

## Stack

- **Next.js 16** (App Router, React Compiler enabled) + **React 19** + **TypeScript 5.9**
- **Tailwind CSS 4** (CSS-first config via `@tailwindcss/postcss`) + **PostCSS 8**
- **Zustand 5** (persist middleware + localStorage)
- **Vitest 4** for tests, **ESLint 9** (flat config), **knip** for dead code detection
- Node 24 LTS target (`.nvmrc`), engines `>=20.9.0 <25`

## Project Structure

```
src/app/              # 5 routes: /, /compare/quick, /compare/detailed, /how-it-works, /playground
src/components/       # anthropometry/, comparison/, layout/, persistence/, results/, ui/, visualization/
src/lib/animation/    # PoseSolver system — per-movement pose solvers in movements/
src/lib/biomechanics/ # Core physics: anthropometry, kinematics, physics, comparison, constants
src/lib/              # units.ts (conversions), formatters.ts (display), archetypes.ts, validation.ts
src/store/            # Zustand store (useLeverStore) — profiles, history, unitPreference
src/hooks/            # useLiveComparison, useUnits (global unit preference hook)
src/types/            # Shared TypeScript types (including SavedProfile, ComparisonSnapshot)
```

## Key Patterns

- **PoseSolver architecture**: Each lift type (squat, deadlift, bench, OHP, pullup, pushup, thruster) has its own solver in `src/lib/animation/movements/`. Factory function `createPoseSolver()` dispatches by lift type.
- **Segment-based anthropometry**: All body proportions derived from height + sex using ratio tables in `src/lib/biomechanics/constants.ts`.
- **Global unit system**: `useUnits()` hook reads `unitPreference` from Zustand store, returns resolved units (`cm`/`inches`, `kg`/`lbs`). All input components (BuildInput, HeightWeightInput, LiftSelector) read units internally via this hook — no prop threading. Toggling metric/imperial in the GlobalHeader or any per-field button updates everywhere simultaneously.
- **Persistence system**: Portal-rendered slide-out drawer (`PersistenceDrawer`) with History + Profiles tabs. Components in `src/components/persistence/`. Profiles support naming, custom segments, full CRUD. History stores up to 10 comparisons with `ComparisonSnapshot` for input restoration.
- **Zustand store slices**: `savedProfiles[]` (multi-profile library), `comparisonHistory[]` (capped at 10, enriched with id/timestamp/snapshot), `unitPreference` ("metric" | "imperial"). All persisted to localStorage.
- **Icons**: `lucide-react` — avoid renaming/removing icons without checking all imports (0.x semver).
- **z-index ladder**: dropdowns z-[100], drawer backdrop z-[199], drawer panel z-[200], drawer-internal dropdowns z-[300].

## Commands

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` — ESLint with flat config (`eslint.config.mjs`)
- `npm run test:run` — Vitest (140 tests)
- `npx knip` — detect unused deps/exports/files

## Known Constraints

- **ESLint 10 blocked**: `eslint-plugin-react` hasn't updated for ESLint 10's removed `getFilename()` API. Stay on ESLint 9.x until `eslint-config-next` ships a compatible update.
- **Pre-existing TS errors in test files**: Some test files (especially gitignored exploratory tests) have type mismatches with current types. Tests still pass via Vitest.
- **No CI/CD**: No `.github/workflows/`, no Dockerfile, no `vercel.json`. Deployment target assumed Vercel.
- **Audit dev deps** (`audit-ci`, `knip`, `license-checker-rseidelsohn`, `@socketsecurity/cli`) are intentionally installed for periodic audits but not wired into CI yet.
- **Node 20 EOL**: 2026-04-30. Local dev may still be on Node 20 while `.nvmrc` targets 24.14.0.
