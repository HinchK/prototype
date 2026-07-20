import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import { makeRule } from './rules'
import { absorption, backfillCandidates } from './absorption'

const STAFF = [
  makeStaff({ name: 'Rosa Delgado', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'rosa'),
  makeStaff({ name: 'Imani Cole', role: 'Tech', credentials: ['LVT', 'LVT-A'] }, 'imani'),
  makeStaff({ name: 'Priya Sharma', role: 'Tech', credentials: ['LVT'] }, 'priya'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))
const RULE = makeRule({
  id: 'r-anesthesia', type: 'min-credential-coverage', severity: 'hard',
  params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: ['Thu'] },
  rationale: 'Anesthesia needs its own hands.',
})

describe('backfillCandidates', () => {
  it('offers a free, qualified substitute', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'] })
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual(['imani'])
  })

  it('rejects substitutes whose day has a time overlap', () => {
    const week = createWeek({
      [slotKey('surgery', 'Thu')]: ['rosa'],
      [slotKey('appts-am', 'Thu')]: ['imani'], // 8–12 overlaps surgery 9–14
    })
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual([])
  })

  it('rejects substitutes that would leave a new hard violation open', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'], [slotKey('kennel-pm', 'Thu')]: ['imani'] })
    // imani free at surgery time? kennel-pm 17–20 does NOT overlap surgery 9–14,
    // so imani qualifies; priya (plain LVT) must not — subbing priya leaves the
    // LVT-A minimum broken, a hard violation the original week didn't have.
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual(['imani'])
  })

  it('rejects called-out substitutes', () => {
    const week = { ...createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'] }), callOuts: [{ staffId: 'imani', day: 'Thu' }] }
    expect(backfillCandidates(week, [RULE], staffById, 'surgery', 'Thu', 'rosa')).toEqual([])
  })
})

describe('absorption', () => {
  it('scores every effective assignment', () => {
    const week = createWeek({ [slotKey('surgery', 'Thu')]: ['rosa'], [slotKey('midday', 'Mon')]: ['priya'] })
    const result = absorption(week, [RULE], staffById)
    expect(result.total).toBe(2)
    expect(result.perAssignment[`${slotKey('surgery', 'Thu')}:rosa`].absorbable).toBe(true)
    expect(result.perAssignment[`${slotKey('midday', 'Mon')}:priya`].candidates).toContain('rosa')
    expect(result.absorbable).toBe(2)
  })
})
