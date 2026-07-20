// PROTOTYPE — wipe me. Deterministic mock data shared by the style variants.
// Two datasets: a frozen mid-shift snapshot of the triage board, and a
// 60-employee / 4-week AI scheduling dataset (personality + weighting scores).

// Seeded PRNG so every reload and every variant shows the identical moment.
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rand = mulberry32(20260720)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (lo, hi) => Math.round(lo + rand() * (hi - lo))

// --- personalities ----------------------------------------------------------

export const ARCHETYPES = {
  Anchor: { key: 'Anchor', blurb: 'Steady metronome — holds routine shifts together', color: '#516d7d' },
  Spark: { key: 'Spark', blurb: 'Floor energy — lifts slow afternoons', color: '#d97a29' },
  Empath: { key: 'Empath', blurb: 'Client whisperer — de-escalates a full lobby', color: '#7c5cb0' },
  Analyst: { key: 'Analyst', blurb: 'Protocol precision — zero missed charts', color: '#2e7d6b' },
  Shield: { key: 'Shield', blurb: 'Crisis-calm — emergencies route to them', color: '#b03a48' },
}
const ARCH_KEYS = Object.keys(ARCHETYPES)

// Pairwise synergy the "AI" uses to score a shift's team chemistry.
export const SYNERGY = {
  Anchor: { Anchor: 70, Spark: 88, Empath: 80, Analyst: 84, Shield: 78 },
  Spark: { Anchor: 88, Spark: 55, Empath: 82, Analyst: 62, Shield: 74 },
  Empath: { Anchor: 80, Spark: 82, Empath: 68, Analyst: 72, Shield: 86 },
  Analyst: { Anchor: 84, Spark: 62, Empath: 72, Analyst: 74, Shield: 82 },
  Shield: { Anchor: 78, Spark: 74, Empath: 86, Analyst: 82, Shield: 60 },
}

// --- 60 employees -----------------------------------------------------------

const FIRST = ['Kai', 'Priya', 'Marisol', 'Dev', 'June', 'Theo', 'Amara', 'Colin', 'Yuki', 'Rosa', 'Miles', 'Ingrid', 'Omar', 'Tess', 'Felix', 'Nadia', 'Beau', 'Carmen', 'Silas', 'Wren', 'Hugo', 'Leila', 'Otis', 'Faye', 'Dmitri', 'Anya', 'Cole', 'Mabel', 'Ravi', 'Sloane']
const LAST = ['Nakamura', 'Delgado', 'Okafor', 'Lindqvist', 'Reyes', 'Marsh', 'Kowalski', 'Bell', 'Haddad', 'Nguyen', 'Ferrera', 'Stone', 'Whitaker', 'Osei', 'Park', 'Moreno', 'Fitch', 'Ibarra', 'Voss', 'Crane']
const ROLE_COUNTS = [
  ['DVM', 10],
  ['LVT', 14],
  ['Vet Assistant', 16],
  ['CSR', 10],
  ['Groomer', 4],
  ['Kennel Tech', 6],
]

const KEY_STAT = { Anchor: 'stress', Spark: 'chaos', Empath: 'warmth', Analyst: 'surgical', Shield: 'stress' }

export const EMPLOYEES = []
{
  let i = 0
  for (const [role, count] of ROLE_COUNTS) {
    for (let k = 0; k < count; k++, i++) {
      const archetype = ARCH_KEYS[Math.floor(rand() * ARCH_KEYS.length)]
      const scores = {
        warmth: between(30, 78),
        stress: between(30, 78),
        surgical: role === 'DVM' || role === 'LVT' ? between(45, 85) : between(5, 40),
        chaos: between(30, 78),
        mentor: between(20, 80),
      }
      scores[KEY_STAT[archetype]] = Math.min(99, scores[KEY_STAT[archetype]] + 22)
      // The composite "AI weight" the scheduler ranks people by.
      const weight = Math.round(
        scores.warmth * 0.2 + scores.stress * 0.25 + scores.surgical * 0.2 + scores.chaos * 0.15 + scores.mentor * 0.2,
      )
      EMPLOYEES.push({
        id: `e${i}`,
        name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
        role,
        archetype,
        scores,
        weight,
        weekendOk: rand() > 0.35,
        pto: rand() > 0.7 ? [between(0, 27)] : [],
      })
    }
  }
}

// --- 4-week schedule (starts Mon Jul 20, 2026 — "a month out") --------------

const START = new Date(2026, 6, 20)
const dayLabel = (offset) => {
  const d = new Date(START)
  d.setDate(d.getDate() + offset)
  return {
    dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weekend: d.getDay() === 0 || d.getDay() === 6,
  }
}

