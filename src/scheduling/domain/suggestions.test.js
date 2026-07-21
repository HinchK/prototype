import { describe, expect, it } from 'vitest'
import { createSeededState, STAFF_BY_ID } from '../data/clinic'
import { scheduleReducer } from './schedule'
import { scheduleHealth } from './health'
import { suggestMoves } from './suggestions'

const seeded = () => createSeededState()

describe('suggestMoves on the seeded week', () => {
  it('proposes at least one move', () => {
    const s = seeded()
    expect(suggestMoves(s.week, s.rulebook, STAFF_BY_ID).length).toBeGreaterThan(0)
  })

  it('offers a coverage fill for the planted Saturday surgery gap', () => {
    const s = seeded()
    const fill = suggestMoves(s.week, s.rulebook, STAFF_BY_ID).find((m) => m.kind === 'coverage')
    expect(fill).toBeDefined()
    expect(fill.id).toContain('surgery:Sat')
    expect(fill.apply).toEqual([
      { type: 'assigned', staffId: expect.any(String), blockId: 'surgery', day: 'Sat' },
    ])
  })

  it('gives every suggestion a dispatchable list of real reducer actions', () => {
    const s = seeded()
    for (const m of suggestMoves(s.week, s.rulebook, STAFF_BY_ID)) {
      expect(Array.isArray(m.apply), `${m.id} apply is a list`).toBe(true)
      expect(m.apply.length, `${m.id} apply non-empty`).toBeGreaterThan(0)
      for (const action of m.apply) {
        expect(['assigned', 'unassigned'], `${m.id} action type`).toContain(action.type)
        expect(STAFF_BY_ID[action.staffId], `${m.id} staff`).toBeDefined()
      }
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.detail.length).toBeGreaterThan(0)
    }
  })

  // The anti-theater test: EVERY badge on EVERY suggestion must survive
  // actually dispatching that suggestion through the real reducer. This is
  // what stops the dashboard from advertising numbers nothing can produce.
  it('reports only impacts that are real — applying each move reproduces them', () => {
    const s = seeded()
    const before = scheduleHealth(s.week, s.rulebook, STAFF_BY_ID)
    const moves = suggestMoves(s.week, s.rulebook, STAFF_BY_ID)
    expect(moves.length).toBeGreaterThan(1)

    for (const move of moves) {
      const applied = move.apply.reduce((state, action) => scheduleReducer(state, action), s)
      expect(applied.week, `${move.id} actually changed the week`).not.toBe(s.week)
      const after = scheduleHealth(applied.week, s.rulebook, STAFF_BY_ID)

      for (const { label, delta } of move.impact) {
        const key = { Coverage: 'coverage', Chemistry: 'chemistry', Fairness: 'fairness', Burnout: 'burnout' }[label]
        const actual = after[key] - before[key]
        const unit = label === 'Coverage' ? '%' : ''
        expect(`${move.id} ${label} ${delta}`).toBe(
          `${move.id} ${label} ${actual > 0 ? '+' : ''}${actual}${unit}`,
        )
      }
    }
  })

  it('never advertises an impact of zero', () => {
    const s = seeded()
    for (const m of suggestMoves(s.week, s.rulebook, STAFF_BY_ID)) {
      for (const i of m.impact) expect(i.delta, `${m.id} ${i.label}`).not.toMatch(/^\+?0/)
    }
  })
})
