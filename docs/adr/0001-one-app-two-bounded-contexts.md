# One app, two bounded contexts, folder seams

The scheduling epic spec calls patient flow and staff scheduling different
products that share an auth pattern, a drag-and-drop engine, and a design
system — but never a domain model. We keep both in one Vite app with
folder-level bounded contexts (`src/patient-flow`, `src/scheduling`) and a
shared kernel (`src/shared`), enforced by convention (see dependency rules in
ARCHITECTURE.md), rather than splitting into a monorepo or separate repos.

## Considered Options

- Separate repos: honest product split, but the three shared assets would
  drift or need publishing overhead a two-person prototype can't justify.
- npm workspaces monorepo: right shape at scale, premature at ~30 files.
- Folder contexts in one app (chosen): near-zero overhead now; the folder
  seams make a later workspace split mechanical if the products diverge.
