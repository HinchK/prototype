import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import { makeRule } from './rules'
import { burnoutStreaks, fairnessSpread, scheduleHealth } from './health'

const STAFF = [
  makeStaff({ name: 'Rosa', role: 'Tech', credentials: ['LVT'], archetype: 'Anchor' }, 'rosa'),
  makeStaff({ name: 'Imani', role: 'Tech', credentials: ['LVT'], archetype: 'Spark' }, 'imani'),
  makeStaff({ name: 'Chen', role: 'Tech', credentials: ['LVT'], archetype: 'Empath' }, 'chen'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))

const onDays = (staffId, days) =>
  Object.fromEntries(days.map((d) => [slotKey('midday', d), [staffId]]))

describe('burnoutStreaks', () => {
  it('flags a run of consecutive working days at or over the threshold', () => {
    const week = createWeek(onDays('rosa', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']))
    expect(burnoutStreaks(week, staffById, 6)).toEqual([{ staffId: 'rosa', days: 6, from: 'Mon', to: 'Sat' }])
  })

  it('does not flag a run broken by a day off', () => {
    const week = createWeek(onDays('rosa', ['Mon', 'Tue', 'Wed', 'Fri', 'Sat', 'Sun']))
    expect(burnoutStreaks(week, staffById, 6)).toEqual([])
  })

  it('reports the longest streak per person, not one per day', () => {
    const week = createWeek(onDays('rosa', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']))
    const flags = burnoutStreaks(week, staffById, 6)
    expect(flags).toHaveLength(1)
    expect(flags[0].days).toBe(7)
  })

  it('ignores called-out days when measuring a streak', () => {
    const week = {
      ...createWeek(onDays('rosa', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])),
      callOuts: [{ staffId: 'rosa', day: 'Wed' }],
    }
    expect(burnoutStreaks(week, staffById, 6)).toEqual([])
  })
})

describe('fairnessSpread', () => {
  it('is 100 when weekend load is perfectly even', () => {
    const week = createWeek({
      [slotKey('midday', 'Sat')]: ['rosa', 'imani', 'chen'],
      [slotKey('midday', 'Sun')]: ['rosa', 'imani', 'chen'],
    })
    expect(fairnessSpread(week, staffById)).toBe(100)
  })

  it('drops as one person absorbs more weekends than another', () => {
    // All three are active staff (they work weekdays); only the weekend
    // distribution differs. Comparing weekend load among people who never
    // work at all would be meaningless, so both fixtures keep everyone busy.
    const weekdays = { [slotKey('midday', 'Mon')]: ['rosa', 'imani', 'chen'] }
    const even = createWeek({ ...weekdays, [slotKey('midday', 'Sat')]: ['rosa', 'imani', 'chen'] })
    const skewed = createWeek({
      ...weekdays,
      [slotKey('midday', 'Sat')]: ['rosa'],
      [slotKey('appts-am', 'Sat')]: ['rosa'],
      [slotKey('midday', 'Sun')]: ['rosa'],
    })
    expect(fairnessSpread(even, staffById)).toBe(100)
    expect(fairnessSpread(skewed, staffById)).toBeLessThan(100)
  })

  it('is 100 when nobody works the weekend at all', () => {
    expect(fairnessSpread(createWeek({}), staffById)).toBe(100)
  })
})

describe('scheduleHealth', () => {
  const rulebook = [
    makeRule({
      id: 'r-cov',
      type: 'min-role-coverage',
      params: { blockId: 'midday', role: 'Tech', count: 1, days: ['Mon'] },
      rationale: 'Someone covers lunch.',
    }),
  ]

  it('returns every component the dashboard displays', () => {
    const week = createWeek({ [slotKey('midday', 'Mon')]: ['rosa', 'imani'] })
    const h = scheduleHealth(week, rulebook, staffById)
    expect(h).toHaveProperty('score')
    expect(h).toHaveProperty('coverage')
    expect(h).toHaveProperty('fairness')
    expect(h).toHaveProperty('chemistry')
    expect(h).toHaveProperty('burnout')
    expect(h).toHaveProperty('unfilled')
    expect(h.score).toBeGreaterThanOrEqual(0)
    expect(h.score).toBeLessThanOrEqual(100)
  })

  it('scores a satisfied week higher than one with a violation', () => {
    const good = createWeek({ [slotKey('midday', 'Mon')]: ['rosa', 'imani'] })
    const bad = createWeek({})
    expect(scheduleHealth(good, rulebook, staffById).score)
      .toBeGreaterThan(scheduleHealth(bad, rulebook, staffById).score)
  })

  it('counts unfilled as the slots the rulebook wanted and did not get', () => {
    expect(scheduleHealth(createWeek({}), rulebook, staffById).unfilled).toBe(1)
  })
})
