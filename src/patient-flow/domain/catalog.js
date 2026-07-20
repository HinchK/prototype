// Patient-flow domain — static facts of the floor.
// Pure data: no React, no I/O. See ../CONTEXT.md for the ubiquitous language.

/** Exam rooms a walk-in can be checked in to. */
export const ROOMS = ['Room 1', 'Room 2', 'Room 3', 'Triage', 'Surgery', 'Recovery']

/** The care team. Care queues are keyed by doctor id. */
export const DOCTORS = [
  { id: 'gibbings', name: 'Dr. Megan Gibbings', specialty: 'Internal Medicine' },
  { id: 'young', name: 'Dr. Stefanie Young', specialty: 'Surgery' },
  { id: 'benitez', name: 'Dr. Melinda Benitez', specialty: 'Dermatology' },
]

/** @param {string} doctorId */
export const doctorById = (doctorId) => DOCTORS.find((d) => d.id === doctorId)

/**
 * Expected exam duration by triage urgency, in seconds. Deliberately short so
 * the prototype demos every visit stage inside a few minutes.
 * @type {Record<import('./board').Urgency, number>}
 */
export const EXAM_DURATION_SECONDS = { High: 120, Medium: 180, Low: 240 }
