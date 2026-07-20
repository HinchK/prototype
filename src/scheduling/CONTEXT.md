# Scheduling

Staff scheduling co-pilot for ~60 employees: rule engine, internal shift
market, robustness-first objective. **Reserved — the epic has not started.**

## Language

Deliberately empty. The epic spec (§7, phase 1) makes rule extraction the
first deliverable: the ubiquitous language here must come out of the
scheduler interviews, not be invented ahead of them. Do not import
patient-flow terms — a Walk-In, Room, or Visit means nothing in this context.

Two terms are already fixed by the spec and safe to anchor on:

**Staff**:
An employee being scheduled.
_Avoid_: Doctor, care team (patient-flow words)

**Shift**:
A block of time a staff member can be assigned to. The draggable unit on the
future resource timeline.
_Avoid_: Visit, slot
