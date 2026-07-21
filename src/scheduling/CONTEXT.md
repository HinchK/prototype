# Scheduling

Staff scheduling co-pilot — **demo build** (see
`docs/superpowers/specs/2026-07-20-scheduling-demo-design.md`). The rulebook,
roster, and week are fictitious-but-plausible inventions; this language is
provisional until real phase-1 rule extraction replaces it.

## Language

**Staff**: an employee being scheduled. _Avoid_: Doctor, care team.
**Block**: an operational unit of the clinic day (Kennel AM … Kennel PM), a
Coverage Board row. _Avoid_: Room.
**Slot**: one Block on one day — a grid cell.
**Shift / Assignment**: a Staff member placed in a Slot.
**Rulebook / Rule**: Dana's externalized judgment — 8 parameterized templates,
hard (red) or soft (amber).
**Violation**: a rule failing on the current week; renders at the seams.
**Call-Out**: a simulated absence for one Staff member on one day.
**Absorption**: whether an assignment survives a call-out — someone qualified,
free, and legal can back-fill.
**Back-fill**: the named candidates who could cover.
**Bench**: unassigned staff — the drag source.
**Week Vitals / Demand**: the headline stats bar and the mock PIMS load strip.
