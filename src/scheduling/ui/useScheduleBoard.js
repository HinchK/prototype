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
