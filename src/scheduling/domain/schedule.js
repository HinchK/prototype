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
      const destKey = slotKey(action.blockId, action.day)
      if (!(destKey in state.week.slots) || state.week.slots[destKey].includes(action.staffId))
        return state
      const from = removeFrom(state.week, action.staffId, action.fromBlockId, action.fromDay)
      if (from === state.week) return state
      return { ...state, week: assignTo(from, action.staffId, action.blockId, action.day) }
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

    case 'rule-updated': {
      if (!state.rulebook.some((r) => r.id === action.ruleId)) return state
      return {
        ...state,
        rulebook: state.rulebook.map((r) =>
          r.id === action.ruleId ? { ...r, params: { ...r.params, ...action.params } } : r,
        ),
      }
    }

    case 'reset':
      return action.state

    default:
      return state
  }
}
