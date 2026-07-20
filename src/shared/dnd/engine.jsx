// Drag-and-drop board engine — shared module, domain-agnostic (dnd-kit inside).
//
// Interface (everything a caller must know):
//   <DragDropBoard onDrop={(dragId, dropId) => void} preview={(dragId) => ReactNode}>
//     <DragHandle id="...">{({ isDragging }) => node}</DragHandle>
//     <DropZone id="...">{({ isOver }) => node}</DropZone>
//   </DragDropBoard>
//
// - Ids are opaque strings; encode domain meaning in them and parse in onDrop.
//   onDrop fires only when a drag ends over a zone.
// - preview renders the floating card that follows the pointer (DragOverlay).
// - Pointer drags need 4px of travel before activating, so clicks on buttons
//   inside a DragHandle still work. Keyboard dragging: focus the handle,
//   Space/Enter lifts, arrows move, Space/Enter drops.
// - Zones are never disabled by the engine: whether a drop is *valid* is the
//   caller's rule to enforce in onDrop (e.g. reject with a toast).
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'

export function DragDropBoard({ onDrop, preview, children }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active, over }) => {
        setActiveId(null)
        if (over) onDrop(String(active.id), String(over.id))
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{activeId && preview ? preview(activeId) : null}</DragOverlay>
    </DndContext>
  )
}

export function DragHandle({ id, children }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {typeof children === 'function' ? children({ isDragging }) : children}
    </div>
  )
}

export function DropZone({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef}>{typeof children === 'function' ? children({ isOver }) : children}</div>
  )
}
