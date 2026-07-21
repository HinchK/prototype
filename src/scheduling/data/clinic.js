// The fictional clinic — West Coast Animal Hospital as the demo imagines it.
// EVERYTHING in this file is invented (spec: fictitious-but-plausible).
// Dana Whitfield, practice manager of 11 years, is the scheduler whose
// judgment the rulebook externalizes; rationales are in her voice.
//
// PLANTED DEFECTS (the demo finds what we planted — clinic.test.js locks them):
//   hard: Sat surgery has 1 LVT (rule wants 2)
//   hard: Marisol closes Tue (kennel-pm) then opens Wed (kennel-am)
//   soft: weekend Tech spread (Hector 2, several 0)
//   thin: Rosa's Thu surgery seat has NO back-fill (every other LVT-A is
//         unavailable, overlapping, or would leave the anesthesia seat open)
import { createScheduleState, makeStaff, slotKey } from '../domain/schedule'
import { makeRule } from '../domain/rules'

const s = (id, name, role, credentials = [], float = false) =>
  makeStaff({ name, role, credentials, float }, id)

// How each person shows up on the floor — the other half of Dana's judgment,
// the part she'd phrase as "don't put those two on together." Hand-assigned
// (never random) so the chemistry heatmap tells a stable, defensible story:
// surgery days are Analyst/Anchor-heavy, the front desk skews Empath, and the
// Sat surgery seam that the rulebook flags is ALSO the week's weakest pairing.
const ARCHETYPE_OF = {
  // DVMs — surgeons skew Analyst, ER-minded doctors Shield
  gibbings: 'Analyst', okafor: 'Shield', reyes: 'Anchor', calloway: 'Analyst',
  nassar: 'Empath', ito: 'Spark', brennan: 'Anchor', whitaker: 'Analyst',
  // Techs — the anesthesia five are deliberately spread across archetypes
  rosa: 'Anchor', imani: 'Analyst', chen: 'Analyst', noor: 'Shield', sana: 'Spark',
  marisol: 'Anchor', jenna: 'Empath', tasha: 'Spark', oliver: 'Anchor',
  quinn: 'Analyst', hector: 'Spark', bree: 'Empath', sam: 'Shield', priya: 'Empath',
  // Assistants
  ava: 'Spark', ben: 'Anchor', carla: 'Empath', dev: 'Analyst', elle: 'Empath',
  finn: 'Spark', gus: 'Anchor', hana: 'Analyst', iris: 'Empath', jo: 'Anchor',
  kai: 'Shield', luz: 'Spark',
  // CSRs — the lobby runs on Empaths
  mabel: 'Empath', nico: 'Spark', opal: 'Empath', pete: 'Anchor', rae: 'Empath',
  sof: 'Analyst', tam: 'Empath', uma: 'Anchor', vic: 'Shield',
  // Kennel
  wes: 'Anchor', xio: 'Spark', yara: 'Empath', zane: 'Anchor', abe: 'Analyst', nell: 'Shield',
  // Float pool
  tran: 'Shield', wren: 'Anchor', jules: 'Spark', kit: 'Empath', remy: 'Analyst',
  sol: 'Empath', max: 'Spark', ash: 'Anchor', bo: 'Analyst',
}

