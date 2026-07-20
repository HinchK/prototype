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
