// PROTOTYPE — style variant "Field Notes Editorial": cream paper, serif
// typography, hairline rules, small-caps labels. Structure: single-column
// broadsheet flow — ledger rows, dotted leaders, margin notes. No cards.
import { TRIAGE, WEEKS, SCHED_STATS, SUGGESTIONS, ROSTER_WEEK1, ARCH_MIX } from '../data'

const serif = { fontFamily: 'Georgia, "Times New Roman", Times, serif' }
const rule = 'border-t border-[#d8d0c0]'
const smallCaps = 'text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8a7f6a]'
const INK = { High: '#7c2d2d', Medium: '#8a6a1f', Low: '#33523e' }

function Leader() {
  return <span className="mx-2 flex-1 border-b border-dotted border-[#b9ad95]" aria-hidden="true" />
}

export default function EditorialVariant() {
  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#2b2620]" style={serif}>
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* masthead */}
        <header className="text-center">
          <p className={smallCaps}>West Coast Animal Hospital · Est. 1987</p>
          <h1 className="mt-3 text-6xl font-normal tracking-tight italic">The Daily Round</h1>
          <p className="mt-3 text-sm text-[#6b6152]">
            Saturday, July 19, 2026 · Afternoon edition · <em>{TRIAGE.alert}</em>
          </p>
          <div className="mt-5 border-t-2 border-b border-double border-[#2b2620] pt-1 pb-0.5">
            <div className="border-t border-[#2b2620] pt-1.5 pb-1.5 text-[12px] tracking-[0.25em] text-[#6b6152] uppercase">
              Floor Report — and — The Month Ahead
            </div>
          </div>
        </header>

        {/* pull-stat band */}
        <section className="mt-10 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
          {[
            [TRIAGE.stats.checkedIn, 'pets seen today'],
            [TRIAGE.stats.avgWait, 'average wait'],
            [TRIAGE.stats.occupied, 'rooms in service'],
            [TRIAGE.stats.urgency, 'lobby temperament'],
          ].map(([v, l], i) => (
            <div key={l} className={`px-6 text-center ${i > 0 ? 'sm:border-l sm:border-[#d8d0c0]' : ''}`}>
              <p className="text-5xl font-light tabular-nums">{v}</p>
              <p className={`mt-2 ${smallCaps}`}>{l}</p>
            </div>
          ))}
        </section>

        {/* ---------------- Triage: the floor report ---------------- */}
        <section className="mt-12">
          <div className={`${rule} pt-6`}>
            <h2 className="text-3xl italic">I. The Floor Report</h2>
          </div>

          <div className="mt-6 grid gap-12 md:grid-cols-5">
            {/* rooms ledger */}
            <div className="md:col-span-3">
              <p className={smallCaps}>Rooms in service</p>
              <ul className="mt-3">
                {TRIAGE.rooms.map((r) => (
                  <li key={r.name} className="flex items-baseline py-2.5 text-[15px]" style={{ borderBottom: '1px solid #ece5d6' }}>
                    <span className="font-semibold">{r.name}</span>
                    <Leader />
                    {r.patient ? (
                      <span>
                        {r.patient}, <em>{r.species.toLowerCase()}</em> — {r.status},{' '}
                        <span className="tabular-nums">{r.timer}</span>
                      </span>
                    ) : (
                      <span className="text-[#a89c85] italic">vacant</span>
                    )}
                  </li>
                ))}
              </ul>

              <p className={`${smallCaps} mt-8`}>Attending</p>
              <ul className="mt-3 space-y-2.5">
                {TRIAGE.doctors.map((d) => (
                  <li key={d.name} className="text-[15px]">
                    <span className="font-semibold">{d.name}</span>, <em>{d.specialty.toLowerCase()}</em>
                    {d.queue.length ? (
                      <span className="text-[#7c2d2d]"> — presently with {d.queue[0].split(' — ')[0]}</span>
                    ) : (
                      <span className="text-[#6b6152]"> — at liberty</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* waiting column */}
            <div className="md:col-span-2 md:border-l md:border-[#d8d0c0] md:pl-8">
              <p className={smallCaps}>The waiting column · {TRIAGE.lobby.length} parties</p>
              <ul className="mt-3 space-y-4">
                {TRIAGE.lobby.map((p) => (
                  <li key={p.pet} className="text-[14px] leading-snug">
                    <span
                      className="mr-1.5 text-[10px] font-bold tracking-[0.15em] uppercase"
                      style={{ color: INK[p.urgency] }}
                    >
                      {p.urgency} ·
                    </span>
                    <span className="font-semibold">{p.pet}</span>, {p.species.toLowerCase()}, with {p.client}.{' '}
                    <em className="text-[#6b6152]">{p.note}</em>
                  </li>
                ))}
              </ul>
              <p className="mt-5 cursor-pointer text-[13px] text-[#7c2d2d] italic underline decoration-dotted underline-offset-4 hover:text-[#4d1c1c]">
                → Simulate a walk-in arrival
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Scheduler: the month ahead ---------------- */}
        <section className="mt-14">
          <div className={`${rule} pt-6 flex flex-wrap items-baseline justify-between gap-2`}>
            <h2 className="text-3xl italic">II. The Month Ahead</h2>
            <p className="text-[13px] text-[#6b6152] italic">
              Sixty staff, four weeks, arranged by temperament — coverage {SCHED_STATS.coverage}, fairness{' '}
              {SCHED_STATS.fairness}, {SCHED_STATS.burnout} burnout advisories.
            </p>
          </div>

          {/* broadsheet calendar */}
          <table className="mt-6 w-full border-collapse text-center">
            <thead>
              <tr>
                {WEEKS[0].map((d) => (
                  <th key={d.offset} className={`${smallCaps} border-b border-[#2b2620] pb-2 font-semibold`}>
                    {d.dow}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKS.map((week, w) => (
                <tr key={w}>
                  {week.map((d) => (
                    <td key={d.offset} className="border-b border-[#ece5d6] px-1 py-3 align-top">
                      <p className="text-[13px] text-[#6b6152]">{d.date}</p>
                      <p className="mt-1 text-2xl font-light tabular-nums">{d.coverage}<span className="text-sm">%</span></p>
                      <p className="mt-1 text-[11px] tracking-widest" style={{ color: d.chemistry > 80 ? '#33523e' : d.chemistry > 65 ? '#8a6a1f' : '#7c2d2d' }} aria-label={`chemistry ${d.chemistry}`}>
                        {'●'.repeat(Math.max(1, Math.round(d.chemistry / 25)))}{'○'.repeat(4 - Math.max(1, Math.round(d.chemistry / 25)))}
                      </p>
                      {d.burnoutFlags > 0 && <p className="mt-0.5 text-[10px] text-[#7c2d2d] italic">† {d.burnoutFlags} advisories</p>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-right text-[11px] text-[#8a7f6a] italic">
            ● team chemistry, of four · † consecutive-day advisories
          </p>

          <div className="mt-10 grid gap-12 md:grid-cols-5">
            {/* roster excerpt */}
            <div className="md:col-span-3">
              <p className={smallCaps}>Week the first · Jul 20 – 26 · an excerpt</p>
              <ul className="mt-3">
                {[...ROSTER_WEEK1].sort((a, b) => b.weight - a.weight).slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-baseline py-2 text-[14px]" style={{ borderBottom: '1px solid #ece5d6' }}>
                    <span>
                      <span className="font-semibold">{e.name}</span>, <em>{e.role.toLowerCase()}</em>
                      <span className="text-[#8a7f6a]"> · {e.archetype.toLowerCase()}</span>
                    </span>
                    <Leader />
                    <span className="font-mono text-[12px] tracking-[0.2em] tabular-nums" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {e.days.join(' ')}
                    </span>
                    <span className="ml-3 w-8 text-right text-[13px] font-semibold tabular-nums" title="AI weight">
                      {e.weight}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-[#8a7f6a] italic">
                M morning · E evening · S surgery · P leave · fifty-two further names withheld for space
              </p>

              <p className={`${smallCaps} mt-8`}>Character studies</p>
              <div className="mt-3 space-y-2">
                {ARCH_MIX.map((a) => (
                  <p key={a.key} className="text-[14px] leading-snug">
                    <span className="font-semibold" style={{ color: a.color }}>{a.key}</span>{' '}
                    <span className="text-[#6b6152]">({a.count} of 60)</span> — <em>{a.blurb.toLowerCase()}.</em>
                  </p>
                ))}
              </div>
            </div>

            {/* margin notes */}
            <aside className="md:col-span-2 md:border-l md:border-[#d8d0c0] md:pl-8">
              <p className={smallCaps}>Margin notes, by the machine</p>
              <ul className="mt-3 space-y-5">
                {SUGGESTIONS.map((s) => (
                  <li key={s.title} className="text-[14px] leading-snug">
                    <p className="text-[#7c2d2d]">¶ <span className="font-semibold">{s.title}.</span></p>
                    <p className="mt-0.5 italic">{s.detail}.</p>
                    <p className="mt-0.5 text-[12px] text-[#33523e]">{s.impact}</p>
                    <p className="mt-1 text-[12px]">
                      <span className="cursor-pointer underline decoration-dotted underline-offset-4 hover:text-[#33523e]">adopt</span>
                      <span className="mx-2 text-[#b9ad95]">·</span>
                      <span className="cursor-pointer text-[#8a7f6a] underline decoration-dotted underline-offset-4 hover:text-[#7c2d2d]">decline</span>
                    </p>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <footer className={`${rule} mt-14 pt-4 pb-8 text-center`}>
          <p className={smallCaps}>The Daily Round · prototype E (editorial) · set in Georgia</p>
        </footer>
      </main>
    </div>
  )
}