const RAW_STAFF = [
  // DVMs (8)
  s('gibbings', 'Dr. Gibbings', 'DVM', ['DVM']),
  s('okafor', 'Dr. Okafor', 'DVM', ['DVM']),
  s('reyes', 'Dr. Reyes', 'DVM', ['DVM']),
  s('calloway', 'Dr. Calloway', 'DVM', ['DVM']),
  s('nassar', 'Dr. Nassar', 'DVM', ['DVM']),
  s('ito', 'Dr. Ito', 'DVM', ['DVM']),
  s('brennan', 'Dr. Brennan', 'DVM', ['DVM']),
  s('whitaker', 'Dr. Whitaker', 'DVM', ['DVM']),
  // Techs (14; 5 anesthesia-certified)
  s('rosa', 'Rosa Delgado', 'Tech', ['LVT', 'LVT-A']),
  s('imani', 'Imani Cole', 'Tech', ['LVT', 'LVT-A']),
  s('chen', 'Chen Wei', 'Tech', ['LVT', 'LVT-A']),
  s('noor', 'Noor Haddad', 'Tech', ['LVT', 'LVT-A']),
  s('sana', 'Sana Qureshi', 'Tech', ['LVT', 'LVT-A']),
  s('marisol', 'Marisol Vega', 'Tech', ['LVT']),
  s('jenna', 'Jenna Kowalski', 'Tech', ['LVT']),
  s('tasha', 'Tasha Brooks', 'Tech', ['LVT']),
  s('oliver', 'Oliver Finch', 'Tech', ['LVT']),
  s('quinn', 'Quinn Marsh', 'Tech', ['LVT']),
  s('hector', 'Hector Ruiz', 'Tech', ['LVT']),
  s('bree', 'Bree Tanaka', 'Tech', ['LVT']),
  s('sam', 'Sam Whitlock', 'Tech', ['LVT']),
  s('priya', 'Priya Sharma', 'Tech', ['LVT']),
  // Assistants (12)
  s('ava', 'Ava Chen', 'Assistant'), s('ben', 'Ben Palmer', 'Assistant'),
  s('carla', 'Carla Núñez', 'Assistant'), s('dev', 'Dev Patel', 'Assistant'),
  s('elle', 'Elle Bishop', 'Assistant'), s('finn', 'Finn Gallagher', 'Assistant'),
  s('gus', 'Gus Moreno', 'Assistant'), s('hana', 'Hana Sato', 'Assistant'),
  s('iris', 'Iris Kim', 'Assistant'), s('jo', 'Jo Okada', 'Assistant'),
  s('kai', 'Kai Rivera', 'Assistant'), s('luz', 'Luz Herrera', 'Assistant'),
  // CSRs (9)
  s('mabel', 'Mabel Ortiz', 'CSR'), s('nico', 'Nico Flores', 'CSR'),
  s('opal', 'Opal Jennings', 'CSR'), s('pete', 'Pete Sandoval', 'CSR'),
  s('rae', 'Rae Thompson', 'CSR'), s('sof', 'Sofía Marín', 'CSR'),
  s('tam', 'Tam Nguyen', 'CSR'), s('uma', 'Uma Iyer', 'CSR'),
  s('vic', 'Vic Romano', 'CSR'),
  // Kennel (6)
  s('wes', 'Wes Barlow', 'Kennel'), s('xio', 'Xio Deng', 'Kennel'),
  s('yara', 'Yara Aziz', 'Kennel'), s('zane', 'Zane Holt', 'Kennel'),
  s('abe', 'Abe Lindqvist', 'Kennel'), s('nell', 'Nell Foster', 'Kennel'),
  // Part-time / float pool (9)
  s('tran', 'Dr. Tran (relief)', 'DVM', ['DVM'], true),
  s('wren', 'Wren Castillo', 'Tech', ['LVT'], true),
  s('jules', 'Jules Beck', 'Assistant', [], true),
  s('kit', 'Kit Osei', 'Assistant', [], true),
  s('remy', 'Remy Laurent', 'Assistant', [], true),
  s('sol', 'Sol Dominguez', 'CSR', [], true),
  s('max', 'Max Egan', 'CSR', [], true),
  s('ash', 'Ash Varga', 'Kennel', [], true),
  s('bo', 'Bo Nakamura', 'Kennel', [], true),
]

export const STAFF = RAW_STAFF.map((m) => ({ ...m, archetype: ARCHETYPE_OF[m.id] }))

export const STAFF_BY_ID = Object.fromEntries(STAFF.map((m) => [m.id, m]))

