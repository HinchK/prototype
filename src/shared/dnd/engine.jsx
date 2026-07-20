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
//   Space/Enter lifts, arrow keys jump zone to zone, Space/Enter drops.
// - Zones are never disabled by the engine: whether a drop is *valid* is the
//   caller's rule to enforce in onDrop (e.g. reject with a toast).
// - Interactive elements nested inside a DragHandle (menus, overlays) should
//   stopPropagation on pointerdown/keydown so they don't start a drag.
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

const ARROW_DIRECTIONS = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
}

// On arrow press, jump to the nearest drop zone in that direction (dnd-kit's
// default getter only nudges 25px per press — unusable across a board layout).
function snapToDroppable(event, { currentCoordinates, context: { collisionRect, droppableRects, droppableContainers } }) {
  const direction = ARROW_DIRECTIONS[event.code]
  if (!direction || !collisionRect) return undefined
  event.preventDefault()

  const [dx, dy] = direction
  const activeCenter = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top + collisionRect.height / 2,
  }

  let best
  let bestDistance = Infinity
  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id)
    if (!rect) continue
    const delta = {
      x: rect.left + rect.width / 2 - activeCenter.x,
      y: rect.top + rect.height / 2 - activeCenter.y,
    }
    // Must lie in the pressed direction (with a small dead zone).
    if (dx !== 0 && (Math.sign(delta.x) !== dx || Math.abs(delta.x) < 4)) continue
    if (dy !== 0 && (Math.sign(delta.y) !== dy || Math.abs(delta.y) < 4)) continue
    const distance = Math.hypot(delta.x, delta.y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { x: currentCoordinates.x + delta.x, y: currentCoordinates.y + delta.y }
    }
  }
  return best
}

const POINTER_OPTIONS = { activationConstraint: { distance: 4 } }
const KEYBOARD_OPTIONS = { coordinateGetter: snapToDroppable }

export function DragDropBoard({ onDrop, preview, children }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
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
