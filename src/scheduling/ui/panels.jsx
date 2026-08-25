// Coverage Board chrome: Week Vitals (glass), the demand strip, and the Bench.
import { Activity, AlertTriangle, ShieldCheck, Users } from 'lucide-react'
import { Badge, cn } from '../../shared/ui/primitives'
import { DragHandle, DropZone } from '../../shared/dnd/engine'
import { DAYS } from '../domain/catalog'
import { DEMAND, DEMAND_NOTES } from '../data/clinic'
import { StaffChip } from './chips'

function Vital({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4', tone ?? 'text-primary')} />
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-charcoal text-sm font-bold">{value}</span>
    </div>
  )
}

export function VitalsBar({ stats, onSelectViolation }) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-2.5">
      <h2 className="text-charcoal mr-2 text-sm font-bold">Week Vitals</h2>
      <Vital icon={Users} label="Coverage" value={`${stats.filled}/${stats.totalSlots} slots`} />
      <Vital
        icon={AlertTriangle}
        label="Hard violations"
        value={stats.hard}
        tone={stats.hard > 0 ? 'text-red-500' : 'text-success-text'}
      />
      <Vital
        icon={Activity}
        label="Soft flags"
        value={stats.soft}
        tone={stats.soft > 0 ? 'text-amber-500' : 'text-success-text'}
      />
      <Vital
        icon={ShieldCheck}
        label="Absorbs"
        value={`${stats.absorbable}/${stats.total} call-outs`}
        tone={stats.absorbable === stats.total ? 'text-success-text' : 'text-amber-500'}
      />
      {stats.violations.length > 0 && (
        <button
          type="button"
          onClick={() => onSelectViolation(0)}
          className="text-primary ml-auto cursor-pointer text-xs font-semibold hover:underline"
        >
          Review flags →
        </button>
      )}
    </div>
  )
}

export function DemandStrip() {
  return (
    <div className="grid grid-cols-[9.5rem_repeat(7,1fr)] items-end gap-px px-1">
      <span className="pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Appt load (PIMS)
      </span>
      {DAYS.map((day) => (
        <div key={day} className="flex flex-col items-center gap-0.5 px-2" title={DEMAND_NOTES[day]}>
          <span className="text-[10px] text-slate-400">{DEMAND[day]}%</span>
          <div className="h-8 w-full overflow-hidden rounded-t bg-slate-200/60">
            <div
              className={cn('w-full', DEMAND[day] > 85 ? 'bg-primary' : 'bg-primary/50')}
              style={{ height: `${DEMAND[day]}%`, marginTop: `${100 - DEMAND[day]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const BENCH_GROUPS = ['DVM', 'Tech', 'Assistant', 'CSR', 'Kennel']

export function Bench({ staff, weekHours, onChipClick }) {
  return (
    <DropZone id="bench">
      {({ isOver }) => (
        <div className={cn('glass-panel rounded-xl p-3', isOver && 'ring-primary-hover ring-2')}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-charcoal text-sm font-bold">Bench</h2>
            <span className="text-xs text-slate-500">drag to assign · drop here to unassign</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {BENCH_GROUPS.map((role) => (
              <div key={role} className="min-w-40 flex-1">
                <Badge variant="neutral" className="mb-1.5">{role}</Badge>
                <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto pr-1">
                  {staff
                    .filter((m) => m.role === role)
                    .map((m) => (
                      <DragHandle key={m.id} id={`bench:${m.id}`}>
                        <StaffChip staff={m} hours={weekHours[m.id]} onClick={() => onChipClick(m.id)} />
                      </DragHandle>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DropZone>
  )
}
