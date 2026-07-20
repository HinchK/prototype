import { useState } from 'react'
import Landing from './screens/Landing'
import Lock from './screens/Lock'
import Dashboard from './screens/Dashboard'

export default function App() {
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
