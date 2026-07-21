// Schedule health — the dashboard's headline numbers, computed.
// Pure module: no React, no clocks, no I/O.
//
// Every figure here is derived from the actual week and the actual rulebook.
// Nothing is sampled, weighted by vibes, or hardcoded: if the score moves, a
// real assignment moved. That is the whole point — the prototype this replaces
// generated its 87 from a seeded PRNG.
//
// Interface:
//   burnoutStreaks(week, staffById, threshold?) -> [{ staffId, days, from, to }]
//   fairnessSpread(week, staffById)             -> 0..100 (100 = perfectly even weekends)
//   scheduleHealth(week, rulebook, staffById)   -> { score, coverage, fairness, chemistry, burnout, unfilled }
import { DAYS } from './catalog'
import { effectiveSlots } from './schedule'
import { evaluateWeek } from './rules'
import { weekChemistry } from './chemistry'

/** Consecutive-day run that counts as a burnout risk. Dana's number. */
export const BURNOUT_THRESHOLD = 6

const WEEKEND = ['Sat', 'Sun']

const worksOn = (eff, staffId, day) =>
  Object.keys(eff).some((key) => key.endsWith(`:${day}`) && eff[key].includes(staffId))

/**
 * Longest run of consecutive worked days per person, reported only when it
 * reaches the threshold. One entry per person — a 7-day run is one problem,
 * not seven. Called-out days break a run: the rest is real rest.
 * @returns {{staffId: string, days: number, from: string, to: string}[]}
 */
export function burnoutStreaks(week, staffById, threshold = BURNOUT_THRESHOLD) {
  const eff = effectiveSlots(week)
  const flags = []
  for (const staffId of Object.keys(staffById)) {
    let run = 0
    let best = null
    for (let i = 0; i < DAYS.length; i++) {
      if (worksOn(eff, staffId, DAYS[i])) {
        run += 1
        if (!best || run > best.days) best = { staffId, days: run, from: DAYS[i - run + 1], to: DAYS[i] }
      } else {
        run = 0
      }
    }
    if (best && best.days >= threshold) flags.push(best)
  }
  return flags
}

/**
 * How evenly weekend work is shared, as 0..100 (100 = perfectly even).
 *
 * Uses a Gini coefficient over the weekend load of every staff member who
 * works at all that week. Deliberately NOT a max-minus-min spread: in a real
 * roster most people work no weekend at all, so max-min saturates to 0 the
 * moment one person works two weekend shifts and anyone works none — it
 * reports "maximally unfair" for a perfectly ordinary week. Gini degrades
 * smoothly, is the standard measure for exactly this question, and stays
 * meaningful when the horizon grows past one week (which is where Dana's
 * "nobody eats every Saturday" actually bites).
 *
 * @returns {number}
 */
export function fairnessSpread(week, staffById) {
  const eff = effectiveSlots(week)
  const loads = []
  for (const staffId of Object.keys(staffById)) {
    if (!DAYS.some((day) => worksOn(eff, staffId, day))) continue // not on this week at all
    loads.push(
      WEEKEND.reduce(
        (n, day) => n + Object.keys(eff).filter((k) => k.endsWith(`:${day}`) && eff[k].includes(staffId)).length,
        0,
      ),
    )
  }
  const n = loads.length
  if (n === 0) return 100
  const total = loads.reduce((s, v) => s + v, 0)
  if (total === 0) return 100 // nobody works the weekend — trivially even

  let absoluteGaps = 0
  for (const a of loads) for (const b of loads) absoluteGaps += Math.abs(a - b)
  const gini = absoluteGaps / (2 * n * total)
  return Math.round((1 - gini) * 100)
}

/**
 * The composite the health ring shows, plus the components beside it.
 *
 * `unfilled` counts the slots the rulebook asked for and did not get — i.e.
 * coverage-shaped violations, which is what "unfilled shifts" means to a
 * scheduler. `coverage` is the share of coverage demands actually satisfied.
 * The score weights coverage hardest: a beautiful, uncovered week is worthless.
 *
 * @returns {{score: number, coverage: number, fairness: number, chemistry: number, burnout: number, unfilled: number}}
 */
export function scheduleHealth(week, rulebook, staffById) {
  const violations = evaluateWeek(week, rulebook, staffById)
  const coverageRules = rulebook.filter(
    (r) => r.type === 'min-role-coverage' || r.type === 'min-credential-coverage',
  )
  const demanded = coverageRules.reduce((n, r) => n + (r.params.days ?? DAYS).length, 0)
  const unfilled = violations.filter(
    (v) => v.type === 'min-role-coverage' || v.type === 'min-credential-coverage',
  ).length
  const coverage = demanded === 0 ? 100 : Math.round(((demanded - unfilled) / demanded) * 100)

  const fairness = fairnessSpread(week, staffById)
  const chemistry = weekChemistry(week, staffById) ?? 0
  const burnout = burnoutStreaks(week, staffById).length

  // Hard violations beyond coverage (rest gaps, hour caps, unavailability)
  // are counted as a flat penalty — they are qualitative failures, not a rate.
  const otherHard = violations.filter(
    (v) => v.severity === 'hard' && v.type !== 'min-role-coverage' && v.type !== 'min-credential-coverage',
  ).length

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(coverage * 0.45 + fairness * 0.2 + chemistry * 0.25 + 10 - otherHard * 4 - burnout * 3),
    ),
  )

  return { score, coverage, fairness, chemistry, burnout, unfilled }
}
