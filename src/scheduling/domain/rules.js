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
      for (const id of ctx.staffScope) {
        const hours = staffWeekHours(ctx.week, id, ctx.eff)
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
      for (const id of ctx.staffScope) {
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
export function evaluateWeek(week, rulebook, staffById, options = {}) {
  const ctx = {
    eff: effectiveSlots(week),
    week,
    staffById,
    // Person-scoped rules (hours caps, rest gaps) walk this list. Narrowing it
    // is a pure optimization for callers asking a targeted question — "does
    // moving THIS person here break anything?" — where checking the other 57
    // staff re-derives an answer that cannot have changed. Semantics are
    // unaffected for the people in scope.
    staffScope: options.staffScope ?? Object.keys(staffById),
  }
  return rulebook.flatMap((rule) => RULE_TEMPLATES[rule.type]?.evaluate(rule, ctx) ?? [])
}

/**
 * Identity of a violation — which rule failed, where, about whom.
 * @param {{ruleId: string, slotKeys: string[], staffIds: string[]}} v
 */
export const violationKey = (v) => `${v.ruleId}@${v.slotKeys.join('+')}|${v.staffIds.join('+')}`

/**
 * Hard violations present in `after` that are not in `before`, compared by
 * IDENTITY rather than count.
 *
 * Counting is not good enough and the difference is not academic: a change that
 * repairs one violation while creating a different one nets to zero, so a
 * count check waves it through. That is how a candidate who is hard-unavailable
 * gets offered as a "repair" for a coverage gap — the gap closes, their
 * unavailability opens, the total is unchanged, and the UI reports only the
 * upside. Compare what actually broke, not how many things broke.
 *
 * @param {ReturnType<typeof evaluateWeek>} before
 * @param {ReturnType<typeof evaluateWeek>} after
 * @returns {ReturnType<typeof evaluateWeek>}
 */
export function newHardViolations(before, after) {
  const known = new Set(before.filter((v) => v.severity === 'hard').map(violationKey))
  return after.filter((v) => v.severity === 'hard' && !known.has(violationKey(v)))
}

/** @param {ReturnType<typeof evaluateWeek>} violations @returns {Record<string, 'hard' | 'soft'>} */
export function violationsBySlot(violations) {
  const map = {}
  for (const v of violations)
    for (const key of v.slotKeys) if (map[key] !== 'hard') map[key] = v.severity
  return map
}
