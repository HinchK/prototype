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
import { evaluateWeek, newHardViolations } from './rules'

// Substituting must introduce no NEW hard violation. Compared by identity, not
// by count: a swap that closes the coverage gap while breaking a different rule
// nets to zero and a count check would accept it.

/**
 * @param {import('./schedule').Week} week
 * @param {import('./schedule').RuleInstance[]} rulebook
 * @param {Record<string, import('./schedule').StaffMember>} staffById
 * @param {string} blockId @param {string} day @param {string} absentId
 * @returns {string[]} staff ids that could cover this assignment
 */
export function backfillCandidates(week, rulebook, staffById, blockId, day, absentId, precomputedBaseline) {
  // Only hard rules can disqualify a substitute, and only those that touch
  // THIS block or are person-scoped can change when one person moves into one
  // slot. Coverage rules for other blocks are identical before and after, so
  // evaluating them per candidate is pure waste — and this runs once per
  // candidate per assignment, which is where the cost lives.
  const relevant = rulebook.filter(
    (r) => r.severity === 'hard' && (r.params.blockId === undefined || r.params.blockId === blockId),
  )
  const baseline = (precomputedBaseline ?? evaluateWeek(week, rulebook, staffById)).filter((v) =>
    relevant.some((r) => r.id === v.ruleId),
  )
  const vacated = removeFrom(week, absentId, blockId, day)
  const target = blockById(blockId)
  const slotIds = effectiveSlots(week)[slotKey(blockId, day)]

  return Object.keys(staffById).filter((id) => {
    // Cheap disqualifiers first — the rule evaluation below is the expensive
    // step and most people are excluded before reaching it.
    if (id === absentId || slotIds.includes(id) || isCalledOut(week, id, day)) return false
    const busy = staffDayBlocks(vacated, id, day)
    if (busy.some((b) => blocksOverlap(blockById(b), target))) return false
    const withSub = assignTo(vacated, id, blockId, day)
    // Only this candidate's own hours/rest can newly break; everyone else's
    // schedule is untouched by the substitution.
    const after = evaluateWeek(withSub, relevant, staffById, { staffScope: [id] })
    return newHardViolations(baseline, after).length === 0
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
  // The week does not change during the sweep, so its violations are constant.
  const baseline = evaluateWeek(week, rulebook, staffById)
  for (const [key, ids] of Object.entries(eff)) {
    const [blockId, day] = key.split(':')
    for (const staffId of ids) {
      const candidates = backfillCandidates(week, rulebook, staffById, blockId, day, staffId, baseline)
      perAssignment[`${key}:${staffId}`] = { absorbable: candidates.length > 0, candidates }
      total += 1
      if (candidates.length > 0) absorbable += 1
    }
  }
  return { perAssignment, absorbable, total }
}
