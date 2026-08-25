// Adapter between the pure board domain and React: owns the reducer, the
// 1-second clock, and the notification side effects. UI components call
// `actions`; the domain stays free of React and clocks.
import { useEffect, useReducer, useRef } from 'react'
import { boardReducer, createBoard, canCheckIn, makeWalkIn } from '../domain/board'
import { doctorById } from '../domain/catalog'
import { seedWalkIns, WALK_IN_POOL, shuffle } from '../data/walkIns'

const displayTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** @param {(message: string, tone?: 'success' | 'error' | 'info') => void} notify */
export function useTriageBoard(notify) {
  const [board, dispatch] = useReducer(boardReducer, undefined, () => createBoard(seedWalkIns()))
  const poolRef = useRef(null)
  if (poolRef.current === null) poolRef.current = shuffle(WALK_IN_POOL)

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'clock-ticked' }), 1000)
    return () => clearInterval(t)
  }, [])

  const actions = {
    simulateArrival() {
      if (poolRef.current.length === 0) poolRef.current = shuffle(WALK_IN_POOL)
      const [client, pet, species, kind, note, urgency] = poolRef.current.pop()
      dispatch({ type: 'walk-in-arrived', walkIn: makeWalkIn({ client, pet, species, kind, note, urgency }) })
      notify(`Walk-in arrived: ${client} & ${pet}.`, 'info')
    },
    checkIn(walkInId, room) {
      const walkIn = board.lobby.find((w) => w.id === walkInId)
      if (!walkIn) return
      if (!canCheckIn(board, room)) {
        notify(`${room} is already occupied.`, 'error')
        return
      }
      dispatch({ type: 'checked-in', walkInId, room })
      notify(`${walkIn.pet} checked into ${room}.`, 'success')
    },
    assignToDoctor(walkInId, doctorId) {
      const walkIn = board.lobby.find((w) => w.id === walkInId)
      const doctor = doctorById(doctorId)
      if (!walkIn || !doctor) return
      dispatch({ type: 'assigned-to-doctor', walkInId, doctorId })
      notify(`${walkIn.pet} added to ${doctor.name}'s care queue.`, 'success')
    },
    checkOut(room) {
      const visit = board.rooms[room]
      if (!visit) return
      dispatch({ type: 'checked-out', room, at: displayTime() })
      notify(`${visit.walkIn.pet} checked out of ${room}.`, 'success')
    },
    discharge(doctorId, walkInId) {
      const walkIn = board.careQueues[doctorId]?.find((w) => w.id === walkInId)
      const doctor = doctorById(doctorId)
      if (!walkIn || !doctor) return
      dispatch({ type: 'discharged', doctorId, walkInId, at: displayTime() })
      notify(`${walkIn.pet} discharged from ${doctor.name}'s queue.`, 'success')
    },
  }

  return { board, actions }
}
