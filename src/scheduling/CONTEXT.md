# Scheduling

Staff scheduling co-pilot — **demo build** (see
`docs/superpowers/specs/2026-07-20-scheduling-demo-design.md`). The rulebook,
roster, archetypes, and week are fictitious-but-plausible inventions; this
language is provisional until real phase-1 rule extraction replaces it.

Two surfaces, one engine: the **Practice Intelligence** dashboard (front door,
read-and-apply) and the **Coverage Board** (drill-down, where editing happens).

## Language

### Structure

**Staff**: an employee being scheduled. _Avoid_: Doctor, care team.
**Block**: an operational unit of the clinic day (Kennel AM … Kennel PM), a
Coverage Board row. _Avoid_: Room.
**Slot**: one Block on one day — a grid cell.
**Shift / Assignment**: a Staff member placed in a Slot.
**Bench**: unassigned staff — the drag source.

### Rules

**Rulebook / Rule**: Dana's externalized judgment — 8 parameterized templates,
hard (red) or soft (amber).
**Violation**: a rule failing on the current week; renders at the seams.
_Only rules produce Violations._ Metrics (below) never do.

### Robustness

**Call-Out**: a simulated absence for one Staff member on one day.
**Absorption**: whether an assignment survives a call-out — someone qualified,
free, and legal can back-fill.
**Back-fill**: the named candidates who could cover.

### Metrics

Computed advisory numbers, never Violations. A low-chemistry shift is awkward,
not invalid — and wiring any of these into the rulebook would change what
counts as a broken schedule.

**Archetype**: how a person shows up on the floor — Anchor, Spark, Empath,
Analyst, Shield. Dana makes archetype claims without naming them ("put a steady
one on with the new kid"). _Avoid_: personality type, profile.
**Synergy**: the symmetric 0–100 matrix scoring one Archetype pairing.
**Chemistry**: mean Synergy across the pairings actually present — in a Slot, a
day, a week. Null, not zero, when nobody can pair.
**Weekend Equity**: how evenly weekend duty is shared (Gini-based). Meaningful
across a Horizon; low by nature in any single week.
**Burnout Streak**: a run of consecutive worked days at or over the threshold.
**Schedule Health**: the composite score — coverage, equity, chemistry, burnout.

### Planning

**Suggested Move**: a generated change with a **measured** impact — simulate,
diff, report. Its `apply` is an ordered list of real reducer actions, because a
swap is genuinely vacate-then-fill. Never advertises an impact it cannot
produce. _Avoid_: recommendation, tip.
**Horizon**: the four-week planning window.
**Projection**: weeks 2–4 — the live week's pattern carried forward with
weekend duty rotated. Derived, never hand-authored, so repairing week 1
improves the month. _Avoid_: forecast (nothing is predicted).
**Week Vitals / Demand**: the Coverage Board's headline stats bar and the mock
PIMS load strip.

## Boundaries worth keeping

- Metrics are computed from the week; Rules judge it. Moving a metric into
  `rules.js` would break the planted-defect regression in `data/clinic.test.js`,
  which asserts an exact Violation set — that test is the tripwire.
- Rest gaps and Burnout Streaks are measured **within** a week and do not cross
  Horizon week boundaries. Closing Sunday of W1 and opening Monday of W2 does
  not flag.
- Projections are validated against the rulebook: a Projection never introduces
  a hard Violation the live week lacks.
