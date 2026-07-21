// The four-week horizon — "the month, already scored".
// Pure module: no React, no clocks, no I/O, no randomness.
//
// Week 1 is the real, editable week (the one the Coverage Board edits and the
// one carrying the planted defects). Weeks 2-4 are PROJECTIONS of it: the same
// pattern with weekend duty rotated across same-role, same-credential peers,
// which is how the clinic actually runs a month. They are deliberately derived
// rather than hand-authored, for two reasons:
//
//   1. Honesty. Four independently invented weeks would be four times the
//      fiction with no more truth in it. A projection states plainly that it
//      is week 1's shape carried forward.
//   2. It makes editing meaningful. Repair week 1 and the whole month improves,
//      because the month IS week 1's pattern.
//
// Weekend rotation is the point: single-week equity looks terrible in any real
// roster (a handful of people carry each weekend), but a month that rotates
// them is fair. That gap is only visible at horizon scale.
//
// Known limitation, inherited and intentional: rest gaps and burnout streaks
// are computed per week and do not cross week boundaries — the same boundary
// that min-rest-gap already documents.
//
// Interface:
//   HORIZON_WEEKS                              4
//   deriveWeek(base, staffById, offset)        -> Week
//   createHorizon(base, staffById, count?)     -> Week[]   ([0] === base)
//   horizonChemistry(weeks, staffById)         -> [{ week, days: [{day, chemistry}] }]
//   horizonHealth(weeks, rulebook, staffById)  -> { perWeek, score, coverage, fairness, chemistry, burnout, unfilled }
import { DAYS } from './catalog'
import { effectiveSlots } from './schedule'
import { evaluateWeek, violationKey } from './rules'
import { dayChemistry } from './chemistry'
import { scheduleHealth } from './health'

export const HORIZON_WEEKS = 4

const WEEKEND = ['Sat', 'Sun']

/** Everyone who could stand in for this person without changing what the slot can do. */
function peersOf(member, staffById) {
  return Object.values(staffById)
    .filter(
      (other) =>
        other.role === member.role &&
        member.credentials.every((c) => other.credentials.includes(c)),
    )
    .map((o) => o.id)
    .sort() // stable ordering — the rotation must be reproducible
}

/**
 * Project the base week forward by `offset` weeks, rotating weekend duty.
 * Weekday assignments carry over unchanged: the clinic's weekday shape is the
 * stable part, and rotating it would invent a different clinic each week.
 *
 * A projection must never invent a problem the real week does not have, so the
 * rotation is validated against the rulebook and any weekend slot implicated in
 * a NEW hard violation is reverted to its original staffing. This matters at
 * the week's edges: rotating Saturday's openers can pull in someone who closed
 * on Friday — a day this function deliberately leaves alone — which trips the
 * rest-gap rule even though nothing about Friday changed.
 *
 * @param {import('./schedule').Week} base
 * @param {Record<string, import('./schedule').StaffMember>} staffById
 * @param {number} offset  0 returns the base week untouched
 * @param {import('./schedule').RuleInstance[]} rulebook  omit to skip validation
 * @returns {import('./schedule').Week}
 */
