// Practice intelligence — the Coastal Glass overview.
//
// The front door of the scheduling context: health ring, chemistry heatmap,
// suggested moves, staff load. Every figure here is computed by the domain
// from the live week; nothing is sampled or hardcoded. The layout is ported
// from the prototype's Coastal Glass variant, but where that variant read from
// a seeded PRNG this reads from the same engine that drives the Coverage
// Board — apply a move here and the board reflects it immediately.
//
// Components are module-scope (repo rule). Colors come from @theme tokens
// (coast-*) and the .coast-panel / .coast-bg utilities in index.css.
import { ArrowLeftRight, BrainCircuit, LayoutGrid } from 'lucide-react'
import { ARCHETYPES } from '../domain/chemistry'

function HealthRing({ value }) {
  const r = 54
  const circumference = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={`Schedule health ${value} of 100`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="10" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="var(--color-coast-accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" fill="white" style={{ fontSize: 30, fontWeight: 700 }}>
        {value}
      </text>
      <text x="70" y="88" textAnchor="middle" fill="rgb(255 255 255 / 0.6)" style={{ fontSize: 11 }}>
        schedule health
      </text>
    </svg>
  )
}

function VitalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-coast-accent text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

// Chemistry across a real week lands in a narrow band (low 70s to high 70s),
// so mapping 0-100 straight onto opacity makes every tile look identical.
// Stretch the week's own min..max across the usable range instead — the
// heatmap's job is showing which day is weakest, not absolute magnitude.
function heatAlpha(value, lo, hi) {
  if (value === null) return null
  if (hi === lo) return 0.4
  return 0.12 + ((value - lo) / (hi - lo)) * 0.63
}

function ChemistryHeatmap({ chemistryByDay, mix }) {
  const scored = chemistryByDay.map((d) => d.chemistry).filter((c) => c !== null)
  const lo = scored.length ? Math.min(...scored) : 0
  const hi = scored.length ? Math.max(...scored) : 0
  return (
    <div className="coast-panel p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Chemistry by day · week of Mar 9</h3>
        <span className="text-[11px] text-white/50">brighter = better pairing</span>
      </div>
      <div className="flex items-end gap-1.5">
        {chemistryByDay.map(({ day, chemistry }) => (
          <div key={day} className="flex-1">
            <div
              title={chemistry === null ? `${day} · no paired shifts` : `${day} · chemistry ${chemistry}`}
              className="flex h-16 items-end justify-center rounded-lg"
              style={{
                background:
                  chemistry === null
                    ? 'rgb(255 255 255 / 0.05)'
                    : `rgb(94 234 212 / ${heatAlpha(chemistry, lo, hi)})`,
              }}
            >
              <span className="pb-1 text-[11px] font-semibold text-white/80 tabular-nums">
                {chemistry ?? '—'}
              </span>
            </div>
            <p className="pt-1 text-center text-[10px] text-white/50">{day}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/50">
        {mix.map((a) => (
          <span key={a.key} className="flex items-center gap-1" title={ARCHETYPES[a.key].blurb}>
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} /> {a.key} {a.count}
          </span>
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion, onApply }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="min-w-[12rem] flex-1">
        <p className="text-sm font-semibold">{suggestion.title}</p>
        <p className="text-xs text-white/50">{suggestion.detail}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {suggestion.impact.map((i) => (
          <span
            key={i.label}
            className="bg-coast-accent/15 text-coast-accent rounded-full px-2.5 py-1 text-[10px] font-bold"
          >
            {i.label} {i.delta}
          </span>
        ))}
        <button
          type="button"
          onClick={() => onApply(suggestion)}
          aria-label={`Apply: ${suggestion.title}`}
          className="border-coast-accent/40 text-coast-accent cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold hover:bg-white/10"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

function StaffLoadRow({ member, hours, max }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: `${ARCHETYPES[member.archetype].color}55`,
          boxShadow: `0 0 0 2px ${ARCHETYPES[member.archetype].color}`,
        }}
      >
        {member.name.replace('Dr. ', '').split(' ').map((w) => w[0]).join('')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{member.name}</p>
        <p className="text-xs text-white/50">
          {member.role} · {member.archetype}
        </p>
      </div>
      <div className="w-24 shrink-0">
        <div className="h-1 overflow-hidden rounded-full bg-white/15">
          <div className="bg-coast-accent h-full rounded-full" style={{ width: `${(hours / max) * 100}%` }} />
        </div>
        <p className="text-coast-accent mt-1 text-right text-[10px] tabular-nums">{hours}h</p>
      </div>
    </div>
  )
}

export default function Dashboard({ health, chemistryByDay, suggestions, mix, staff, weekHours, onApply, onOpenBoard }) {
  const busiest = [...staff]
    .filter((m) => weekHours[m.id] > 0)
    .sort((a, b) => weekHours[b.id] - weekHours[a.id])
    .slice(0, 6)
  const maxHours = busiest.length ? weekHours[busiest[0].id] : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-coast-accent/80 flex items-center gap-2 text-sm">
            <BrainCircuit className="h-4 w-4" /> Practice intelligence
          </p>
          <h2 className="mt-1 text-4xl font-light tracking-tight">
            The week, <span className="font-bold">already scored</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            58 staff across 8 blocks — weighted by credential coverage, team chemistry, burnout risk,
            and weekend equity. Every number below is computed from the live schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenBoard}
          className="coast-panel flex cursor-pointer items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-white/15"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Open Coverage Board
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="coast-panel flex items-center gap-6 p-6 lg:col-span-5">
          <HealthRing value={health.score} />
          <div className="min-w-0 flex-1 space-y-3">
            <VitalRow label="Coverage" value={`${health.coverage}%`} />
            <VitalRow label="Weekend equity" value={health.fairness} />
            <VitalRow label="Chemistry" value={health.chemistry} />
            <VitalRow label="Burnout alerts" value={health.burnout} />
            <VitalRow label="Unfilled shifts" value={health.unfilled} />
          </div>
        </div>

        <div className="lg:col-span-7">
          <ChemistryHeatmap chemistryByDay={chemistryByDay} mix={mix} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="coast-panel p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <ArrowLeftRight className="text-coast-accent h-4 w-4" /> Suggested moves
            <span className="ml-auto text-[11px] font-normal text-white/40">impact is measured, not estimated</span>
          </h3>
          <div className="space-y-2.5">
            {suggestions.length === 0 && (
              <p className="py-6 text-center text-xs text-white/40">
                Nothing to suggest — the week satisfies every rule Dana wrote.
              </p>
            )}
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onApply={onApply} />
            ))}
          </div>
        </div>

        <div className="coast-panel p-5">
          <h3 className="mb-4 text-sm font-bold">Heaviest load this week</h3>
          <div className="space-y-2.5">
            {busiest.map((m) => (
              <StaffLoadRow key={m.id} member={m} hours={weekHours[m.id]} max={maxHours} />
            ))}
          </div>
          <p className="pt-3 text-center text-[11px] text-white/40">
            {staff.filter((m) => weekHours[m.id] > 0).length} staff rostered · {staff.length} on the roll
          </p>
        </div>
      </div>
    </div>
  )
}
