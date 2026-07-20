# Scheduling Demo ("Slate Clinic with Glass") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the demo scheduling co-pilot from `docs/superpowers/specs/2026-07-20-scheduling-demo-design.md`: a Coverage Board (operational blocks × days) with a live rule checker, editable rulebook, call-out absorption scoring, and a fictional clinic dataset with planted defects.

**Architecture:** New bounded context `src/scheduling` mirroring `src/patient-flow`'s discipline — a pure JSDoc-typed domain (state + rule templates + absorption, all vitest-covered), a seeded fictional data package, and a React UI layer wired through one `useScheduleBoard` hook and the shared dnd engine. `src/app` grows a context switcher; contexts never import each other.

**Tech Stack:** Vite 6, React 18, Tailwind v4 (`@theme` tokens), @dnd-kit via `src/shared/dnd/engine.jsx`, lucide-react icons, vitest. Plain JS with JSDoc — **no TypeScript**.

## Global Constraints

- Bounded contexts (`src/patient-flow`, `src/scheduling`) never import each other; only `src/app` composes them; `src/shared` stays domain-agnostic (CLAUDE.md).
- `src/scheduling/domain` is pure: no React, no `Date.now()`/`setInterval`/`crypto` calls inside reducers; ids/timestamps arrive via factory args or action payloads (CLAUDE.md).
- React components at module scope only — never defined inside another component (CLAUDE.md).
- Colors/fonts via token classes (`bg-primary`, `text-charcoal`, `bg-glass`); no raw hex in components (CLAUDE.md).
- Ubiquitous language (updates `src/scheduling/CONTEXT.md` in Task 8): Staff, Shift, Block, Slot, Assignment, Rulebook, Rule, Violation (Hard/Soft), Call-Out, Absorption, Back-fill, Bench, Week Vitals, Demand. Never patient-flow words (Walk-In, Room, Visit).
- Drag/drop ids are colon-separated opaque strings parsed in `onDrop` (matches `room:`/`doc:` in TriageBoard): `bench:{staffId}`, `cell:{staffId}:{blockId}:{day}`, `slot:{blockId}:{day}`, `bench` (the bench as drop target).
- Drops are **never blocked** — any drop lands, then the checker flags (spec §5 legitimacy rule). The reducer guards only impossibilities (unknown slot, duplicate).
- Tests: `npx vitest run` (all) or `npx vitest run src/scheduling` (context only). Commit after every task.
- Copy is in Dana Whitfield's voice where the spec says so (rule rationales, violation phrasing).

## File Structure

```
src/scheduling/
  domain/
    catalog.js         blocks/days/roles constants + time-overlap helpers
    schedule.js        Week/state entities, reducer, selectors (pure)
    schedule.test.js
    rules.js           8 rule templates, evaluateWeek, violationsBySlot (pure)
    rules.test.js
    absorption.js      back-fill candidates + absorption score (pure)
    absorption.test.js
  data/
    clinic.js          fictional roster (58), rulebook, seeded week, demand
    clinic.test.js     regression: seeded week yields EXACTLY the planted defects
  ui/
    useScheduleBoard.js  reducer+derived-state adapter (React)
    chips.jsx            StaffChip, CredBadge, chip drag preview
    panels.jsx           VitalsBar, DemandStrip, Bench
    rail.jsx             RulebookRail (rulebook / violation / staff modes) + rule editor
    CoverageGrid.jsx     the blocks×days grid of DropZone cells
    ScheduleBoard.jsx    screen assembly, DragDropBoard wiring, toasts
src/shared/dnd/engine.jsx   additive: optional onActiveChange prop
src/index.css               additive: glass tokens + scheduling backdrop
src/app/App.jsx             context switcher (Patient Flow | Staff Scheduling)
src/scheduling/CONTEXT.md   ubiquitous language (Task 8)
CLAUDE.md                   current-state section update (Task 8)
```

---

### Task 1: Domain catalog + schedule state machine

**Files:**
- Create: `src/scheduling/domain/catalog.js`
- Create: `src/scheduling/domain/schedule.js`
- Test: `src/scheduling/domain/schedule.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces (later tasks import these exact names):
  - `catalog.js`: `DAYS: string[]` (`'Mon'..'Sun'`), `BLOCKS: {id,label,start,end,hours}[]`, `OPENING_BLOCKS: string[]`, `CLOSING_BLOCKS: string[]`, `ROLES: string[]`, `CREDENTIALS: string[]`, `blockById(id)`, `blocksOverlap(a, b)`, `formatWindow(block) -> string`
  - `schedule.js`: `slotKey(blockId, day) -> string` (`` `${blockId}:${day}` ``), `makeStaff(fields, id)`, `createWeek(assignments?) -> Week`, `createScheduleState({assignments, rulebook}) -> ScheduleState`, `scheduleReducer(state, action) -> ScheduleState`, `assignTo(week, staffId, blockId, day) -> Week`, `removeFrom(week, staffId, blockId, day) -> Week`, `effectiveSlots(week) -> Record<string, string[]>`, `isCalledOut(week, staffId, day) -> boolean`, `staffDayBlocks(week, staffId, day) -> string[]`, `staffWeekHours(week, staffId) -> number`

- [ ] **Step 1: Write the failing test**

`src/scheduling/domain/schedule.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { BLOCKS, DAYS, blockById, blocksOverlap } from './catalog'
import {
  createScheduleState,
  createWeek,
  effectiveSlots,
  isCalledOut,
  scheduleReducer,
  slotKey,
  staffDayBlocks,
  staffWeekHours,
} from './schedule'

const state = () =>
  createScheduleState({
    assignments: { [slotKey('surgery', 'Mon')]: ['rosa'] },
    rulebook: [],
  })

