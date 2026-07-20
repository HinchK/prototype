// PROTOTYPE — style variant "Coastal Glass": dark ocean gradient, frosted
// glassmorphism panels, glow accents. Structure: floating pill nav, horizontal
// room wall, health ring + heatmap — no sidebar, no data tables.
import { PawPrint, Lock, Clock, Sparkles, BrainCircuit, ArrowLeftRight } from 'lucide-react'
import { TRIAGE, WEEKS, SCHED_STATS, SUGGESTIONS, ROSTER_WEEK1, ARCH_MIX, ARCHETYPES } from '../data'

const glass = 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
const URGENCY = {
  High: 'bg-rose-400/20 text-rose-200 border-rose-300/30',
  Medium: 'bg-amber-400/20 text-amber-200 border-amber-300/30',
  Low: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30',
}

function HealthRing({ value }) {
  const r = 54
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#5eead4"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" className="fill-white text-3xl font-bold" style={{ fontSize: 30 }}>
        {value}
      </text>
      <text x="70" y="88" textAnchor="middle" fill="rgba(255,255,255,0.6)" style={{ fontSize: 11 }}>
        schedule health
      </text>
    </svg>
  )
}

export default function GlassVariant() {
  return (
    <div
      className="min-h-screen font-sans text-white"
      style={{ background: 'linear-gradient(135deg, #0b1e2d 0%, #123f56 45%, #0d2b3e 100%)' }}
    >
      {/* glow orbs */}
      <div className="pointer-events-none fixed -top-32 right-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 -left-32 h-96 w-96 rounded-full bg-rose-400/10 blur-3xl" />

      {/* floating pill nav */}
      <header className="sticky top-4 z-30 mx-auto flex w-fit items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1.5 backdrop-blur-xl">
        <span className="mr-2 ml-2 flex items-center gap-2 text-sm font-bold">
          <PawPrint className="h-4 w-4 text-cyan-300" /> West Coast
        </span>
        <a href="#g-triage" className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold">Floor</a>
        <a href="#g-sched" className="rounded-full px-4 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">Scheduler</a>
        <span className="rounded-full px-4 py-1.5 text-xs text-white/50">Logs</span>
        <button className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Lock">
          <Lock className="h-3.5 w-3.5" />
        </button>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-16 px-6 pt-12 pb-24">
        {/* ---------------- Triage ---------------- */}
        <section id="g-triage" className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-200/80">Saturday afternoon · {TRIAGE.alert}</p>
              <h1 className="mt-1 text-4xl font-light tracking-tight">
                Good afternoon, <span className="font-bold">Dr. Gibbings</span>
              </h1>
            </div>
            <div className="flex gap-3">
              {[
                [TRIAGE.stats.checkedIn, 'checked in'],
                [TRIAGE.stats.avgWait, 'avg wait'],
                [TRIAGE.stats.occupied, 'rooms'],
                [TRIAGE.stats.urgency, 'urgency'],
              ].map(([v, l]) => (
                <div key={l} className={`${glass} px-5 py-3 text-center`}>
                  <p className="text-xl font-bold text-cyan-200">{v}</p>
                  <p className="text-[11px] text-white/60">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* room wall — horizontal scroll */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {TRIAGE.rooms.map((r) => (
              <div
                key={r.name}
                className={`${glass} w-52 shrink-0 p-5 ${!r.patient && 'border-dashed bg-white/5'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{r.name}</p>
                  {r.patient ? (
                    <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200">{r.status}</span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white/50">Empty</span>
                  )}
                </div>
                {r.patient ? (
                  <>
                    <p className="mt-4 text-lg font-semibold">{r.patient}</p>
                    <p className="text-xs text-white/60">{r.species} · {r.client}</p>
                    <p className="mt-3 flex items-center gap-1.5 font-mono text-2xl font-bold text-cyan-200 tabular-nums">
                      <Clock className="h-4 w-4" /> {r.timer}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${r.pct}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="mt-10 mb-6 text-center text-xs text-white/40">drop a walk-in</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${glass} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold">Unscheduled Lobby</h2>
                <span className="text-xs text-cyan-200">{TRIAGE.lobby.length} waiting</span>
              </div>
              <div className="space-y-2.5">
                {TRIAGE.lobby.map((p) => (
                  <div key={p.pet} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-sm font-bold text-cyan-200">
                      {p.pet[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {p.pet} <span className="font-normal text-white/50">· {p.species}</span>
                      </p>
                      <p className="truncate text-xs text-white/50 italic">{p.note}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${URGENCY[p.urgency]}`}>
                      {p.urgency}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-400/20">
                <Sparkles className="h-3.5 w-3.5" /> Simulate walk-in arrival
              </button>
            </div>

            <div className={`${glass} p-5`}>
              <h2 className="mb-4 text-sm font-bold">Care team</h2>
              <div className="space-y-3">
                {TRIAGE.doctors.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/40 to-rose-400/30 text-sm font-bold">
                      {d.name.replace('Dr. ', '').split(' ').map((w) => w[0]).join('')}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-white/50">{d.specialty}</p>
                    </div>
                    <span className="text-xs text-white/60">{d.queue.length ? d.queue[0] : 'available'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Scheduler ---------------- */}
        <section id="g-sched" className="space-y-8">
          <div>
            <p className="flex items-center gap-2 text-sm text-cyan-200/80">
              <BrainCircuit className="h-4 w-4" /> Practice intelligence
            </p>
            <h2 className="mt-1 text-4xl font-light tracking-tight">
              The month, <span className="font-bold">already solved</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              60 staff scheduled four weeks out — weighted by personality chemistry, burnout risk, and weekend fairness.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className={`${glass} flex items-center gap-6 p-6 lg:col-span-5`}>
              <HealthRing value={SCHED_STATS.health} />
              <div className="space-y-3">
                {[
                  ['Coverage', SCHED_STATS.coverage],
                  ['Fairness', SCHED_STATS.fairness],
                  ['Burnout alerts', SCHED_STATS.burnout],
                  ['Unfilled shifts', SCHED_STATS.unfilled],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between gap-8">
                    <span className="text-xs text-white/60">{l}</span>
                    <span className="text-sm font-bold text-cyan-200 tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${glass} p-6 lg:col-span-7`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">Chemistry heatmap · Jul 20 – Aug 16</h3>
                <span className="text-[11px] text-white/50">brighter = better pairing</span>
              </div>
              <div className="space-y-1.5">
                {WEEKS.map((week, w) => (
                  <div key={w} className="flex items-center gap-1.5">
                    <span className="w-7 text-[10px] text-white/40">W{w + 1}</span>
                    {week.map((d) => (
                      <div
                        key={d.offset}
                        title={`${d.dow} ${d.date} · chem ${d.chemistry} · cov ${d.coverage}%`}
                        className="h-9 flex-1 rounded-lg"
                        style={{ background: `rgba(94,234,212,${0.08 + (d.chemistry / 100) * 0.55})` }}
                      >
                        <p className="pt-1 text-center text-[9px] text-white/70">{d.date.split(' ')[1]}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[10px] text-white/50">
                {ARCH_MIX.map((a) => (
                  <span key={a.key} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} /> {a.key} {a.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${glass} p-5`}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                <ArrowLeftRight className="h-4 w-4 text-cyan-300" /> Suggested moves
              </h3>
              <div className="space-y-2.5">
                {SUGGESTIONS.map((s) => (
                  <div key={s.title} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="truncate text-xs text-white/50">{s.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-400/15 px-2.5 py-1 text-[10px] font-bold text-cyan-200">
                      {s.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${glass} p-5`}>
              <h3 className="mb-4 text-sm font-bold">Top-weighted staff this week</h3>
              <div className="space-y-2.5">
                {[...ROSTER_WEEK1].sort((a, b) => b.weight - a.weight).slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: `${ARCHETYPES[e.archetype].color}55`, boxShadow: `0 0 0 2px ${ARCHETYPES[e.archetype].color}` }}
                    >
                      {e.name.split(' ').map((w) => w[0]).join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{e.name}</p>
                      <p className="text-xs text-white/50">{e.role} · {e.archetype}</p>
                    </div>
                    <div className="w-24">
                      <div className="h-1 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${e.weight}%` }} />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-cyan-200 tabular-nums">{e.weight}</p>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-center text-[11px] text-white/40">+ 54 more · full grid in month view</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
