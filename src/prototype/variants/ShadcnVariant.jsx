// PROTOTYPE — style variant "Slate Clinic", built from real shadcn/ui component
// ports (see ../shadcn/ui.jsx). Structure: app-shell header + max-width content,
// card grids and data tables — the canonical shadcn dashboard idiom.
import {
  PawPrint,
  Lock,
  Sparkles,
  DoorOpen,
  Clock,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from 'lucide-react'
import {
  cn,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Separator,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../shadcn/ui'
import { TRIAGE, ROSTER_WEEK1, WEEKS, SCHED_STATS, SUGGESTIONS, ARCH_MIX, ARCHETYPES } from '../data'

const URGENCY = { High: 'destructive', Medium: 'secondary', Low: 'outline' }
const SHIFT_STYLE = {
  M: 'bg-zinc-900 text-zinc-50',
  E: 'bg-zinc-500 text-zinc-50',
  S: 'bg-emerald-600 text-white',
  P: 'bg-amber-100 text-amber-800',
  '·': 'bg-zinc-100 text-zinc-400',
}

export default function ShadcnVariant() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {/* App shell header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900">
              <PawPrint className="h-4 w-4 text-zinc-50" />
            </span>
            West Coast Animal Hospital
          </div>
          <nav className="ml-6 hidden gap-1 text-sm text-zinc-500 md:flex">
            <a href="#triage" className="rounded-md px-3 py-1.5 font-medium text-zinc-950 hover:bg-zinc-100">Triage</a>
            <a href="#scheduler" className="rounded-md px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-950">Scheduler</a>
            <span className="rounded-md px-3 py-1.5">Logs</span>
            <span className="rounded-md px-3 py-1.5">Settings</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">S · shadcn/ui</Badge>
            <Button variant="outline" size="sm">
              <Lock /> Lock
            </Button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-zinc-50">MG</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-14 px-6 py-8">
        {/* ---------------- Triage board ---------------- */}
        <section id="triage" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Triage Board</h1>
              <p className="text-sm text-zinc-500">Live floor status · {TRIAGE.alert}</p>
            </div>
            <Button size="sm">
              <Sparkles /> Simulate walk-in
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Checked-in Pets</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{TRIAGE.stats.checkedIn}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-500">+3 since noon</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Wait</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{TRIAGE.stats.avgWait}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-500">target &lt; 20 min</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Occupied Rooms</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{TRIAGE.stats.occupied}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-500">Surgery + Room 2</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Triage Urgency</CardDescription>
                <CardTitle className="text-3xl">{TRIAGE.stats.urgency}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-500">2 high-urgency waiting</CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {TRIAGE.rooms.map((r) => (
                  <Card key={r.name} className={cn(!r.patient && 'border-dashed shadow-none')}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{r.name}</CardTitle>
                        {r.patient ? <Badge>{r.status}</Badge> : <Badge variant="outline">Empty</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {r.patient ? (
                        <>
                          <p className="text-sm font-medium">
                            {r.patient} <span className="text-zinc-500">· {r.species}</span>
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-mono tabular-nums">{r.timer}</span> remaining
                          </div>
                          <Progress value={r.pct} className="mt-2" />
                        </>
                      ) : (
                        <p className="flex items-center gap-2 text-xs text-zinc-400">
                          <DoorOpen className="h-4 w-4" /> Drop a walk-in here
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {TRIAGE.doctors.map((d) => (
                  <Card key={d.name}>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{d.name}</CardTitle>
                      <CardDescription>{d.specialty}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-zinc-500">
                      {d.queue.length ? d.queue.join(', ') : 'No active patients'}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="lg:col-span-5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Unscheduled Lobby</CardTitle>
                  <Badge variant="secondary">{TRIAGE.lobby.length} waiting</Badge>
                </div>
                <CardDescription>Walk-ins — drag onto a room or doctor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {TRIAGE.lobby.map((p, i) => (
                  <div key={p.pet}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-zinc-100/70">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">
                        {p.pet[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {p.pet} <span className="font-normal text-zinc-500">· {p.species} · {p.client}</span>
                        </p>
                        <p className="truncate text-xs text-zinc-500 italic">{p.note}</p>
                      </div>
                      <Badge variant={URGENCY[p.urgency]}>{p.urgency}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* ---------------- AI scheduler ---------------- */}
        <section id="scheduler" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <BrainCircuit className="h-6 w-6" /> Shift Scheduler AI
              </h2>
              <p className="text-sm text-zinc-500">
                60 staff · 4-week horizon · weighted on warmth / stress / surgical / chaos / mentorship
              </p>
            </div>
            <Button size="sm">
              <CalendarDays /> Regenerate month
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Coverage', SCHED_STATS.coverage, 'of required shifts filled'],
              ['Schedule health', SCHED_STATS.health, 'AI composite score'],
              ['Burnout alerts', SCHED_STATS.burnout, 'streaks over 5 days'],
              ['Fairness index', SCHED_STATS.fairness, 'weekend distribution'],
              ['Unfilled shifts', SCHED_STATS.unfilled, 'across 28 days'],
            ].map(([label, value, sub]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500">{sub}</CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Week 1 roster · Jul 20 – 26</CardTitle>
                  <CardDescription>First 10 of 60 — ranked by AI weight</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Archetype</TableHead>
                        <TableHead className="w-28">AI weight</TableHead>
                        {WEEKS[0].map((d) => (
                          <TableHead key={d.offset} className="text-center">{d.dow[0]}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...ROSTER_WEEK1].sort((a, b) => b.weight - a.weight).slice(0, 10).map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <p className="font-medium">{e.name}</p>
                            <p className="text-xs text-zinc-500">{e.role}</p>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="h-2 w-2 rounded-full" style={{ background: ARCHETYPES[e.archetype].color }} />
                              {e.archetype}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={e.weight} className="h-1.5 w-14" />
                              <span className="text-xs tabular-nums">{e.weight}</span>
                            </div>
                          </TableCell>
                          {e.days.map((s, i) => (
                            <TableCell key={i} className="text-center">
                              <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold', SHIFT_STYLE[s])}>
                                {s}
                              </span>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-zinc-400">
                    + 50 more staff · M morning · E evening · S surgery · P PTO
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Month heat · coverage × chemistry</CardTitle>
                  <CardDescription>Jul 20 – Aug 16 · darker = better team chemistry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {WEEKS.map((week, w) => (
                    <div key={w} className="flex items-center gap-1.5">
                      <span className="w-8 text-xs text-zinc-400">W{w + 1}</span>
                      {week.map((d) => (
                        <div
                          key={d.offset}
                          title={`${d.dow} ${d.date} · coverage ${d.coverage}% · chemistry ${d.chemistry}`}
                          className={cn('h-10 flex-1 rounded-md border border-zinc-200 p-1', d.weekend && 'border-dashed')}
                          style={{ background: `rgba(24,24,27,${(d.chemistry / 100) * 0.55})` }}
                        >
                          <p className={cn('text-[9px] leading-none', d.chemistry > 55 ? 'text-zinc-50' : 'text-zinc-500')}>{d.date.split(' ')[1]}</p>
                          <p className={cn('mt-1 text-[10px] font-bold tabular-nums', d.chemistry > 55 ? 'text-white' : 'text-zinc-700')}>
                            {d.coverage}%
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI suggestions</CardTitle>
                  <CardDescription>Ranked by projected impact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SUGGESTIONS.map((s) => (
                    <div key={s.title} className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{s.detail}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge variant="secondary">{s.impact}</Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2">
                            <CheckCircle2 /> Apply
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-400">
                            <XCircle />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Personality mix</CardTitle>
                  <CardDescription>All 60 staff, by archetype</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ARCH_MIX.map((a) => (
                    <div key={a.key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium">{a.key}</span>
                        <span className="text-zinc-500">{a.count}</span>
                      </div>
                      <Progress value={(a.count / 60) * 100} indicatorClassName="rounded-full" className="h-1.5" />
                      <p className="mt-0.5 text-[11px] text-zinc-400">{a.blurb}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
