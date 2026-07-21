// Composition root: owns the session state machine and mounts contexts.
// Bounded contexts (src/patient-flow, src/scheduling) never import each other;
// they meet only here and in src/shared. See ARCHITECTURE.md.
import { useState } from 'react'
import Landing from '../shared/auth/Landing'
import Lock from '../shared/auth/Lock'
import TriageBoard from '../patient-flow/ui/TriageBoard'
import ScheduleBoard from '../scheduling/ui/ScheduleBoard'
import { cn } from '../shared/ui/primitives'

const CONTEXTS = [
  { id: 'patient-flow', label: 'Patient Flow' },
  { id: 'scheduling', label: 'Staff Scheduling' },
]

export default function App() {
  // 'signed-out' | 'active' | 'locked'
  const [session, setSession] = useState('signed-out')
  // Boards mount on first visit and stay mounted (hidden) thereafter, so
  // timers, assignments, and call-out simulations survive switches and locks.
  const [hasSession, setHasSession] = useState(false)
  const [context, setContext] = useState('patient-flow')
  const [visited, setVisited] = useState({ 'patient-flow': true, scheduling: false })

  const signIn = () => {
    setHasSession(true)
    setSession('active')
  }

  const signOut = () => {
    setHasSession(false)
    setVisited({ 'patient-flow': true, scheduling: false })
    setContext('patient-flow')
    setSession('signed-out')
  }

  const switchTo = (id) => {
    setVisited((v) => ({ ...v, [id]: true }))
    setContext(id)
  }

  const active = session === 'active'
  return (
    <>
      {hasSession && visited['patient-flow'] && (
        <TriageBoard hidden={!active || context !== 'patient-flow'} onLock={() => setSession('locked')} />
      )}
      {hasSession && visited['scheduling'] && (
        <ScheduleBoard hidden={!active || context !== 'scheduling'} onLock={() => setSession('locked')} />
      )}
      {active && (
        <nav className="glass-panel fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full p-1">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => switchTo(c.id)}
              className={cn(
                'cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
                context === c.id ? 'bg-primary text-white' : 'text-charcoal hover:bg-white/70',
              )}
            >
              {c.label}
            </button>
          ))}
        </nav>
      )}
      {session === 'signed-out' && <Landing onSignIn={signIn} />}
      {session === 'locked' && <Lock onUnlock={() => setSession('active')} onSignOut={signOut} />}
    </>
  )
}
