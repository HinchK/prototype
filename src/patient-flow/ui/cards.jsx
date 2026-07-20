// Patient-flow cards: walk-ins (drag sources), rooms and doctors (drop zones).
// Domain state comes in as props; drops are reported upward via the shared
// dnd engine's opaque ids ('walk-in id' onto 'room:<name>' / 'doc:<id>').
import { PawPrint, Dog, Cat, Bird, Rabbit, Rat, Clock, DoorOpen, GripVertical, MoreVertical, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Avatar, cn } from '../../shared/ui/primitives'
import { DragHandle, DropZone } from '../../shared/dnd/engine'
import { visitStage } from '../domain/board'
import { DOCTORS } from '../domain/catalog'

export const URGENCY_BADGE = { High: 'danger', Medium: 'warning', Low: 'success' }
const KIND_ICONS = { dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, hamster: Rat, ferret: Rat }
const STAGE_UI = {
  vitals: { label: 'Vitals', variant: 'info', bar: 'bg-primary-hover' },
  exam: { label: 'Exam', variant: 'primary', bar: 'bg-primary' },
  discharging: { label: 'Discharging', variant: 'warning', bar: 'bg-amber-500' },
  ready: { label: 'Ready for Checkout', variant: 'success', bar: 'bg-emerald-500' },
}

const fmtSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function WalkInCard({
  walkIn,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  openRooms,
  onCheckIn,
  onAssignDoctor,
}) {
  const Kind = KIND_ICONS[walkIn.kind] ?? PawPrint
  return (
    <DragHandle id={walkIn.id}>
      {({ isDragging }) => (
        <div
          className={cn(
            'group animate-pop-in relative cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 select-none',
            'hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing',
            isDragging && 'border-primary rotate-1 border-dashed opacity-40',
          )}
        >
          <div className="flex items-start gap-2">
            <GripVertical size={16} className="mt-1 shrink-0 text-slate-300" aria-hidden="true" />
            <div className="bg-primary/10 text-primary mt-0.5 shrink-0 rounded-lg p-1.5">
              <Kind size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-charcoal truncate text-sm font-bold">
                {walkIn.pet} <span className="font-normal text-slate-500">· {walkIn.species}</span>
              </p>
              <p className="truncate text-xs text-slate-500">with {walkIn.client}</p>
            </div>
            <Badge variant={URGENCY_BADGE[walkIn.urgency]}>{walkIn.urgency}</Badge>
            <button
              aria-label={`Assign ${walkIn.pet} without dragging`}
              onClick={onToggleMenu}
              className="hover:text-primary focus-visible:ring-primary-hover -mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <MoreVertical size={15} />
            </button>
          </div>
          <p className="mt-2 pl-6 text-xs text-slate-500 italic">{walkIn.note}</p>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
              <div className="absolute top-9 right-2 z-20 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  Send to room
                </p>
                {openRooms.length === 0 && (
                  <p className="px-2 pb-1 text-xs text-slate-400 italic">All rooms occupied</p>
                )}
                {openRooms.map((room) => (
                  <MenuItem
                    key={room}
                    onClick={() => {
                      onCloseMenu()
                      onCheckIn(walkIn.id, room)
                    }}
                  >
                    {room}
                  </MenuItem>
                ))}
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  Assign to doctor
                </p>
                {DOCTORS.map((d) => (
                  <MenuItem
                    key={d.id}
                    onClick={() => {
                      onCloseMenu()
                      onAssignDoctor(walkIn.id, d.id)
                    }}
                  >
                    {d.name}
                  </MenuItem>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </DragHandle>
  )
}

/** Compact ghost card shown under the pointer while dragging. */
export function WalkInDragPreview({ walkIn }) {
  const Kind = KIND_ICONS[walkIn.kind] ?? PawPrint
  return (
    <div className="border-primary flex w-56 rotate-2 items-center gap-2 rounded-xl border-2 bg-white p-3 shadow-xl">
      <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-1.5">
        <Kind size={16} />
      </div>
      <p className="text-charcoal min-w-0 flex-1 truncate text-sm font-bold">
        {walkIn.pet} <span className="font-normal text-slate-500">· {walkIn.species}</span>
      </p>
      <Badge variant={URGENCY_BADGE[walkIn.urgency]}>{walkIn.urgency}</Badge>
    </div>
  )
}

export function RoomCard({ name, visit, onCheckOut }) {
  const stage = visit ? STAGE_UI[visitStage(visit)] : null
  return (
    <DropZone id={`room:${name}`}>
      {({ isOver }) => (
        <div
          className={cn(
            'flex min-h-[160px] flex-col rounded-xl border-2 p-4 transition-all duration-200',
            visit ? 'border-slate-200 bg-white shadow-sm' : 'border-dashed border-slate-300 bg-slate-50/60',
            isOver &&
              (visit
                ? 'border-red-300 bg-red-50'
                : 'border-primary-hover ring-primary-hover/40 scale-[1.02] bg-sky-50/80 ring-2'),
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-charcoal text-sm font-bold">{name}</h3>
            {visit ? <Badge variant={stage.variant}>{stage.label}</Badge> : <Badge>Empty</Badge>}
          </div>
          {visit ? (
            <>
              <p className="text-charcoal truncate text-sm font-semibold">
                {visit.walkIn.pet} <span className="font-normal text-slate-500">· {visit.walkIn.species}</span>
              </p>
              <p className="truncate text-xs text-slate-500">with {visit.walkIn.client}</p>
              <div className="mt-3 flex items-center gap-1.5 text-slate-600">
                <Clock size={14} />
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {fmtSeconds(Math.max(0, visit.remainingSeconds))}
                </span>
                <span className="text-xs text-slate-400">remaining</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000', stage.bar)}
                  style={{ width: `${Math.max(2, (visit.remainingSeconds / visit.totalSeconds) * 100)}%` }}
                />
              </div>
              <Button
                size="sm"
                variant={visit.remainingSeconds <= 0 ? 'default' : 'outline'}
                className="mt-3 w-full"
                onClick={onCheckOut}
              >
                <CheckCircle2 size={14} /> Check Out
              </Button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-slate-400">
              <DoorOpen size={22} />
              <p className="text-xs font-medium">Drop a walk-in here</p>
            </div>
          )}
        </div>
      )}
    </DropZone>
  )
}

export function DoctorCard({ doctor, queue, onDischarge }) {
  return (
    <DropZone id={`doc:${doctor.id}`}>
      {({ isOver }) => (
        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200',
            isOver && 'border-primary-hover ring-primary-hover/40 scale-[1.01] bg-sky-50/60 ring-2',
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar name={doctor.name} />
            <div className="min-w-0">
              <p className="text-charcoal truncate text-sm font-bold">{doctor.name}</p>
              <p className="truncate text-xs text-slate-500">{doctor.specialty}</p>
            </div>
            <Badge variant="primary" className="ml-auto">
              {queue.length} in care
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            {queue.map((walkIn) => (
              <div
                key={walkIn.id}
                className="animate-pop-in flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-charcoal truncate text-xs font-bold">{walkIn.pet}</p>
                  <p className="truncate text-[11px] text-slate-500">with {walkIn.client}</p>
                </div>
                <Badge variant={URGENCY_BADGE[walkIn.urgency]}>{walkIn.urgency}</Badge>
                <button
                  aria-label={`Discharge ${walkIn.pet}`}
                  onClick={() => onDischarge(doctor.id, walkIn.id)}
                  className="hover:bg-success hover:text-success-text focus-visible:ring-primary-hover flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <CheckCircle2 size={15} />
                </button>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
                Drag a patient here to assign
              </div>
            )}
          </div>
        </div>
      )}
    </DropZone>
  )
}

function MenuItem({ children, ...props }) {
  return (
    <button
      className="text-charcoal focus-visible:ring-primary-hover w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:outline-none"
      {...props}
    >
      {children}
    </button>
  )
}