const WEEKDAYS_SAT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const RULEBOOK = [
  makeRule({
    id: 'r-surgery-dvm', type: 'min-role-coverage',
    params: { blockId: 'surgery', role: 'DVM', count: 1, days: WEEKDAYS_SAT },
    rationale: 'Surgery never runs without a doctor in the building. Ever.',
  }),
  makeRule({
    id: 'r-surgery-techs', type: 'min-credential-coverage',
    params: { blockId: 'surgery', credential: 'LVT', count: 2, days: WEEKDAYS_SAT },
    rationale: "Surgery can't run on one tech — someone preps while someone monitors.",
  }),
  makeRule({
    id: 'r-surgery-anesthesia', type: 'min-credential-coverage',
    params: { blockId: 'surgery', credential: 'LVT-A', count: 1, days: WEEKDAYS_SAT },
    rationale: 'Anesthesia needs its own hands. One certified tech, minimum, every cut day.',
  }),
  makeRule({
    id: 'r-kennel-open', type: 'min-role-coverage',
    params: { blockId: 'kennel-am', role: 'Kennel', count: 1 },
    rationale: 'Somebody is with the boarders by 6am, seven days a week. The dogs don\'t do weekends off.',
  }),
  makeRule({
    id: 'r-desk-open', type: 'min-role-coverage',
    params: { blockId: 'desk-open', role: 'CSR', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Two on the desk at open or the phones eat whoever is alone.',
  }),
  makeRule({
    id: 'r-desk-close', type: 'min-role-coverage',
    params: { blockId: 'desk-close', role: 'CSR', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Closing alone means cash-out plus pickups plus phones. Two, always.',
  }),
  makeRule({
    id: 'r-appts-dvm', type: 'min-role-coverage',
    params: { blockId: 'appts-am', role: 'DVM', count: 2, days: WEEKDAYS_SAT },
    rationale: 'Mornings book double — one doctor on morning appointments is a two-hour wait by 10.',
  }),
  makeRule({
    id: 'r-hours', type: 'max-weekly-hours',
    params: { maxHours: 40 },
    rationale: 'Forty hours. I have watched overtime turn into resignation letters.',
  }),
  makeRule({
    id: 'r-rest', type: 'min-rest-gap',
    params: {},
    rationale: 'Nobody closes and then opens. Tired hands drop things that bite.',
  }),
  makeRule({
    id: 'r-unavail-imani', type: 'hard-unavailability',
    params: { staffId: 'imani', days: ['Thu'] },
    rationale: 'Imani has clinicals Thursdays through May. Not negotiable, I promised her.',
  }),
  makeRule({
    id: 'r-apart-seniors', type: 'keep-apart',
    params: { staffIdA: 'marisol', staffIdB: 'jenna', blockId: 'kennel-pm' },
    rationale: 'Marisol and Jenna are my two senior techs — they never close together. One of them opens the next day, rested.',
  }),
  makeRule({
    id: 'r-pair-priya', type: 'prefer-pairing', weight: 2,
    params: { staffIdA: 'priya', staffIdB: 'gibbings', blockId: 'surgery' },
    rationale: "Priya's training on dentals — put her on Dr. Gibbings' surgery days when you can.",
  }),
  makeRule({
    id: 'r-fair-weekend', type: 'fair-rotation', weight: 1,
    params: { days: ['Sat', 'Sun'], role: 'Tech', maxSpread: 1 },
    rationale: 'Weekends get shared, or resentment does. Nobody eats every Saturday.',
  }),
]

// The seeded week. Hand-authored, not generated, so every planted defect is
// visible in the data. Cross-checked against RULEBOOK; clinic.test.js locks it.
const A = (blockId, day, ids) => [slotKey(blockId, day), ids]

export const WEEK_ASSIGNMENTS = Object.fromEntries([
  // Kennel AM — r-kennel-open (all 7 days). Marisol Wed is the rest-gap plant.
  A('kennel-am', 'Mon', ['wes']), A('kennel-am', 'Tue', ['xio']),
  A('kennel-am', 'Wed', ['yara', 'marisol']), A('kennel-am', 'Thu', ['zane']),
  A('kennel-am', 'Fri', ['abe']), A('kennel-am', 'Sat', ['nell']),
  A('kennel-am', 'Sun', ['wes']),
  // Front Desk Open — 2 CSRs Mon–Sat, reduced Sunday.
  A('desk-open', 'Mon', ['mabel', 'nico']), A('desk-open', 'Tue', ['opal', 'pete']),
  A('desk-open', 'Wed', ['rae', 'sof']), A('desk-open', 'Thu', ['tam', 'uma']),
  A('desk-open', 'Fri', ['mabel', 'nico']), A('desk-open', 'Sat', ['opal', 'pete']),
  A('desk-open', 'Sun', ['vic']),
  // Morning Appts — 2 DVMs Mon–Sat + tech + assistant. Chen's Thu here blocks
  // her from covering Thu surgery (8–12 overlaps 9–14).
  A('appts-am', 'Mon', ['reyes', 'nassar', 'quinn', 'ava']),
  A('appts-am', 'Tue', ['nassar', 'whitaker', 'oliver', 'ben']),
  A('appts-am', 'Wed', ['calloway', 'brennan', 'quinn', 'carla']),
  A('appts-am', 'Thu', ['ito', 'whitaker', 'chen', 'dev']),
  A('appts-am', 'Fri', ['reyes', 'nassar', 'oliver', 'elle']),
  A('appts-am', 'Sat', ['okafor', 'ito', 'hector', 'finn']),
  A('appts-am', 'Sun', ['brennan', 'bree', 'gus']),
  // Surgery — DVM + 2 LVT (one LVT-A) + assistant, Mon–Sat.
  // PLANT: Sat runs with only Sana (LVT count 1 < 2). Sunday: no surgery.
  A('surgery', 'Mon', ['okafor', 'rosa', 'marisol', 'hana']),
  A('surgery', 'Tue', ['gibbings', 'chen', 'priya', 'iris']),
  A('surgery', 'Wed', ['reyes', 'noor', 'jenna', 'jo']),
  A('surgery', 'Thu', ['okafor', 'rosa', 'tasha', 'kai']),
  A('surgery', 'Fri', ['gibbings', 'chen', 'priya', 'luz']),
  A('surgery', 'Sat', ['calloway', 'sana']),
  A('surgery', 'Sun', []),
  // Midday Cover — lunch-relief exams and treatments. Noor's Thu here blocks
  // her from Thu surgery (11:30–14:30 overlaps 9–14).
  A('midday', 'Mon', ['imani', 'jo']), A('midday', 'Tue', ['tasha', 'kai']),
  A('midday', 'Wed', ['sana', 'luz']), A('midday', 'Thu', ['noor', 'hana']),
  A('midday', 'Fri', ['tasha', 'iris']), A('midday', 'Sat', ['bree', 'gus']),
  A('midday', 'Sun', []),
  // Afternoon Appts. Sana's Thu here blocks her from Thu surgery (13–18 overlaps 9–14).
  A('appts-pm', 'Mon', ['reyes', 'brennan', 'jenna', 'ben']),
  A('appts-pm', 'Tue', ['nassar', 'ito', 'bree', 'carla']),
  A('appts-pm', 'Wed', ['calloway', 'whitaker', 'oliver', 'dev']),
  A('appts-pm', 'Thu', ['ito', 'brennan', 'sana', 'elle']),
  A('appts-pm', 'Fri', ['reyes', 'brennan', 'jenna', 'finn']),
  A('appts-pm', 'Sat', ['okafor', 'ito', 'hector', 'ava']),
  A('appts-pm', 'Sun', []),
  // Front Desk Close — rota avoids close-then-open pairs (checked by hand).
  A('desk-close', 'Mon', ['rae', 'sof']), A('desk-close', 'Tue', ['tam', 'uma']),
  A('desk-close', 'Wed', ['mabel', 'nico']), A('desk-close', 'Thu', ['vic', 'opal']),
  A('desk-close', 'Fri', ['rae', 'sof']), A('desk-close', 'Sat', ['tam', 'uma']),
  A('desk-close', 'Sun', ['vic']),
  // Kennel PM — evening treatments get a tech alongside kennel staff.
  // The PM rota is deliberately offset from the AM rota so no kennel closer
  // opens the next morning (that would trip r-rest beyond the plant).
  // PLANT: Marisol Tue (closing) pairs with her Wed kennel-am (opening).
  A('kennel-pm', 'Mon', ['zane']), A('kennel-pm', 'Tue', ['abe', 'marisol']),
  A('kennel-pm', 'Wed', ['nell']), A('kennel-pm', 'Thu', ['xio']),
  A('kennel-pm', 'Fri', ['wes']), A('kennel-pm', 'Sat', ['yara']),
  A('kennel-pm', 'Sun', ['zane']),
])

// Mock PIMS demand — booked-appointment load per day, 0–100. The real epic
// pulls this from the practice-management system; the shape is what matters.
export const DEMAND = { Mon: 92, Tue: 78, Wed: 64, Thu: 85, Fri: 74, Sat: 96, Sun: 38 }
export const DEMAND_NOTES = {
  Mon: 'Weekend backlog — heaviest book of the week',
  Sat: 'Half-day hours, full-day chaos',
  Sun: 'Boarding pickups only',
}

/** @returns {import('../domain/schedule').ScheduleState} */
export const createSeededState = () =>
  createScheduleState({ assignments: WEEK_ASSIGNMENTS, rulebook: RULEBOOK })
