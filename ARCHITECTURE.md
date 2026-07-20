# Architecture

Single Vite + React app hosting two bounded contexts that share infrastructure
but never a domain model. See [CONTEXT-MAP.md](./CONTEXT-MAP.md) for the
domain map and `docs/adr/` for the decisions behind this shape.

```
src/
├── main.jsx                 entry
├── index.css                design tokens (@theme): slate-blue palette, Open Sans
├── app/
│   └── App.jsx              composition root — session machine, mounts contexts
├── shared/                  modules both contexts may use
│   ├── ui/                  design system: cn() + Button/Card/Badge/Input/Avatar
│   ├── auth/                gateway screens: Landing, Lock (PIN 1234), Backdrop
│   ├── dnd/                 drag-and-drop engine (dnd-kit inside)
│   └── toast/               useToasts() + <Toaster>
├── patient-flow/            bounded context: the live triage board
│   ├── CONTEXT.md           ubiquitous language
│   ├── domain/              PURE: board reducer, selectors, catalog — no React,
│   │                        no clocks, no I/O; ids/timestamps injected. Tested.
│   ├── data/                seed walk-ins + simulation pool (content only)
│   └── ui/                  TriageBoard screen, cards, panels, useTriageBoard
│                            (the adapter owning the reducer + 1s clock + toasts)
└── scheduling/              bounded context: RESERVED for the scheduling epic
    └── CONTEXT.md           deliberately near-empty until rule extraction
```

## Dependency rules

1. Contexts never import each other. `patient-flow` ↔ `scheduling` share
   nothing but `shared/` and the composition root.
2. `domain/` never imports React, `shared/`, or `ui/`. It is pure data and
   functions; the UI adapts to it (via `useTriageBoard`), never the reverse.
3. `shared/` modules are domain-agnostic. The dnd engine moves opaque string
   ids; the design system knows colors, not walk-ins.
4. Only `app/` may import from more than one context.

## Shared module interfaces

- **ui/primitives** — `Button`, `Card`, `Badge`, `Input`, `Avatar`, `cn()`.
  Tokens live in `src/index.css` (`--color-primary #516d7d`, hover `#6297b5`,
  accent `#475a6e`, cream `#f9f9f7`, charcoal `#454545`, Open Sans).
- **auth** — `<Landing onSignIn>`, `<Lock onUnlock onSignOut>`; both render the
  shared `Backdrop` so the gateway screens stay visually identical.
- **dnd/engine** — `<DragDropBoard onDrop(dragId, dropId) preview(dragId)>`
  wrapping `<DragHandle id>` sources and `<DropZone id>` targets. Ids are
  opaque strings; drop validity is the caller's rule (reject in `onDrop`).
  Pointer drags activate after 4px so inner buttons stay clickable; keyboard
  dragging is built in (focus handle, Space lifts, arrow keys jump zone to
  zone via a droppable-snapping coordinate getter, Space drops). Interactive
  elements nested inside a DragHandle must stopPropagation on
  pointerdown/keydown so they don't start a drag.
- **toast** — `useToasts()` → `{ toasts, notify(message, tone), dismiss }` +
  `<Toaster>`; tones `success | error | info`; auto-dismiss with cleanup.

## What the scheduling epic reuses (spec §1)

Auth gateway unchanged; the dnd engine with new meanings (card = unassigned
shift or employee, grid = resource timeline); the design system. Nothing from
`patient-flow/domain` — the manual grid is the fallback, not the value.

## Commands

- `npm run dev` — Vite dev server on 5173 (also via `.claude/launch.json`)
- `npm test` / `npx vitest run` — domain tests
- `npm run build` — production build

## History

The full four-variant style exploration that settled the design system lives
on branch `prototype/style-variants`.
