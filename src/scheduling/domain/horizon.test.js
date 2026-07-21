import { describe, expect, it } from 'vitest'
import { createSeededState, STAFF_BY_ID } from '../data/clinic'
import { evaluateWeek } from './rules'
import { HORIZON_WEEKS, createHorizon, deriveWeek, horizonChemistry, horizonHealth } from './horizon'

const seeded = () => createSeededState()

describe('deriveWeek', () => {
  it('returns the base week untouched at offset 0', () => {
    const s = seeded()
    expect(deriveWeek(s.week, STAFF_BY_ID, 0, s.rulebook)).toBe(s.week)
  })

  it('leaves weekday assignments alone', () => {
    const s = seeded()
    const next = deriveWeek(s.week, STAFF_BY_ID, 1, s.rulebook)
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      for (const key of Object.keys(s.week.slots).filter((k) => k.endsWith(`:${day}`))) {
        expect(next.slots[key], key).toEqual(s.week.slots[key])
      }
    }
  })

  it('rotates weekend duty to different people', () => {
    const s = seeded()
    const next = deriveWeek(s.week, STAFF_BY_ID, 1, s.rulebook)
    const weekendKeys = Object.keys(s.week.slots).filter(
      (k) => (k.endsWith(':Sat') || k.endsWith(':Sun')) && s.week.slots[k].length > 0,
    )
    const changed = weekendKeys.filter((k) => next.slots[k].join() !== s.week.slots[k].join())
    expect(changed.length).toBeGreaterThan(0)
  })

  it('substitutes only same-role peers who keep every credential', () => {
    const s = seeded()
    for (let offset = 1; offset < HORIZON_WEEKS; offset++) {
      const next = deriveWeek(s.week, STAFF_BY_ID, offset, s.rulebook)
      for (const day of ['Sat', 'Sun']) {
        for (const key of Object.keys(s.week.slots).filter((k) => k.endsWith(`:${day}`))) {
          const before = s.week.slots[key]
          const after = next.slots[key]
          expect(after, key).toHaveLength(before.length)
          before.forEach((originalId, i) => {
            const original = STAFF_BY_ID[originalId]
            const replacement = STAFF_BY_ID[after[i]]
            expect(replacement.role, `${key} role`).toBe(original.role)
            for (const cred of original.credentials) {
              expect(replacement.credentials, `${key} ${cred}`).toContain(cred)
            }
          })
        }
      }
    }
  })

  it('never double-books one person inside a slot', () => {
    const s = seeded()
    for (let offset = 1; offset < HORIZON_WEEKS; offset++) {
      const next = deriveWeek(s.week, STAFF_BY_ID, offset, s.rulebook)
      for (const [key, ids] of Object.entries(next.slots)) {
        expect(new Set(ids).size, `${key} @${offset}`).toBe(ids.length)
      }
    }
  })

  it('is deterministic — same inputs, same projection', () => {
    const s = seeded()
    expect(deriveWeek(s.week, STAFF_BY_ID, 2, s.rulebook)).toEqual(deriveWeek(s.week, STAFF_BY_ID, 2, s.rulebook))
  })

  it('starts projections free of the live week\'s call-outs', () => {
    const s = seeded()
    const withCallOut = { ...s.week, callOuts: [{ staffId: 'rosa', day: 'Sat' }] }
    expect(deriveWeek(withCallOut, STAFF_BY_ID, 1, s.rulebook).callOuts).toEqual([])
  })
})

describe('createHorizon', () => {
  it('puts the live week first and projects the rest', () => {
    const s = seeded()
    const weeks = createHorizon(s.week, STAFF_BY_ID, s.rulebook)
    expect(weeks).toHaveLength(HORIZON_WEEKS)
    expect(weeks[0]).toBe(s.week)
  })

  // A projection must never invent a problem the real week does not have.
  // Rotating Saturday's openers can pull in someone who closed on Friday — a
  // day the rotation leaves untouched — so the generator validates against the
  // rulebook and reverts offending weekend slots.
  it('introduces no hard violation the base week did not already have', () => {
    const s = seeded()
    const signature = (week) =>
      evaluateWeek(week, s.rulebook, STAFF_BY_ID)
        .filter((v) => v.severity === 'hard')
        .map((v) => `${v.ruleId}@${v.slotKeys.join('+')}`)
        .sort()
    const base = new Set(signature(s.week))
    for (const week of createHorizon(s.week, STAFF_BY_ID, s.rulebook).slice(1)) {
      const introduced = signature(week).filter((v) => !base.has(v))
      expect(introduced).toEqual([])
    }
  })
})

describe('horizonChemistry', () => {
  it('produces a week x day grid', () => {
    const s = seeded()
    const grid = horizonChemistry(createHorizon(s.week, STAFF_BY_ID, s.rulebook), STAFF_BY_ID)
    expect(grid).toHaveLength(HORIZON_WEEKS)
    expect(grid[0].week).toBe(1)
    expect(grid[0].days).toHaveLength(7)
    expect(grid[0].days[0]).toHaveProperty('chemistry')
  })
})

describe('horizonHealth', () => {
  it('reports per-week detail alongside month aggregates', () => {
    const s = seeded()
    const h = horizonHealth(createHorizon(s.week, STAFF_BY_ID, s.rulebook), s.rulebook, STAFF_BY_ID)
    expect(h.perWeek).toHaveLength(HORIZON_WEEKS)
    expect(h.score).toBeGreaterThan(0)
    expect(h.coverage).toBeGreaterThan(0)
  })

  it('totals burnout and unfilled rather than averaging them away', () => {
    const s = seeded()
    const weeks = createHorizon(s.week, STAFF_BY_ID, s.rulebook)
    const h = horizonHealth(weeks, s.rulebook, STAFF_BY_ID)
    expect(h.unfilled).toBe(h.perWeek.reduce((n, w) => n + w.unfilled, 0))
    expect(h.burnout).toBe(h.perWeek.reduce((n, w) => n + w.burnout, 0))
  })

  it('rates a rotating month fairer than any single week of it', () => {
    // The reason the horizon exists: one week concentrates weekend duty on a
    // few people; a month that rotates it spreads the load.
    const s = seeded()
    const weeks = createHorizon(s.week, STAFF_BY_ID, s.rulebook)
    const h = horizonHealth(weeks, s.rulebook, STAFF_BY_ID)
    expect(h.fairness).toBeGreaterThan(h.perWeek[0].fairness)
  })
})
