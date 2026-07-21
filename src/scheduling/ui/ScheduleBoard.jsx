// The Coverage Board screen — scheduling context's main surface.
// Assembly only: domain state via useScheduleBoard, chrome and drag wiring
// here, panels/rail from siblings. Mirrors TriageBoard's { hidden, onLock }
// prop contract so src/app can mount both contexts symmetrically.
import { useState } from 'react'
import { CalendarRange, ChevronLeft, Lock as LockIcon, RotateCcw } from 'lucide-react'
import { Button, cn } from '../../shared/ui/primitives'
import { useToasts, Toaster } from '../../shared/toast/toast'
import { DragDropBoard } from '../../shared/dnd/engine'
import { assignTo, removeFrom } from '../domain/schedule'
import { evaluateWeek } from '../domain/rules'
import { useScheduleBoard } from './useScheduleBoard'
import { CoverageGrid } from './CoverageGrid'
import { VitalsBar, DemandStrip, Bench } from './panels'
import { RulebookRail } from './rail'
import { ChipDragPreview } from './chips'
import Dashboard from './Dashboard'
import { STAFF } from '../data/clinic'

export default function ScheduleBoard({ hidden, onLock }) {
  const { toasts, notify, dismiss } = useToasts()
  const {
    state, staffById, violations, bySlot, absorb, weekHours, stats,
    health, chemistryByDay, suggestions, mix, actions,
  } = useScheduleBoard(notify)
  // 'overview' is the front door; the Coverage Board is the drill-down where
  // the actual editing happens. Both read the same live state.
  const [view, setView] = useState('overview')
  // selection: null | {kind:'violation', index} | {kind:'staff', id}
  const [selection, setSelection] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)

  // Live rule feedback during drag hover: evaluate the hypothetical drop and
  // report the worst NEW consequence. One evaluateWeek per hovered cell —
  // cheap at demo scale.
  const hoverCheck = (staffId, blockId, day) => {
    const drag = activeDragId?.split(':') ?? []
    // A cell→cell move vacates the source slot first; assignTo alone would
    // double-count the staffer in both slots and misreport the ring.
    const base = drag[0] === 'cell' ? removeFrom(state.week, drag[1], drag[2], drag[3]) : state.week
    const week = assignTo(base, staffId, blockId, day)
    if (week === base) return 'ok' // already in the slot
    const after = evaluateWeek(week, state.rulebook, staffById)
    const count = (list, severity) => list.filter((v) => v.severity === severity).length
    if (count(after, 'hard') > count(violations, 'hard')) return 'hard'
    if (count(after, 'soft') > count(violations, 'soft')) return 'soft'
    return 'ok'
  }

  const handleDrop = (dragId, dropId) => {
    const drag = dragId.split(':')
    const drop = dropId.split(':')
    if (drop[0] === 'slot') {
      if (drag[0] === 'bench') actions.assign(drag[1], drop[1], drop[2])
      else if (drag[0] === 'cell') actions.move(drag[1], drag[2], drag[3], drop[1], drop[2])
    } else if (dropId === 'bench' && drag[0] === 'cell') {
      actions.unassign(drag[1], drag[2], drag[3])
    }
  }

  const dragPreview = (dragId) => {
    const staff = staffById[dragId.split(':')[1]]
    return staff ? <ChipDragPreview staff={staff} /> : null
  }

  // The overview is its own dark surface; it shares state with the board but
  // not its chrome, so it renders as an early return rather than a sub-branch.
  if (view === 'overview') {
    return (
      <div className={cn('coast-bg min-h-screen font-sans text-white', hidden && 'hidden')}>
        <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
          <header className="mb-8 flex items-center gap-3">
            <CalendarRange className="text-coast-accent h-6 w-6" />
            <h1 className="text-lg font-bold">Staff Scheduling</h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={actions.reset}
                className="coast-panel cursor-pointer px-3 py-1.5 text-xs font-bold hover:bg-white/15"
              >
                <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Reset demo
              </button>
              <button
                type="button"
                onClick={onLock}
                aria-label="Lock screen"
                className="coast-panel cursor-pointer px-3 py-2 hover:bg-white/15"
              >
                <LockIcon className="h-4 w-4" />
              </button>
            </div>
          </header>
          <Dashboard
            health={health}
            chemistryByDay={chemistryByDay}
            suggestions={suggestions}
            mix={mix}
            staff={STAFF}
            weekHours={weekHours}
            onApply={actions.applySuggestion}
            onOpenBoard={() => setView('board')}
          />
        </div>
        <Toaster toasts={toasts} onDismiss={dismiss} />
      </div>
    )
  }

  return (
    <div className={cn('from-primary/10 via-cream to-accent/10 min-h-screen bg-gradient-to-br', hidden && 'hidden')}>
      <DragDropBoard onDrop={handleDrop} preview={dragPreview} onActiveChange={setActiveDragId}>
        <div className="mx-auto flex max-w-[110rem] flex-col gap-3 p-4">
          <header className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView('overview')}>
              <ChevronLeft className="h-4 w-4" /> Overview
            </Button>
            <CalendarRange className="text-primary h-6 w-6" />
            <div>
              <h1 className="text-charcoal text-lg font-bold">Coverage Board</h1>
              <p className="text-xs text-slate-500">
                Week of Mar 9 · Dana's rulebook, running live — drops land, then flag
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={actions.reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset demo
              </Button>
              <Button variant="ghost" size="sm" onClick={onLock} aria-label="Lock screen">
                <LockIcon className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <VitalsBar stats={stats} onSelectViolation={(index) => setSelection({ kind: 'violation', index })} />

          <div className="flex gap-3">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <DemandStrip />
              <CoverageGrid
                week={state.week}
                bySlot={bySlot}
                staffById={staffById}
                selection={selection}
                onChipClick={(staffId) => setSelection({ kind: 'staff', id: staffId })}
                activeDragId={activeDragId}
                hoverCheck={hoverCheck}
              />
            </div>
            <RulebookRail
              state={state}
              staff={STAFF}
              staffById={staffById}
              violations={violations}
              absorb={absorb}
              weekHours={weekHours}
              selection={selection}
              onSelect={setSelection}
              actions={actions}
            />
          </div>

          <Bench
            staff={STAFF.filter((m) => weekHours[m.id] === 0)}
            weekHours={weekHours}
            onChipClick={(staffId) => setSelection({ kind: 'staff', id: staffId })}
          />
        </div>
      </DragDropBoard>
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
