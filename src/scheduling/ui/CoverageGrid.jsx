// The Coverage Board grid: operational blocks (rows, office-flow order) ×
// days (columns). Cells are drop zones; chips drag between cells and bench.
// Violations render AT THE SEAMS: the offending cell's border glows. While a
// chip is being dragged, the hovered cell previews what the checker would say
// about that exact drop (hoverCheck) — red/amber/green before release.
import { Fragment } from 'react'
import { cn } from '../../shared/ui/primitives'
import { DragHandle, DropZone } from '../../shared/dnd/engine'
import { BLOCKS, DAYS, formatWindow } from '../domain/catalog'
import { isCalledOut, slotKey } from '../domain/schedule'
import { StaffChip } from './chips'

const SEAM = {
  hard: 'border-red-400 bg-red-50/60 shadow-[0_0_0_1px_theme(colors.red.400)]',
  soft: 'border-amber-300 bg-amber-50/60',
}

const HOVER_RING = {
  hard: 'ring-2 ring-red-400 border-red-400',
  soft: 'ring-2 ring-amber-400 border-amber-400',
  ok: 'ring-2 ring-success-text/60 border-success-text/60',
}

function Cell({ blockId, day, ids, tone, week, staffById, selection, onChipClick, activeDragId, hoverCheck }) {
  const dragStaffId = activeDragId?.split(':')[1]
  return (
    <DropZone id={`slot:${blockId}:${day}`}>
      {({ isOver }) => (
        <div
          className={cn(
            'min-h-14 rounded-lg border border-slate-200 bg-white p-1 transition-colors',
            SEAM[tone],
            isOver &&
              (dragStaffId
                ? HOVER_RING[hoverCheck(dragStaffId, blockId, day)]
                : 'border-primary-hover ring-primary-hover/40 ring-2'),
          )}
        >
          <div className="flex flex-col gap-1">
            {ids.map((staffId) => (
              <DragHandle key={staffId} id={`cell:${staffId}:${blockId}:${day}`}>
                <StaffChip
                  staff={staffById[staffId]}
                  compact
                  calledOut={isCalledOut(week, staffId, day)}
                  tone={selection?.kind === 'staff' && selection.id === staffId ? 'soft' : null}
                  onClick={() => onChipClick(staffId, blockId, day)}
                />
              </DragHandle>
            ))}
          </div>
        </div>
      )}
    </DropZone>
  )
}

export function CoverageGrid({ week, bySlot, staffById, selection, onChipClick, activeDragId, hoverCheck }) {
  return (
    <div className="min-w-[64rem]">
      <div className="grid grid-cols-[9.5rem_repeat(7,1fr)] gap-1">
        <span />
        {DAYS.map((day) => (
          <div key={day} className="px-2 pb-1 text-center text-xs font-bold text-slate-500">{day}</div>
        ))}
        {BLOCKS.map((block) => (
          <Fragment key={block.id}>
            <div className="flex flex-col justify-center rounded-lg py-1 pr-3 text-right">
              <span className="text-charcoal text-xs font-bold">{block.label}</span>
              <span className="text-[10px] text-slate-400">{formatWindow(block)}</span>
            </div>
            {DAYS.map((day) => (
              <Cell
                key={day}
                blockId={block.id}
                day={day}
                ids={week.slots[slotKey(block.id, day)]}
                tone={bySlot[slotKey(block.id, day)]}
                week={week}
                staffById={staffById}
                selection={selection}
                onChipClick={onChipClick}
                activeDragId={activeDragId}
                hoverCheck={hoverCheck}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
