import { describe, expect, it } from 'vitest'
import { createWeek, makeStaff, slotKey } from './schedule'
import {
  ARCHETYPES,
  SYNERGY,
  archetypeMix,
  dayChemistry,
  pairChemistry,
  slotChemistry,
  weekChemistry,
} from './chemistry'

const STAFF = [
  makeStaff({ name: 'Rosa', role: 'Tech', credentials: ['LVT'], archetype: 'Anchor' }, 'rosa'),
  makeStaff({ name: 'Imani', role: 'Tech', credentials: ['LVT'], archetype: 'Spark' }, 'imani'),
  makeStaff({ name: 'Chen', role: 'Tech', credentials: ['LVT'], archetype: 'Empath' }, 'chen'),
  makeStaff({ name: 'Noor', role: 'Tech', credentials: ['LVT'], archetype: 'Anchor' }, 'noor'),
]
const staffById = Object.fromEntries(STAFF.map((s) => [s.id, s]))

describe('archetypes', () => {
  it('defines the five archetypes with a blurb and a color', () => {
    expect(Object.keys(ARCHETYPES)).toEqual(['Anchor', 'Spark', 'Empath', 'Analyst', 'Shield'])
    for (const a of Object.values(ARCHETYPES)) {
      expect(a.blurb.length).toBeGreaterThan(0)
      expect(a.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('has a symmetric synergy matrix covering every pairing', () => {
    const keys = Object.keys(ARCHETYPES)
    for (const a of keys) {
      for (const b of keys) {
        expect(SYNERGY[a][b], `${a}->${b}`).toBeTypeOf('number')
        expect(SYNERGY[a][b], `${a}/${b} symmetry`).toBe(SYNERGY[b][a])
      }
    }
  })
})

describe('pairChemistry', () => {
  it('reads the synergy matrix for two staff', () => {
    expect(pairChemistry(staffById.rosa, staffById.imani)).toBe(SYNERGY.Anchor.Spark)
  })

  it('is order-independent', () => {
    expect(pairChemistry(staffById.rosa, staffById.chen)).toBe(pairChemistry(staffById.chen, staffById.rosa))
  })
})

describe('slotChemistry', () => {
  it('averages every pairing in the slot', () => {
    // Anchor/Spark, Anchor/Empath, Spark/Empath
    const expected = Math.round(
      (SYNERGY.Anchor.Spark + SYNERGY.Anchor.Empath + SYNERGY.Spark.Empath) / 3,
    )
    expect(slotChemistry(['rosa', 'imani', 'chen'], staffById)).toBe(expected)
  })

  it('returns null for a slot that cannot pair (0 or 1 staff)', () => {
    expect(slotChemistry([], staffById)).toBeNull()
    expect(slotChemistry(['rosa'], staffById)).toBeNull()
  })

  it('ignores unknown staff ids rather than throwing', () => {
    expect(slotChemistry(['rosa', 'ghost'], staffById)).toBeNull()
    expect(slotChemistry(['rosa', 'imani', 'ghost'], staffById)).toBe(SYNERGY.Anchor.Spark)
  })
})

describe('dayChemistry and weekChemistry', () => {
  it('averages only the slots that actually have a pairing', () => {
    const week = createWeek({
      [slotKey('surgery', 'Mon')]: ['rosa', 'imani'],
      [slotKey('midday', 'Mon')]: ['chen'], // solo — contributes nothing
    })
    expect(dayChemistry(week, 'Mon', staffById)).toBe(SYNERGY.Anchor.Spark)
  })

  it('returns null for a day with no pairings at all', () => {
    expect(dayChemistry(createWeek({}), 'Tue', staffById)).toBeNull()
  })

  it('averages the week over its scoreable days', () => {
    const week = createWeek({
      [slotKey('surgery', 'Mon')]: ['rosa', 'imani'],
      [slotKey('surgery', 'Tue')]: ['rosa', 'chen'],
    })
    const expected = Math.round((SYNERGY.Anchor.Spark + SYNERGY.Anchor.Empath) / 2)
    expect(weekChemistry(week, staffById)).toBe(expected)
  })

  it('excludes called-out staff from chemistry', () => {
    const week = {
      ...createWeek({ [slotKey('surgery', 'Mon')]: ['rosa', 'imani', 'chen'] }),
      callOuts: [{ staffId: 'chen', day: 'Mon' }],
    }
    expect(dayChemistry(week, 'Mon', staffById)).toBe(SYNERGY.Anchor.Spark)
  })
})

describe('archetypeMix', () => {
  it('counts staff per archetype, preserving archetype order', () => {
    expect(archetypeMix(STAFF)).toEqual([
      { key: 'Anchor', count: 2, color: ARCHETYPES.Anchor.color },
      { key: 'Spark', count: 1, color: ARCHETYPES.Spark.color },
      { key: 'Empath', count: 1, color: ARCHETYPES.Empath.color },
      { key: 'Analyst', count: 0, color: ARCHETYPES.Analyst.color },
      { key: 'Shield', count: 0, color: ARCHETYPES.Shield.color },
    ])
  })
})
