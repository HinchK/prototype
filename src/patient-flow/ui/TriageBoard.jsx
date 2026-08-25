// The triage board screen — patient-flow context's main surface.
// Assembly only: domain state via useTriageBoard, cards/panels from siblings,
// drag-and-drop via the shared engine, chrome (sidebar/header/toasts) here.
import { useState } from 'react'
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
  Clock,
  AlertTriangle,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button, Card, Badge, Input, Avatar, cn } from '../../shared/ui/primitives'
import { useToasts, Toaster } from '../../shared/toast/toast'
import { DragDropBoard } from '../../shared/dnd/engine'
import { ROOMS, DOCTORS } from '../domain/catalog'
import { boardStats, matchLobby, openRooms } from '../domain/board'
import { useTriageBoard } from './useTriageBoard'
import { WalkInCard, WalkInDragPreview, RoomCard, DoctorCard } from './cards'
import { StatCard, Sparkline } from './widgets'
import { LogsView, SettingsPanel } from './panels'

const NAV = [
  { id: 'triage', label: 'Triage Board', icon: ClipboardList },
  { id: 'rooms', label: 'Room Map', icon: DoorOpen },
  { id: 'doctors', label: 'Doctor Schedules', icon: CalendarDays },
  { id: 'logs', label: 'Patient Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

const URGENCY_UI = {
  high: { label: 'High', variant: 'danger' },
  moderate: { label: 'Moderate', variant: 'warning' },
  calm: { label: 'Calm', variant: 'success' },
}

export default function TriageBoard({ hidden, onLock }) {
  const [tab, setTab] = useState('triage')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [menuFor, setMenuFor] = useState(null)
  const [settings, setSettings] = useState({ autoAssign: false, sounds: true, hints: true })

  const { toasts, notify, dismiss } = useToasts()
  const { board, actions } = useTriageBoard(notify)

  const stats = boardStats(board)
  const sparkData = [6, 9, 7, 11, 10, 13, 12, stats.checkedIn - 1, stats.checkedIn]
  const urgency = URGENCY_UI[stats.urgencyLevel]
  const visibleLobby = matchLobby(board, query)
  const vacantRooms = openRooms(board)

  const surgeryMsg = board.rooms['Surgery']
    ? `Surgery Suite occupied — ${board.rooms['Surgery'].walkIn.pet}`
    : 'Surgery Suite booked — 2:30 PM'

  const handleDrop = (walkInId, zoneId) => {
    if (zoneId.startsWith('room:')) actions.checkIn(walkInId, zoneId.slice(5))
    else if (zoneId.startsWith('doc:')) actions.assignToDoctor(walkInId, zoneId.slice(4))
  }

  const dragPreview = (walkInId) => {
    const walkIn = board.lobby.find((w) => w.id === walkInId)
    return walkIn ? <WalkInDragPreview walkIn={walkIn} /> : null
  }

  const lobbyPanel = (
    <Card className="flex w-full shrink-0 flex-col lg:w-80">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-charcoal flex items-center gap-2 text-sm font-bold">
            <Users size={16} className="text-primary" /> Unscheduled Lobby
          </h2>
          <Badge variant="primary">{board.lobby.length} waiting</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Walk-ins without appointments — drag onto a room or doctor.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {visibleLobby.map((walkIn) => (
          <WalkInCard
            key={walkIn.id}
            walkIn={walkIn}
            menuOpen={menuFor === walkIn.id}
            onToggleMenu={() => setMenuFor(menuFor === walkIn.id ? null : walkIn.id)}
            onCloseMenu={() => setMenuFor(null)}
            openRooms={vacantRooms}
            onCheckIn={actions.checkIn}
            onAssignDoctor={actions.assignToDoctor}
          />
        ))}
        {visibleLobby.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
            <PawPrint size={28} />
            <p className="text-xs">
              {board.lobby.length === 0
                ? 'Lobby is empty. Suspiciously quiet…'
                : 'No waiting patients match your search.'}
            </p>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 p-3">
        <Button variant="outline" className="w-full" onClick={actions.simulateArrival}>
          <Sparkles size={16} /> Simulate Walk-in Arrival
        </Button>
      </div>
    </Card>
  )

  const roomCards = ROOMS.map((name) => (
    <RoomCard key={name} name={name} visit={board.rooms[name]} onCheckOut={() => actions.checkOut(name)} />
  ))

  const doctorCards = DOCTORS.map((doctor) => (
    <DoctorCard
      key={doctor.id}
      doctor={doctor}
      queue={board.careQueues[doctor.id]}
      onDischarge={actions.discharge}
    />
  ))

  const statsGrid = (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard icon={PawPrint} label="Checked-in Pets">
        <p className="text-charcoal text-2xl font-bold tabular-nums">{stats.checkedIn}</p>
        <Sparkline data={sparkData} className="text-primary-hover h-7 w-20" />
      </StatCard>
      <StatCard icon={Clock} label="Average Wait">
        <p className="text-charcoal text-2xl font-bold tabular-nums">
          {stats.avgWaitMinutes} <span className="text-sm font-semibold text-slate-500">min</span>
        </p>
      </StatCard>
      <StatCard icon={DoorOpen} label="Occupied Rooms">
        <p className="text-charcoal text-2xl font-bold tabular-nums">
          {stats.occupiedRooms}{' '}
          <span className="text-sm font-semibold text-slate-500">/ {stats.roomCount}</span>
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
    logs: <LogsView completedLog={board.completedLog} />,
    settings: <SettingsPanel settings={settings} onChange={setSettings} />,
  }

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

        <DragDropBoard onDrop={handleDrop} preview={dragPreview}>
          <main className="min-h-0 flex-1 overflow-y-auto">{VIEWS[tab]}</main>
        </DragDropBoard>
      </div>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