export const WEEKS = Array.from({ length: 4 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const offset = w * 7 + d
    const { dow, date, weekend } = dayLabel(offset)
    const coverage = weekend ? between(78, 94) : between(88, 100)
    return {
      offset,
      dow,
      date,
      weekend,
      coverage,
      chemistry: between(58, 96),
      burnoutFlags: rand() > 0.75 ? between(1, 3) : 0,
      unfilled: coverage < 85 ? between(1, 2) : 0,
    }
  }),
)

// Week-1 roster detail: shift code per day per employee.
// M morning · E evening · S surgery block · · off
const SHIFTS = ['M', 'M', 'E', 'E', 'S']
export const ROSTER_WEEK1 = EMPLOYEES.map((e) => {
  const days = Array.from({ length: 7 }, (_, d) => {
    if (e.pto.includes(d)) return 'P'
    const working = d < 5 ? rand() > 0.25 : e.weekendOk && rand() > 0.55
    if (!working) return '·'
    const s = pick(SHIFTS)
    return s === 'S' && e.scores.surgical < 60 ? 'M' : s
  })
  const hours = days.filter((s) => s !== '·' && s !== 'P').length * 8
  return { ...e, days, hours }
})

export const SCHED_STATS = {
  coverage: '96%',
  health: 87,
  burnout: 3,
  fairness: 92,
  unfilled: 4,
}

const n = (i) => EMPLOYEES[i].name
export const SUGGESTIONS = [
  { title: 'Swap Thu W2 closers', detail: `${n(7)} ↔ ${n(23)}`, impact: 'Chemistry +12 · OT −3h', kind: 'pairing' },
  { title: 'Rebalance Sat W1 lobby', detail: `Move ${n(41)} (Empath 91) to front desk`, impact: 'Client CSAT +8', kind: 'personality' },
  { title: 'Burnout guard', detail: `${n(3)} is on a 6-day streak — insert Wed rest`, impact: 'Risk −34%', kind: 'wellness' },
  { title: 'Surgery block W3', detail: `${n(12)} + ${n(1)} pairing scores 94`, impact: 'Turnover −18 min', kind: 'pairing' },
  { title: 'Fairness nudge', detail: `${n(55)} has 4 straight weekends — trade with ${n(30)}`, impact: 'Equity +6', kind: 'wellness' },
]

// Archetype mix across the whole staff, for distribution charts.
export const ARCH_MIX = ARCH_KEYS.map((k) => ({
  ...ARCHETYPES[k],
  count: EMPLOYEES.filter((e) => e.archetype === k).length,
}))

// --- frozen triage-board snapshot (matches the live dashboard's mid-shift) --

export const TRIAGE = {
  stats: {
    checkedIn: 17,
    spark: [6, 9, 7, 11, 10, 13, 12, 16, 17],
    avgWait: '15 min',
    occupied: '2 / 6',
    urgency: 'Moderate',
  },
  alert: 'Surgery Suite occupied — Penelope',
  rooms: [
    { name: 'Room 1', patient: null },
    { name: 'Room 2', patient: 'Cleo', species: 'Calico Cat', client: 'Sarah', status: 'Exam', timer: '1:38', pct: 54 },
    { name: 'Room 3', patient: null },
    { name: 'Triage', patient: null },
    { name: 'Surgery', patient: 'Penelope', species: 'Pot-bellied Pig', client: 'Lizzie', status: 'Vitals', timer: '2:50', pct: 94 },
    { name: 'Recovery', patient: null },
  ],
  lobby: [
    { pet: 'Barnaby', species: 'Chihuahua', client: 'Marcus', urgency: 'Medium', note: 'Tried to pick a fight with a broom. The broom won.' },
    { pet: 'Buster', species: 'Great Dane', client: 'Bob', urgency: 'Low', note: "Convinced he is a lap dog. Bob's lap disagrees." },
    { pet: 'Nibbles', species: 'Hamster', client: 'The Hendersons', urgency: 'High', note: 'Three crying children, one escaping hamster.' },
    { pet: 'Biscuit', species: 'Tabby Cat', client: 'Maggie', urgency: 'Medium', note: 'Head stuck in a tissue box. Dignity recovering.' },
    { pet: 'Waffles', species: 'Corgi', client: 'Tina', urgency: 'High', note: 'Ate an entire sock. Third sock this month.' },
  ],
  doctors: [
    { name: 'Dr. Megan Gibbings', specialty: 'Internal Medicine', queue: [] },
    { name: 'Dr. Stefanie Young', specialty: 'Surgery', queue: ['Penelope — Pot-bellied Pig'] },
    { name: 'Dr. Melinda Benitez', specialty: 'Dermatology', queue: [] },
  ],
}
