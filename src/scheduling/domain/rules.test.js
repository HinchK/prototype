import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import { evaluateWeek, makeRule, violationsBySlot } from './rules'

const STAFF = [
  makeStaff({ name: 'Dr. Okafor', role: 'DVM', credentials: ['DVM'] }, 'okafor'),
  makeStaff({ name: 'Rosa Delgado', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'rosa'),
  makeStaff({ name: 'Marisol Vega', role: 'Tech', credentials: ['LVT'] }, 'marisol'),
  makeStaff({ name: 'Jenna Kowalski', role: 'Tech', credentials: ['LVT'] }, 'jenna'),
  makeStaff({ name: 'Mabel Ortiz', role: 'CSR', credentials: [] }, 'mabel'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))

const week = (assignments) => createWeek(assignments)
const run = (assignments, rule) => evaluateWeek(week(assignments), [rule], staffById)

describe('rule templates', () => {
  it('min-role-coverage flags each short day, at the seam', () => {
    const rule = makeRule({
      id: 'r1', type: 'min-role-coverage', severity: 'hard',
      params: { blockId: 'surgery', role: 'DVM', count: 1, days: ['Mon', 'Tue'] },
      rationale: 'Surgery never runs without a doctor.',
    })
    const out = run({ [slotKey('surgery', 'Mon')]: ['okafor'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ ruleId: 'r1', severity: 'hard', slotKeys: [slotKey('surgery', 'Tue')] })
    expect(run({ [slotKey('surgery', 'Mon')]: ['okafor'], [slotKey('surgery', 'Tue')]: ['okafor'] }, rule)).toEqual([])
  })

  it('min-credential-coverage counts credentials, not roles', () => {
    const rule = makeRule({
      id: 'r2', type: 'min-credential-coverage', severity: 'hard',
      params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: ['Mon'] },
      rationale: 'Anesthesia needs its own hands.',
    })
    expect(run({ [slotKey('surgery', 'Mon')]: ['marisol', 'jenna'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('surgery', 'Mon')]: ['rosa'] }, rule)).toEqual([])
  })

  it('max-weekly-hours flags any staff over the cap', () => {
    const rule = makeRule({
      id: 'r3', type: 'max-weekly-hours', severity: 'hard',
      params: { maxHours: 9 }, rationale: 'Nobody burns out on my watch.',
    })
    const heavy = {
      [slotKey('appts-am', 'Mon')]: ['rosa'], [slotKey('appts-pm', 'Mon')]: ['rosa'],
      [slotKey('appts-am', 'Tue')]: ['rosa'],
    } // 4 + 5 + 4 = 13h
    const out = run(heavy, rule)
    expect(out).toHaveLength(1)
    expect(out[0].staffIds).toEqual(['rosa'])
    expect(run({ [slotKey('appts-am', 'Mon')]: ['rosa'] }, rule)).toEqual([])
  })

  it('min-rest-gap flags closing then opening the next day', () => {
    const rule = makeRule({
      id: 'r4', type: 'min-rest-gap', severity: 'hard',
      params: {}, rationale: 'Close-then-open is how mistakes happen.',
    })
    const out = run({ [slotKey('kennel-pm', 'Tue')]: ['marisol'], [slotKey('kennel-am', 'Wed')]: ['marisol'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0].slotKeys).toEqual([slotKey('kennel-pm', 'Tue'), slotKey('kennel-am', 'Wed')])
    expect(run({ [slotKey('kennel-pm', 'Tue')]: ['marisol'], [slotKey('kennel-am', 'Thu')]: ['marisol'] }, rule)).toEqual([])
  })

  it('hard-unavailability flags any assignment on a protected day', () => {
    const rule = makeRule({
      id: 'r5', type: 'hard-unavailability', severity: 'hard',
      params: { staffId: 'rosa', days: ['Thu'] }, rationale: 'Rosa has clinicals Thursdays.',
    })
    expect(run({ [slotKey('midday', 'Thu')]: ['rosa'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('midday', 'Fri')]: ['rosa'] }, rule)).toEqual([])
  })

  it('keep-apart flags the pair sharing the target block', () => {
    const rule = makeRule({
      id: 'r6', type: 'keep-apart', severity: 'hard',
      params: { staffIdA: 'marisol', staffIdB: 'jenna', blockId: 'kennel-pm' },
      rationale: 'My two seniors never close together.',
    })
    expect(run({ [slotKey('kennel-pm', 'Fri')]: ['marisol', 'jenna'] }, rule)).toHaveLength(1)
    expect(run({ [slotKey('kennel-pm', 'Fri')]: ['marisol'], [slotKey('kennel-pm', 'Sat')]: ['jenna'] }, rule)).toEqual([])
  })

  it('prefer-pairing (soft) flags A scheduled without B', () => {
    const rule = makeRule({
      id: 'r7', type: 'prefer-pairing', severity: 'soft', weight: 2,
      params: { staffIdA: 'jenna', staffIdB: 'okafor', blockId: 'surgery' },
      rationale: "Jenna's training on dentals — keep her with Dr. Okafor.",
    })
    const out = run({ [slotKey('surgery', 'Mon')]: ['jenna'] }, rule)
    expect(out).toHaveLength(1)
    expect(out[0].severity).toBe('soft')
    expect(run({ [slotKey('surgery', 'Mon')]: ['jenna', 'okafor'] }, rule)).toEqual([])
  })

  it('fair-rotation (soft) flags weekend spread beyond the cap', () => {
    const rule = makeRule({
      id: 'r8', type: 'fair-rotation', severity: 'soft', weight: 1,
      params: { days: ['Sat', 'Sun'], role: 'Tech', maxSpread: 1 },
      rationale: 'Weekends get shared, or resentment does.',
    })
    const skewed = {
      [slotKey('appts-am', 'Sat')]: ['rosa'], [slotKey('appts-pm', 'Sat')]: ['rosa'],
      [slotKey('appts-am', 'Sun')]: ['rosa'],
    } // rosa 3 weekend slots, marisol/jenna 0 -> spread 3
    expect(run(skewed, rule)).toHaveLength(1)
    expect(run({ [slotKey('appts-am', 'Sat')]: ['rosa'], [slotKey('appts-pm', 'Sat')]: ['marisol'], [slotKey('appts-am', 'Sun')]: ['jenna'] }, rule)).toEqual([])
  })
})

describe('evaluateWeek plumbing', () => {
  it('skips unknown rule types and maps worst severity per slot', () => {
    const v = evaluateWeek(week({}), [makeRule({ id: 'x', type: 'not-a-rule', severity: 'hard', params: {}, rationale: '' })], staffById)
    expect(v).toEqual([])
    const map = violationsBySlot([
      { ruleId: 'a', type: 't', severity: 'soft', message: '', slotKeys: ['surgery:Sat'], staffIds: [] },
      { ruleId: 'b', type: 't', severity: 'hard', message: '', slotKeys: ['surgery:Sat'], staffIds: [] },
    ])
    expect(map['surgery:Sat']).toBe('hard')
  })
})
