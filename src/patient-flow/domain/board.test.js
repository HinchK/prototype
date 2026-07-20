import { describe, it, expect } from 'vitest'
import {
  createBoard,
  boardReducer,
  makeWalkIn,
  canCheckIn,
  openRooms,
  visitStage,
  boardStats,
  matchLobby,
} from './board'
import { ROOMS, EXAM_DURATION_SECONDS } from './catalog'

const walkIn = (urgency = 'Medium', id = `w-${urgency}`) =>
  makeWalkIn(
    { client: 'Marcus', pet: 'Barnaby', species: 'Chihuahua', kind: 'dog', note: 'Fought a broom.', urgency },
    id,
  )

describe('createBoard', () => {
  it('seeds the lobby and opens every room', () => {
    const board = createBoard([walkIn()])
    expect(board.lobby).toHaveLength(1)
    expect(openRooms(board)).toEqual(ROOMS)
    expect(board.completedLog).toEqual([])
  })
})

describe('checked-in', () => {
  it('moves the walk-in from lobby into the room with an urgency-based countdown', () => {
    const board = createBoard([walkIn('High', 'w1')])
    const next = boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Room 2' })
    expect(next.lobby).toHaveLength(0)
    expect(next.rooms['Room 2'].walkIn.id).toBe('w1')
    expect(next.rooms['Room 2'].remainingSeconds).toBe(EXAM_DURATION_SECONDS.High)
    expect(canCheckIn(next, 'Room 2')).toBe(false)
  })

  it('is a no-op when the room is occupied — the walk-in stays in the lobby', () => {
    let board = createBoard([walkIn('High', 'w1'), walkIn('Low', 'w2')])
    board = boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Room 1' })
    const next = boardReducer(board, { type: 'checked-in', walkInId: 'w2', room: 'Room 1' })
    expect(next).toBe(board)
    expect(next.lobby.map((w) => w.id)).toEqual(['w2'])
  })

  it('is a no-op for an unknown walk-in or room', () => {
    const board = createBoard([walkIn('Low', 'w1')])
    expect(boardReducer(board, { type: 'checked-in', walkInId: 'ghost', room: 'Room 1' })).toBe(board)
    expect(boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Broom Closet' })).toBe(board)
  })
})

describe('clock-ticked', () => {
  it('decrements only occupied rooms and floors at zero', () => {
    let board = createBoard([walkIn('High', 'w1')])
    board = boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Surgery' })
    board = boardReducer(board, { type: 'clock-ticked' })
    expect(board.rooms['Surgery'].remainingSeconds).toBe(EXAM_DURATION_SECONDS.High - 1)
    expect(board.rooms['Room 1']).toBeNull()

    for (let i = 0; i < EXAM_DURATION_SECONDS.High + 10; i++) {
      board = boardReducer(board, { type: 'clock-ticked' })
    }
    expect(board.rooms['Surgery'].remainingSeconds).toBe(0)
  })

  it('returns the same board reference when nothing is running', () => {
    const board = createBoard([])
    expect(boardReducer(board, { type: 'clock-ticked' })).toBe(board)
  })
})

describe('visitStage', () => {
  const at = (remainingSeconds) => ({ walkIn: walkIn(), totalSeconds: 120, remainingSeconds })

  it('walks vitals -> exam -> discharging -> ready as the countdown elapses', () => {
    expect(visitStage(at(120))).toBe('vitals')
    expect(visitStage(at(81))).toBe('vitals')
    expect(visitStage(at(80))).toBe('exam')
    expect(visitStage(at(41))).toBe('exam')
    expect(visitStage(at(40))).toBe('discharging')
    expect(visitStage(at(1))).toBe('discharging')
    expect(visitStage(at(0))).toBe('ready')
  })
})

describe('checked-out', () => {
  it('clears the room and appends to the completed log with the room destination', () => {
    let board = createBoard([walkIn('Medium', 'w1')])
    board = boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Room 3' })
    board = boardReducer(board, { type: 'checked-out', room: 'Room 3', at: '10:23 AM' })
    expect(board.rooms['Room 3']).toBeNull()
    expect(board.completedLog).toHaveLength(1)
    expect(board.completedLog[0]).toMatchObject({
      dest: { type: 'room', room: 'Room 3' },
      checkedOutAt: '10:23 AM',
    })
  })

  it('is a no-op on an empty room', () => {
    const board = createBoard([])
    expect(boardReducer(board, { type: 'checked-out', room: 'Room 1', at: 'now' })).toBe(board)
  })
})

describe('care queues', () => {
  it('assigns from the lobby and discharges into the completed log', () => {
    let board = createBoard([walkIn('High', 'w1')])
    board = boardReducer(board, { type: 'assigned-to-doctor', walkInId: 'w1', doctorId: 'young' })
    expect(board.lobby).toHaveLength(0)
    expect(board.careQueues.young.map((w) => w.id)).toEqual(['w1'])

    board = boardReducer(board, { type: 'discharged', doctorId: 'young', walkInId: 'w1', at: '2:15 PM' })
    expect(board.careQueues.young).toHaveLength(0)
    expect(board.completedLog[0].dest).toEqual({ type: 'doctor', doctorId: 'young' })
  })
})

describe('boardStats', () => {
  it('derives urgency from the most urgent waiting walk-in', () => {
    expect(boardStats(createBoard([walkIn('Low', 'a')])).urgencyLevel).toBe('calm')
    expect(boardStats(createBoard([walkIn('Low', 'a'), walkIn('Medium', 'b')])).urgencyLevel).toBe('moderate')
    expect(boardStats(createBoard([walkIn('High', 'c')])).urgencyLevel).toBe('high')
  })

  it('counts occupied rooms and in-care patients as checked in', () => {
    let board = createBoard([walkIn('High', 'w1'), walkIn('Low', 'w2')])
    const base = boardStats(board).checkedIn
    board = boardReducer(board, { type: 'checked-in', walkInId: 'w1', room: 'Room 1' })
    board = boardReducer(board, { type: 'assigned-to-doctor', walkInId: 'w2', doctorId: 'gibbings' })
    expect(boardStats(board).checkedIn).toBe(base + 2)
    expect(boardStats(board).occupiedRooms).toBe(1)
  })
})

describe('matchLobby', () => {
  it('matches pet, client, and species case-insensitively; empty query returns all', () => {
    const board = createBoard([walkIn('Low', 'w1')])
    expect(matchLobby(board, '')).toHaveLength(1)
    expect(matchLobby(board, 'BARN')).toHaveLength(1)
    expect(matchLobby(board, 'chihuahua')).toHaveLength(1)
    expect(matchLobby(board, 'marcus')).toHaveLength(1)
    expect(matchLobby(board, 'penelope')).toHaveLength(0)
  })
})
