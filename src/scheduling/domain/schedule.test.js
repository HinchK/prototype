import { describe, expect, it } from 'vitest'
import { BLOCKS, DAYS, blockById, blocksOverlap } from './catalog'
import {
  createScheduleState,
  createWeek,
  effectiveSlots,
  isCalledOut,
  scheduleReducer,
  slotKey,
  staffDayBlocks,
  staffWeekHours,
} from './schedule'

const state = () =>
  createScheduleState({
    assignments: { [slotKey('surgery', 'Mon')]: ['rosa'] },
    rulebook: [],
  })

describe('catalog', () => {
  it('defines the eight operational blocks in office-flow order', () => {
    expect(BLOCKS.map((b) => b.id)).toEqual([
      'kennel-am', 'desk-open', 'appts-am', 'surgery',
      'midday', 'appts-pm', 'desk-close', 'kennel-pm',
    ])
    expect(DAYS).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('detects time overlap between blocks', () => {
    expect(blocksOverlap(blockById('surgery'), blockById('appts-am'))).toBe(true)
    expect(blocksOverlap(blockById('surgery'), blockById('kennel-pm'))).toBe(false)
  })
})

describe('week state', () => {
  it('creates all block×day slots, seeding provided assignments', () => {
    const week = createWeek({ [slotKey('surgery', 'Mon')]: ['rosa'] })
    expect(Object.keys(week.slots)).toHaveLength(BLOCKS.length * DAYS.length)
    expect(week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa'])
    expect(week.slots[slotKey('surgery', 'Tue')]).toEqual([])
    expect(week.callOuts).toEqual([])
  })

  it('assigns staff into a slot, guarding duplicates and unknown slots', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'surgery', day: 'Mon' })
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa', 'okafor'])
    expect(scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'surgery', day: 'Mon' })).toBe(s)
    expect(scheduleReducer(s, { type: 'assigned', staffId: 'okafor', blockId: 'nope', day: 'Mon' })).toBe(s)
  })

  it('unassigns and moves staff between slots', () => {
    let s = state()
    s = scheduleReducer(s, {
      type: 'moved', staffId: 'rosa',
      fromBlockId: 'surgery', fromDay: 'Mon', blockId: 'surgery', day: 'Tue',
    })
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual([])
    expect(s.week.slots[slotKey('surgery', 'Tue')]).toEqual(['rosa'])
    s = scheduleReducer(s, { type: 'unassigned', staffId: 'rosa', blockId: 'surgery', day: 'Tue' })
    expect(s.week.slots[slotKey('surgery', 'Tue')]).toEqual([])
  })

  it('toggles call-outs and reflects them in effective slots only', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(isCalledOut(s.week, 'rosa', 'Mon')).toBe(true)
    expect(s.week.slots[slotKey('surgery', 'Mon')]).toEqual(['rosa'])
    expect(effectiveSlots(s.week)[slotKey('surgery', 'Mon')]).toEqual([])
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(isCalledOut(s.week, 'rosa', 'Mon')).toBe(false)
  })

  it('updates rule params in place', () => {
    const s0 = createScheduleState({
      assignments: {},
      rulebook: [{ id: 'r1', type: 'min-role-coverage', severity: 'hard', params: { count: 1 }, rationale: '' }],
    })
    const s1 = scheduleReducer(s0, { type: 'rule-updated', ruleId: 'r1', params: { count: 2 } })
    expect(s1.rulebook[0].params.count).toBe(2)
    expect(s0.rulebook[0].params.count).toBe(1)
  })

  it('resets to a provided state and ignores unknown actions', () => {
    const s = state()
    expect(scheduleReducer(s, { type: 'reset', state: state() }).week.callOuts).toEqual([])
    expect(scheduleReducer(s, { type: 'mystery' })).toBe(s)
  })

  it('derives per-day blocks and weekly hours from effective slots', () => {
    let s = state()
    s = scheduleReducer(s, { type: 'assigned', staffId: 'rosa', blockId: 'kennel-pm', day: 'Mon' })
    expect(staffDayBlocks(s.week, 'rosa', 'Mon')).toEqual(['surgery', 'kennel-pm'])
    expect(staffWeekHours(s.week, 'rosa')).toBe(5 + 3)
    s = scheduleReducer(s, { type: 'call-out-toggled', staffId: 'rosa', day: 'Mon' })
    expect(staffWeekHours(s.week, 'rosa')).toBe(0)
  })

  it('moved with an unknown or already-occupied destination is a no-op', () => {
    const s = state()
    expect(scheduleReducer(s, { type: 'moved', staffId: 'rosa', fromBlockId: 'surgery', fromDay: 'Mon', blockId: 'nope', day: 'Mon' })).toBe(s)
    expect(scheduleReducer(s, { type: 'moved', staffId: 'rosa', fromBlockId: 'surgery', fromDay: 'Mon', blockId: 'surgery', day: 'Mon' })).toBe(s)
  })

  it('rule-updated with an unknown ruleId is a no-op', () => {
    const s0 = createScheduleState({
      assignments: {},
      rulebook: [{ id: 'r1', type: 'min-role-coverage', severity: 'hard', params: { count: 1 }, rationale: '' }],
    })
    expect(scheduleReducer(s0, { type: 'rule-updated', ruleId: 'nope', params: { count: 2 } })).toBe(s0)
  })
})
