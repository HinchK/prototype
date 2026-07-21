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
(phase 5), persistence, auth changes, any patient-flow domain coupling.

---

# Amendment 1 — the Coastal Glass pivot (2026-07-21)

*Everything above describes the build as shipped through Task 8 and remains
accurate about the Coverage Board. This amendment records what changed and why.
It is written as an amendment rather than a rewrite because the original
decisions were correct given what was known, and the reason they changed is the
most useful thing in this document.*

## What prompted it

A prior session had built a four-variant design exploration on branch
`prototype/style-variants`, including a "Coastal Glass" scheduling dashboard:
personality archetypes, a chemistry heatmap, schedule health, suggested moves.
Commit `846321c` removed it from main as a **palette** exploration — its message
records the verdict as "slate-blue, Open Sans, shadcn idiom." But
`src/prototype/data.js` held a product model, not a palette.

Three things then compounded the loss during this build:

1. `CLAUDE.md` and the session memory both described the branch as style-only.
2. Epic spec §1 explicitly instructs that the earlier prototype's "domain,
   state, and logic" must **not** carry over — only auth, dnd, and the design
   system.
3. Nobody checked out the branch. The design above was derived from the epic
   spec's prose, and the scoping question offered three options all carved from
   that same phasing. Porting the existing prototype was never on the menu.

**Lesson worth keeping:** a commit message that records a verdict ("we chose
slate-blue") can silently discard everything else in the artifact it removed.
When a branch is preserved "as the primary source," read it before building
adjacent to it.

## Decision: augment, not replace

`GlassVariant.jsx` is **read-only** — no drag-drop, no rulebook editor, no
call-out toggle. Replacing the Coverage Board with it would have deleted the
elicitation surface that is the epic's entire thesis (§0: the judgment becomes
inspectable policy anyone can run).

So: the dashboard is the **front door**, the Coverage Board the **drill-down**.
Both read the same live state. The dashboard sells the system; the board does
the work.

## What the pivot added

| Module | Purpose |
|---|---|
| `domain/chemistry.js` | Archetypes, symmetric synergy matrix, slot/day/week chemistry |
| `domain/health.js` | Composite score, burnout streaks, weekend equity |
| `domain/suggestions.js` | Generated moves with measured impact |
| `domain/horizon.js` | Four-week horizon; weeks 2–4 as projections |
| `ui/Dashboard.jsx` | The Coastal Glass surface |

## Decisions that shaped it

**Chemistry is a metric, never a Violation.** It colors the heatmap and drives
suggestions; it does not make a schedule invalid. Wiring it into `evaluateWeek`
would also break `data/clinic.test.js`'s exact planted-defect assertion — that
test is the deliberate tripwire.

**Impact is measured, not asserted.** Every suggestion badge is produced by
simulating the move and diffing health components. The prototype's
`Client CSAT +8` and `Risk −34%` were dropped: nothing in the system can compute
them. A suggestion's `apply` is an *ordered list* of real reducer actions
because a swap is genuinely vacate-then-fill — collapsing it into one invented
action type let a badge describe a change the reducer could not perform. Caught
by strengthening the test to dispatch every suggestion rather than one.

**Weekend equity uses a Gini coefficient, not max−min.** Max−min saturates to 0
on any ordinary roster — one person working two weekend shifts while anyone
works none reports "maximally unfair" for a perfectly normal week.

**Weeks 2–4 are projections, not invented data.** Four hand-authored weeks
would be four times the fiction with no more truth in it. Deriving them from
week 1 (weekend duty rotated across credential-preserving peers) means
repairing week 1 improves the whole month — verified: one coverage fill took
month-wide unfilled 4 → 0.

**Projections are rulebook-validated.** Rotating Saturday's openers pulls in
Friday closers — a day the rotation deliberately leaves alone — tripping the
rest-gap rule. Offending weekend slots revert, and a test asserts the
introduced-violation set is exactly empty, not merely "no worse."

**Month equity is pooled, not averaged.** Averaging per-week equity would hide
the fact the horizon exists to reveal: 60 across the month against 33 in week 1
alone.

**Coastal palette lives in `@theme`.** The variant was ~40 hardcoded colors; the
`coast-*` tokens plus `.coast-bg` / `.coast-panel` keep the repo's token rule
intact. Heatmap opacity normalizes to the week's own min–max, since a real
week's chemistry spans a narrow band and a 0–100 mapping renders every tile
identical.

## Known limitations

- Rest gaps and burnout streaks are measured within a week and do not cross
  horizon boundaries (closing Sunday of W1 into opening Monday of W2 does not
  flag). Fixing this makes the horizon one continuous 28-day structure.
- `backfillCandidates` guarantees *no net increase* in hard violations, not
  "this candidate trips nothing new" — filling one gap can offset a different
  new violation.
- Archetype assignments are hand-authored fiction, as is the synergy matrix.
  Real phase-1 extraction would replace both.

## Revised demo script

1. Land on the dashboard — month health, 4×7 chemistry heatmap, equity 60 for
   the month against 33 for week 1 alone.
2. Apply a suggested move — headline numbers shift by exactly the badge values;
   the suggestion list regenerates.
3. Open the Coverage Board — the same repair is already reflected in the grid.
4. Beats 2–5 of the original script (violation rail, rule edit cascade,
   call-out simulation) run unchanged from there.
