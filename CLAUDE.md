# West Coast Animal Hospital — portal

Vite + React 18 + Tailwind v4 (JS with JSDoc-typed domain, not TypeScript).
Two bounded contexts share this app; read [ARCHITECTURE.md](./ARCHITECTURE.md)
and [CONTEXT-MAP.md](./CONTEXT-MAP.md) before restructuring anything.

## Commands

- `npm run dev` — dev server on 5173 (browser preview: launch config `wcah-portal`)
- `npx vitest run` — domain tests (fast, no browser)
- `npm run build` — production build

## Hard rules

- Bounded contexts (`src/patient-flow`, `src/scheduling`) never import each
  other; only `src/app` composes them. `src/shared` stays domain-agnostic.
- `src/patient-flow/domain` is pure: no React, no `Date.now()`/`setInterval`,
  no id generation inside reducers — timestamps and ids arrive via action
  payloads / factory args. Extend behavior there first, with a vitest case,
  then wire UI through `useTriageBoard`.
- Use the ubiquitous language from each context's `CONTEXT.md` in code and
  copy (Walk-In, Check-In, Visit, Care Queue, Discharge — not synonyms).
- Define React components at module scope, never inside another component —
  inline definitions remount the subtree every render, which cancels
  in-progress drags and replays entry animations.
- Design tokens live in `src/index.css` `@theme`; components use token classes
  (`bg-primary`, `text-charcoal`), not raw hex.

## Current state

- Demo auth: any credentials sign in; lock-screen PIN is `1234`.
- The scheduling context is a DEMO build (spec: `docs/scheduling-epic-spec.md`,
  design: `docs/superpowers/specs/2026-07-20-scheduling-demo-design.md` —
  **read Amendment 1**, the build pivoted). All clinic facts (roster, rulebook,
  archetypes, week) are fictitious-but-plausible by directive; real phase-1 rule
  extraction has not happened.
- Two scheduling surfaces on one engine: the Coastal Glass **dashboard**
  (front door, `ui/Dashboard.jsx`) and the **Coverage Board** (drill-down, where
  editing happens). Metrics (chemistry, health, equity) are computed and never
  produce Violations — only rules do. `data/clinic.test.js` asserts an exact
  violation set and is the tripwire if that boundary is ever crossed.
- Branch `prototype/style-variants` holds the four-variant exploration. It is
  **not** only a palette study: `src/prototype/data.js` carries a product model
  (archetypes, synergy, suggestions) that the Coastal Glass pivot ported. Read
  the branch before designing anything scheduling-adjacent — a previous session
  lost weeks of intent by trusting the removal commit's "we chose slate-blue"
  summary.
