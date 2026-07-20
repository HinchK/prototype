# Patient Flow

The live floor of the hospital: walk-ins arriving without appointments, moving
through exam rooms or a doctor's care, and checking out. A real-time ops tool
for front desk and techs.

## Language

**Walk-In**:
A client-and-pet party waiting without an appointment. The unit that moves
through the board.
_Avoid_: Patient card, clump of humans (fun, but not a term)

**Lobby**:
Where walk-ins wait before being placed. Always unscheduled.
_Avoid_: Queue (that's a doctor's Care Queue), waiting list

**Exam Room**:
One of the six named rooms a walk-in can be checked in to (Room 1–3, Triage,
Surgery, Recovery). Holds at most one visit.
_Avoid_: Slot, bay

**Check-In**:
Moving a walk-in from the Lobby into an empty Exam Room, starting a Visit.
_Avoid_: Assign (that's for doctors), book

**Visit**:
An in-progress exam occupying a room: the walk-in plus its countdown.
_Avoid_: Session, appointment (walk-ins never have appointments)

**Visit Stage**:
Where a visit is in its countdown: Vitals → Exam → Discharging → Ready.
_Avoid_: Status (overloaded), phase

**Check-Out**:
Ending a visit: the room empties and the visit enters the Completed Log.
_Avoid_: Release, close

**Care Team**:
The three doctors on duty.
_Avoid_: Staff (that's the scheduling context's word)

**Care Queue**:
A doctor's list of walk-ins assigned directly to them, bypassing rooms.
_Avoid_: Column, worklist

**Assign**:
Moving a walk-in from the Lobby into a doctor's Care Queue.

**Discharge**:
Completing a walk-in from a Care Queue into the Completed Log.

**Urgency**:
Triage priority of a waiting walk-in: High, Medium, or Low. Drives expected
visit length and the board's headline urgency level.
_Avoid_: Severity, priority

**Completed Log**:
The session's record of finished visits and where each was seen.
_Avoid_: History, archive

**Triage Board**:
The whole surface: lobby, rooms, care team, and stats, live.
_Avoid_: Dashboard (generic)
