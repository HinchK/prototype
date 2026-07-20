// Patient-flow domain — the triage board state machine.
//
// Pure module: no React, no clocks, no I/O. The board is an immutable value;
// boardReducer maps (board, action) -> board. Anything time- or identity-
// related (timestamps, ids) is injected via action payloads or factory
// arguments, which is what keeps this file trivially testable.
//
// Interface:
//   createBoard(lobby)          -> Board
//   boardReducer(board, action) -> Board       (unknown/invalid actions: same board back)
//   makeWalkIn(fields, id?)     -> WalkIn
//   canCheckIn(board, room)     -> boolean
//   openRooms(board)            -> string[]
//   visitStage(visit)           -> 'vitals' | 'exam' | 'discharging' | 'ready'
//   boardStats(board)           -> { checkedIn, occupiedRooms, roomCount, avgWaitMinutes, urgencyLevel }
//   matchLobby(board, query)    -> WalkIn[]
import { ROOMS, DOCTORS, EXAM_DURATION_SECONDS } from './catalog'

/** @typedef {'High' | 'Medium' | 'Low'} Urgency */

/**
 * A client-and-pet party waiting in the lobby without an appointment.
 * @typedef {Object} WalkIn
 * @property {string} id
 * @property {string} client  Human(s) attached to the pet
 * @property {string} pet
 * @property {string} species
 * @property {string} kind    Icon key: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | ...
 * @property {string} note    Front-desk color commentary
 * @property {Urgency} urgency
 */

/**
 * An in-progress exam occupying a room.
 * @typedef {Object} Visit
 * @property {WalkIn} walkIn
 * @property {number} totalSeconds
 * @property {number} remainingSeconds
 */

/**
 * Where a completed visit happened: an exam room or a doctor's care queue.
 * @typedef {{ type: 'room', room: string } | { type: 'doctor', doctorId: string }} Destination
 */

/**
 * @typedef {Object} CompletedVisit
 * @property {WalkIn} walkIn
 * @property {Destination} dest
 * @property {string} checkedOutAt  Display time, supplied by the caller
 */

/**
 * @typedef {Object} Board
 * @property {WalkIn[]} lobby
 * @property {Record<string, Visit | null>} rooms       Keyed by room name
 * @property {Record<string, WalkIn[]>} careQueues      Keyed by doctor id
 * @property {CompletedVisit[]} completedLog
 */

/** @param {Omit<WalkIn, 'id'>} fields @param {string} [id] @returns {WalkIn} */
export const makeWalkIn = (fields, id = crypto.randomUUID()) => ({ id, ...fields })

/** @param {WalkIn[]} lobby @returns {Board} */
export const createBoard = (lobby = []) => ({
  lobby,
  rooms: Object.fromEntries(ROOMS.map((r) => [r, null])),
  careQueues: Object.fromEntries(DOCTORS.map((d) => [d.id, []])),
  completedLog: [],
})

/** @param {Board} board @param {string} room */
export const canCheckIn = (board, room) => room in board.rooms && !board.rooms[room]

/** @param {Board} board @returns {string[]} */
export const openRooms = (board) => ROOMS.filter((r) => !board.rooms[r])

/**
 * @param {Board} board
 * @param {{ type: string } & Record<string, any>} action
 * @returns {Board}
 */
export function boardReducer(board, action) {
  switch (action.type) {
    case 'walk-in-arrived':
      return { ...board, lobby: [...board.lobby, action.walkIn] }

    case 'checked-in': {
      const walkIn = board.lobby.find((w) => w.id === action.walkInId)
      if (!walkIn || !canCheckIn(board, action.room)) return board
      const totalSeconds = EXAM_DURATION_SECONDS[walkIn.urgency] ?? 180
      return {
        ...board,
        lobby: board.lobby.filter((w) => w.id !== action.walkInId),
        rooms: { ...board.rooms, [action.room]: { walkIn, totalSeconds, remainingSeconds: totalSeconds } },
      }
    }

    case 'assigned-to-doctor': {
      const walkIn = board.lobby.find((w) => w.id === action.walkInId)
      if (!walkIn || !(action.doctorId in board.careQueues)) return board
      return {
        ...board,
        lobby: board.lobby.filter((w) => w.id !== action.walkInId),
        careQueues: {
          ...board.careQueues,
          [action.doctorId]: [...board.careQueues[action.doctorId], walkIn],
        },
      }
    }

    case 'checked-out': {
      const visit = board.rooms[action.room]
      if (!visit) return board
      return {
        ...board,
        rooms: { ...board.rooms, [action.room]: null },
        completedLog: [
          ...board.completedLog,
          { walkIn: visit.walkIn, dest: { type: 'room', room: action.room }, checkedOutAt: action.at },
        ],
      }
    }

    case 'discharged': {
      const queue = board.careQueues[action.doctorId]
      const walkIn = queue?.find((w) => w.id === action.walkInId)
      if (!walkIn) return board
      return {
        ...board,
        careQueues: {
          ...board.careQueues,
          [action.doctorId]: queue.filter((w) => w.id !== action.walkInId),
        },
        completedLog: [
          ...board.completedLog,
          { walkIn, dest: { type: 'doctor', doctorId: action.doctorId }, checkedOutAt: action.at },
        ],
      }
    }

    case 'clock-ticked': {
      let changed = false
      const rooms = { ...board.rooms }
      for (const room of ROOMS) {
        const visit = rooms[room]
        if (visit && visit.remainingSeconds > 0) {
          rooms[room] = { ...visit, remainingSeconds: visit.remainingSeconds - 1 }
          changed = true
        }
      }
      return changed ? { ...board, rooms } : board
    }

    default:
      return board
  }
}

/**
 * Stage of an in-progress visit, from its countdown:
 * first third 'vitals', middle 'exam', final 'discharging', elapsed 'ready'.
 * @param {Visit} visit
 * @returns {'vitals' | 'exam' | 'discharging' | 'ready'}
 */
export function visitStage(visit) {
  if (visit.remainingSeconds <= 0) return 'ready'
  const fraction = visit.remainingSeconds / visit.totalSeconds
  if (fraction > 2 / 3) return 'vitals'
  if (fraction > 1 / 3) return 'exam'
  return 'discharging'
}

// Pets already seen before this session's board opened — keeps the demo
// stats plausible. Presentation garnish, isolated here on purpose.
const PRIOR_CHECKED_IN = 14

/**
 * @param {Board} board
 * @returns {{ checkedIn: number, occupiedRooms: number, roomCount: number, avgWaitMinutes: number, urgencyLevel: 'high' | 'moderate' | 'calm' }}
 */
export function boardStats(board) {
  const occupiedRooms = ROOMS.filter((r) => board.rooms[r]).length
  const inCare = Object.values(board.careQueues).reduce((n, q) => n + q.length, 0)
  const urgencyLevel = board.lobby.some((w) => w.urgency === 'High')
    ? 'high'
    : board.lobby.some((w) => w.urgency === 'Medium')
      ? 'moderate'
      : 'calm'
  return {
    checkedIn: PRIOR_CHECKED_IN + occupiedRooms + inCare + board.completedLog.length,
    occupiedRooms,
    roomCount: ROOMS.length,
    avgWaitMinutes: 6 + board.lobby.length * 3,
    urgencyLevel,
  }
}

/** @param {Board} board @param {string} query @returns {WalkIn[]} */
export function matchLobby(board, query) {
  const q = query.trim().toLowerCase()
  if (!q) return board.lobby
  return board.lobby.filter((w) => `${w.pet} ${w.client} ${w.species}`.toLowerCase().includes(q))
}
