// Team chemistry — the "who works well with whom" half of Dana's judgment.
// Pure module: no React, no clocks, no I/O.
//
// This is a computed METRIC, never a rule Violation. Chemistry is advisory:
// it colors the heatmap and drives suggestions, but a low-chemistry shift is
// not "invalid" and must never appear in evaluateWeek's output. Wiring it into
// the rulebook would also break the planted-defect regression in
// data/clinic.test.js, which asserts an exact violation set.
//
// Interface:
//   ARCHETYPES                          key -> { key, blurb, color }
//   SYNERGY                             archetype -> archetype -> 0..100 (symmetric)
//   pairChemistry(a, b)                 -> number
//   slotChemistry(staffIds, staffById)  -> number | null   (null = no pairing possible)
//   dayChemistry(week, day, staffById)  -> number | null
//   weekChemistry(week, staffById)      -> number | null
//   archetypeMix(staff)                 -> [{ key, count, color }]  (ARCHETYPES order)
import { DAYS } from './catalog'
import { effectiveSlots } from './schedule'

/**
 * How a person shows up on the floor. Dana names these without knowing she
 * does — "put a steady one on with the new kid" is an archetype claim.
 * @typedef {'Anchor' | 'Spark' | 'Empath' | 'Analyst' | 'Shield'} Archetype
 */

export const ARCHETYPES = {
  Anchor: { key: 'Anchor', blurb: 'Steady metronome — holds routine shifts together', color: '#516d7d' },
  Spark: { key: 'Spark', blurb: 'Floor energy — lifts slow afternoons', color: '#d97a29' },
  Empath: { key: 'Empath', blurb: 'Client whisperer — de-escalates a full lobby', color: '#7c5cb0' },
  Analyst: { key: 'Analyst', blurb: 'Protocol precision — zero missed charts', color: '#2e7d6b' },
  Shield: { key: 'Shield', blurb: 'Crisis-calm — emergencies route to them', color: '#b03a48' },
}

/**
 * Pairwise synergy, 0-100. Symmetric by construction — chemistry between two
 * people does not depend on which one you name first. Same-archetype pairings
 * score lower than complements: two Sparks are a party, not a shift.
 */
export const SYNERGY = {
  Anchor: { Anchor: 70, Spark: 88, Empath: 80, Analyst: 84, Shield: 78 },
  Spark: { Anchor: 88, Spark: 55, Empath: 82, Analyst: 62, Shield: 74 },
  Empath: { Anchor: 80, Spark: 82, Empath: 68, Analyst: 72, Shield: 86 },
  Analyst: { Anchor: 84, Spark: 62, Empath: 72, Analyst: 74, Shield: 82 },
  Shield: { Anchor: 78, Spark: 74, Empath: 86, Analyst: 82, Shield: 60 },
}

/** @param {{archetype: Archetype}} a @param {{archetype: Archetype}} b @returns {number} */
export const pairChemistry = (a, b) => SYNERGY[a.archetype][b.archetype]

const mean = (values) => (values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null)

/**
 * Mean synergy across every pairing in one slot. Null when fewer than two
 * known staff are present — a solo shift has no chemistry to speak of, which
 * is different from having bad chemistry.
 * @param {string[]} staffIds
 * @param {Record<string, {archetype: Archetype}>} staffById
 * @returns {number | null}
 */
export function slotChemistry(staffIds, staffById) {
  const present = staffIds.map((id) => staffById[id]).filter(Boolean)
  if (present.length < 2) return null
  const pairs = []
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) pairs.push(pairChemistry(present[i], present[j]))
  }
  return mean(pairs)
}

/**
 * Mean chemistry across a day's scoreable slots (those with a real pairing).
 * Reads effective slots, so a called-out staffer stops counting.
 * @returns {number | null}
 */
export function dayChemistry(week, day, staffById) {
  const eff = effectiveSlots(week)
  const scores = Object.keys(eff)
    .filter((key) => key.endsWith(`:${day}`))
    .map((key) => slotChemistry(eff[key], staffById))
    .filter((s) => s !== null)
  return mean(scores)
}

/** @returns {number | null} Mean chemistry across the week's scoreable days. */
export function weekChemistry(week, staffById) {
  const scores = DAYS.map((day) => dayChemistry(week, day, staffById)).filter((s) => s !== null)
  return mean(scores)
}

/**
 * Headcount per archetype for the distribution legend, in ARCHETYPES order.
 * @param {{archetype: Archetype}[]} staff
 * @returns {{key: string, count: number, color: string}[]}
 */
export const archetypeMix = (staff) =>
  Object.values(ARCHETYPES).map(({ key, color }) => ({
    key,
    count: staff.filter((s) => s.archetype === key).length,
    color,
  }))
