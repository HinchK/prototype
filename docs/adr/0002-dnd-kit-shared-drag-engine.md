# dnd-kit behind the shared drag-and-drop seam

The board originally used native HTML5 drag-and-drop. We replaced it with
dnd-kit inside `src/shared/dnd/engine.jsx` because the epic spec names dnd-kit
as the engine the scheduling timeline will reuse, and because native HTML5 DnD
has no touch support, no keyboard dragging, browser-styled drag previews, and
cancels a drag if React remounts the dragged node mid-gesture.

## Consequences

- The engine's interface is deliberately small and domain-agnostic: opaque
  string ids, `onDrop(dragId, dropId)`, a `preview` render prop. Callers
  (today the triage board, later the resource timeline) encode meaning in ids
  and enforce drop validity themselves — zones are never disabled engine-side.
- Pointer drags require 4px of travel before activating so buttons inside
  draggable cards keep working; keyboard dragging (Space/arrows) comes free.
- Anything dnd-kit-specific stays inside the module; swapping engines again
  would touch one file.
