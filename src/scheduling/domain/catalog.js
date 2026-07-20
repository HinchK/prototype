// Scheduling catalog — the clinic's operational shape. Pure constants.
// BLOCKS are the rows of the Coverage Board, in office-flow order: the
// chronology of a hospital day, opening to closing. start/end are decimal
// hours (7.5 = 7:30) used only for overlap math and window display.
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const BLOCKS = [
  { id: 'kennel-am', label: 'Kennel AM', start: 6, end: 9, hours: 3 },
  { id: 'desk-open', label: 'Front Desk Open', start: 7.5, end: 11.5, hours: 4 },
  { id: 'appts-am', label: 'Morning Appts', start: 8, end: 12, hours: 4 },
  { id: 'surgery', label: 'Surgery Block', start: 9, end: 14, hours: 5 },
  { id: 'midday', label: 'Midday Cover', start: 11.5, end: 14.5, hours: 3 },
  { id: 'appts-pm', label: 'Afternoon Appts', start: 13, end: 18, hours: 5 },
  { id: 'desk-close', label: 'Front Desk Close', start: 14.5, end: 18.5, hours: 4 },
  { id: 'kennel-pm', label: 'Kennel PM', start: 17, end: 20, hours: 3 },
]

// The min-rest-gap rule ("no one closes then opens"): working any CLOSING
// block on day d and any OPENING block on day d+1 is a violation.
export const OPENING_BLOCKS = ['kennel-am', 'desk-open']
export const CLOSING_BLOCKS = ['desk-close', 'kennel-pm']

export const ROLES = ['DVM', 'Tech', 'Assistant', 'CSR', 'Kennel']
// LVT-A (anesthesia-certified) staff carry BOTH 'LVT' and 'LVT-A'.
export const CREDENTIALS = ['DVM', 'LVT', 'LVT-A']

/** @param {string} id */
export const blockById = (id) => BLOCKS.find((b) => b.id === id)

/** Two blocks overlap when their time ranges intersect. */
export const blocksOverlap = (a, b) => a.start < b.end && b.start < a.end

const fmt = (h) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`
/** @param {{start: number, end: number}} block @returns {string} e.g. '9:00–14:00' */
export const formatWindow = (block) => `${fmt(block.start)}–${fmt(block.end)}`
