import { useState } from 'react'
import { PawPrint, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button, Input } from '../ui/primitives'
import Backdrop from './Backdrop'

export default function Landing({ onSignIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  // idle | verifying | loading
  const [phase, setPhase] = useState('idle')

  const submit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password to continue.')
      return
    }
    setError('')
    setPhase('verifying')
    setTimeout(() => {
      setPhase('loading')
      setTimeout(onSignIn, 1000)
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4">
      <Backdrop />
      <div className="relative w-full max-w-md">
        <div className="animate-pop-in rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          {phase === 'loading' ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center" aria-live="polite">
              <Loader2 className="text-primary h-10 w-10 animate-spin" />
              <div>
                <p className="text-charcoal font-bold">Establishing secure session…</p>
                <p className="mt-1 text-sm text-slate-500">
                  Clinic records stay hidden until authentication completes.
                </p>
              </div>
              <div className="text-success-text bg-success flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <ShieldCheck size={14} /> Encrypted connection
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="bg-primary mb-3 flex h-14 w-14 items-center justify-center rounded-full shadow-md">
                  <PawPrint className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-charcoal text-xl font-bold">West Coast Animal Hospital</h1>
                <p className="mt-0.5 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  Staff Portal
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="username" className="text-charcoal mb-1.5 block text-sm font-semibold">
                    Username
                  </label>
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="e.g. m.gibbings"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={phase === 'verifying'}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="text-charcoal mb-1.5 block text-sm font-semibold">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={phase === 'verifying'}
                    />
                    <button
                      type="button"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPw((s) => !s)}
                      className="hover:text-primary focus-visible:ring-primary-hover absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-medium text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={phase === 'verifying'}>
                  {phase === 'verifying' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying credentials…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-400">
                Authorized staff only · Sessions auto-lock when unattended
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          © West Coast Animal Hospital · Prototype demo — any credentials work
        </p>
      </div>
    </div>
  )
}