describe('catalog', () => {
  it('defines the eight operational blocks in office-flow order', () => {
    expect(BLOCKS.map((b) => b.id)).toEqual([
      'kennel-am', 'desk-open', 'appts-am', 'surgery',
      'midday', 'appts-pm', 'desk-close', 'kennel-pm',
    ])
    expect(DAYS).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('detects time overlap between blocks', () => {
    expect(blocksOverlap(blockById('surgery'), blockById('appts-am'))).toBe(true)
    expect(blocksOverlap(blockById('surgery'), blockById('kennel-pm'))).toBe(false)
  })
})

describe('week state', () => {
  it('creates all block×day slots, seeding provided assignments', () => {
    const week = createWeek({ [slotKey('surgery', 'Mon')]: ['rosa'] })
    expect(Object.keys(week.slots)).toHaveLength(BLOCKS.length * DAYS.length)
    expect(week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa'])
    expect(week.slots[slotKey('surgery', 'Tue')]).toEqual([])
    expect(week.callOuts).toEqual([])
  })

  it('assigns staff into a slot, guarding duplicates and unknown slots', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'surgery', day: 'Mon' })
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa', 'okafor'])
    expect(scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'surgery', day: 'Mon' })).toBe(s)
    expect(scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'nope', day: 'Mon' })).toBe(s)
  })

  it('unassigns and moves staff between slots', () => {
    let s = state()
    s = scheduleReducer(s, {
      type: 'moved', staffId: 'rosa',
      fromBlockId: 'surgery', fromDay: 'Mon', blockId: 'surgery', day: 'Tue',
    })
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual([])
    expect(s.week.slots[slotKey('surgery', 'Tue')]).toEqual(['rosa'])
    s = scheduleReducer(s, { type: 'unassigned', staffId: 'rosa', blockId: 'surgery', day: 'Tue' })
    expect(s.week.slots[slotKey('surgery', 'Tue')]).toEqual([])
  })

  it('toggles call-outs and reflects them in effective slots only', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(isCalledOut(s.week, 'rosa', 'Mon')).toBe(true)
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa'])
    expect(effectiveSlots(s.week)[slotKey('surgery', 'Mon')]).toEqual([])
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(isCalledOut(s.week, 'rosa', 'Mon')).toBe(false)
  })

  it('updates rule params in place', () => {
    const s0 = createScheduleState({
      assignments: {},
      rulebook: [{ id: 'r1', type: 'min-role-coverage', severity: 'hard', params: { count: 1 }, rationale: '' }],
    })
    const s1 = scheduleReducer(s0, { type: 'rule-updated', ruleId: 'r1', params: { count: 2 } })
    expect(s1.rulebook[0].params.count).toBe(2)
    expect(s0.rulebook[0].params.count).toBe(1)
  })

  it('resets to a provided state and ignores unknown actions', () => {
    const s = state()
    expect(scheduleReducer(s, { type: 'reset', state: state() }).week.callOuts).toEqual([])
    expect(scheduleReducer(s, { type: 'mystery' })).toBe(s)
  })

  it('derives per-day blocks and weekly hours from effective slots', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'assigned', staffId: 'rosa', blockId: 'kennel-pm', day: 'Mon' })
    expect(staffDayBlocks(s.week, 'rosa', 'Mon')).toEqual(['surgery', 'kennel-pm'])
    expect(staffWeekHours(s.week, 'rosa')).toBe(5 + 3)
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(staffWeekHours(s.week, 'rosa')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scheduling`
Expected: FAIL — cannot resolve `./catalog` / `./schedule`.

- [ ] **Step 3: Write the implementation**

`src/scheduling/domain/catalog.js`:

```js
// Scheduling catalog — the clinic's operational shape. Pure constants.
// BLOCKS are the rows of the Coverage Board, in office-flow order: the
// chronology of a hospital day, opening to closing. start/end are decimal
// hours (7.5 = 7:30) used only for overlap math and window display.
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const BLOCKS = [
  { id: 'kennel-am', label: 'Kennel AM', start: 6, end: 9, hours: 3 },
  { id: 'desk-open', label: 'Front Desk Open', start: 7.5, end: 11.5, hours: 4 },
  { id: 'appts-am', label: 'Morning Appts', start: 8, end: 12, hours: 4 },
  { id: 'surgery', label: 'Surgery Block', start: 9, end: 14, hours: 5 },
  { id: 'midday', label: 'Midday Cover', start: 11.5, end: 14.5, hours: 3 },
  { id: 'appts-pm', label: 'Afternoon Appts', start: 13, end: 18, hours: 5 },
  { id: 'desk-close', label: 'Front Desk Close', start: 14.5, end: 18.5, hours: 4 },
  { id: 'kennel-pm', label: 'Kennel PM', start: 17, end: 20, hours: 3 },
]

// The min-rest-gap rule ("no one closes then opens"): working any CLOSING
// block on day d and any OPENING block on day d+1 is a violation.
export const OPENING_BLOCKS = ['kennel-am', 'desk-open']
export const CLOSING_BLOCKS = ['desk-close', 'kennel-pm']

export const ROLES = ['DVM', 'Tech', 'Assistant', 'CSR', 'Kennel']
// LVT-A (anesthesia-certified) staff carry BOTH 'LVT' and 'LVT-A'.
export const CREDENTIALS = ['DVM', 'LVT', 'LVT-A']

/** @param {string} id */
export const blockById = (id) => BLOCKS.find((b) => b.id === id)

/** Two blocks overlap when their time ranges intersect. */
export const blocksOverlap = (a, b) => a.start < b.end && b.start < a.end

const fmt = (h) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`
/** @param {{start: number, end: number}} block @returns {string} e.g. '9:00–14:00' */
export const formatWindow = (block) => `${fmt(block.start)}–${fmt(block.end)}`
```

`src/scheduling/domain/schedule.js`:

```js
// Scheduling domain — week state machine. Pure module: no React, no clocks,
// no I/O, no id generation. scheduleReducer maps (state, action) -> state;
// unknown/invalid actions return the same state back (patient-flow idiom).
//
// Interface:
//   slotKey(blockId, day)                  -> 'surgery:Sat'
//   makeStaff(fields, id)                  -> StaffMember
//   createWeek(assignments?)               -> Week
//   createScheduleState({assignments, rulebook}) -> ScheduleState
//   scheduleReducer(state, action)         -> ScheduleState
//   assignTo / removeFrom (week, staffId, blockId, day) -> Week   (pure helpers,
//     also used by absorption to build hypothetical weeks)
//   effectiveSlots(week)                   -> slots minus called-out staff
//   isCalledOut(week, staffId, day)        -> boolean
//   staffDayBlocks(week, staffId, day)     -> blockId[] (effective)
//   staffWeekHours(week, staffId)          -> number    (effective)
import { BLOCKS, DAYS, blockById } from './catalog'

/**
 * @typedef {Object} StaffMember
 * @property {string} id
 * @property {string} name
 * @property {'DVM' | 'Tech' | 'Assistant' | 'CSR' | 'Kennel'} role
 * @property {string[]} credentials  e.g. ['DVM'] or ['LVT', 'LVT-A'] or []
 * @property {boolean} [float]       Part-time/relief pool
 */

/**
 * @typedef {Object} RuleInstance
 * @property {string} id
 * @property {string} type       A key of RULE_TEMPLATES (rules.js)
 * @property {'hard' | 'soft'} severity
 * @property {Record<string, any>} params
 * @property {string} rationale  The rule in Dana's words — shown in the rail
 * @property {number} [weight]   Soft rules only
 */

/**
 * @typedef {Object} Week
 * @property {Record<string, string[]>} slots  slotKey -> staffIds; every BLOCKS×DAYS key present
 * @property {{staffId: string, day: string}[]} callOuts  Simulated absences
 */

/** @typedef {{ week: Week, rulebook: RuleInstance[] }} ScheduleState */

/** @param {string} blockId @param {string} day */
export const slotKey = (blockId, day) => `${blockId}:${day}`

/** @param {Omit<StaffMember, 'id'>} fields @param {string} id @returns {StaffMember} */
export const makeStaff = (fields, id) => ({ id, ...fields })

/** @param {Record<string, string[]>} assignments @returns {Week} */
export const createWeek = (assignments = {}) => ({
  slots: Object.fromEntries(
    BLOCKS.flatMap((b) => DAYS.map((d) => [slotKey(b.id, d), assignments[slotKey(b.id, d)] ?? []])),
  ),
  callOuts: [],
})

/** @param {{assignments?: Record<string, string[]>, rulebook?: RuleInstance[]}} seed @returns {ScheduleState} */
export const createScheduleState = ({ assignments = {}, rulebook = [] } = {}) => ({
  week: createWeek(assignments),
  rulebook,
})

/** @param {Week} week @param {string} staffId @param {string} blockId @param {string} day @returns {Week} */
export const assignTo = (week, staffId, blockId, day) => {
  const key = slotKey(blockId, day)
  if (!(key in week.slots) || week.slots[key].includes(staffId)) return week
  return { ...week, slots: { ...week.slots, [key]: [...week.slots[key], staffId] } }
}

/** @param {Week} week @param {string} staffId @param {string} blockId @param {string} day @returns {Week} */
export const removeFrom = (week, staffId, blockId, day) => {
  const key = slotKey(blockId, day)
  if (!week.slots[key]?.includes(staffId)) return week
  return { ...week, slots: { ...week.slots, [key]: week.slots[key].filter((id) => id !== staffId) } }
}

/** @param {Week} week @param {string} staffId @param {string} day */
export const isCalledOut = (week, staffId, day) =>
  week.callOuts.some((c) => c.staffId === staffId && c.day === day)

/**
 * Slots with called-out staff removed — what the checker and vitals see.
 * The raw slots keep the assignment so a call-out is reversible.
 * @param {Week} week @returns {Record<string, string[]>}
 */
export function effectiveSlots(week) {
  if (week.callOuts.length === 0) return week.slots
  const out = {}
  for (const [key, ids] of Object.entries(week.slots)) {
    const day = key.split(':')[1]
    out[key] = ids.filter((id) => !isCalledOut(week, id, day))
  }
  return out
}

/** @param {Week} week @param {string} staffId @param {string} day @returns {string[]} */
export const staffDayBlocks = (week, staffId, day) => {
  const eff = effectiveSlots(week)
  return BLOCKS.filter((b) => eff[slotKey(b.id, day)].includes(staffId)).map((b) => b.id)
}

/** @param {Week} week @param {string} staffId @returns {number} */
export const staffWeekHours = (week, staffId) => {
  const eff = effectiveSlots(week)
  let hours = 0
  for (const [key, ids] of Object.entries(eff)) {
    if (ids.includes(staffId)) hours += blockById(key.split(':')[0]).hours
  }
  return hours
}

/**
 * @param {ScheduleState} state
 * @param {{ type: string } & Record<string, any>} action
 * @returns {ScheduleState}
 */
export function scheduleReducer(state, action) {
  switch (action.type) {
    case 'assigned': {
      const week = assignTo(state.week, action.staffId, action.blockId, action.day)
      return week === state.week ? state : { ...state, week }
    }

    case 'unassigned': {
      const week = removeFrom(state.week, action.staffId, action.blockId, action.day)
      return week === state.week ? state : { ...state, week }
    }

    case 'moved': {
      const from = removeFrom(state.week, action.staffId, action.fromBlockId, action.fromDay)
      if (from === state.week) return state
      const week = assignTo(from, action.staffId, action.blockId, action.day)
      // Dropping back onto the origin slot (from === removed, assign refused
      // as duplicate-free re-add) still lands: assignTo re-adds cleanly.
      return { ...state, week }
    }

    case 'call-out-toggled': {
      const on = isCalledOut(state.week, action.staffId, action.day)
      return {
        ...state,
        week: {
          ...state.week,
          callOuts: on
            ? state.week.callOuts.filter((c) => !(c.staffId === action.staffId && c.day === action.day))
            : [...state.week.callOuts, { staffId: action.staffId, day: action.day }],
        },
      }
    }

    case 'rule-updated':
      return {
        ...state,
        rulebook: state.rulebook.map((r) =>
          r.id === action.ruleId ? { ...r, params: { ...r.params, ...action.params } } : r,
        ),
      }

    case 'reset':
      return action.state

    default:
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scheduling`
Expected: PASS (8 tests). Also run `npx vitest run` — patient-flow's 13 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/domain/catalog.js src/scheduling/domain/schedule.js src/scheduling/domain/schedule.test.js
git commit -m "feat(scheduling): domain catalog and week state machine"
```

---

### Task 2: Rule templates + evaluateWeek

**Files:**
- Create: `src/scheduling/domain/rules.js`
- Test: `src/scheduling/domain/rules.test.js`

**Interfaces:**
- Consumes: `catalog.js` (`DAYS`, `CLOSING_BLOCKS`, `OPENING_BLOCKS`), `schedule.js` (`slotKey`, `effectiveSlots`, `staffWeekHours`, `staffDayBlocks`).
- Produces:
  - `RULE_TEMPLATES: Record<type, { label, defaultSeverity, paramFields, evaluate(rule, ctx) }>` — the 8 types: `'min-role-coverage' | 'min-credential-coverage' | 'max-weekly-hours' | 'min-rest-gap' | 'hard-unavailability' | 'keep-apart' | 'prefer-pairing' | 'fair-rotation'`. `paramFields` drives the Task 7 editor: `{ name, label, kind: 'block' | 'role' | 'credential' | 'count' | 'days' | 'staff' }[]`.
  - `makeRule({id, type, severity?, params, rationale, weight?}) -> RuleInstance`
  - `evaluateWeek(week, rulebook, staffById) -> Violation[]` where `Violation = { ruleId, type, severity, message, slotKeys: string[], staffIds: string[] }`
  - `violationsBySlot(violations) -> Record<slotKey, 'hard' | 'soft'>` (hard wins)
- `ctx` passed to `evaluate` is `{ eff, week, staffById }` with `eff = effectiveSlots(week)`.

- [ ] **Step 1: Write the failing test**

`src/scheduling/domain/rules.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import { evaluateWeek, makeRule, violationsBySlot } from './rules'

const STAFF = [
  makeStaff({ name: 'Dr. Okafor', role: 'DVM', credentials: ['DVM'] }, 'okafor'),
  makeStaff({ name: 'Rosa Delgado', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'rosa'),
  makeStaff({ name: 'Marisol Vega', role: 'Tech', credentials: ['LVT'] }, 'marisol'),
  makeStaff({ name: 'Jenna Kowalski', role: 'Tech', credentials: ['LVT'] }, 'jenna'),
  makeStaff({ name: 'Mabel Ortiz', role: 'CSR', credentials: [] }, 'mabel'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))

const week = (assignments) => createWeek(assignments)
const run = (assignments, rule) => evaluateWeek(week(assignments), [rule], staffById)

describe('rule templates', () => {
  it('min-role-coverage flags each short day, at the seam', () => {
    const rule = makeRule({
      id: 'r1', type: 'min-role-coverage', severity: 'hard',
      params: { blockId: 'surgery', role: 'DVM', count: 1, days: ['Mon', 'Tue'] },
      rationale: 'Surgery never runs without a doctor.',
    })
    const out = run({ [slotKey('surgery', 'Mon')]: ['okafor'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ ruleId: 'r1', severity: 'hard', slotKeys: [slotKey('surgery', 'Tue')] })
    expect(run({ [slotKey('surgery', 'Mon')]: ['okafor'], [slotKey('surgery', 'Tue')]: ['okafor'] }, rule)).toEqual([])
  })

  it('min-credential-coverage counts credentials, not roles', () => {
    const rule = makeRule({
      id: 'r2', type: 'min-credential-coverage', severity: 'hard',
      params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: ['Mon'] },
      rationale: 'Anesthesia needs its own hands.',
    })
    expect(run({ [slotKey('surgery', 'Mon')]: ['marisol', 'jenna'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('surgery', 'Mon')]: ['rosa'] }, rule)).toEqual([])
  })

  it('max-weekly-hours flags any staff over the cap', () => {
    const rule = makeRule({
      id: 'r3', type: 'max-weekly-hours', severity: 'hard',
      params: { maxHours: 9 }, rationale: 'Nobody burns out on my watch.',
    })
    const heavy = {
      [slotKey('appts-am', 'Mon')]: ['rosa'], [slotKey('appts-pm', 'Mon')]: ['rosa'],
      [slotKey('appts-am', 'Tue')]: ['rosa'],
    } // 4 + 5 + 4 = 13h
    const out = run(heavy, rule)
    expect(out).toHaveLength(1)
    expect(out[0].staffIds).toEqual(['rosa'])
    expect(run({ [slotKey('appts-am', 'Mon')]: ['rosa'] }, rule)).toEqual([])
  })

  it('min-rest-gap flags closing then opening the next day', () => {
    const rule = makeRule({
      id: 'r4', type: 'min-rest-gap', severity: 'hard',
      params: {}, rationale: 'Close-then-open is how mistakes happen.',
    })
    const out = run({ [slotKey('kennel-pm', 'Tue')]: ['marisol'], [slotKey('kennel-am', 'Wed')]: ['marisol'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0].slotKeys).toEqual([slotKey('kennel-pm', 'Tue'), slotKey('kennel-am', 'Wed')])
    expect(run({ [slotKey('kennel-pm', 'Tue')]: ['marisol'], [slotKey('kennel-am', 'Thu')]: ['marisol'] }, rule)).toEqual([])
  })

  it('hard-unavailability flags any assignment on a protected day', () => {
    const rule = makeRule({
      id: 'r5', type: 'hard-unavailability', severity: 'hard',
      params: { staffId: 'rosa', days: ['Thu'] }, rationale: 'Rosa has clinicals Thursdays.',
    })
    expect(run({ [slotKey('midday', 'Thu')]: ['rosa'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('midday', 'Fri')]: ['rosa'] }, rule)).toEqual([])
  })

  it('keep-apart flags the pair sharing the target block', () => {
    const rule = makeRule({
      id: 'r6', type: 'keep-apart', severity: 'hard',
      params: { staffIdA: 'marisol', staffIdB: 'jenna', blockId: 'kennel-pm' },
      rationale: 'My two seniors never close together.',
    })
    expect(run({ [slotKey('kennel-pm', 'Fri')]: ['marisol', 'jenna'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('kennel-pm', 'Fri')]: ['marisol'], [slotKey('kennel-pm', 'Sat')]: ['jenna'] }, rule)).toEqual([])
  })

  it('prefer-pairing (soft) flags A scheduled without B', () => {
    const rule = makeRule({
      id: 'r7', type: 'prefer-pairing', severity: 'soft', weight: 2,
      params: { staffIdA: 'jenna', staffIdB: 'okafor', blockId: 'surgery' },
      rationale: "Jenna's training on dentals — keep her with Dr. Okafor.",
    })
    const out = run({ [slotKey('surgery', 'Mon')]: ['jenna'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0].severity).toBe('soft')
    expect(run({ [slotKey('surgery', 'Mon')]: ['jenna', 'okafor'] }, rule)).toEqual([])
  })

  it('fair-rotation (soft) flags weekend spread beyond the cap', () => {
    const rule = makeRule({
      id: 'r8', type: 'fair-rotation', severity: 'soft', weight: 1,
      params: { days: ['Sat', 'Sun'], role: 'Tech', maxSpread: 1 },
      rationale: 'Weekends get shared, or resentment does.',
    })
    const skewed = {
      [slotKey('appts-am', 'Sat')]: ['rosa'], [slotKey('appts-pm', 'Sat')]: ['rosa'],
      [slotKey('appts-am', 'Sun')]: ['rosa'],
    } // rosa 3 weekend slots, marisol/jenna 0 -> spread 3
    expect(run(skewed, rule)).toHaveLength(1)
    expect(run({ [slotKey('appts-am', 'Sat')]: ['rosa'], [slotKey('appts-pm', 'Sat')]: ['marisol'], [slotKey('appts-am', 'Sun')]: ['jenna'] }, rule)).toEqual([])
  })
})

describe('evaluateWeek plumbing', () => {
  it('skips unknown rule types and maps worst severity per slot', () => {
    const v = evaluateWeek(week({}), [makeRule({ id: 'x', type: 'not-a-rule', severity: 'hard', params: {}, rationale: '' })], staffById)
    expect(v).toEqual([])
    const map = violationsBySlot([
      { ruleId: 'a', type: 't', severity: 'soft', message: '', slotKeys: ['surgery:Sat'], staffIds: [] },
      { ruleId: 'b', type: 't', severity: 'hard', message: '', slotKeys: ['surgery:Sat'], staffIds: [] },
    ])
    expect(map['surgery:Sat']).toBe('hard')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scheduling`
Expected: FAIL — cannot resolve `./rules`.

- [ ] **Step 3: Write the implementation**

`src/scheduling/domain/rules.js`:

```js
// The rulebook engine — Dana's externalized judgment. Pure module.
//
// Eight parameterized rule TEMPLATES; the rulebook is INSTANCES of them
// (RuleInstance in schedule.js). Each template is a pure predicate over the
// effective week returning violations that trace back to their rule, so every
// flag the UI shows can answer "which rule says so, in whose words".
//
// Interface:
//   RULE_TEMPLATES                          type -> { label, defaultSeverity, paramFields, evaluate }
//   makeRule(fields)                        -> RuleInstance (severity defaults from template)
//   evaluateWeek(week, rulebook, staffById) -> Violation[]
//   violationsBySlot(violations)            -> slotKey -> 'hard' | 'soft'  (hard wins)
//
// Violation: { ruleId, type, severity, message, slotKeys, staffIds }.
// Week-scoped violations (hours, fairness) have slotKeys: [] and surface in
// the rail/vitals, not as grid seams.
import { CLOSING_BLOCKS, DAYS, OPENING_BLOCKS, blockById } from './catalog'
import { effectiveSlots, slotKey, staffWeekHours } from './schedule'

const violation = (rule, message, slotKeys = [], staffIds = []) => ({
  ruleId: rule.id,
  type: rule.type,
  severity: rule.severity,
  message,
  slotKeys,
  staffIds,
})

const nameOf = (staffById, id) => staffById[id]?.name ?? id

export const RULE_TEMPLATES = {
  'min-role-coverage': {
    label: 'Minimum staffing',
    defaultSeverity: 'hard',
    paramFields: [
      { name: 'blockId', label: 'Block', kind: 'block' },
      { name: 'role', label: 'Role', kind: 'role' },
      { name: 'count', label: 'At least', kind: 'count' },
      { name: 'days', label: 'On days', kind: 'days' },
    ],
    evaluate(rule, ctx) {
      const { blockId, role, count, days = DAYS } = rule.params
      const out = []
      for (const day of days) {
        const key = slotKey(blockId, day)
        const have = (ctx.eff[key] ?? []).filter((id) => ctx.staffById[id]?.role === role).length
        if (have < count)
          out.push(violation(rule, `${blockById(blockId).label} ${day} has ${have} ${role} on — needs ${count}.`, [key]))
      }
      return out
    },
  },

  'min-credential-coverage': {
    label: 'Credential minimum',
    defaultSeverity: 'hard',
    paramFields: [
      { name: 'blockId', label: 'Block', kind: 'block' },
      { name: 'credential', label: 'Credential', kind: 'credential' },
      { name: 'count', label: 'At least', kind: 'count' },
      { name: 'days', label: 'On days', kind: 'days' },
    ],
    evaluate(rule, ctx) {
      const { blockId, credential, count, days = DAYS } = rule.params
      const out = []
      for (const day of days) {
        const key = slotKey(blockId, day)
        const have = (ctx.eff[key] ?? []).filter((id) => ctx.staffById[id]?.credentials.includes(credential)).length
        if (have < count)
          out.push(violation(rule, `${blockById(blockId).label} ${day} has ${have} ${credential} on — needs ${count}.`, [key]))
      }
      return out
    },
  },

  'max-weekly-hours': {
    label: 'Weekly hours cap',
    defaultSeverity: 'hard',
    paramFields: [{ name: 'maxHours', label: 'Max hours/week', kind: 'count' }],
    evaluate(rule, ctx) {
      const out = []
      for (const id of Object.keys(ctx.staffById)) {
        const hours = staffWeekHours(ctx.week, id)
        if (hours > rule.params.maxHours)
          out.push(violation(rule, `${nameOf(ctx.staffById, id)} is at ${hours}h — cap is ${rule.params.maxHours}h.`, [], [id]))
      }
      return out
    },
  },

  'min-rest-gap': {
    label: 'No close-then-open',
    defaultSeverity: 'hard',
    paramFields: [],
    evaluate(rule, ctx) {
      const out = []
      for (const id of Object.keys(ctx.staffById)) {
        for (let i = 0; i < DAYS.length - 1; i++) {
          const closes = CLOSING_BLOCKS.find((b) => ctx.eff[slotKey(b, DAYS[i])]?.includes(id))
          const opens = OPENING_BLOCKS.find((b) => ctx.eff[slotKey(b, DAYS[i + 1])]?.includes(id))
          if (closes && opens)
            out.push(
              violation(
                rule,
                `${nameOf(ctx.staffById, id)} closes ${DAYS[i]} and opens ${DAYS[i + 1]} — that's not enough rest.`,
                [slotKey(closes, DAYS[i]), slotKey(opens, DAYS[i + 1])],
                [id],
              ),
            )
        }
      }
      return out
    },
  },

  'hard-unavailability': {
    label: 'Unavailable',
    defaultSeverity: 'hard',
    paramFields: [
      { name: 'staffId', label: 'Staff', kind: 'staff' },
      { name: 'days', label: 'Days off', kind: 'days' },
    ],
    evaluate(rule, ctx) {
      const { staffId, days } = rule.params
      const out = []
      for (const day of days) {
        const keys = Object.keys(ctx.eff).filter((k) => k.endsWith(`:${day}`) && ctx.eff[k].includes(staffId))
        if (keys.length)
          out.push(violation(rule, `${nameOf(ctx.staffById, staffId)} is scheduled ${day} but is unavailable.`, keys, [staffId]))
      }
      return out
    },
  },

  'keep-apart': {
    label: 'Keep apart',
    defaultSeverity: 'hard',
    paramFields: [
      { name: 'staffIdA', label: 'Staff', kind: 'staff' },
      { name: 'staffIdB', label: 'Away from', kind: 'staff' },
      { name: 'blockId', label: 'On block', kind: 'block' },
    ],
    evaluate(rule, ctx) {
      const { staffIdA, staffIdB, blockId } = rule.params
      const out = []
      for (const day of DAYS) {
        const ids = ctx.eff[slotKey(blockId, day)] ?? []
        if (ids.includes(staffIdA) && ids.includes(staffIdB))
          out.push(
            violation(
              rule,
              `${nameOf(ctx.staffById, staffIdA)} and ${nameOf(ctx.staffById, staffIdB)} are both on ${blockById(blockId).label} ${day}.`,
              [slotKey(blockId, day)],
              [staffIdA, staffIdB],
            ),
          )
      }
      return out
    },
  },

  'prefer-pairing': {
    label: 'Pair for training',
    defaultSeverity: 'soft',
    paramFields: [
      { name: 'staffIdA', label: 'Trainee', kind: 'staff' },
      { name: 'staffIdB', label: 'With', kind: 'staff' },
      { name: 'blockId', label: 'On block', kind: 'block' },
    ],
    evaluate(rule, ctx) {
      const { staffIdA, staffIdB, blockId } = rule.params
      const out = []
      for (const day of DAYS) {
        const ids = ctx.eff[slotKey(blockId, day)] ?? []
        if (ids.includes(staffIdA) && !ids.includes(staffIdB))
          out.push(
            violation(
              rule,
              `${nameOf(ctx.staffById, staffIdA)} is on ${blockById(blockId).label} ${day} without ${nameOf(ctx.staffById, staffIdB)}.`,
              [slotKey(blockId, day)],
              [staffIdA],
            ),
          )
      }
      return out
    },
  },

  'fair-rotation': {
    label: 'Fair rotation',
    defaultSeverity: 'soft',
    paramFields: [
      { name: 'role', label: 'Role', kind: 'role' },
      { name: 'days', label: 'Over days', kind: 'days' },
      { name: 'maxSpread', label: 'Max spread', kind: 'count' },
    ],
    evaluate(rule, ctx) {
      const { role, days, maxSpread } = rule.params
      const pool = Object.values(ctx.staffById).filter((s) => s.role === role && !s.float)
      if (pool.length === 0) return []
      const counts = new Map(pool.map((s) => [s.id, 0]))
      for (const day of days) {
        for (const key of Object.keys(ctx.eff)) {
          if (!key.endsWith(`:${day}`)) continue
          for (const id of ctx.eff[key]) if (counts.has(id)) counts.set(id, counts.get(id) + 1)
        }
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
      const [maxId, max] = sorted[0]
      const [minId, min] = sorted[sorted.length - 1]
      if (max - min > maxSpread)
        return [
          violation(
            rule,
            `${nameOf(ctx.staffById, maxId)} has ${max} ${days.join('/')} shifts while ${nameOf(ctx.staffById, minId)} has ${min} — spread the weekends out.`,
            [],
            [maxId, minId],
          ),
        ]
      return []
    },
  },
}

/**
 * @param {Omit<import('./schedule').RuleInstance, 'severity'> & { severity?: 'hard' | 'soft' }} fields
 * @returns {import('./schedule').RuleInstance}
 */
export const makeRule = (fields) => ({
  severity: RULE_TEMPLATES[fields.type]?.defaultSeverity ?? 'hard',
  ...fields,
})

/**
 * @param {import('./schedule').Week} week
 * @param {import('./schedule').RuleInstance[]} rulebook
 * @param {Record<string, import('./schedule').StaffMember>} staffById
 * @returns {{ruleId: string, type: string, severity: 'hard' | 'soft', message: string, slotKeys: string[], staffIds: string[]}[]}
 */
export function evaluateWeek(week, rulebook, staffById) {
  const ctx = { eff: effectiveSlots(week), week, staffById }
  return rulebook.flatMap((rule) => RULE_TEMPLATES[rule.type]?.evaluate(rule, ctx) ?? [])
}

/** @param {ReturnType<typeof evaluateWeek>} violations @returns {Record<string, 'hard' | 'soft'>} */
export function violationsBySlot(violations) {
  const map = {}
  for (const v of violations)
    for (const key of v.slotKeys) if (map[key] !== 'hard') map[key] = v.severity
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scheduling`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/domain/rules.js src/scheduling/domain/rules.test.js
git commit -m "feat(scheduling): eight rule templates and week evaluation"
```

---

### Task 3: Absorption — back-fill candidates + score

**Files:**
- Create: `src/scheduling/domain/absorption.js`
- Test: `src/scheduling/domain/absorption.test.js`

**Interfaces:**
- Consumes: `catalog.js` (`blockById`, `blocksOverlap`), `schedule.js` (`assignTo`, `removeFrom`, `effectiveSlots`, `isCalledOut`, `staffDayBlocks`, `slotKey`), `rules.js` (`evaluateWeek`).
- Produces:
  - `backfillCandidates(week, rulebook, staffById, blockId, day, absentId) -> string[]`
  - `absorption(week, rulebook, staffById) -> { perAssignment: Record<`${slotKey}:${staffId}`, {absorbable: boolean, candidates: string[]}>, absorbable: number, total: number }`
- Semantics (spec-locked): single call-out at a time, no cascade re-check. A candidate qualifies when they are not the absentee, not already in the slot, not called out that day, have no time-overlapping assignment that day, and substituting them yields **no more hard violations than the original untouched week** (so pre-existing violations don't disqualify, and a substitute that leaves a credential gap open does).

- [ ] **Step 1: Write the failing test**

`src/scheduling/domain/absorption.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import { makeRule } from './rules'
import { absorption, backfillCandidates } from './absorption'

const STAFF = [
  makeStaff({ name: 'Rosa Delgado', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'rosa'),
  makeStaff({ name: 'Imani Cole', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'imani'),
  makeStaff({ name: 'Priya Sharma', role: 'Tech', credentials: ['LVT'] }, 'priya'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))
const RULE = makeRule({
  id: 'r-anesthesia', type: 'min-credential-coverage', severity: 'hard',
  params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: ['Thu'] },
  rationale: 'Anesthesia needs its own hands.',
})

describe('backfillCandidates', () => {
  it('offers a free, qualified substitute', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'] })
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual(['imani'])
  })

  it('rejects substitutes whose day has a time overlap', () => {
    const week = createWeek({
      [slotKey('surgery', 'Thu')]: ['rosa'],
      [slotKey('appts-am', 'Thu')]: ['imani'], // 8–12 overlaps surgery 9–14
    })
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual([])
  })

  it('rejects substitutes that would leave a new hard violation open', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'], [slotKey('kennel-pm', 'Thu')]: ['imani'] })
    // imani free at surgery time? kennel-pm 17–20 does NOT overlap surgery 9–14,
    // so imani qualifies; priya (plain LVT) must not — subbing priya leaves the
    // LVT-A minimum broken, a hard violation the original week didn't have.
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual(['imani'])
  })

  it('rejects called-out substitutes', () => {
    const week = { ...createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'] }), callOuts: [{ staffId: 'imani', day: 'Thu' }] }
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual([])
  })
})

describe('absorption', () => {
  it('scores every effective assignment', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'], [slotKey('midday', 'Mon')]: ['priya'] })
    const result = absorption(week, [RULE], staffById)
    expect(result.total).toBe(2)
    expect(result.perAssignment[`${slotKey('surgery', 'Thu')}:rosa`].absorbable).toBe(true)
    expect(result.perAssignment[`${slotKey('midday', 'Mon')}:priya`].candidates).toContain('rosa')
    expect(result.absorbable).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scheduling`
Expected: FAIL — cannot resolve `./absorption`.

- [ ] **Step 3: Write the implementation**

`src/scheduling/domain/absorption.js`:

```js
// Robustness scoring — "design for the call-out, not the ideal week".
// Pure module.
//
// For each effective assignment, simulate that person calling out and search
// for a substitute. Candidate filter: not the absentee, not already in the
// slot, not called out that day, no time-overlapping assignment that day, and
// substituting yields NO MORE hard violations than the original week had —
// pre-existing violations don't disqualify a slot, but a substitute that
// leaves a fresh gap (e.g. a plain LVT covering the anesthesia seat) does.
//
// Stated limitation (spec): single call-out at a time, no cascade re-check of
// the substitute's own week. The score is not a worst-case-k guarantee.
import { blockById, blocksOverlap } from './catalog'
import { assignTo, effectiveSlots, isCalledOut, removeFrom, slotKey, staffDayBlocks } from './schedule'
import { evaluateWeek } from './rules'

const countHard = (violations) => violations.filter((v) => v.severity === 'hard').length

/**
 * @param {import('./schedule').Week} week
 * @param {import('./schedule').RuleInstance[]} rulebook
 * @param {Record<string, import('./schedule').StaffMember>} staffById
 * @param {string} blockId @param {string} day @param {string} absentId
 * @returns {string[]} staff ids that could cover this assignment
 */
export function backfillCandidates(week, rulebook, staffById, blockId, day, absentId) {
  const baseline = countHard(evaluateWeek(week, rulebook, staffById))
  const vacated = removeFrom(week, absentId, blockId, day)
  const target = blockById(blockId)
  const slotIds = effectiveSlots(week)[slotKey(blockId, day)]

  return Object.keys(staffById).filter((id) => {
    if (id === absentId || slotIds.includes(id) || isCalledOut(week, id, day)) return false
    const busy = staffDayBlocks(vacated, id, day)
    if (busy.some((b) => blocksOverlap(blockById(b), target))) return false
    const withSub = assignTo(vacated, id, blockId, day)
    return countHard(evaluateWeek(withSub, rulebook, staffById)) <= baseline
  })
}

/**
 * @param {import('./schedule').Week} week
 * @param {import('./schedule').RuleInstance[]} rulebook
 * @param {Record<string, import('./schedule').StaffMember>} staffById
 * @returns {{perAssignment: Record<string, {absorbable: boolean, candidates: string[]}>, absorbable: number, total: number}}
 */
export function absorption(week, rulebook, staffById) {
  const perAssignment = {}
  let absorbable = 0
  let total = 0
  const eff = effectiveSlots(week)
  for (const [key, ids] of Object.entries(eff)) {
    const [blockId, day] = key.split(':')
    for (const staffId of ids) {
      const candidates = backfillCandidates(week, rulebook, staffById, blockId, day, staffId)
      perAssignment[`${key}:${staffId}`] = { absorbable: candidates.length > 0, candidates }
      total += 1
      if (candidates.length > 0) absorbable += 1
    }
  }
  return { perAssignment, absorbable, total }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scheduling`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/domain/absorption.js src/scheduling/domain/absorption.test.js
git commit -m "feat(scheduling): call-out absorption scoring with back-fill candidates"
```

---

### Task 4: Fictional clinic data + planted-defect regression test

**Files:**
- Create: `src/scheduling/data/clinic.js`
- Test: `src/scheduling/data/clinic.test.js`

**Interfaces:**
- Consumes: `schedule.js` (`makeStaff`, `createScheduleState`, `slotKey`), `rules.js` (`makeRule`).
- Produces:
  - `STAFF: StaffMember[]` (58), `STAFF_BY_ID: Record<string, StaffMember>`
  - `RULEBOOK: RuleInstance[]` (Dana's 11 rule instances)
  - `WEEK_ASSIGNMENTS: Record<string, string[]>`
  - `DEMAND: Record<string, number>` (day -> 0–100 load) and `DEMAND_NOTES: Record<string, string>`
  - `createSeededState() -> ScheduleState`
- **Planted defects (the regression contract):** exactly two hard violations (Sat surgery has 1 LVT, needs 2; Marisol closes Tue → opens Wed), exactly one soft violation (weekend Tech spread), Rosa's Thu surgery assignment **non-absorbable**, Dr. Okafor's Thu surgery assignment absorbable with `tran` among candidates. No other violations. If the test surfaces extras, **fix the data, not the rules or the domain**.

- [ ] **Step 1: Write the failing test**

`src/scheduling/data/clinic.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { slotKey } from '../domain/schedule'
import { evaluateWeek } from '../domain/rules'
import { absorption } from '../domain/absorption'
import { RULEBOOK, STAFF, STAFF_BY_ID, createSeededState } from './clinic'

const state = createSeededState()
const violations = evaluateWeek(state.week, state.rulebook, STAFF_BY_ID)

describe('the fictional clinic', () => {
  it('has 58 staff in the designed role mix', () => {
    expect(STAFF).toHaveLength(58)
    const count = (fn) => STAFF.filter(fn).length
    expect(count((s) => s.role === 'DVM' && !s.float)).toBe(8)
    expect(count((s) => s.role === 'Tech' && !s.float)).toBe(14)
    expect(count((s) => s.credentials.includes('LVT-A') && !s.float)).toBe(5)
    expect(count((s) => s.role === 'Assistant' && !s.float)).toBe(12)
    expect(count((s) => s.role === 'CSR' && !s.float)).toBe(9)
    expect(count((s) => s.role === 'Kennel' && !s.float)).toBe(6)
    expect(count((s) => s.float)).toBe(9)
  })

  it('rulebook rules all reference real staff and templates', () => {
    for (const rule of RULEBOOK) {
      for (const key of ['staffId', 'staffIdA', 'staffIdB'])
        if (rule.params[key]) expect(STAFF_BY_ID[rule.params[key]], `${rule.id}.${key}`).toBeDefined()
      expect(rule.rationale.length).toBeGreaterThan(0)
    }
  })
})

describe('planted defects — the demo script regression', () => {
  it('yields exactly the two planted hard violations', () => {
    const hard = violations.filter((v) => v.severity === 'hard')
    expect(hard.map((v) => ({ ruleId: v.ruleId, slotKeys: v.slotKeys }))).toEqual([
      { ruleId: 'r-surgery-techs', slotKeys: [slotKey('surgery', 'Sat')] },
      { ruleId: 'r-rest', slotKeys: [slotKey('kennel-pm', 'Tue'), slotKey('kennel-am', 'Wed')] },
    ])
    expect(hard[1].staffIds).toEqual(['marisol'])
  })

  it('yields exactly the planted weekend-fairness soft violation', () => {
    const soft = violations.filter((v) => v.severity === 'soft')
    expect(soft).toHaveLength(1)
    expect(soft[0].ruleId).toBe('r-fair-weekend')
  })

  it("Rosa's Thu surgery seat is the thin spot — non-absorbable", () => {
    const result = absorption(state.week, state.rulebook, STAFF_BY_ID)
    expect(result.perAssignment[`${slotKey('surgery', 'Thu')}:rosa`].absorbable).toBe(false)
    const okafor = result.perAssignment[`${slotKey('surgery', 'Thu')}:okafor`]
    expect(okafor.absorbable).toBe(true)
    expect(okafor.candidates).toContain('tran')
  })

  it('tightening the anesthesia rule to 2 cascades new violations (demo beat 4)', () => {
    const tightened = state.rulebook.map((r) =>
      r.id === 'r-surgery-anesthesia' ? { ...r, params: { ...r.params, count: 2 } } : r,
    )
    const after = evaluateWeek(state.week, tightened, STAFF_BY_ID)
    expect(after.filter((v) => v.ruleId === 'r-surgery-anesthesia').length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/scheduling`
Expected: FAIL — cannot resolve `./clinic`.

- [ ] **Step 3: Write the data**

`src/scheduling/data/clinic.js` — complete file. The week literal was hand-checked against the rulebook; the regression test is the enforcement. **If extra violations appear, adjust assignments, never the domain.**

```js
// The fictional clinic — West Coast Animal Hospital as the demo imagines it.
// EVERYTHING in this file is invented (spec: fictitious-but-plausible).
// Dana Whitfield, practice manager of 11 years, is the scheduler whose
// judgment the rulebook externalizes; rationales are in her voice.
//
// PLANTED DEFECTS (the demo finds what we planted — clinic.test.js locks them):
//   hard: Sat surgery has 1 LVT (rule wants 2)
//   hard: Marisol closes Tue (kennel-pm) then opens Wed (kennel-am)
//   soft: weekend Tech spread (Hector 2, several 0)
//   thin: Rosa's Thu surgery seat has NO back-fill (every other LVT-A is
//         unavailable, overlapping, or would leave the anesthesia seat open)
import { createScheduleState, makeStaff, slotKey } from '../domain/schedule'
import { makeRule } from '../domain/rules'

const s = (id, name, role, credentials = [], float = false) =>
  makeStaff({ name, role, credentials, float }, id)

export const STAFF = [
  // DVMs (8)
  s('gibbings', 'Dr. Gibbings', 'DVM', ['DVM']),
  s('okafor', 'Dr. Okafor', 'DVM', ['DVM']),
  s('reyes', 'Dr. Reyes', 'DVM', ['DVM']),
  s('calloway', 'Dr. Calloway', 'DVM', ['DVM']),
  s('nassar', 'Dr. Nassar', 'DVM', ['DVM']),
  s('ito', 'Dr. Ito', 'DVM', ['DVM']),
  s('brennan', 'Dr. Brennan', 'DVM', ['DVM']),
  s('whitaker', 'Dr. Whitaker', 'DVM', ['DVM']),
  // Techs (14; 5 anesthesia-certified)
  s('rosa', 'Rosa Delgado', 'Tech', ['LVT', 'LVT-A']),
  s('imani', 'Imani Cole', 'Tech', ['LVT', 'LVT-A']),
  s('chen', 'Chen Wei', 'Tech', ['LVT', 'LVT-A']),
  s('noor', 'Noor Haddad', 'Tech', ['LVT', 'LVT-A']),
  s('sana', 'Sana Qureshi', 'Tech', ['LVT', 'LVT-A']),
  s('marisol', 'Marisol Vega', 'Tech', ['LVT']),
  s('jenna', 'Jenna Kowalski', 'Tech', ['LVT']),
  s('tasha', 'Tasha Brooks', 'Tech', ['LVT']),
  s('oliver', 'Oliver Finch', 'Tech', ['LVT']),
  s('quinn', 'Quinn Marsh', 'Tech', ['LVT']),
  s('hector', 'Hector Ruiz', 'Tech', ['LVT']),
  s('bree', 'Bree Tanaka', 'Tech', ['LVT']),
  s('sam', 'Sam Whitlock', 'Tech', ['LVT']),
  s('priya', 'Priya Sharma', 'Tech', ['LVT']),
  // Assistants (12)
  s('ava', 'Ava Chen', 'Assistant'), s('ben', 'Ben Palmer', 'Assistant'),
  s('carla', 'Carla Núñez', 'Assistant'), s('dev', 'Dev Patel', 'Assistant'),
  s('elle', 'Elle Bishop', 'Assistant'), s('finn', 'Finn Gallagher', 'Assistant'),
  s('gus', 'Gus Moreno', 'Assistant'), s('hana', 'Hana Sato', 'Assistant'),
  s('iris', 'Iris Kim', 'Assistant'), s('jo', 'Jo Okada', 'Assistant'),
  s('kai', 'Kai Rivera', 'Assistant'), s('luz', 'Luz Herrera', 'Assistant'),
  // CSRs (9)
  s('mabel', 'Mabel Ortiz', 'CSR'), s('nico', 'Nico Flores', 'CSR'),
  s('opal', 'Opal Jennings', 'CSR'), s('pete', 'Pete Sandoval', 'CSR'),
  s('rae', 'Rae Thompson', 'CSR'), s('sof', 'Sofía Marín', 'CSR'),
  s('tam', 'Tam Nguyen', 'CSR'), s('uma', 'Uma Iyer', 'CSR'),
  s('vic', 'Vic Romano', 'CSR'),
  // Kennel (6)
  s('wes', 'Wes Barlow', 'Kennel'), s('xio', 'Xio Deng', 'Kennel'),
  s('yara', 'Yara Aziz', 'Kennel'), s('zane', 'Zane Holt', 'Kennel'),
  s('abe', 'Abe Lindqvist', 'Kennel'), s('nell', 'Nell Foster', 'Kennel'),
  // Part-time / float pool (9)
  s('tran', 'Dr. Tran (relief)', 'DVM', ['DVM'], true),
  s('wren', 'Wren Castillo', 'Tech', ['LVT'], true),
  s('jules', 'Jules Beck', 'Assistant', [], true),
  s('kit', 'Kit Osei', 'Assistant', [], true),
  s('remy', 'Remy Laurent', 'Assistant', [], true),
  s('sol', 'Sol Dominguez', 'CSR', [], true),
  s('max', 'Max Egan', 'CSR', [], true),
  s('ash', 'Ash Varga', 'Kennel', [], true),
  s('bo', 'Bo Nakamura', 'Kennel', [], true),
]

export const STAFF_BY_ID = Object.fromEntries(STAFF.map((m) => [m.id, m]))

const WEEKDAYS_SAT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const RULEBOOK = [
  makeRule({
    id: 'r-surgery-dvm', type: 'min-role-coverage',
    params: { blockId: 'surgery', role: 'DVM', count: 1, days: WEEKDAYS_SAT },
    rationale: 'Surgery never runs without a doctor in the building. Ever.',
  }),
  makeRule({
    id: 'r-surgery-techs', type: 'min-credential-coverage',
    params: { blockId: 'surgery', credential: 'LVT', count: 2, days: WEEKDAYS_SAT },
    rationale: "Surgery can't run on one tech — someone preps while someone monitors.",
  }),
  makeRule({
    id: 'r-surgery-anesthesia', type: 'min-credential-coverage',
    params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: WEEKDAYS_SAT },
    rationale: 'Anesthesia needs its own hands. One certified tech, minimum, every cut day.',
  }),
  makeRule({
    id: 'r-kennel-open', type: 'min-role-coverage',
    params: { blockId: 'kennel-am', role: 'Kennel', count: 1 },
    rationale: 'Somebody is with the boarders by 6am, seven days a week. The dogs don\'t do weekends off.',
  }),
  makeRule({
    id: 'r-desk-open', type: 'min-role-coverage',
    params: { blockId: 'desk-open', role: 'CSR', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Two on the desk at open or the phones eat whoever is alone.',
  }),
  makeRule({
    id: 'r-desk-close', type: 'min-role-coverage',
    params: { blockId: 'desk-close', role: 'CSR', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Closing alone means cash-out plus pickups plus phones. Two, always.',
  }),
  makeRule({
    id: 'r-appts-dvm', type: 'min-role-coverage',
    params: { blockId: 'appts-am', role: 'DVM', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Mornings book double — one doctor on morning appointments is a two-hour wait by 10.',
  }),
  makeRule({
    id: 'r-hours', type: 'max-weekly-hours',
    params: { maxHours: 40 },
    rationale: 'Forty hours. I have watched overtime turn into resignation letters.',
  }),
  makeRule({
    id: 'r-rest', type: 'min-rest-gap',
    params: {},
    rationale: 'Nobody closes and then opens. Tired hands drop things that bite.',
  }),
  makeRule({
    id: 'r-unavail-imani', type: 'hard-unavailability',
    params: { staffId: 'imani', days: ['Thu'] },
    rationale: 'Imani has clinicals Thursdays through May. Not negotiable, I promised her.',
  }),
  makeRule({
    id: 'r-apart-seniors', type: 'keep-apart',
    params: { staffIdA: 'marisol', staffIdB: 'jenna', blockId: 'kennel-pm' },
    rationale: 'Marisol and Jenna are my two senior techs — they never close together. One of them opens the next day, rested.',
  }),
  makeRule({
    id: 'r-pair-priya', type: 'prefer-pairing', weight: 2,
    params: { staffIdA: 'priya', staffIdB: 'gibbings', blockId: 'surgery' },
    rationale: "Priya's training on dentals — put her on Dr. Gibbings' surgery days when you can.",
  }),
  makeRule({
    id: 'r-fair-weekend', type: 'fair-rotation', weight: 1,
    params: { days: ['Sat', 'Sun'], role: 'Tech', maxSpread: 1 },
    rationale: 'Weekends get shared, or resentment does. Nobody eats every Saturday.',
  }),
]

// The seeded week. Hand-authored, not generated, so every planted defect is
// visible in the data. Cross-checked against RULEBOOK; clinic.test.js locks it.
const A = (blockId, day, ids) => [slotKey(blockId, day), ids]

export const WEEK_ASSIGNMENTS = Object.fromEntries([
  // Kennel AM — r-kennel-open (all 7 days). Marisol Wed is the rest-gap plant.
  A('kennel-am', 'Mon', ['wes']), A('kennel-am', 'Tue', ['xio']),
  A('kennel-am', 'Wed', ['yara', 'marisol']), A('kennel-am', 'Thu', ['zane']),
  A('kennel-am', 'Fri', ['abe']), A('kennel-am', 'Sat', ['nell']),
  A('kennel-am', 'Sun', ['wes']),
  // Front Desk Open — 2 CSRs Mon–Sat, reduced Sunday.
  A('desk-open', 'Mon', ['mabel', 'nico']), A('desk-open', 'Tue', ['opal', 'pete']),
  A('desk-open', 'Wed', ['rae', 'sof']), A('desk-open', 'Thu', ['tam', 'uma']),
  A('desk-open', 'Fri', ['mabel', 'nico']), A('desk-open', 'Sat', ['opal', 'pete']),
  A('desk-open', 'Sun', ['vic']),
  // Morning Appts — 2 DVMs Mon–Sat + tech + assistant. Chen's Thu here blocks
  // her from covering Thu surgery (8–12 overlaps 9–14).
  A('appts-am', 'Mon', ['reyes', 'nassar', 'quinn', 'ava']),
  A('appts-am', 'Tue', ['nassar', 'whitaker', 'oliver', 'ben']),
  A('appts-am', 'Wed', ['calloway', 'brennan', 'quinn', 'carla']),
  A('appts-am', 'Thu', ['ito', 'whitaker', 'chen', 'dev']),
  A('appts-am', 'Fri', ['reyes', 'nassar', 'oliver', 'elle']),
  A('appts-am', 'Sat', ['okafor', 'ito', 'hector', 'finn']),
  A('appts-am', 'Sun', ['brennan', 'bree', 'gus']),
  // Surgery — DVM + 2 LVT (one LVT-A) + assistant, Mon–Sat.
  // PLANT: Sat runs with only Sana (LVT count 1 < 2). Sunday: no surgery.
  A('surgery', 'Mon', ['okafor', 'rosa', 'marisol', 'hana']),
  A('surgery', 'Tue', ['gibbings', 'chen', 'priya', 'iris']),
  A('surgery', 'Wed', ['reyes', 'noor', 'jenna', 'jo']),
  A('surgery', 'Thu', ['okafor', 'rosa', 'tasha', 'kai']),
  A('surgery', 'Fri', ['gibbings', 'chen', 'priya', 'luz']),
  A('surgery', 'Sat', ['calloway', 'sana']),
  A('surgery', 'Sun', []),
  // Midday Cover — lunch-relief exams and treatments. Noor's Thu here blocks
  // her from Thu surgery (11:30–14:30 overlaps 9–14).
  A('midday', 'Mon', ['imani', 'jo']), A('midday', 'Tue', ['tasha', 'kai']),
  A('midday', 'Wed', ['sana', 'luz']), A('midday', 'Thu', ['noor', 'hana']),
  A('midday', 'Fri', ['tasha', 'iris']), A('midday', 'Sat', ['bree', 'gus']),
  A('midday', 'Sun', []),
  // Afternoon Appts. Sana's Thu here blocks her from Thu surgery (13–18 overlaps 9–14).
  A('appts-pm', 'Mon', ['reyes', 'brennan', 'jenna', 'ben']),
  A('appts-pm', 'Tue', ['nassar', 'ito', 'bree', 'carla']),
  A('appts-pm', 'Wed', ['calloway', 'whitaker', 'oliver', 'dev']),
  A('appts-pm', 'Thu', ['ito', 'brennan', 'sana', 'elle']),
  A('appts-pm', 'Fri', ['reyes', 'brennan', 'jenna', 'finn']),
  A('appts-pm', 'Sat', ['okafor', 'ito', 'hector', 'ava']),
  A('appts-pm', 'Sun', []),
  // Front Desk Close — rota avoids close-then-open pairs (checked by hand).
  A('desk-close', 'Mon', ['rae', 'sof']), A('desk-close', 'Tue', ['tam', 'uma']),
  A('desk-close', 'Wed', ['mabel', 'nico']), A('desk-close', 'Thu', ['vic', 'opal']),
  A('desk-close', 'Fri', ['rae', 'sof']), A('desk-close', 'Sat', ['tam', 'uma']),
  A('desk-close', 'Sun', ['vic']),
  // Kennel PM — evening treatments get a tech alongside kennel staff.
  // The PM rota is deliberately offset from the AM rota so no kennel closer
  // opens the next morning (that would trip r-rest beyond the plant).
  // PLANT: Marisol Tue (closing) pairs with her Wed kennel-am (opening).
  A('kennel-pm', 'Mon', ['zane']), A('kennel-pm', 'Tue', ['abe', 'marisol']),
  A('kennel-pm', 'Wed', ['nell']), A('kennel-pm', 'Thu', ['xio']),
  A('kennel-pm', 'Fri', ['wes']), A('kennel-pm', 'Sat', ['yara']),
  A('kennel-pm', 'Sun', ['zane']),
])

// Mock PIMS demand — booked-appointment load per day, 0–100. The real epic
// pulls this from the practice-management system; the shape is what matters.
export const DEMAND = { Mon: 92, Tue: 78, Wed: 64, Thu: 85, Fri: 74, Sat: 96, Sun: 38 }
export const DEMAND_NOTES = {
  Mon: 'Weekend backlog — heaviest book of the week',
  Sat: 'Half-day hours, full-day chaos',
  Sun: 'Boarding pickups only',
}

/** @returns {import('../domain/schedule').ScheduleState} */
export const createSeededState = () =>
  createScheduleState({ assignments: WEEK_ASSIGNMENTS, rulebook: RULEBOOK })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/scheduling`
Expected: PASS. If `planted defects` tests fail with EXTRA violations, adjust `WEEK_ASSIGNMENTS` (e.g. a CSR accidentally closing then opening) until the exact-match assertions hold. Do not weaken tests or rules.

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/data/clinic.js src/scheduling/data/clinic.test.js
git commit -m "feat(scheduling): fictional clinic dataset with planted defects"
```

---

### Task 5: Glass tokens, staff chips, vitals/demand/bench panels

**Files:**
- Modify: `src/index.css` (additive `@theme` tokens + one utility block)
- Create: `src/scheduling/ui/chips.jsx`
- Create: `src/scheduling/ui/panels.jsx`

**Interfaces:**
- Consumes: `primitives.jsx` (`Badge`, `Button`, `Card`, `cn`), `engine.jsx` (`DragHandle`, `DropZone`), domain selectors, `DEMAND`/`DEMAND_NOTES`.
- Produces (Task 6/7 import these exact names and props):
  - `chips.jsx`: `StaffChip({ staff, tone, calledOut, hours, onClick, compact })` (`tone: 'hard' | 'soft' | null`), `ChipDragPreview({ staff })`, `CredBadge({ staff })`
  - `panels.jsx`: `VitalsBar({ stats, onSelectViolation })` where `stats = { filled, totalSlots, hard, soft, absorbable, total, violations }`; `DemandStrip({ })` (reads DEMAND directly); `Bench({ staff, weekHours, onChipClick })` — renders `DropZone id="bench"` and one `DragHandle id={'bench:' + s.id}` per member, grouped by role.

- [ ] **Step 1: Add glass tokens to `src/index.css`**

Append inside the existing `@theme` block (do not touch existing tokens):

```css
  --color-glass: rgb(255 255 255 / 0.55);
  --color-glass-strong: rgb(255 255 255 / 0.75);
  --color-glass-border: rgb(255 255 255 / 0.45);
```

Append after the `.animate-shake` rule:

```css
/* Slate Clinic with Glass — frosted chrome for the scheduling context.
   Glass is chrome, not content: grid cells stay opaque for legibility. */
.glass-panel {
  @apply bg-glass border-glass-border border shadow-sm backdrop-blur-md;
}
```

- [ ] **Step 2: Write `src/scheduling/ui/chips.jsx`** (complete file)

```jsx
// Staff chips — the draggable unit of the Coverage Board.
// Module-scope components only (repo rule).
import { CloudOff } from 'lucide-react'
import { Badge, cn } from '../../shared/ui/primitives'

const ROLE_BADGE = { DVM: 'primary', Tech: 'info', Assistant: 'neutral', CSR: 'warning', Kennel: 'success' }

export function CredBadge({ staff }) {
  const label = staff.credentials.includes('LVT-A')
    ? 'LVT-A'
    : staff.credentials[0] ?? staff.role
  return <Badge variant={ROLE_BADGE[staff.role]}>{label}</Badge>
}

const TONE_RING = {
  hard: 'ring-2 ring-red-400',
  soft: 'ring-2 ring-amber-300',
}

export function StaffChip({ staff, tone = null, calledOut = false, hours, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-grab items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-left shadow-sm',
        'transition-colors hover:border-primary',
        TONE_RING[tone],
        calledOut && 'opacity-40 line-through',
      )}
    >
      <span className={cn('truncate font-semibold', compact ? 'text-[11px]' : 'text-xs')}>
        {staff.name}
      </span>
      {calledOut && <CloudOff aria-label="Called out" className="h-3 w-3 shrink-0 text-red-500" />}
      {!compact && <span className="ml-auto flex items-center gap-1">
        {hours != null && <span className="text-[10px] text-slate-400">{hours}h</span>}
        <CredBadge staff={staff} />
      </span>}
    </button>
  )
}

export function ChipDragPreview({ staff }) {
  return (
    <div className="border-primary flex items-center gap-1.5 rounded-lg border-2 bg-white px-2 py-1 shadow-lg">
      <span className="text-xs font-semibold">{staff.name}</span>
      <CredBadge staff={staff} />
    </div>
  )
}
```

- [ ] **Step 3: Write `src/scheduling/ui/panels.jsx`** (complete file)

```jsx
// Coverage Board chrome: Week Vitals (glass), the demand strip, and the Bench.
import { Activity, AlertTriangle, ShieldCheck, Users } from 'lucide-react'
import { Badge, cn } from '../../shared/ui/primitives'
import { DragHandle, DropZone } from '../../shared/dnd/engine'
import { DAYS } from '../domain/catalog'
import { DEMAND, DEMAND_NOTES } from '../data/clinic'
import { StaffChip } from './chips'

function Vital({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4', tone ?? 'text-primary')} />
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-charcoal text-sm font-bold">{value}</span>
    </div>
  )
}

export function VitalsBar({ stats, onSelectViolation }) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-2.5">
      <h2 className="text-charcoal mr-2 text-sm font-bold">Week Vitals</h2>
      <Vital icon={Users} label="Coverage" value={`${stats.filled}/${stats.totalSlots} slots`} />
      <Vital
        icon={AlertTriangle}
        label="Hard violations"
        value={stats.hard}
        tone={stats.hard > 0 ? 'text-red-500' : 'text-success-text'}
      />
      <Vital
        icon={Activity}
        label="Soft flags"
        value={stats.soft}
        tone={stats.soft > 0 ? 'text-amber-500' : 'text-success-text'}
      />
      <Vital
        icon={ShieldCheck}
        label="Absorbs"
        value={`${stats.absorbable}/${stats.total} call-outs`}
        tone={stats.absorbable === stats.total ? 'text-success-text' : 'text-amber-500'}
      />
      {stats.violations.length > 0 && (
        <button
          type="button"
          onClick={() => onSelectViolation(0)}
          className="text-primary ml-auto cursor-pointer text-xs font-semibold hover:underline"
        >
          Review flags →
        </button>
      )}
    </div>
  )
}

export function DemandStrip() {
  return (
    <div className="grid grid-cols-[9.5rem_repeat(7,1fr)] items-end gap-px px-1">
      <span className="pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Appt load (PIMS)
      </span>
      {DAYS.map((day) => (
        <div key={day} className="flex flex-col items-center gap-0.5 px-2" title={DEMAND_NOTES[day]}>
          <span className="text-[10px] text-slate-400">{DEMAND[day]}%</span>
          <div className="h-8 w-full overflow-hidden rounded-t bg-slate-200/60">
            <div
              className={cn('w-full', DEMAND[day] > 85 ? 'bg-primary' : 'bg-primary/50')}
              style={{ height: `${DEMAND[day]}%`, marginTop: `${100 - DEMAND[day]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const BENCH_GROUPS = ['DVM', 'Tech', 'Assistant', 'CSR', 'Kennel']

export function Bench({ staff, weekHours, onChipClick }) {
  return (
    <DropZone id="bench">
      {({ isOver }) => (
        <div className={cn('glass-panel rounded-xl p-3', isOver && 'ring-primary-hover ring-2')}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-charcoal text-sm font-bold">Bench</h2>
            <span className="text-xs text-slate-500">drag to assign · drop here to unassign</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {BENCH_GROUPS.map((role) => (
              <div key={role} className="min-w-40 flex-1">
                <Badge variant="neutral" className="mb-1.5">{role}</Badge>
                <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto pr-1">
                  {staff
                    .filter((m) => m.role === role)
                    .map((m) => (
                      <DragHandle key={m.id} id={`bench:${m.id}`}>
                        <StaffChip staff={m} hours={weekHours[m.id]} onClick={() => onChipClick(m.id)} />
                      </DragHandle>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DropZone>
  )
}
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: build succeeds (components are not yet mounted; this catches syntax/import errors only).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/scheduling/ui/chips.jsx src/scheduling/ui/panels.jsx
git commit -m "feat(scheduling): glass tokens, staff chips, vitals/demand/bench panels"
```

---

### Task 6: useScheduleBoard hook, CoverageGrid, ScheduleBoard assembly

**Files:**
- Modify: `src/shared/dnd/engine.jsx` (additive `onActiveChange` prop)
- Create: `src/scheduling/ui/useScheduleBoard.js`
- Create: `src/scheduling/ui/CoverageGrid.jsx`
- Create: `src/scheduling/ui/ScheduleBoard.jsx`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `engine.jsx`: `DragDropBoard` gains optional `onActiveChange(activeId | null)`, fired on drag start/cancel/end. Existing callers unaffected.
  - `useScheduleBoard(notify) -> { state, staffById, violations, bySlot, absorb, weekHours, stats, actions }` with `actions = { assign(staffId, blockId, day), move(staffId, fromBlockId, fromDay, blockId, day), unassign(staffId, blockId, day), toggleCallOut(staffId, day), updateRule(ruleId, params), reset() }` and `stats = { filled, totalSlots, hard, soft, absorbable, total, violations }`.
  - `CoverageGrid({ week, bySlot, staffById, selection, onChipClick, activeDragId, hoverCheck })` — renders `DropZone id={'slot:' + blockId + ':' + day}` per cell and `DragHandle id={'cell:' + staffId + ':' + blockId + ':' + day}` per chip; while a drag is active, the hovered cell rings red/amber/green from `hoverCheck(staffId, blockId, day) -> 'hard' | 'soft' | 'ok'`.
  - `ScheduleBoard({ hidden, onLock })` — default export, same prop contract as `TriageBoard`.

- [ ] **Step 1: Extend the engine (additive)**

In `src/shared/dnd/engine.jsx`, change the `DragDropBoard` signature and the three handlers:

```jsx
export function DragDropBoard({ onDrop, preview, onActiveChange, children }) {
  const [activeId, setActiveId] = useState(null)
  const setActive = (id) => {
    setActiveId(id)
    onActiveChange?.(id)
  }
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActive(String(active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={({ active, over }) => {
        setActive(null)
        if (over) onDrop(String(active.id), String(over.id))
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{activeId && preview ? preview(activeId) : null}</DragOverlay>
    </DndContext>
  )
}
```

Also add one line to the interface comment block at the top of the file, after the `preview` line:

```
// - onActiveChange (optional) reports the active drag id (or null) so callers
//   can render drop-target feedback that depends on WHAT is being dragged.
```

Run: `npx vitest run` — patient-flow tests still pass (TriageBoard doesn't pass the new prop; optional chaining makes it inert).

- [ ] **Step 2: Write `src/scheduling/ui/useScheduleBoard.js`** (complete file)

```js
// Adapter between the pure scheduling domain and React: owns the reducer and
// memoized derived state (violations, absorption, vitals). UI calls `actions`;
// the domain stays free of React (patient-flow idiom, minus the clock — the
// Coverage Board has no timers).
import { useMemo, useReducer } from 'react'
import { BLOCKS } from '../domain/catalog'
import { scheduleReducer, effectiveSlots } from '../domain/schedule'
import { evaluateWeek, violationsBySlot } from '../domain/rules'
import { absorption } from '../domain/absorption'
import { STAFF, STAFF_BY_ID, createSeededState } from '../data/clinic'

// One effectiveSlots pass covers all 58 staff; per-staff staffWeekHours would
// recompute it 58 times per render.
const HOURS_BY_BLOCK = Object.fromEntries(BLOCKS.map((b) => [b.id, b.hours]))

/** @param {(message: string, tone?: 'success' | 'error' | 'info') => void} notify */
export function useScheduleBoard(notify) {
  const [state, dispatch] = useReducer(scheduleReducer, undefined, createSeededState)

  const violations = useMemo(
    () => evaluateWeek(state.week, state.rulebook, STAFF_BY_ID),
    [state],
  )
  const bySlot = useMemo(() => violationsBySlot(violations), [violations])
  const absorb = useMemo(
    () => absorption(state.week, state.rulebook, STAFF_BY_ID),
    [state],
  )
  const weekHours = useMemo(() => {
    const eff = effectiveSlots(state.week)
    const hours = Object.fromEntries(STAFF.map((s) => [s.id, 0]))
    for (const [key, ids] of Object.entries(eff)) {
      const blockId = key.split(':')[0]
      for (const id of ids) hours[id] += HOURS_BY_BLOCK[blockId]
    }
    return hours
  }, [state])

  const stats = useMemo(() => {
    const eff = effectiveSlots(state.week)
    const keys = Object.keys(eff)
    return {
      filled: keys.filter((k) => eff[k].length > 0).length,
      totalSlots: keys.length,
      hard: violations.filter((v) => v.severity === 'hard').length,
      soft: violations.filter((v) => v.severity === 'soft').length,
      absorbable: absorb.absorbable,
      total: absorb.total,
      violations,
    }
  }, [state, violations, absorb])

  const actions = {
    assign(staffId, blockId, day) {
      dispatch({ type: 'assigned', staffId, blockId, day })
      notify(`${STAFF_BY_ID[staffId].name} assigned — checking the rulebook…`, 'info')
    },
    move(staffId, fromBlockId, fromDay, blockId, day) {
      dispatch({ type: 'moved', staffId, fromBlockId, fromDay, blockId, day })
    },
    unassign(staffId, blockId, day) {
      dispatch({ type: 'unassigned', staffId, blockId, day })
      notify(`${STAFF_BY_ID[staffId].name} back on the bench.`, 'info')
    },
    toggleCallOut(staffId, day) {
      dispatch({ type: 'call-out-toggled', staffId, day })
    },
    updateRule(ruleId, params) {
      dispatch({ type: 'rule-updated', ruleId, params })
      notify('Rule updated — re-checking the whole week.', 'info')
    },
    reset() {
      dispatch({ type: 'reset', state: createSeededState() })
      notify('Board reset to the seeded week.', 'success')
    },
  }

  return { state, staffById: STAFF_BY_ID, violations, bySlot, absorb, weekHours, stats, actions }
}
```


- [ ] **Step 3: Write `src/scheduling/ui/CoverageGrid.jsx`** (complete file)

```jsx
// The Coverage Board grid: operational blocks (rows, office-flow order) ×
// days (columns). Cells are drop zones; chips drag between cells and bench.
// Violations render AT THE SEAMS: the offending cell's border glows. While a
// chip is being dragged, the hovered cell previews what the checker would say
// about that exact drop (hoverCheck) — red/amber/green before release.
import { Fragment } from 'react'
import { Badge, cn } from '../../shared/ui/primitives'
import { DragHandle, DropZone } from '../../shared/dnd/engine'
import { BLOCKS, DAYS, formatWindow } from '../domain/catalog'
import { isCalledOut, slotKey } from '../domain/schedule'
import { StaffChip } from './chips'

const SEAM = {
  hard: 'border-red-400 bg-red-50/60 shadow-[0_0_0_1px_theme(colors.red.400)]',
  soft: 'border-amber-300 bg-amber-50/60',
}

const HOVER_RING = {
  hard: 'ring-2 ring-red-400 border-red-400',
  soft: 'ring-2 ring-amber-400 border-amber-400',
  ok: 'ring-2 ring-success-text/60 border-success-text/60',
}

function Cell({ blockId, day, ids, tone, week, staffById, selection, onChipClick, activeDragId, hoverCheck }) {
  const dragStaffId = activeDragId?.split(':')[1]
  return (
    <DropZone id={`slot:${blockId}:${day}`}>
      {({ isOver }) => (
        <div
          className={cn(
            'min-h-14 rounded-lg border border-slate-200 bg-white p-1 transition-colors',
            SEAM[tone],
            isOver &&
              (dragStaffId
                ? HOVER_RING[hoverCheck(dragStaffId, blockId, day)]
                : 'border-primary-hover ring-primary-hover/40 ring-2'),
          )}
        >
          <div className="flex flex-col gap-1">
            {ids.map((staffId) => (
              <DragHandle key={staffId} id={`cell:${staffId}:${blockId}:${day}`}>
                <StaffChip
                  staff={staffById[staffId]}
                  compact
                  calledOut={isCalledOut(week, staffId, day)}
                  tone={selection?.kind === 'staff' && selection.id === staffId ? 'soft' : null}
                  onClick={() => onChipClick(staffId, blockId, day)}
                />
              </DragHandle>
            ))}
          </div>
        </div>
      )}
    </DropZone>
  )
}

export function CoverageGrid({ week, bySlot, staffById, selection, onChipClick, activeDragId, hoverCheck }) {
  return (
    <div className="min-w-[64rem]">
      <div className="grid grid-cols-[9.5rem_repeat(7,1fr)] gap-1">
        <span />
        {DAYS.map((day) => (
          <div key={day} className="px-2 pb-1 text-center text-xs font-bold text-slate-500">{day}</div>
        ))}
        {BLOCKS.map((block) => (
          <Fragment key={block.id}>
            <div className="flex flex-col justify-center rounded-lg py-1 pr-3 text-right">
              <span className="text-charcoal text-xs font-bold">{block.label}</span>
              <span className="text-[10px] text-slate-400">{formatWindow(block)}</span>
            </div>
            {DAYS.map((day) => (
              <Cell
                key={day}
                blockId={block.id}
                day={day}
                ids={week.slots[slotKey(block.id, day)]}
                tone={bySlot[slotKey(block.id, day)]}
                week={week}
                staffById={staffById}
                selection={selection}
                onChipClick={onChipClick}
                activeDragId={activeDragId}
                hoverCheck={hoverCheck}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/scheduling/ui/ScheduleBoard.jsx`** (complete file)

```jsx
// The Coverage Board screen — scheduling context's main surface.
// Assembly only: domain state via useScheduleBoard, chrome and drag wiring
// here, panels/rail from siblings. Mirrors TriageBoard's { hidden, onLock }
// prop contract so src/app can mount both contexts symmetrically.
import { useState } from 'react'
import { CalendarRange, Lock as LockIcon, RotateCcw } from 'lucide-react'
import { Button, cn } from '../../shared/ui/primitives'
import { useToasts, Toaster } from '../../shared/toast/toast'
import { DragDropBoard } from '../../shared/dnd/engine'
import { assignTo } from '../domain/schedule'
import { evaluateWeek } from '../domain/rules'
import { useScheduleBoard } from './useScheduleBoard'
import { CoverageGrid } from './CoverageGrid'
import { VitalsBar, DemandStrip, Bench } from './panels'
import { RulebookRail } from './rail'
import { ChipDragPreview } from './chips'
import { STAFF } from '../data/clinic'

export default function ScheduleBoard({ hidden, onLock }) {
  const { toasts, notify, dismiss } = useToasts()
  const { state, staffById, violations, bySlot, absorb, weekHours, stats, actions } =
    useScheduleBoard(notify)
  // selection: null | {kind:'violation', index} | {kind:'staff', id}
  const [selection, setSelection] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)

  // Live rule feedback during drag hover: evaluate the hypothetical drop and
  // report the worst NEW consequence. One evaluateWeek per hovered cell —
  // cheap at demo scale.
  const hoverCheck = (staffId, blockId, day) => {
    const week = assignTo(state.week, staffId, blockId, day)
    if (week === state.week) return 'ok' // already in the slot
    const after = evaluateWeek(week, state.rulebook, staffById)
    const count = (list, severity) => list.filter((v) => v.severity === severity).length
    if (count(after, 'hard') > count(violations, 'hard')) return 'hard'
    if (count(after, 'soft') > count(violations, 'soft')) return 'soft'
    return 'ok'
  }

  const handleDrop = (dragId, dropId) => {
    const drag = dragId.split(':')
    const drop = dropId.split(':')
    if (drop[0] === 'slot') {
      if (drag[0] === 'bench') actions.assign(drag[1], drop[1], drop[2])
      else if (drag[0] === 'cell') actions.move(drag[1], drag[2], drag[3], drop[1], drop[2])
    } else if (dropId === 'bench' && drag[0] === 'cell') {
      actions.unassign(drag[1], drag[2], drag[3])
    }
  }

  const dragPreview = (dragId) => {
    const staff = staffById[dragId.split(':')[1]]
    return staff ? <ChipDragPreview staff={staff} /> : null
  }

  return (
    <div className={cn('from-primary/10 via-cream to-accent/10 min-h-screen bg-gradient-to-br', hidden && 'hidden')}>
      <DragDropBoard onDrop={handleDrop} preview={dragPreview} onActiveChange={setActiveDragId}>
        <div className="mx-auto flex max-w-[110rem] flex-col gap-3 p-4">
          <header className="flex items-center gap-3">
            <CalendarRange className="text-primary h-6 w-6" />
            <div>
              <h1 className="text-charcoal text-lg font-bold">Staff Scheduling</h1>
              <p className="text-xs text-slate-500">
                Week of Mar 9 · Dana's rulebook, running live — drops land, then flag
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={actions.reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset demo
              </Button>
              <Button variant="ghost" size="sm" onClick={onLock} aria-label="Lock screen">
                <LockIcon className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <VitalsBar stats={stats} onSelectViolation={(index) => setSelection({ kind: 'violation', index })} />

          <div className="flex gap-3">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <DemandStrip />
              <CoverageGrid
                week={state.week}
                bySlot={bySlot}
                staffById={staffById}
                selection={selection}
                onChipClick={(staffId) => setSelection({ kind: 'staff', id: staffId })}
                activeDragId={activeDragId}
                hoverCheck={hoverCheck}
              />
            </div>
            <RulebookRail
              state={state}
              staff={STAFF}
              staffById={staffById}
              violations={violations}
              absorb={absorb}
              weekHours={weekHours}
              selection={selection}
              onSelect={setSelection}
              actions={actions}
            />
          </div>

          <Bench
            staff={STAFF.filter((m) => weekHours[m.id] === 0)}
            weekHours={weekHours}
            onChipClick={(staffId) => setSelection({ kind: 'staff', id: staffId })}
          />
        </div>
      </DragDropBoard>
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
```

Note: `RulebookRail` does not exist until Task 7. To keep this task shippable, create `src/scheduling/ui/rail.jsx` now with the minimal placeholder that Task 7 replaces wholesale:

```jsx
// Placeholder — Task 7 replaces this file with the full three-mode rail.
export function RulebookRail() {
  return <aside className="glass-panel w-80 shrink-0 rounded-xl p-3 text-xs text-slate-500">Rulebook rail (Task 7)</aside>
}
```

Check `src/shared/toast/toast.jsx` for the exact `useToasts`/`Toaster` prop names before wiring (TriageBoard.jsx:23,53 shows the import and call shape — mirror it exactly).

- [ ] **Step 5: Verify build + full test suite**

Run: `npm run build && npx vitest run`
Expected: build passes; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/dnd/engine.jsx src/scheduling/ui/useScheduleBoard.js src/scheduling/ui/CoverageGrid.jsx src/scheduling/ui/ScheduleBoard.jsx src/scheduling/ui/rail.jsx
git commit -m "feat(scheduling): coverage board assembly with dnd wiring"
```

---

### Task 7: RulebookRail — rulebook, violation, and staff modes

**Files:**
- Modify (replace wholesale): `src/scheduling/ui/rail.jsx`

**Interfaces:**
- Consumes: props from ScheduleBoard (Task 6): `{ state, staff, staffById, violations, absorb, weekHours, selection, onSelect, actions }`.
- Produces: `RulebookRail` with three modes keyed off `selection`:
  - `null` → **Rulebook mode**: every rule as a card — template label, Dana's `rationale` (italic, quoted), severity badge, and editable params via `RULE_TEMPLATES[type].paramFields` (`count` kind → number input calling `actions.updateRule`; other kinds render read-only values — YAGNI, the demo edits counts).
  - `{kind:'violation', index}` → **Violation mode**: the violation message, the owning rule's rationale, navigation (prev/next), and **repairs**: for each `slotKey` in the violation, `backfillCandidates`-style suggestions — list `absorb.perAssignment` is per-assignment, so instead call the candidates from the violation's slot: for coverage violations suggest bench staff whose credentials satisfy the rule, each with an "Assign" button calling `actions.assign(staffId, blockId, day)`; when no candidate exists render "No repair available — every qualified hand is busy or capped." honestly.
  - `{kind:'staff', id}` → **Staff mode**: name, credentials, weekly hours, their assignments, a per-day "Simulate call-out" toggle calling `actions.toggleCallOut(staffId, day)`, and their back-fill map (from `absorb.perAssignment`).

- [ ] **Step 1: Write the full rail** — replace `src/scheduling/ui/rail.jsx` entirely:

```jsx
// The right rail — context-sensitive "consult" panel of the Coverage Board.
// Three modes: Rulebook (nothing selected), Violation (a flag selected),
// Staff (a chip selected). This is the demo's elicitation surface: rules are
// editable HERE, live, in Dana's own words.
import { ArrowLeft, ArrowRight, BookOpenText, CloudOff, ShieldCheck, X } from 'lucide-react'
import { Badge, Button, cn } from '../../shared/ui/primitives'
import { RULE_TEMPLATES } from '../domain/rules'
import { DAYS, blockById } from '../domain/catalog'
import { isCalledOut, slotKey, staffDayBlocks } from '../domain/schedule'

const SEVERITY_BADGE = { hard: 'danger', soft: 'warning' }

function RuleCard({ rule, actions }) {
  const template = RULE_TEMPLATES[rule.type]
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-charcoal text-xs font-bold">{template.label}</span>
        <Badge variant={SEVERITY_BADGE[rule.severity]}>{rule.severity}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 italic">“{rule.rationale}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {template.paramFields.map((field) => {
          const value = rule.params[field.name]
          if (field.kind === 'count')
            return (
              <label key={field.name} className="flex items-center gap-1 text-[11px] text-slate-600">
                {field.label}
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => actions.updateRule(rule.id, { [field.name]: Number(e.target.value) })}
                  className="focus-visible:border-primary-hover h-6 w-14 rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none"
                />
              </label>
            )
          return (
            <span key={field.name} className="text-[11px] text-slate-500">
              {field.label}:{' '}
              <b className="text-charcoal">{Array.isArray(value) ? value.join(' ') : String(value ?? 'any')}</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RulebookMode({ state, actions }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <BookOpenText className="text-primary h-4 w-4" />
        <h2 className="text-charcoal text-sm font-bold">Dana's Rulebook</h2>
      </div>
      <p className="text-[11px] text-slate-500">
        The schedule's brain, externalized. Edit a number — the whole week re-checks instantly.
      </p>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {state.rulebook.map((rule) => (
          <RuleCard key={rule.id} rule={rule} actions={actions} />
        ))}
      </div>
    </>
  )
}

function coverageRepairs(violation, state, staff, weekHours, rulebook) {
  // For a coverage violation, suggest bench-light staff who satisfy the rule.
  const rule = rulebook.find((r) => r.id === violation.ruleId)
  if (!rule || violation.slotKeys.length !== 1) return null
  const [blockId, day] = violation.slotKeys[0].split(':')
  const need = rule.params.credential ?? null
  const role = rule.params.role ?? null
  const inSlot = state.week.slots[violation.slotKeys[0]]
  const candidates = staff.filter(
    (m) =>
      !inSlot.includes(m.id) &&
      (need ? m.credentials.includes(need) : m.role === role) &&
      staffDayBlocks(state.week, m.id, day).length === 0,
  )
  return { blockId, day, candidates }
}

function ViolationMode({ violations, selection, onSelect, state, staff, staffById, weekHours, actions }) {
  const index = Math.min(selection.index, violations.length - 1)
  if (index < 0)
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ShieldCheck className="text-success-text h-8 w-8" />
        <p className="text-charcoal text-sm font-bold">Clean board</p>
        <p className="text-[11px] text-slate-500">Every rule in the book is satisfied.</p>
      </div>
    )
  const v = violations[index]
  const rule = state.rulebook.find((r) => r.id === v.ruleId)
  const repairs = ['min-role-coverage', 'min-credential-coverage'].includes(v.type)
    ? coverageRepairs(v, state, staff, weekHours, state.rulebook)
    : null
  return (
    <>
      <div className="flex items-center gap-1">
        <Badge variant={SEVERITY_BADGE[v.severity]}>{v.severity}</Badge>
        <span className="ml-auto text-[11px] text-slate-400">{index + 1} of {violations.length}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Previous flag"
          onClick={() => onSelect({ kind: 'violation', index: (index + violations.length - 1) % violations.length })}>
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Next flag"
          onClick={() => onSelect({ kind: 'violation', index: (index + 1) % violations.length })}>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-charcoal text-sm font-semibold">{v.message}</p>
      {rule && <p className="text-[11px] text-slate-500 italic">“{rule.rationale}”</p>}
      {repairs && (
        <div className="mt-1">
          <h3 className="text-xs font-bold text-slate-600">Suggested repairs</h3>
          {repairs.candidates.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No repair available — every qualified hand is busy or capped.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-1">
              {repairs.candidates.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2 py-1">
                  <span className="text-xs font-semibold">{m.name}</span>
                  <span className="text-[10px] text-slate-400">{weekHours[m.id]}h this week</span>
                  <Button size="sm" className="ml-auto h-6 px-2 text-[11px]"
                    onClick={() => actions.assign(m.id, repairs.blockId, repairs.day)}>
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function StaffMode({ staffId, state, staffById, absorb, weekHours, actions }) {
  const member = staffById[staffId]
  const rows = DAYS.flatMap((day) =>
    staffDayBlocks(state.week, member.id, day).map((blockId) => ({ day, blockId })),
  )
  return (
    <>
      <h2 className="text-charcoal text-sm font-bold">{member.name}</h2>
      <p className="text-[11px] text-slate-500">
        {member.role}
        {member.credentials.length > 0 && ` · ${member.credentials.join(', ')}`}
        {member.float && ' · float pool'} · {weekHours[member.id]}h this week
      </p>
      <h3 className="mt-1 text-xs font-bold text-slate-600">This week & back-fill</h3>
      {rows.length === 0 && <p className="text-[11px] text-slate-500">On the bench all week.</p>}
      <div className="flex flex-col gap-1 overflow-y-auto">
        {rows.map(({ day, blockId }) => {
          const entry = absorb.perAssignment[`${slotKey(blockId, day)}:${member.id}`]
          return (
            <div key={`${blockId}:${day}`} className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{day} · {blockById(blockId).label}</span>
                <Badge variant={entry?.absorbable ? 'success' : 'danger'} className="ml-auto">
                  {entry?.absorbable ? 'covered' : 'no cover'}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                {entry?.absorbable
                  ? `Back-fill: ${entry.candidates.slice(0, 3).map((id) => staffById[id].name).join(', ')}`
                  : 'If this call-out happens, nobody qualified is free.'}
              </p>
            </div>
          )
        })}
      </div>
      <h3 className="mt-1 text-xs font-bold text-slate-600">Simulate call-out</h3>
      <div className="flex flex-wrap gap-1">
        {DAYS.map((day) => {
          const out = isCalledOut(state.week, member.id, day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => actions.toggleCallOut(member.id, day)}
              className={cn(
                'cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
                out
                  ? 'border-red-300 bg-red-100 text-red-700'
                  : 'text-charcoal border-slate-200 bg-white hover:border-primary',
              )}
            >
              {out && <CloudOff className="mr-1 inline h-3 w-3" />}
              {day}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function RulebookRail({ state, staff, staffById, violations, absorb, weekHours, selection, onSelect, actions }) {
  return (
    <aside className="glass-panel flex max-h-[44rem] w-80 shrink-0 flex-col gap-2 self-start rounded-xl p-3">
      {selection && (
        <Button variant="ghost" size="sm" className="self-end" onClick={() => onSelect(null)}>
          <X className="h-3.5 w-3.5" /> Rulebook
        </Button>
      )}
      {selection == null && <RulebookMode state={state} actions={actions} />}
      {selection?.kind === 'violation' && (
        <ViolationMode
          violations={violations} selection={selection} onSelect={onSelect}
          state={state} staff={staff} staffById={staffById} weekHours={weekHours} actions={actions}
        />
      )}
      {selection?.kind === 'staff' && (
        <StaffMode
          staffId={selection.id} state={state} staffById={staffById}
          absorb={absorb} weekHours={weekHours} actions={actions}
        />
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/scheduling/ui/rail.jsx
git commit -m "feat(scheduling): rulebook rail with violation repairs and call-out simulation"
```

---

### Task 8: App context switcher, docs, and demo-script verification

**Files:**
- Modify: `src/app/App.jsx`
- Modify: `src/scheduling/CONTEXT.md`
- Modify: `CLAUDE.md` (Current state section)
- Verify: full demo script in the browser pane

**Interfaces:**
- Consumes: `ScheduleBoard` default export (Task 6).
- Produces: the shipped demo.

- [ ] **Step 1: Wire the switcher** — replace `src/app/App.jsx` body:

```jsx
// Composition root: owns the session state machine and mounts contexts.
// Bounded contexts (src/patient-flow, src/scheduling) never import each other;
// they meet only here and in src/shared. See ARCHITECTURE.md.
import { useState } from 'react'
import Landing from '../shared/auth/Landing'
import Lock from '../shared/auth/Lock'
import TriageBoard from '../patient-flow/ui/TriageBoard'
import ScheduleBoard from '../scheduling/ui/ScheduleBoard'
import { cn } from '../shared/ui/primitives'

const CONTEXTS = [
  { id: 'patient-flow', label: 'Patient Flow' },
  { id: 'scheduling', label: 'Staff Scheduling' },
]

export default function App() {
  // 'signed-out' | 'active' | 'locked'
  const [session, setSession] = useState('signed-out')
  // Boards mount on first visit and stay mounted (hidden) thereafter, so
  // timers, assignments, and call-out simulations survive switches and locks.
  const [hasSession, setHasSession] = useState(false)
  const [context, setContext] = useState('patient-flow')
  const [visited, setVisited] = useState({ 'patient-flow': true, scheduling: false })

  const signIn = () => {
    setHasSession(true)
    setSession('active')
  }

  const signOut = () => {
    setHasSession(false)
    setVisited({ 'patient-flow': true, scheduling: false })
    setContext('patient-flow')
    setSession('signed-out')
  }

  const switchTo = (id) => {
    setVisited((v) => ({ ...v, [id]: true }))
    setContext(id)
  }

  const active = session === 'active'
  return (
    <>
      {hasSession && visited['patient-flow'] && (
        <TriageBoard hidden={!active || context !== 'patient-flow'} onLock={() => setSession('locked')} />
      )}
      {hasSession && visited['scheduling'] && (
        <ScheduleBoard hidden={!active || context !== 'scheduling'} onLock={() => setSession('locked')} />
      )}
      {active && (
        <nav className="glass-panel fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full p-1">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => switchTo(c.id)}
              className={cn(
                'cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
                context === c.id ? 'bg-primary text-white' : 'text-charcoal hover:bg-white/70',
              )}
            >
              {c.label}
            </button>
          ))}
        </nav>
      )}
      {session === 'signed-out' && <Landing onSignIn={signIn} />}
      {session === 'locked' && <Lock onUnlock={() => setSession('active')} onSignOut={signOut} />}
    </>
  )
}
```

- [ ] **Step 2: Update `src/scheduling/CONTEXT.md`** — replace the "Reserved" framing:

```markdown
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
```

- [ ] **Step 3: Update `CLAUDE.md` Current state** — replace the scheduling bullet:

```markdown
- The scheduling context is a DEMO build (spec: `docs/scheduling-epic-spec.md`,
  design: `docs/superpowers/specs/2026-07-20-scheduling-demo-design.md`).
  All clinic facts (roster, rulebook, week) are fictitious-but-plausible by
  directive; real phase-1 rule extraction has not happened.
```

- [ ] **Step 4: Verify the five demo beats in the browser pane**

Start `preview_start` with launch config `wcah-portal`, sign in (any credentials), switch to Staff Scheduling, then:

1. Vitals shows **2 hard / 1 soft**; `surgery:Sat`, `kennel-pm:Tue`, `kennel-am:Wed` cells glow red.
2. Click "Review flags" → rail shows the Sat surgery violation with Dana's rationale and repair suggestions (expect free LVTs — Rosa Delgado first, since suggestions follow roster order).
3. Click Assign on a suggested LVT → Sat surgery seam clears; hard count drops to 1.
4. Return to Rulebook mode, change "Credential minimum / LVT-A / At least" from 1 to 2 → new red seams cascade across surgery days. Set it back to 1.
5. Click Dr. Okafor's Thu surgery chip → Staff mode shows that seat "covered" with back-fill candidates (Dr. Gibbings, Dr. Reyes, … — Dr. Tran is in the full list, per the regression test) → toggle a Thursday call-out → vitals hard count rises (surgery loses its DVM) and the Thu surgery seam glows. Also click Rosa's Thu surgery chip: "no cover" — the thin spot, on screen.

Browser-pane quirks (project memory): drags use screenshot-pixel coordinates; `left_click_drag` works for dnd-kit; prefer JS clicks when refs go stale.

- [ ] **Step 5: Run everything, commit**

```bash
npx vitest run && npm run build
git add src/app/App.jsx src/scheduling/CONTEXT.md CLAUDE.md
git commit -m "feat(app): context switcher; scheduling demo docs and language"
```

---

## Execution notes

- Tasks 1–4 are the pure domain and must go first, in order. Task 5 can run parallel to 3–4. Tasks 6→7→8 are sequential.
- The working tree currently has **unrelated uncommitted changes** (patient-flow UI, dnd engine, ADRs). Do not sweep them into scheduling commits — stage only the files each task names. The Task 6 engine edit builds on the current uncommitted `engine.jsx` state.
- Absorption is O(assignments × staff × rules) recomputed per edit. At demo scale this is fine; if the UI ever stutters on drops, memoize per-day instead of optimizing blind.
```
