// The right rail — context-sensitive "consult" panel of the Coverage Board.
// Three modes: Rulebook (nothing selected), Violation (a flag selected),
// Staff (a chip selected). This is the demo's elicitation surface: rules are
// editable HERE, live, in Dana's own words.
import { ArrowLeft, ArrowRight, BookOpenText, CloudOff, ShieldCheck, X } from 'lucide-react'
import { Badge, Button, cn } from '../../shared/ui/primitives'
import { RULE_TEMPLATES } from '../domain/rules'
import { DAYS, blockById } from '../domain/catalog'
import { isCalledOut, slotKey, staffDayBlocks } from '../domain/schedule'

const SEVERITY_BADGE = { hard: 'danger', soft: 'warning' }

function RuleCard({ rule, actions }) {
  const template = RULE_TEMPLATES[rule.type]
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-charcoal text-xs font-bold">{template.label}</span>
        <Badge variant={SEVERITY_BADGE[rule.severity]}>{rule.severity}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 italic">“{rule.rationale}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {template.paramFields.map((field) => {
          const value = rule.params[field.name]
          if (field.kind === 'count')
            return (
              <label key={field.name} className="flex items-center gap-1 text-[11px] text-slate-600">
                {field.label}
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => actions.updateRule(rule.id, { [field.name]: Number(e.target.value) })}
                  className="focus-visible:border-primary-hover h-6 w-14 rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none"
                />
              </label>
            )
          return (
            <span key={field.name} className="text-[11px] text-slate-500">
              {field.label}:{' '}
              <b className="text-charcoal">{Array.isArray(value) ? value.join(' ') : String(value ?? 'any')}</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RulebookMode({ state, actions }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <BookOpenText className="text-primary h-4 w-4" />
        <h2 className="text-charcoal text-sm font-bold">Dana's Rulebook</h2>
      </div>
      <p className="text-[11px] text-slate-500">
        The schedule's brain, externalized. Edit a number — the whole week re-checks instantly.
      </p>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {state.rulebook.map((rule) => (
          <RuleCard key={rule.id} rule={rule} actions={actions} />
        ))}
      </div>
    </>
  )
}

function coverageRepairs(violation, state, staff, weekHours, rulebook) {
  // For a coverage violation, suggest bench-light staff who satisfy the rule.
  const rule = rulebook.find((r) => r.id === violation.ruleId)
  if (!rule || violation.slotKeys.length !== 1) return null
  const [blockId, day] = violation.slotKeys[0].split(':')
  const need = rule.params.credential ?? null
  const role = rule.params.role ?? null
  const inSlot = state.week.slots[violation.slotKeys[0]]
  const candidates = staff.filter(
    (m) =>
      !inSlot.includes(m.id) &&
      (need ? m.credentials.includes(need) : m.role === role) &&
      staffDayBlocks(state.week, m.id, day).length === 0,
  )
  return { blockId, day, candidates }
}

