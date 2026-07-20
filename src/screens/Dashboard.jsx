import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PawPrint,
  Lock as LockIcon,
  Search,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  CalendarDays,
  FileText,
  Settings as SettingsIcon,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Rat,
  Clock,
  AlertTriangle,
  GripVertical,
  Sparkles,
  MoreVertical,
  CheckCircle2,
  Users,
  X,
  Info,
} from 'lucide-react'
import { Button, Card, Badge, Input, Avatar, cn } from '../ui'
import { DOCTORS, ROOMS, initialWalkIns, randomPool, makePatient, shuffle } from '../data'

const NAV = [
  { id: 'triage', label: 'Triage Board', icon: ClipboardList },
  { id: 'rooms', label: 'Room Map', icon: DoorOpen },
  { id: 'doctors', label: 'Doctor Schedules', icon: CalendarDays },
  { id: 'logs', label: 'Patient Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

// Exam duration by triage urgency (seconds) — short so the demo shows status changes.
const DURATIONS = { High: 120, Medium: 180, Low: 240 }
const URGENCY_BADGE = { High: 'danger', Medium: 'warning', Low: 'success' }
const KIND_ICONS = { dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, hamster: Rat, ferret: Rat }

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function roomStatus(room) {
  if (room.remaining <= 0) return { label: 'Ready for Checkout', variant: 'success', bar: 'bg-emerald-500' }
  const f = room.remaining / room.total
  if (f > 2 / 3) return { label: 'Vitals', variant: 'info', bar: 'bg-primary-hover' }
  if (f > 1 / 3) return { label: 'Exam', variant: 'primary', bar: 'bg-primary' }
  return { label: 'Discharging', variant: 'warning', bar: 'bg-amber-500' }
}

export default function Dashboard({ hidden, onLock }) {
  const [tab, setTab] = useState('triage')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')

  const [lobby, setLobby] = useState(initialWalkIns)
  const [rooms, setRooms] = useState(() => Object.fromEntries(ROOMS.map((r) => [r, null])))
  const [queues, setQueues] = useState(() => Object.fromEntries(DOCTORS.map((d) => [d.id, []])))
  const [completed, setCompleted] = useState([])
  const [toasts, setToasts] = useState([])

  const [dragId, setDragId] = useState(null)
  const [overZone, setOverZone] = useState(null)
  const [menuFor, setMenuFor] = useState(null)

  const poolRef = useRef(shuffle(randomPool))

  // Countdown tick for occupied rooms.
  useEffect(() => {
    const t = setInterval(() => {
      setRooms((prev) => {
        let changed = false
        const next = { ...prev }
        for (const name of ROOMS) {
          const r = prev[name]
          if (r && r.remaining > 0) {
            next[name] = { ...r, remaining: r.remaining - 1 }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const toast = (msg, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }

  const takeFromLobby = (patientId) => {
    const p = lobby.find((x) => x.id === patientId)
    if (p) setLobby((l) => l.filter((x) => x.id !== patientId))
    return p
  }

  const assignToRoom = (patientId, roomName) => {
    if (rooms[roomName]) {
      toast(`${roomName} is already occupied.`, 'error')
      return
    }
    const p = takeFromLobby(patientId)
    if (!p) return
    const total = DURATIONS[p.urgency] ?? 180
    setRooms((r) => ({ ...r, [roomName]: { patient: p, total, remaining: total } }))
    toast(`${p.pet} checked into ${roomName}.`, 'success')
  }

  const assignToDoctor = (patientId, docId) => {
    const p = takeFromLobby(patientId)
    if (!p) return
    const doc = DOCTORS.find((d) => d.id === docId)
    setQueues((q) => ({ ...q, [docId]: [...q[docId], p] }))
    toast(`${p.pet} added to ${doc.name}'s care queue.`, 'success')
  }

  const checkOutRoom = (roomName) => {
    const r = rooms[roomName]
    if (!r) return
    setRooms((rm) => ({ ...rm, [roomName]: null }))
    setCompleted((c) => [
      ...c,
      { ...r.patient, dest: roomName, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ])
    toast(`${r.patient.pet} checked out of ${roomName}.`, 'success')
  }

  const completeFromDoctor = (docId, patientId) => {
    const doc = DOCTORS.find((d) => d.id === docId)
    const p = queues[docId].find((x) => x.id === patientId)
    if (!p) return
    setQueues((q) => ({ ...q, [docId]: q[docId].filter((x) => x.id !== patientId) }))
    setCompleted((c) => [
      ...c,
      { ...p, dest: doc.name, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ])
    toast(`${p.pet} discharged from ${doc.name}'s queue.`, 'success')
  }

  const simulateArrival = () => {
    if (poolRef.current.length === 0) poolRef.current = shuffle(randomPool)
    const [client, pet, species, kind, note, urgency] = poolRef.current.pop()
    setLobby((l) => [...l, makePatient(client, pet, species, kind, note, urgency)])
    toast(`Walk-in arrived: ${client} & ${pet}.`, 'info')
  }

  // --- drag & drop plumbing -------------------------------------------------
  const onCardDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
    setMenuFor(null)
  }
  const onCardDragEnd = () => {
    setDragId(null)
    setOverZone(null)
  }
  const handleDrop = (zoneId, patientId) => {
    if (!patientId) return
    if (zoneId.startsWith('room:')) assignToRoom(patientId, zoneId.slice(5))
    else if (zoneId.startsWith('doc:')) assignToDoctor(patientId, zoneId.slice(4))
  }
  const zoneProps = (zoneId, canDrop = true) => ({
    onDragOver: (e) => {
      if (!dragId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = canDrop ? 'move' : 'none'
      if (overZone !== zoneId) setOverZone(zoneId)
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOverZone((z) => (z === zoneId ? null : z))
    },
    onDrop: (e) => {
      e.preventDefault()
      const id = e.dataTransfer.getData('text/plain')
      setOverZone(null)
      setDragId(null)
      handleDrop(zoneId, id)
    },
  })

  // --- derived stats --------------------------------------------------------
  const occupiedCount = ROOMS.filter((r) => rooms[r]).length
  const inCareCount = Object.values(queues).reduce((n, q) => n + q.length, 0)
  const checkedIn = 14 + occupiedCount + inCareCount + completed.length
  const sparkData = [6, 9, 7, 11, 10, 13, 12, checkedIn - 1, checkedIn]
  const avgWait = 6 + lobby.length * 3
  const urgency = lobby.some((p) => p.urgency === 'High')
    ? { label: 'High', variant: 'danger' }
    : lobby.some((p) => p.urgency === 'Medium')
      ? { label: 'Moderate', variant: 'warning' }
      : { label: 'Calm', variant: 'success' }

  const surgeryMsg = rooms['Surgery']
    ? `Surgery Suite occupied — ${rooms['Surgery'].patient.pet}`
    : 'Surgery Suite booked — 2:30 PM'

  const visibleLobby = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return lobby
    return lobby.filter((p) => `${p.pet} ${p.client} ${p.species}`.toLowerCase().includes(q))
  }, [lobby, query])

  const emptyRooms = ROOMS.filter((r) => !rooms[r])

  // --- view fragments (plain elements, so nothing remounts on re-render) ----

  const lobbyPanel = (
    <Card className="flex w-full shrink-0 flex-col lg:w-80">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-charcoal flex items-center gap-2 text-sm font-bold">
            <Users size={16} className="text-primary" /> Unscheduled Lobby
          </h2>
          <Badge variant="primary">{lobby.length} waiting</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Walk-ins without appointments — drag onto a room or doctor.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {visibleLobby.map((p) => (
          <WalkInCard
            key={p.id}
            p={p}
            dragId={dragId}
            menuOpen={menuFor === p.id}
            onToggleMenu={() => setMenuFor(menuFor === p.id ? null : p.id)}
            onCloseMenu={() => setMenuFor(null)}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            emptyRooms={emptyRooms}
            onAssignRoom={assignToRoom}
            onAssignDoctor={assignToDoctor}
          />
        ))}
        {visibleLobby.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
            <PawPrint size={28} />
            <p className="text-xs">
              {lobby.length === 0
                ? 'Lobby is empty. Suspiciously quiet…'
                : 'No waiting patients match your search.'}
            </p>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 p-3">
        <Button variant="outline" className="w-full" onClick={simulateArrival}>
          <Sparkles size={16} /> Simulate Walk-in Arrival
        </Button>
      </div>
    </Card>
  )

  const roomCards = ROOMS.map((name) => (
    <RoomCard
      key={name}
      name={name}
      data={rooms[name]}
      isOver={overZone === `room:${name}`}
      zoneHandlers={zoneProps(`room:${name}`, !rooms[name])}
      onCheckOut={() => checkOutRoom(name)}
    />
  ))

  const doctorCards = DOCTORS.map((doc) => (
    <DoctorCard
      key={doc.id}
      doc={doc}
      queue={queues[doc.id]}
      isOver={overZone === `doc:${doc.id}`}
      zoneHandlers={zoneProps(`doc:${doc.id}`)}
      onComplete={completeFromDoctor}
    />
  ))

  const statsGrid = (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard icon={PawPrint} label="Checked-in Pets">
        <p className="text-charcoal text-2xl font-bold tabular-nums">{checkedIn}</p>
        <Sparkline data={sparkData} className="text-primary-hover h-7 w-20" />
      </StatCard>
      <StatCard icon={Clock} label="Average Wait">
        <p className="text-charcoal text-2xl font-bold tabular-nums">
          {avgWait} <span className="text-sm font-semibold text-slate-500">min</span>
        </p>
      </StatCard>
      <StatCard icon={DoorOpen} label="Occupied Rooms">
        <p className="text-charcoal text-2xl font-bold tabular-nums">
          {occupiedCount} <span className="text-sm font-semibold text-slate-500">/ {ROOMS.length}</span>
        </p>
      </StatCard>
      <StatCard icon={AlertTriangle} label="Triage Urgency">
        <Badge variant={urgency.variant} className="px-3 py-1 text-sm">
          {urgency.label}
        </Badge>
      </StatCard>
    </div>
  )

  const VIEWS = {
    triage: (
      <div className="flex flex-col items-start gap-6 p-4 lg:flex-row lg:p-6">
        <div className="w-full min-w-0 flex-1 space-y-6">
          {statsGrid}
          <section>
            <h2 className="text-charcoal mb-3 text-sm font-bold tracking-wide uppercase">Exam Rooms</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{roomCards}</div>
          </section>
          <section>
            <h2 className="text-charcoal mb-3 text-sm font-bold tracking-wide uppercase">Care Team</h2>
            <div className="grid gap-4 lg:grid-cols-3">{doctorCards}</div>
          </section>
        </div>
        {lobbyPanel}
      </div>
    ),
    rooms: (
      <div className="flex flex-col items-start gap-6 p-4 lg:flex-row lg:p-6">
        <div className="grid w-full min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{roomCards}</div>
        {lobbyPanel}
      </div>
    ),
    doctors: (
      <div className="flex flex-col items-start gap-6 p-4 lg:flex-row lg:p-6">
        <div className="grid w-full min-w-0 flex-1 gap-4 lg:grid-cols-3">{doctorCards}</div>
        {lobbyPanel}
      </div>
    ),
    logs: <LogsView completed={completed} />,
    settings: <SettingsPanel />,
  }

  // --------------------------------------------------------------------------
  return (
    <div className={cn('bg-cream flex h-screen overflow-hidden', hidden && 'hidden')}>
      {/* Sidebar */}
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <div className={cn('flex items-center gap-3 p-4', collapsed && 'justify-center px-0')}>
          <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm">
            <PawPrint className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-charcoal truncate text-sm font-bold">West Coast</p>
              <p className="truncate text-xs text-slate-500">Animal Hospital</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={cn(
                'flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200',
                'focus-visible:ring-primary-hover focus-visible:ring-2 focus-visible:outline-none',
                tab === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'hover:text-charcoal text-slate-600 hover:bg-slate-100',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hover:text-charcoal flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100',
              'focus-visible:ring-primary-hover focus-visible:ring-2 focus-visible:outline-none',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <div className="relative max-w-md flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              aria-label="Search waiting patients"
              placeholder="Search waiting patients…"
              className="h-10 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 lg:flex">
            <Megaphone size={14} />
            {surgeryMsg}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" onClick={onLock} aria-label="Lock the screen">
              <LockIcon size={15} /> Lock
            </Button>
            <div className="flex items-center gap-2.5">
              <Avatar name="Dr. Megan Gibbings" size="sm" />
              <div className="hidden leading-tight xl:block">
                <p className="text-charcoal text-xs font-bold">Dr. Megan Gibbings</p>
                <p className="text-[11px] text-slate-500">Lead Veterinarian</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{VIEWS[tab]}</main>
      </div>

      {/* Toasts */}
      <div className="fixed right-4 bottom-4 z-50 w-80 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </div>
  )
}

// --- stable subcomponents (module scope, so DOM survives re-renders) --------

function WalkInCard({
  p,
  dragId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onDragStart,
  onDragEnd,
  emptyRooms,
  onAssignRoom,
  onAssignDoctor,
}) {
  const Kind = KIND_ICONS[p.kind] ?? PawPrint
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, p.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'group animate-pop-in relative cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 select-none',
        'hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing',
        dragId === p.id && 'border-primary rotate-1 border-dashed opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="mt-1 shrink-0 text-slate-300" aria-hidden="true" />
        <div className="bg-primary/10 text-primary mt-0.5 shrink-0 rounded-lg p-1.5">
          <Kind size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-charcoal truncate text-sm font-bold">
            {p.pet} <span className="font-normal text-slate-500">· {p.species}</span>
          </p>
          <p className="truncate text-xs text-slate-500">with {p.client}</p>
        </div>
        <Badge variant={URGENCY_BADGE[p.urgency]}>{p.urgency}</Badge>
        <button
          aria-label={`Assign ${p.pet} without dragging`}
          onClick={onToggleMenu}
          className="hover:text-primary focus-visible:ring-primary-hover -mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MoreVertical size={15} />
        </button>
      </div>
      <p className="mt-2 pl-6 text-xs text-slate-500 italic">{p.note}</p>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
          <div className="absolute top-9 right-2 z-20 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Send to room
            </p>
            {emptyRooms.length === 0 && (
              <p className="px-2 pb-1 text-xs text-slate-400 italic">All rooms occupied</p>
            )}
            {emptyRooms.map((r) => (
              <MenuItem
                key={r}
                onClick={() => {
                  onCloseMenu()
                  onAssignRoom(p.id, r)
                }}
              >
                {r}
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
                  onAssignDoctor(p.id, d.id)
                }}
              >
                {d.name}
              </MenuItem>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RoomCard({ name, data, isOver, zoneHandlers, onCheckOut }) {
  const status = data ? roomStatus(data) : null
  return (
    <div
      {...zoneHandlers}
      className={cn(
        'flex min-h-[160px] flex-col rounded-xl border-2 p-4 transition-all duration-200',
        data ? 'border-slate-200 bg-white shadow-sm' : 'border-dashed border-slate-300 bg-slate-50/60',
        isOver &&
          (data
            ? 'border-red-300 bg-red-50'
            : 'border-primary-hover ring-primary-hover/40 scale-[1.02] bg-sky-50/80 ring-2'),
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-charcoal text-sm font-bold">{name}</h3>
        {data ? <Badge variant={status.variant}>{status.label}</Badge> : <Badge>Empty</Badge>}
      </div>
      {data ? (
        <>
          <p className="text-charcoal truncate text-sm font-semibold">
            {data.patient.pet} <span className="font-normal text-slate-500">· {data.patient.species}</span>
          </p>
          <p className="truncate text-xs text-slate-500">with {data.patient.client}</p>
          <div className="mt-3 flex items-center gap-1.5 text-slate-600">
            <Clock size={14} />
            <span className="font-mono text-sm font-semibold tabular-nums">
              {data.remaining > 0 ? fmt(data.remaining) : '0:00'}
            </span>
            <span className="text-xs text-slate-400">remaining</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all duration-1000', status.bar)}
              style={{ width: `${Math.max(2, (data.remaining / data.total) * 100)}%` }}
            />
          </div>
          <Button
            size="sm"
            variant={data.remaining <= 0 ? 'default' : 'outline'}
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
  )
}

function DoctorCard({ doc, queue, isOver, zoneHandlers, onComplete }) {
  return (
    <div
      {...zoneHandlers}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200',
        isOver && 'border-primary-hover ring-primary-hover/40 scale-[1.01] bg-sky-50/60 ring-2',
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={doc.name} />
        <div className="min-w-0">
          <p className="text-charcoal truncate text-sm font-bold">{doc.name}</p>
          <p className="truncate text-xs text-slate-500">{doc.specialty}</p>
        </div>
        <Badge variant="primary" className="ml-auto">
          {queue.length} in care
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {queue.map((p) => (
          <div
            key={p.id}
            className="animate-pop-in flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-charcoal truncate text-xs font-bold">{p.pet}</p>
              <p className="truncate text-[11px] text-slate-500">with {p.client}</p>
            </div>
            <Badge variant={URGENCY_BADGE[p.urgency]}>{p.urgency}</Badge>
            <button
              aria-label={`Discharge ${p.pet}`}
              onClick={() => onComplete(doc.id, p.id)}
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
  )
}

function LogsView({ completed }) {
  return (
    <div className="p-4 lg:p-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-charcoal text-sm font-bold">Completed Visits</h2>
          <p className="mt-0.5 text-xs text-slate-500">Patients checked out during this session.</p>
        </div>
        {completed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <FileText size={28} />
            <p className="text-sm">No completed visits yet — check a patient out to log it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Seen In / By</th>
                  <th className="px-4 py-3 font-semibold">Checked Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...completed].reverse().map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="text-charcoal px-4 py-3 font-semibold">
                      {c.pet} <span className="font-normal text-slate-500">· {c.species}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.client}</td>
                    <td className="px-4 py-3 text-slate-600">{c.dest}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{c.at}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Discharged</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
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

const TOAST_STYLES = {
  success: 'border-emerald-200',
  error: 'border-red-200',
  info: 'border-slate-200',
}

function Toast({ toast, onClose }) {
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertTriangle : Info
  const iconColor =
    toast.type === 'success' ? 'text-emerald-600' : toast.type === 'error' ? 'text-red-600' : 'text-primary'
  return (
    <div
      className={cn(
        'animate-toast-in flex items-start gap-2.5 rounded-xl border bg-white p-3 shadow-lg',
        TOAST_STYLES[toast.type],
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconColor)} />
      <p className="text-charcoal flex-1 text-sm font-medium">{toast.msg}</p>
      <button
        aria-label="Dismiss notification"
        onClick={onClose}
        className="hover:text-charcoal flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function StatCard({ icon: Icon, label, children }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="bg-primary/10 text-primary rounded-lg p-2.5">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <div className="mt-1 flex items-end justify-between gap-2">{children}</div>
      </div>
    </Card>
  )
}

function Sparkline({ data, className }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${26 - ((v - min) / (max - min || 1)) * 22}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 28" className={className} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsPanel() {
  const [settings, setSettings] = useState({ autoAssign: false, sounds: true, hints: true })
  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }))
  return (
    <div className="max-w-2xl p-4 lg:p-6">
      <Card className="divide-y divide-slate-100 p-4">
        <SettingRow
          label="Auto-assign walk-ins to open rooms"
          desc="Route new arrivals to the first empty exam room automatically."
          checked={settings.autoAssign}
          onChange={set('autoAssign')}
        />
        <SettingRow
          label="Sound alerts for new arrivals"
          desc="Play a soft chime when a walk-in joins the lobby."
          checked={settings.sounds}
          onChange={set('sounds')}
        />
        <SettingRow
          label="Show demo hints"
          desc="Display helper text like drop-zone prompts and the lock-screen PIN."
          checked={settings.hints}
          onChange={set('hints')}
        />
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Prototype settings are local to this session and reset on sign-out.
      </p>
    </div>
  )
}

function SettingRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-charcoal text-sm font-semibold">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-visible:ring-primary-hover relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          checked ? 'bg-primary' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
