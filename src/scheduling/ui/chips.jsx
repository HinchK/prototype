// Staff chips — the draggable unit of the Coverage Board.
// Module-scope components only (repo rule).
import { CloudOff } from 'lucide-react'
import { Badge, cn } from '../../shared/ui/primitives'

const ROLE_BADGE = { DVM: 'primary', Tech: 'info', Assistant: 'neutral', CSR: 'warning', Kennel: 'success' }

export function CredBadge({ staff }) {
  const label = staff.credentials.includes('LVT-A')
    ? 'LVT-A'
    : staff.credentials[0] ?? staff.role
  return <Badge variant={ROLE_BADGE[staff.role]}>{label}</Badge>
}

const TONE_RING = {
  hard: 'ring-2 ring-red-400',
  soft: 'ring-2 ring-amber-300',
}

export function StaffChip({ staff, tone = null, calledOut = false, hours, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-grab items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-left shadow-sm',
        'transition-colors hover:border-primary',
        TONE_RING[tone],
        calledOut && 'opacity-40 line-through',
      )}
    >
      <span className={cn('truncate font-semibold', compact ? 'text-[11px]' : 'text-xs')}>
        {staff.name}
      </span>
      {calledOut && <CloudOff aria-label="Called out" className="h-3 w-3 shrink-0 text-red-500" />}
      {!compact && <span className="ml-auto flex items-center gap-1">
        {hours != null && <span className="text-[10px] text-slate-400">{hours}h</span>}
        <CredBadge staff={staff} />
      </span>}
    </button>
  )
}

export function ChipDragPreview({ staff }) {
  return (
    <div className="border-primary flex items-center gap-1.5 rounded-lg border-2 bg-white px-2 py-1 shadow-lg">
      <span className="text-xs font-semibold">{staff.name}</span>
      <CredBadge staff={staff} />
    </div>
  )
}
