// Suggested moves — the "practice intelligence" the dashboard leads with.
// Pure module: no React, no clocks, no I/O.
//
// Every suggestion is generated from the live week and carries an impact that
// is MEASURED, not asserted: propose a concrete change, simulate it, diff the
// health components, and report the delta. If a move cannot be simulated, it
// does not get an impact badge. The prototype this replaces hardcoded strings
// like "Client CSAT +8" — a number nothing in the system could compute.
//
// Interface:
//   suggestMoves(week, rulebook, staffById, staff) -> Suggestion[]
//
// Suggestion:
//   { id, kind, title, detail, impact: [{label, delta}], apply: Action[] }
// `apply` is an ORDERED list of scheduleReducer actions. A list, not a single
// action, because a swap is genuinely two operations (vacate, then fill) and
// collapsing it into one invented action type would mean the badge described a
// change the reducer could not actually perform. The UI dispatches them in
// order and never re-derives what to do.
import { BLOCKS, DAYS, blockById } from './catalog'
import { assignTo, effectiveSlots, removeFrom, slotKey, staffDayBlocks } from './schedule'
import { evaluateWeek } from './rules'
import { backfillCandidates } from './absorption'
import { burnoutStreaks, scheduleHealth } from './health'
import { pairChemistry, slotChemistry } from './chemistry'

/** Format a measured delta as a signed badge value. */
const signed = (n, unit = '') => `${n > 0 ? '+' : ''}${n}${unit}`

/**
 * Diff the health components between the current week and a simulated one.
 * Only non-zero movements are reported, so a badge never claims a change that
 * did not happen.
 * @returns {{label: string, delta: string}[]}
 */
function measureImpact(before, after) {
  const out = []
  const track = [
    ['Coverage', 'coverage', '%'],
    ['Chemistry', 'chemistry', ''],
    ['Fairness', 'fairness', ''],
  ]
  for (const [label, key, unit] of track) {
    const delta = after[key] - before[key]
    if (delta !== 0) out.push({ label, delta: signed(delta, unit) })
  }
  const burnoutDelta = after.burnout - before.burnout
  if (burnoutDelta !== 0) out.push({ label: 'Burnout', delta: signed(burnoutDelta) })
  return out
}

/**
 * Fill a coverage gap: for each coverage violation, find a safe back-fill and
 * measure what adding them does.
 */
function coverageFills(week, rulebook, staffById, before) {
  const out = []
  const violations = evaluateWeek(week, rulebook, staffById).filter(
    (v) => v.type === 'min-role-coverage' || v.type === 'min-credential-coverage',
  )
  for (const v of violations) {
    if (v.slotKeys.length !== 1) continue
    const [blockId, day] = v.slotKeys[0].split(':')
    const rule = rulebook.find((r) => r.id === v.ruleId)
    const need = rule?.params.credential ?? null
    const role = rule?.params.role ?? null
    const candidates = backfillCandidates(week, rulebook, staffById, blockId, day, null).filter((id) =>
      need ? staffById[id].credentials.includes(need) : staffById[id].role === role,
    )
    if (candidates.length === 0) continue

    // Prefer the candidate who most improves the slot's chemistry.
    const current = effectiveSlots(week)[v.slotKeys[0]]
    const best = candidates
      .map((id) => ({ id, chem: slotChemistry([...current, id], staffById) ?? 0 }))
      .sort((a, b) => b.chem - a.chem)[0]

    const after = scheduleHealth(assignTo(week, best.id, blockId, day), rulebook, staffById)
    out.push({
      id: `fill:${v.slotKeys[0]}`,
      kind: 'coverage',
      title: `Fill ${blockById(blockId).label} ${day}`,
      detail: `${staffById[best.id].name} covers the gap — ${need ?? role} minimum met`,
      impact: measureImpact(before, after),
      apply: [{ type: 'assigned', staffId: best.id, blockId, day }],
    })
  }
  return out
}

/**
 * Break up a burnout streak: drop the person from their lightest day in the
 * run and measure the relief.
 */
