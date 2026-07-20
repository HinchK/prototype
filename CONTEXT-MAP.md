# Context Map

Two products share this codebase, per the scheduling epic spec (§1): patient
flow is a real-time all-day ops tool; staff scheduling is a bursty planning
tool. Different users, data, and failure modes — deliberately separate models.

## Contexts

- [Patient Flow](./src/patient-flow/CONTEXT.md) — live triage board: walk-ins through rooms and care queues to checkout
- [Scheduling](./src/scheduling/CONTEXT.md) — staff scheduling co-pilot (reserved; epic not started)

## Relationships

- **Patient Flow ↔ Scheduling**: no shared domain model, no imports in either
  direction, by design. They meet only at `src/shared` (design system, auth
  gateway, drag-and-drop engine, toasts) and the composition root `src/app`.
- The epic spec is explicit about what carries between them: the auth pattern,
  the dnd engine, and the design system — never the domain, state, or logic.
