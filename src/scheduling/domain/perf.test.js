import { describe, expect, it } from 'vitest'
import { createSeededState, STAFF_BY_ID } from '../data/clinic'
import { scheduleReducer } from './schedule'
import { absorption } from './absorption'
import { createHorizon, horizonHealth } from './horizon'
import { suggestMoves } from './suggestions'

// A live walkthrough is the acceptance criterion for this build, so recompute
// cost is a correctness property, not a nicety. These budgets are deliberately
// loose (~10x the measured cost) — they exist to catch an order-of-magnitude
// regression like `staffWeekHours` rebuilding effectiveSlots per staff member,
// which once cost 900ms idle and 3.2s with a call-out active.
const budget = (label, fn, ms) => {
  const started = performance.now()
  fn()
  const elapsed = performance.now() - started
  expect(elapsed, `${label} took ${Math.round(elapsed)}ms, budget ${ms}ms`).toBeLessThan(ms)
}

describe('recompute budgets', () => {
  it('scores absorption for a clean week quickly', () => {
    const s = createSeededState()
    budget('absorption (clean)', () => absorption(s.week, s.rulebook, STAFF_BY_ID), 400)
  })

  it('stays fast with a call-out active — the demo\'s heaviest beat', () => {
    let s = createSeededState()
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'okafor', day: 'Thu' })
    budget('absorption (call-out)', () => absorption(s.week, s.rulebook, STAFF_BY_ID), 600)
  })

  it('builds the four-week horizon and scores it quickly', () => {
    const s = createSeededState()
    budget(
      'horizon + health',
      () => horizonHealth(createHorizon(s.week, STAFF_BY_ID, s.rulebook), s.rulebook, STAFF_BY_ID),
      400,
    )
  })

  it('generates suggestions quickly', () => {
    const s = createSeededState()
    budget('suggestMoves', () => suggestMoves(s.week, s.rulebook, STAFF_BY_ID), 400)
  })
})
