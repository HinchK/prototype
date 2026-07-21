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
  design: `docs/superpowers/specs/2026-07-20-scheduling-demo-design.md`).
  All clinic facts (roster, rulebook, week) are fictitious-but-plausible by
  directive; real phase-1 rule extraction has not happened.
- Style history: branch `prototype/style-variants` holds the four-variant
  design exploration; the chosen system is the current slate-blue + Open Sans.