function burnoutRelief(week, rulebook, staffById, before, streaks) {
  const out = []
  for (const flag of streaks) {
    const runDays = DAYS.slice(DAYS.indexOf(flag.from), DAYS.indexOf(flag.to) + 1)
    // The middle of the run is the restful place to cut.
    const day = runDays[Math.floor(runDays.length / 2)]
    const blocks = staffDayBlocks(week, flag.staffId, day)
    if (blocks.length === 0) continue
    const blockId = blocks[0]
    const simulated = removeFrom(week, flag.staffId, blockId, day)
    const after = scheduleHealth(simulated, rulebook, staffById)
    // Only offer it if it does not open a coverage hole.
    if (after.coverage < before.coverage) continue
    out.push({
      id: `rest:${flag.staffId}`,
      kind: 'wellness',
      title: 'Burnout guard',
      detail: `${staffById[flag.staffId].name} is on a ${flag.days}-day run — insert ${day} rest`,
      impact: measureImpact(before, after),
      apply: [{ type: 'unassigned', staffId: flag.staffId, blockId, day }],
    })
  }
  return out
}

/**
 * Improve a weak pairing: find the lowest-chemistry staffed slot and, if a
 * swap with a free colleague of the same role raises it, propose that.
 */
function chemistryLifts(week, rulebook, staffById, before, limit = 2) {
  const eff = effectiveSlots(week)
  const scored = []
  for (const block of BLOCKS) {
    for (const day of DAYS) {
      const key = slotKey(block.id, day)
      const ids = eff[key]
      const chem = slotChemistry(ids, staffById)
      if (chem !== null) scored.push({ key, blockId: block.id, day, ids, chem })
    }
  }
  scored.sort((a, b) => a.chem - b.chem)

  const out = []
  for (const slot of scored) {
    if (out.length >= limit) break
    // The person dragging the pairing down the most.
    const weakest = slot.ids
      .map((id) => ({
        id,
        mean:
          slot.ids.filter((o) => o !== id).reduce((s, o) => s + pairChemistry(staffById[id], staffById[o]), 0) /
          Math.max(1, slot.ids.length - 1),
      }))
      .sort((a, b) => a.mean - b.mean)[0]
    if (!weakest) continue

    const role = staffById[weakest.id].role
    const rest = slot.ids.filter((id) => id !== weakest.id)
    const replacements = Object.keys(staffById).filter(
      (id) =>
        !slot.ids.includes(id) &&
        staffById[id].role === role &&
        staffDayBlocks(week, id, slot.day).length === 0 &&
        (slotChemistry([...rest, id], staffById) ?? 0) > slot.chem,
    )
    if (replacements.length === 0) continue
    const best = replacements
      .map((id) => ({ id, chem: slotChemistry([...rest, id], staffById) ?? 0 }))
      .sort((a, b) => b.chem - a.chem)[0]

    const simulated = assignTo(removeFrom(week, weakest.id, slot.blockId, slot.day), best.id, slot.blockId, slot.day)
    const after = scheduleHealth(simulated, rulebook, staffById)
    if (after.coverage < before.coverage) continue
    out.push({
      id: `chem:${slot.key}`,
      kind: 'pairing',
      title: `Rebalance ${blockById(slot.blockId).label} ${slot.day}`,
      detail: `${staffById[best.id].name} (${staffById[best.id].archetype}) in for ${staffById[weakest.id].name} — pairing ${slot.chem} → ${best.chem}`,
      impact: measureImpact(before, after),
      // Vacate then fill — the same two steps the simulation above measured.
      apply: [
        { type: 'unassigned', staffId: weakest.id, blockId: slot.blockId, day: slot.day },
        { type: 'assigned', staffId: best.id, blockId: slot.blockId, day: slot.day },
      ],
    })
  }
  return out
}

/**
 * Generate the ranked move list. Coverage gaps first (a hole is worse than an
 * awkward pairing), then wellness, then chemistry polish.
 * @returns {{id: string, kind: string, title: string, detail: string, impact: {label: string, delta: string}[], apply: Object}[]}
 */
export function suggestMoves(week, rulebook, staffById) {
  const health = scheduleHealth(week, rulebook, staffById)
  // scheduleHealth reports burnout as a count; the relief generator needs the
  // actual runs, so compute them once here and thread them through.
  const streaks = burnoutStreaks(week, staffById)

  return [
    ...coverageFills(week, rulebook, staffById, health),
    ...burnoutRelief(week, rulebook, staffById, health, streaks),
    ...chemistryLifts(week, rulebook, staffById, health),
  ]
}
