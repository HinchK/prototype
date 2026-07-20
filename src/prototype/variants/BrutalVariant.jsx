// PROTOTYPE — style variant "Butcher-Paper Brutalist": hard black borders,
// offset shadows, stamps, zero radius. Structure: ticker bar + masthead,
// table-first density, giant month grid — no cards-in-a-shell, no sidebar.
import { TRIAGE, WEEKS, SCHED_STATS, SUGGESTIONS, ROSTER_WEEK1, ARCH_MIX } from '../data'

const box = 'border-2 border-black bg-white shadow-[6px_6px_0_#000]'
const STAMP = {
  High: 'text-red-600 border-red-600',
  Medium: 'text-amber-600 border-amber-600',
  Low: 'text-green-700 border-green-700',
}

export default function BrutalVariant() {
  return (
    <div className="min-h-screen bg-[#FFFDF2] font-sans text-black">
      {/* ticker */}
      <div className="overflow-hidden border-b-2 border-black bg-black py-1.5 whitespace-nowrap">
        <p className="font-mono text-xs font-bold tracking-widest text-yellow-300 uppercase">
          ★ {TRIAGE.alert} ★ 17 pets checked in ★ avg wait 15 min ★ 2 high-urgency in lobby ★ month schedule 96% covered ★ 3 burnout
          alerts ★ {TRIAGE.alert} ★
        </p>
      </div>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-8">
        {/* masthead */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-4">
          <div>
            <h1 className="text-5xl leading-none font-black tracking-tight uppercase">
              West Coast<br />Animal Hospital
            </h1>
            <p className="mt-2 font-mono text-xs tracking-widest uppercase">Floor Control · Sat Jul 19 2026 · Shift B</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rotate-3 border-4 border-red-600 px-3 py-1 font-mono text-xl font-black text-red-600 uppercase">
              Live
            </span>
            <button className="cursor-pointer border-2 border-black bg-yellow-300 px-4 py-2 font-mono text-sm font-black uppercase shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000]">
              Lock ▮
            </button>
          </div>
        </header>

        {/* ---------------- Triage ---------------- */}
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              [TRIAGE.stats.checkedIn, 'Checked-in pets'],
              [TRIAGE.stats.avgWait, 'Average wait'],
              [TRIAGE.stats.occupied, 'Rooms occupied'],
              [TRIAGE.stats.urgency, 'Triage urgency'],
            ].map(([v, l]) => (
              <div key={l} className={`${box} p-4`}>
                <p className="text-5xl font-black tabular-nums">{v}</p>
                <p className="mt-1 font-mono text-[11px] font-bold tracking-widest uppercase">{l}</p>
              </div>
            ))}
          </div>

          <div className={`${box} overflow-x-auto`}>
            <table className="w-full border-collapse text-left">
              <caption className="border-b-2 border-black bg-yellow-300 p-2 text-left font-mono text-sm font-black tracking-widest uppercase">
                Exam rooms — live board
              </caption>
              <thead>
                <tr className="border-b-2 border-black font-mono text-xs uppercase">
                  <th className="border-r-2 border-black p-2">Room</th>
                  <th className="border-r-2 border-black p-2">Patient</th>
                  <th className="border-r-2 border-black p-2">Status</th>
                  <th className="border-r-2 border-black p-2">Clock</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {TRIAGE.rooms.map((r) => (
                  <tr key={r.name} className="border-b-2 border-black last:border-0">
                    <td className="border-r-2 border-black p-2 font-black uppercase">{r.name}</td>
                    <td className="border-r-2 border-black p-2">
                      {r.patient ? `${r.patient} — ${r.species} (${r.client})` : <span className="text-black/30">— vacant —</span>}
                    </td>
                    <td className="border-r-2 border-black p-2">
                      {r.patient ? <span className="bg-black px-2 py-0.5 font-bold text-yellow-300 uppercase">{r.status}</span> : ''}
                    </td>
                    <td className="border-r-2 border-black p-2 font-bold tabular-nums">{r.patient ? r.timer : ''}</td>
                    <td className="p-2">
                      {r.patient && (
                        <button className="cursor-pointer border-2 border-black bg-white px-2 py-0.5 text-xs font-black uppercase hover:bg-black hover:text-white">
                          Check out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 font-mono text-sm font-black tracking-widest uppercase">
                ▚ Unscheduled lobby ({TRIAGE.lobby.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {TRIAGE.lobby.map((p, i) => (
                  <div key={p.pet} className={`${box} relative p-3`}>
                    <p className="font-mono text-3xl font-black text-black/15">#{String(i + 1).padStart(2, '0')}</p>
                    <p className="text-lg leading-tight font-black uppercase">{p.pet}</p>
                    <p className="font-mono text-xs">{p.species} · {p.client}</p>
                    <p className="mt-1.5 text-xs leading-snug italic">{p.note}</p>
                    <span
                      className={`absolute top-2 right-2 -rotate-6 border-2 px-1.5 font-mono text-[10px] font-black uppercase ${STAMP[p.urgency]}`}
                    >
                      {p.urgency}
                    </span>
                  </div>
                ))}
                <button className="cursor-pointer border-2 border-dashed border-black p-3 text-center font-mono text-sm font-black uppercase hover:bg-yellow-300">
                  + Simulate<br />walk-in
                </button>
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-mono text-sm font-black tracking-widest uppercase">▚ Care team</h2>
              <div className="space-y-3">
                {TRIAGE.doctors.map((d) => (
                  <div key={d.name} className={`${box} flex items-center gap-3 p-3`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-yellow-300 font-mono text-lg font-black">
                      {d.name.replace('Dr. ', '')[0]}
                    </span>
                    <div className="flex-1">
                      <p className="font-black uppercase">{d.name}</p>
                      <p className="font-mono text-xs">{d.specialty}</p>
                    </div>
                    <p className="font-mono text-xs font-bold uppercase">
                      {d.queue.length ? `busy: ${d.queue[0].split(' — ')[0]}` : 'free'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Scheduler ---------------- */}
        <section className="space-y-6">
          <header className="border-b-4 border-black pb-3">
            <h2 className="text-4xl font-black tracking-tight uppercase">The Machine Schedules the Month</h2>
            <p className="mt-1 font-mono text-xs tracking-widest uppercase">
              60 staff · Jul 20 → Aug 16 · weighted: warmth / stress / surgical / chaos / mentorship
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              [SCHED_STATS.coverage, 'Coverage'],
              [SCHED_STATS.health, 'Health score'],
              [SCHED_STATS.burnout, 'Burnout alerts'],
              [SCHED_STATS.fairness, 'Fairness idx'],
              [SCHED_STATS.unfilled, 'Unfilled'],
            ].map(([v, l]) => (
              <div key={l} className={`${box} p-3`}>
                <p className="text-4xl font-black tabular-nums">{v}</p>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase">{l}</p>
              </div>
            ))}
          </div>

          {/* month grid */}
          <div className={`${box} p-4`}>
            <p className="mb-3 font-mono text-sm font-black tracking-widest uppercase">▚ Month grid — coverage % / chemistry</p>
            <div className="space-y-2">
              {WEEKS.map((week, w) => (
                <div key={w} className="grid grid-cols-7 gap-2">
                  {week.map((d) => (
                    <div
                      key={d.offset}
                      className={`border-2 border-black p-1.5 ${d.weekend ? 'bg-[repeating-linear-gradient(45deg,#fff,#fff_4px,#f3efdd_4px,#f3efdd_8px)]' : 'bg-white'}`}
                    >
                      <p className="font-mono text-[9px] font-bold uppercase">{d.dow} {d.date.split(' ')[1]}</p>
                      <p className="text-xl leading-none font-black tabular-nums">{d.coverage}</p>
                      <div className="mt-1 h-2 w-full border border-black">
                        <div className="h-full bg-black" style={{ width: `${d.chemistry}%` }} />
                      </div>
                      {d.burnoutFlags > 0 && (
                        <p className="mt-0.5 font-mono text-[8px] font-black text-red-600 uppercase">⚠ {d.burnoutFlags} burnout</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* roster */}
            <div className={`${box} overflow-x-auto lg:col-span-3`}>
              <table className="w-full border-collapse">
                <caption className="border-b-2 border-black bg-black p-2 text-left font-mono text-sm font-black tracking-widest text-yellow-300 uppercase">
                  Week 1 roster — top 12 of 60 by AI weight
                </caption>
                <thead>
                  <tr className="border-b-2 border-black font-mono text-[10px] uppercase">
                    <th className="border-r-2 border-black p-1.5 text-left">Staff</th>
                    <th className="border-r-2 border-black p-1.5 text-left">Type</th>
                    <th className="border-r-2 border-black p-1.5">Wt</th>
                    {WEEKS[0].map((d) => (
                      <th key={d.offset} className="border-r-2 border-black p-1.5 last:border-0">{d.dow[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {[...ROSTER_WEEK1].sort((a, b) => b.weight - a.weight).slice(0, 12).map((e) => (
                    <tr key={e.id} className="border-b border-black/30 last:border-0">
                      <td className="border-r-2 border-black p-1.5 leading-tight">
                        <span className="font-bold">{e.name}</span>
                        <br />
                        <span className="text-[10px] text-black/50 uppercase">{e.role}</span>
                      </td>
                      <td className="border-r-2 border-black p-1.5 uppercase">{e.archetype.slice(0, 4)}</td>
                      <td className="border-r-2 border-black p-1.5 text-center font-black">{e.weight}</td>
                      {e.days.map((s, i) => (
                        <td key={i} className="border-r-2 border-black p-1.5 text-center last:border-0">
                          <span className={s === '·' ? 'text-black/25' : s === 'P' ? 'font-black text-red-600' : 'font-black'}>{s}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* memo + mix */}
            <div className="space-y-6 lg:col-span-2">
              <div className={`${box} p-4`}>
                <p className="mb-2 font-mono text-sm font-black tracking-widest uppercase">Memo from the machine</p>
                <ol className="space-y-2.5 font-mono text-xs leading-snug">
                  {SUGGESTIONS.map((s, i) => (
                    <li key={s.title} className="border-b border-dashed border-black/40 pb-2 last:border-0">
                      <span className="font-black uppercase">{String(i + 1).padStart(2, '0')} {s.title}.</span> {s.detail}.
                      <span className="bg-yellow-300 px-1 font-bold"> {s.impact}</span>
                      <span className="mt-1 block">
                        <button className="cursor-pointer font-black hover:bg-black hover:text-yellow-300">[APPLY]</button>{' '}
                        <button className="cursor-pointer text-black/50 hover:bg-black hover:text-white">[REJECT]</button>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={`${box} p-4`}>
                <p className="mb-2 font-mono text-sm font-black tracking-widest uppercase">Personality census</p>
                {ARCH_MIX.map((a) => (
                  <div key={a.key} className="mb-1.5 flex items-center gap-2 font-mono text-xs">
                    <span className="w-16 font-black uppercase">{a.key}</span>
                    <span aria-hidden="true">{'▇'.repeat(Math.round(a.count / 2))}</span>
                    <span className="font-bold">{a.count}</span>
                  </div>
                ))}
                <p className="mt-2 font-mono text-[10px] text-black/60 uppercase">n=60 · balanced within ±3 of target mix</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-4 border-black bg-black p-3 text-center font-mono text-[10px] tracking-widest text-yellow-300 uppercase">
        West Coast Animal Hospital — Floor Control · prototype B (brutalist)
      </footer>
    </div>
  )
}
