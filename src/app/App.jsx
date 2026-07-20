// Composition root: owns the session state machine and mounts contexts.
// Bounded contexts (src/patient-flow, src/scheduling) never import each other;
// they meet only here and in src/shared. See ARCHITECTURE.md.
import { useState } from 'react'
import Landing from '../shared/auth/Landing'
import Lock from '../shared/auth/Lock'
import TriageBoard from '../patient-flow/ui/TriageBoard'

export default function App() {
  // 'signed-out' | 'active' | 'locked'
  const [session, setSession] = useState('signed-out')
  // The board mounts once on sign-in and stays mounted (hidden) while locked,
  // so visit timers and assignments survive a lock/unlock cycle.
  const [hasSession, setHasSession] = useState(false)

  const signIn = () => {
    setHasSession(true)
    setSession('active')
  }

  const signOut = () => {
    setHasSession(false)
    setSession('signed-out')
  }

  return (
    <>
      {hasSession && <TriageBoard hidden={session !== 'active'} onLock={() => setSession('locked')} />}
      {session === 'signed-out' && <Landing onSignIn={signIn} />}
      {session === 'locked' && <Lock onUnlock={() => setSession('active')} onSignOut={signOut} />}
    </>
  )
}
