// Patient-flow seed data — the canonical walk-ins and the simulation pool.
// Content only; all behavior lives in ../domain/board.js.
import { makeWalkIn } from '../domain/board'

/** The five walk-ins waiting when the board opens. */
export const seedWalkIns = () =>
  [
    ['Marcus', 'Barnaby', 'Chihuahua', 'dog', 'Hyperactive — tried to pick a fight with a broom. The broom won.', 'Medium'],
    ['Sarah', 'Cleo', 'Calico Cat', 'cat', 'Grumpy. Arrived in a cardboard box labeled "FRAGILE". The label is accurate.', 'Low'],
    ['Bob', 'Buster', 'Great Dane', 'dog', "Convinced he is a lap dog. Bob's lap strongly disagrees.", 'Low'],
    ['The Henderson Family', 'Nibbles', 'Hamster', 'hamster', 'Family of four: three crying children, one escaping hamster. Hamster currently winning.', 'High'],
    ['Lizzie', 'Penelope', 'Pot-bellied Pig', 'pig', 'Wearing a custom glittery sweater. Refuses to take it off. We respect that.', 'Medium'],
  ].map(([client, pet, species, kind, note, urgency]) => makeWalkIn({ client, pet, species, kind, note, urgency }))

/** [client, pet, species, kind, note, urgency] tuples for "Simulate Walk-in Arrival". */
export const WALK_IN_POOL = [
  ['Greg', 'Sir Reginald', 'Persian Cat', 'cat', "Knocked a full glass of water onto Greg's laptop. Shows zero remorse.", 'Low'],
  ['Tina', 'Waffles', 'Corgi', 'dog', 'Ate an entire sock. Again. Third sock this month.', 'High'],
  ['Dev', 'Kevin', 'Cockatiel', 'bird', 'Learned to imitate the smoke alarm. The family has not slept in days.', 'Low'],
  ['Angela', 'Meatball', 'Pug', 'dog', "Snores louder than Angela's husband. Here for a second opinion.", 'Medium'],
  ['The Nguyens', 'Houdini', 'Rabbit', 'rabbit', 'Escaped four "escape-proof" enclosures. Currently plotting a fifth.', 'Medium'],
  ['Carl', 'Tank', 'Bulldog', 'dog', 'Afraid of the vacuum, leaves, and his own reflection. Not afraid of skunks, unfortunately.', 'High'],
  ['Priya', 'Noodle', 'Ferret', 'ferret', 'Stole a car key and hid it in the couch. Priya was late to work.', 'Low'],
  ['Maggie', 'Biscuit', 'Tabby Cat', 'cat', 'Got head stuck in a tissue box. Box removed. Dignity still recovering.', 'Medium'],
]

/** Fisher–Yates; returns a new array. */
export const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
