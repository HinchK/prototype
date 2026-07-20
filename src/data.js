let uid = 0
const nextId = () => `p${++uid}`

export const makePatient = (client, pet, species, kind, note, urgency) => ({
  id: nextId(),
  client,
  pet,
  species,
  kind,
  note,
  urgency,
})

export const initialWalkIns = () => [
  makePatient(
    'Marcus',
    'Barnaby',
    'Chihuahua',
    'dog',
    'Hyperactive — tried to pick a fight with a broom. The broom won.',
    'Medium',
  ),
  makePatient(
    'Sarah',
    'Cleo',
    'Calico Cat',
    'cat',
    'Grumpy. Arrived in a cardboard box labeled "FRAGILE". The label is accurate.',
    'Low',
  ),
  makePatient(
    'Bob',
    'Buster',
    'Great Dane',
    'dog',
    "Convinced he is a lap dog. Bob's lap strongly disagrees.",
    'Low',
  ),
  makePatient(
    'The Henderson Family',
    'Nibbles',
    'Hamster',
    'hamster',
    'Family of four: three crying children, one escaping hamster. Hamster currently winning.',
    'High',
  ),
  makePatient(
    'Lizzie',
    'Penelope',
    'Pot-bellied Pig',
    'pig',
    'Wearing a custom glittery sweater. Refuses to take it off. We respect that.',
    'Medium',
  ),
]

// [client, pet, species, kind, note, urgency]
export const randomPool = [
  ['Greg', 'Sir Reginald', 'Persian Cat', 'cat', "Knocked a full glass of water onto Greg's laptop. Shows zero remorse.", 'Low'],
  ['Tina', 'Waffles', 'Corgi', 'dog', 'Ate an entire sock. Again. Third sock this month.', 'High'],
  ['Dev', 'Kevin', 'Cockatiel', 'bird', 'Learned to imitate the smoke alarm. The family has not slept in days.', 'Low'],
  ['Angela', 'Meatball', 'Pug', 'dog', "Snores louder than Angela's husband. Here for a second opinion.", 'Medium'],
  ['The Nguyens', 'Houdini', 'Rabbit', 'rabbit', 'Escaped four "escape-proof" enclosures. Currently plotting a fifth.', 'Medium'],
  ['Carl', 'Tank', 'Bulldog', 'dog', 'Afraid of the vacuum, leaves, and his own reflection. Not afraid of skunks, unfortunately.', 'High'],
  ['Priya', 'Noodle', 'Ferret', 'ferret', 'Stole a car key and hid it in the couch. Priya was late to work.', 'Low'],
  ['Maggie', 'Biscuit', 'Tabby Cat', 'cat', 'Got head stuck in a tissue box. Box removed. Dignity still recovering.', 'Medium'],
]

export const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const DOCTORS = [
  { id: 'gibbings', name: 'Dr. Megan Gibbings', specialty: 'Internal Medicine' },
  { id: 'young', name: 'Dr. Stefanie Young', specialty: 'Surgery' },
  { id: 'benitez', name: 'Dr. Melinda Benitez', specialty: 'Dermatology' },
]

export const ROOMS = ['Room 1', 'Room 2', 'Room 3', 'Triage', 'Surgery', 'Recovery']
