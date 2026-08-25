import { describe, expect, it } from 'vitest'
import { slotKey } from '../domain/schedule'
import { evaluateWeek } from '../domain/rules'
import { absorption } from '../domain/absorption'
import { ARCHETYPES } from '../domain/chemistry'
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

  it('gives every staff member a known archetype', () => {
    for (const m of STAFF) {
      expect(Object.keys(ARCHETYPES), `${m.id} archetype`).toContain(m.archetype)
    }
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