function ViolationMode({ violations, selection, onSelect, state, staff, staffById, weekHours, actions }) {
  const index = Math.min(selection.index, violations.length - 1)
  if (index < 0)
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ShieldCheck className="text-success-text h-8 w-8" />
        <p className="text-charcoal text-sm font-bold">Clean board</p>
        <p className="text-[11px] text-slate-500">Every rule in the book is satisfied.</p>
      </div>
    )
  const v = violations[index]
  const rule = state.rulebook.find((r) => r.id === v.ruleId)
  const repairs = ['min-role-coverage', 'min-credential-coverage'].includes(v.type)
    ? coverageRepairs(v, state, staff, weekHours, state.rulebook)
    : null
  return (
    <>
      <div className="flex items-center gap-1">
        <Badge variant={SEVERITY_BADGE[v.severity]}>{v.severity}</Badge>
        <span className="ml-auto text-[11px] text-slate-400">{index + 1} of {violations.length}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Previous flag"
          onClick={() => onSelect({ kind: 'violation', index: (index + violations.length - 1) % violations.length })}>
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Next flag"
          onClick={() => onSelect({ kind: 'violation', index: (index + 1) % violations.length })}>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-charcoal text-sm font-semibold">{v.message}</p>
      {rule && <p className="text-[11px] text-slate-500 italic">“{rule.rationale}”</p>}
      {repairs && (
        <div className="mt-1">
          <h3 className="text-xs font-bold text-slate-600">Suggested repairs</h3>
          {repairs.candidates.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No repair available — every qualified hand is busy or capped.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-1">
              {repairs.candidates.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2 py-1">
                  <span className="text-xs font-semibold">{m.name}</span>
                  <span className="text-[10px] text-slate-400">{weekHours[m.id]}h this week</span>
                  <Button size="sm" className="ml-auto h-6 px-2 text-[11px]"
                    onClick={() => actions.assign(m.id, repairs.blockId, repairs.day)}>
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function StaffMode({ staffId, state, staffById, absorb, weekHours, actions }) {
  const member = staffById[staffId]
  const rows = DAYS.flatMap((day) =>
    staffDayBlocks(state.week, member.id, day).map((blockId) => ({ day, blockId })),
  )
  return (
    <>
      <h2 className="text-charcoal text-sm font-bold">{member.name}</h2>
      <p className="text-[11px] text-slate-500">
        {member.role}
        {member.credentials.length > 0 && ` · ${member.credentials.join(', ')}`}
        {member.float && ' · float pool'} · {weekHours[member.id]}h this week
      </p>
      <h3 className="mt-1 text-xs font-bold text-slate-600">This week & back-fill</h3>
      {rows.length === 0 && <p className="text-[11px] text-slate-500">On the bench all week.</p>}
      <div className="flex flex-col gap-1 overflow-y-auto">
        {rows.map(({ day, blockId }) => {
          const entry = absorb.perAssignment[`${slotKey(blockId, day)}:${member.id}`]
          return (
            <div key={`${blockId}:${day}`} className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{day} · {blockById(blockId).label}</span>
                <Badge variant={entry?.absorbable ? 'success' : 'danger'} className="ml-auto">
                  {entry?.absorbable ? 'covered' : 'no cover'}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                {entry?.absorbable
                  ? `Back-fill: ${entry.candidates.slice(0, 3).map((id) => staffById[id].name).join(', ')}`
                  : 'If this call-out happens, nobody qualified is free.'}
              </p>
            </div>
          )
        })}
      </div>
      <h3 className="mt-1 text-xs font-bold text-slate-600">Simulate call-out</h3>
      <div className="flex flex-wrap gap-1">
        {DAYS.map((day) => {
          const out = isCalledOut(state.week, member.id, day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => actions.toggleCallOut(member.id, day)}
              className={cn(
                'cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
                out
                  ? 'border-red-300 bg-red-100 text-red-700'
                  : 'text-charcoal border-slate-200 bg-white hover:border-primary',
              )}
            >
              {out && <CloudOff className="mr-1 inline h-3 w-3" />}
              {day}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function RulebookRail({ state, staff, staffById, violations, absorb, weekHours, selection, onSelect, actions }) {
  return (
    <aside className="glass-panel flex max-h-[44rem] w-80 shrink-0 flex-col gap-2 self-start rounded-xl p-3">
      {selection && (
        <Button variant="ghost" size="sm" className="self-end" onClick={() => onSelect(null)}>
          <X className="h-3.5 w-3.5" /> Rulebook
        </Button>
      )}
      {selection == null && <RulebookMode state={state} actions={actions} />}
      {selection?.kind === 'violation' && (
        <ViolationMode
          violations={violations} selection={selection} onSelect={onSelect}
          state={state} staff={staff} staffById={staffById} weekHours={weekHours} actions={actions}
        />
      )}
      {selection?.kind === 'staff' && (
        <StaffMode
          staffId={selection.id} state={state} staffById={staffById}
          absorb={absorb} weekHours={weekHours} actions={actions}
        />
      )}
    </aside>
  )
}
