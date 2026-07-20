# Scheduling Demo — "Slate Clinic with Glass"

*Design spec, brainstormed and approved 2026-07-20. Parent epic:
[docs/scheduling-epic-spec.md](../../scheduling-epic-spec.md). Status: approved
for planning (writing-plans is the next step).*

## What this is

A **demonstration** of the scheduling co-pilot from the epic spec — explicitly
not the production phase-2 build. Framing (user decision): the epic's phase 1
(rule-extraction interviews) has not happened, so every real-world fact in this
build is **fictitious but plausible**, invented by the builder. The demo is an
**elicitation instrument** first (a concrete prop a real scheduler can correct:
"no, that rule is wrong, it's actually X") and a **stakeholder demo** second.
It must therefore be judged by "can a non-technical scheduler correct a wrong
rule in it," not by polish.

This reframes the epic's wedge test honestly: the constraint checker here
catches the failures *we planted*, which proves the shape of the product, not
the extractability of the real scheduler's judgment. The doc says so wherever
it matters.

## Decision log

Decisions grilled one-by-one with the user; facts delegated to invention.

| # | Decision | Choice |
|---|----------|--------|
| 1 | Framing | Elicitation-instrument demo, stakeholder demo as side effect. Fabricated rulebook is an asset (concrete artifact extracts tacit knowledge), not a lie |
| 2 | Scope | Wedge (timeline + rulebook editor + live checker) **+ robustness panel + stubbed demand strip**. Bid market is roadmap-only — multi-user mechanism, demos poorly in a five-minute single-user walkthrough |
| 3 | Timeline tech | Custom CSS-grid week view on the shared dnd engine, **day-granularity shift blocks**. FullCalendar resource-timeline rejected: premium license, its own drag system fights ADR-0002's shared engine, library-owned DOM blocks seam-level violation rendering |
| 4 | Rule model | Closed set of **8 parameterized rule templates**; rulebook = instances edited via forms. DSL rejected (parser + syntax burden); hardcoded rules rejected (kills live correction, i.e. the elicitation framing) |
| 5 | Robustness metric | **Per-assignment single-call-out absorption + named back-fill map.** Not k-simultaneous worst case (slow, illegible), not bench-depth (no names, weaker story) |
| 6 | Layout | Delegated to builder → the **Coverage Board** (below) |
| 7 | Theme | **"Slate Clinic with Glass"** — existing slate-blue + Open Sans, plus frosted-glass chrome |

## 1. Layout: the Coverage Board

The spec's default projection (staff rows × time columns) is inverted. Sixty
staff rows is an unusable wall of scroll, and it centers people when the demo's
subject is *coverage*.

- **Rows = operational blocks in office-flow order**, the chronology of a
  hospital day top to bottom: Kennel AM (6a) → Front Desk Open → Morning
  Appointments → Surgery Block → Midday/Lunch Cover → Afternoon Appointments →
  Front Desk Close → Kennel PM. ~8 rows regardless of roster size.
- **Columns = the seven days.**
- **Cells = the staff chips** assigned to that block that day. A thin or empty
  cell is visibly the problem.

Around the grid:

- **Demand strip** above the day headers — fabricated appointment-load
  sparkline per day (mock PIMS shape). Makes "why can't everyone have Tuesday
  off" visible without a word.
- **Week Vitals bar** (glass, top): `Coverage · Hard violations · Absorbs N/M
  call-outs`. The headline number lives here permanently.
- **Right glass rail**, context-switching: nothing selected → Rulebook;
  violation selected → the rule in the scheduler's words + suggested repairs;
  staff chip selected → that person's week, hours, back-fill map.
- **Bench** (bottom drawer) — unassigned/available chips grouped by role; the
  drag source.

Violations render **at the seams**: offending cell borders glow red (hard) or
amber (soft) with a badge that opens the rail. Drops are never blocked —
human-authored, machine-checked (epic §5 legitimacy principle): any drop
lands, then flags.

Rejected layouts: air-traffic strip board (too close to the triage board;
invites the "prettier manual grid" trap of epic §1) and the literal
staff-rows grid (above).

## 2. Fictional content package

Invented, and flagged as invented so it is auditable:

- **Dana Whitfield**, practice manager, 11 years — the bus-factor human. Every
  rule and violation message is written in her voice ("Surgery can't run on
  one tech — anesthesia needs its own hands").
- **Roster of 58**: 8 DVMs (Dr. Gibbings carries over from patient-flow for
  continuity), 14 techs (5 anesthesia-certified), 12 assistants, 9 CSRs,
  6 kennel, 9 part-time/float. Chips carry credential badges (DVM / LVT /
  LVT-A / CSR / KEN).
- **Seeded week with deliberate defects**: two hard violations (Saturday
  surgery one tech short; Marisol closes Tuesday then opens Wednesday), one
  amber cluster (weekend-fairness skew), one thin Thursday that fails
  absorption. The demo finds what we planted — stated honestly.

## 3. Domain model

`src/scheduling/domain/` — pure, JSDoc-typed, mirrors patient-flow discipline:
no React, no `Date.now()`, ids/timestamps via factory args.

- **Entities**: `StaffMember` (role, credentials, maxHours, availability),
  `Slot` (block × day), `Assignment`, `RuleInstance`, `WeekSchedule`.
- **Rule templates** (closed set of 8): `minRoleCoverage`,
  `minCredentialCoverage`, `maxWeeklyHours`, `minRestGap`,
  `hardUnavailability`, `keepApart`, `preferPairing` (soft), `fairRotation`
  (soft). Each = pure predicate + params schema + violation-message template.
  The closed set is also the phase-1 interview taxonomy; a real rule that
  doesn't fit a template is a *finding*, not a failure.
- **`evaluateWeek(schedule, rulebook) → Violation[]`** — runs on every edit
  and on hypothetical drops during drag hover.
- **`absorption(schedule, rulebook)`** → per-assignment `{absorbable,
  candidates[]}`. Single call-out at a time; a substitute must be qualified,
  available, not double-booked, and introduce no new hard violation.
  **Stated limitation:** no cascade re-check (the substitute's own week is not
  re-evaluated for knock-ons) and no simultaneous-absence analysis. The score
  must not be read as worst-case k.
- **Demand curve**: static seeded data in the shape a PIMS adapter would emit.

## 4. UI composition

`src/scheduling/ui/` — all components module-scope (repo hard rule):
`ScheduleBoard`, `CoverageGrid`, `VitalsBar`, `DemandStrip`, `RulebookRail`
(three modes), `Bench`; one `useScheduleBoard` hook (reducer + selectors over
the domain). Drag-and-drop reuses the shared dnd engine per ADR-0002: chips
drag bench→cell and cell→cell; drop targets show live rule feedback during
hover. A **"Simulate call-out"** action on any chip powers the disaster beat.

## 5. Integration & theming

- `src/app` grows a slim context switcher in the authed shell — Patient Flow |
  Staff Scheduling — the only file touching both contexts. Zero cross-context
  imports; `src/shared` untouched except possibly additive dnd options.
- **Slate Clinic with Glass**: slate-blue + Open Sans stays; glass =
  translucent frosted surfaces (vitals bar, right rail, bench drawer) via new
  `@theme` tokens (`--color-glass-*`, blur/opacity). Token classes only, no
  raw hex. Grid cells stay opaque — glass is chrome, not content.
- State: seeded in-memory only, plus a reset button. No persistence — a demo
  must reset to its script.

## 6. Error handling & edge semantics

The domain is pure and synchronous — no async failure modes. Semantics that
matter:

- Invalid drops **flag, never block**.
- An unsatisfiable rule (e.g. demanding 3 anesthesia techs when none are free)
  renders as a violation with an honest "no repair available" state.
- Absorption over an empty/partial week degrades to "n/a", never a division
  error.
- Rule-editor forms validate params (counts ≥ 0, known credentials, known
  staff) so the domain never sees malformed instances.

## 7. Testing

Vitest, domain-only (fast, no browser):

- Each rule template: at least one violation case and one non-violation case.
- `evaluateWeek` on the seeded week returns **exactly** the planted defects —
  this doubles as the demo-script regression test.
- Absorption: absorbable case, non-absorbable case, and a simulate-call-out
  case with expected back-fill candidates.

UI verified through the browser pane against the demo script.

## 8. Demo script (five beats)

1. Open on the seeded week — vitals bar shows 2 hard violations; the grid
   glows where they live.
2. Click the Saturday surgery seam → rail explains in Dana's voice, offers
   repairs.
3. Apply the repair — drag the suggested tech's chip from the bench into the
   Saturday surgery cell → seams clear live, absorption ticks up.
4. **Elicitation beat**: edit the surgery-tech rule 1→2 in the rulebook → new
   violations cascade instantly ("now correct *my* wrong rules").
5. **Disaster beat**: simulate Dr. Okafor out Thursday → vitals drop,
   back-fill map names who covers — epic §0's business case, answered on
   screen.

## Out of scope

Bid market and stable-matching pass (epic phase 4), real PIMS integration
(phase 5), persistence, multi-week/rotation views, auth changes, any
patient-flow domain coupling.