export function deriveWeek(base, staffById, offset, rulebook = []) {
  if (offset === 0) return base
  const slots = { ...base.slots }

  for (const day of WEEKEND) {
    for (const key of Object.keys(base.slots)) {
      if (!key.endsWith(`:${day}`)) continue
      const ids = base.slots[key]
      if (ids.length === 0) continue

      const taken = new Set()
      slots[key] = ids.map((id) => {
        const member = staffById[id]
        if (!member) return id
        const pool = peersOf(member, staffById)
        if (pool.length <= 1) return id
        // Walk from this person's position by the week offset, skipping
        // anyone already placed in this slot.
        const start = pool.indexOf(id)
        for (let step = 1; step <= pool.length; step++) {
          const candidate = pool[(start + offset * step) % pool.length]
          if (!taken.has(candidate)) {
            taken.add(candidate)
            return candidate
          }
        }
        taken.add(id)
        return id
      })
    }
  }

  // Call-outs are a live what-if on the real week; projections start clean.
  let projected = { slots, callOuts: [] }
  if (rulebook.length === 0) return projected

  const weekendKeys = Object.keys(base.slots).filter((k) => WEEKEND.some((d) => k.endsWith(`:${d}`)))
  const baseline = evaluateWeek(base, rulebook, staffById)

  /** Weekend slots this staffer occupies — how a week-scoped violation is traced back. */
  const weekendSlotsOf = (week, staffId) =>
    weekendKeys.filter((k) => week.slots[k].includes(staffId))

  /**
   * Weekend slots implicated in a hard violation the base week does NOT have,
   * compared by violation identity rather than by slot.
   *
   * Week-scoped violations need the staffIds fallback: `max-weekly-hours`
   * reports `slotKeys: []` because a cap is breached by a person's whole week,
   * not one shift. Scanning slotKeys alone therefore cannot see it, and a
   * rotation that pushes a peer over their cap would ship that violation into
   * the projection unnoticed.
   */
  const offendingSlots = (week) => {
    const known = new Set(baseline.filter((v) => v.severity === 'hard').map(violationKey))
    const out = new Set()
    for (const v of evaluateWeek(week, rulebook, staffById)) {
      if (v.severity !== 'hard' || known.has(violationKey(v))) continue
      const implicated = v.slotKeys.length > 0 ? v.slotKeys : v.staffIds.flatMap((id) => weekendSlotsOf(week, id))
      for (const key of implicated) if (weekendKeys.includes(key)) out.add(key)
    }
    return out
  }

  // Revert offending weekend slots until none remain. Reverting is monotone —
  // a reverted slot holds its base staffing and full reversion is exactly the
  // base week — so this terminates; the bound is one pass per weekend slot.
  for (let pass = 0; pass <= weekendKeys.length; pass++) {
    const offenders = offendingSlots(projected)
    if (offenders.size === 0) return projected
    const reverted = { ...projected.slots }
    for (const key of offenders) reverted[key] = base.slots[key]
    projected = { slots: reverted, callOuts: [] }
  }

  // Unreachable given the monotonicity argument above, but a projection that
  // still carries an invented problem is worse than no rotation at all: fall
  // back to the base week rather than shipping one.
  return offendingSlots(projected).size === 0 ? projected : base
}

/**
 * The horizon: the live week followed by its projections.
 * @returns {import('./schedule').Week[]}
 */
export const createHorizon = (base, staffById, rulebook = [], count = HORIZON_WEEKS) =>
  Array.from({ length: count }, (_, i) => deriveWeek(base, staffById, i, rulebook))

/**
 * Per-week, per-day chemistry — the 4x7 heatmap.
 * @returns {{week: number, days: {day: string, chemistry: number | null}[]}[]}
 */
export const horizonChemistry = (weeks, staffById) =>
  weeks.map((week, i) => ({
    week: i + 1,
    days: DAYS.map((day) => ({ day, chemistry: dayChemistry(week, day, staffById) })),
  }))

const mean = (values) => (values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0)

/**
 * Month-level health. Coverage/chemistry/score are averaged across weeks;
 * burnout and unfilled are totals (a problem in week 3 is a real problem, not
 * something an average should dilute).
 *
 * Fairness is recomputed over the WHOLE horizon rather than averaged, which is
 * the entire reason the horizon exists: per-week equity is low by nature
 * because few people work any given weekend, but a rotating month is fair.
 * Averaging the weekly figures would hide exactly the fact we want to show.
 */
export function horizonHealth(weeks, rulebook, staffById) {
  const perWeek = weeks.map((week) => scheduleHealth(week, rulebook, staffById))

  // Weekend load pooled across every week, then the same Gini as health.js.
  const loads = []
  for (const staffId of Object.keys(staffById)) {
    let weekendShifts = 0
    let worksAtAll = false
    for (const week of weeks) {
      const eff = effectiveSlots(week)
      for (const day of DAYS) {
        const shifts = Object.keys(eff).filter((k) => k.endsWith(`:${day}`) && eff[k].includes(staffId)).length
        if (shifts > 0) {
          worksAtAll = true
          if (WEEKEND.includes(day)) weekendShifts += shifts
        }
      }
    }
    if (worksAtAll) loads.push(weekendShifts)
  }

  let fairness = 100
  const total = loads.reduce((s, v) => s + v, 0)
  if (loads.length > 0 && total > 0) {
    let gaps = 0
    for (const a of loads) for (const b of loads) gaps += Math.abs(a - b)
    fairness = Math.round((1 - gaps / (2 * loads.length * total)) * 100)
  }

  const coverage = mean(perWeek.map((h) => h.coverage))
  const chemistry = mean(perWeek.map((h) => h.chemistry))
  const burnout = perWeek.reduce((n, h) => n + h.burnout, 0)
  const unfilled = perWeek.reduce((n, h) => n + h.unfilled, 0)
  const score = mean(perWeek.map((h) => h.score))

  return { perWeek, score, coverage, fairness, chemistry, burnout, unfilled }
}
