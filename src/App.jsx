import { lazy, Suspense, useState } from 'react'
import Landing from './screens/Landing'
import Lock from './screens/Lock'
import Dashboard from './screens/Dashboard'

// PROTOTYPE — style-variant explorer on this same route, gated by ?variant=.
// Delete this lazy import and the early return below when a style is chosen.
const StylePrototype = lazy(() => import('./prototype/StylePrototype'))
const prototypeVariant = new URLSearchParams(window.location.search).get('variant')

export default function App() {
  if (import.meta.env.DEV && prototypeVariant !== null) {
    return (
      <Suspense fallback={null}>
        <StylePrototype />
      </Suspense>
    )
  }
  // landing | dashboard | locked
  const [screen, setScreen] = useState('landing')
  // Dashboard mounts once on sign-in and stays mounted (hidden) while locked,
  // so room timers and assignments survive a lock/unlock cycle.
  const [booted, setBooted] = useState(false)

  const signIn = () => {
    setBooted(true)
    setScreen('dashboard')
  }

  const signOut = () => {
    setBooted(false)
    setScreen('landing')
  }

  return (
    <>
      {booted && <Dashboard hidden={screen !== 'dashboard'} onLock={() => setScreen('locked')} />}
      {screen === 'landing' && <Landing onSignIn={signIn} />}
      {screen === 'locked' && <Lock onUnlock={() => setScreen('dashboard')} onSignOut={signOut} />}
    </>
  )
}
