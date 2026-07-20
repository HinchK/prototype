import { useEffect, useState } from 'react'
import { Lock as LockIcon, Delete, CheckCircle2 } from 'lucide-react'
import { Avatar, cn } from '../ui'
import Backdrop from './Backdrop'

const PIN = '1234'
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function Lock({ onUnlock, onSignOut }) {
  const [entry, setEntry] = useState('')
  // idle | error | success
  const [state, setState] = useState('idle')

  useEffect(() => {
    if (entry.length !== 4) return
    if (entry === PIN) {
      setState('success')
      const t = setTimeout(onUnlock, 650)
      return () => clearTimeout(t)
    }
    setState('error')
    const t = setTimeout(() => {
      setEntry('')
      setState('idle')
    }, 700)
    return () => clearTimeout(t)
  }, [entry, onUnlock])

  const press = (d) => {
    if (state !== 'idle') return
    setEntry((e) => (e.length < 4 ? e + d : e))
  }
  const back = () => {
    if (state !== 'idle') return
    setEntry((e) => e.slice(0, -1))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4">
      <Backdrop />
      <div className="relative w-full max-w-md">
        <div className="animate-pop-in rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <Avatar name="Dr. Megan Gibbings" size="lg" className="mb-3 shadow-md" />
            <h1 className="text-charcoal text-xl font-bold">Dr. Megan Gibbings</h1>
            <p className="mt-0.5 text-sm text-slate-500">Lead Veterinarian</p>
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <LockIcon size={13} /> Session locked — enter PIN to resume
            </div>
          </div>

          {state === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" aria-live="polite">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <p className="text-charcoal font-bold">Welcome back, Dr. Gibbings</p>
            </div>
          ) : (
            <>
              <div
                className={cn('mb-6 flex justify-center gap-3', state === 'error' && 'animate-shake')}
                aria-label="PIN entry"
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5 rounded-full border-2 transition-colors duration-150',
                      i < entry.length
                        ? state === 'error'
                          ? 'border-red-500 bg-red-500'
                          : 'border-primary bg-primary'
                        : 'border-slate-300 bg-transparent',
                    )}
                  />
                ))}
              </div>
              <p
                className={cn('mb-4 h-5 text-center text-sm font-medium text-red-600', state !== 'error' && 'invisible')}
                role="alert"
              >
                Incorrect PIN — try again.
              </p>

              <div className="mx-auto grid w-fit grid-cols-3 gap-3">
                {PAD.map((d) => (
                  <PinKey key={d} onClick={() => press(d)} label={d} />
                ))}
                <span aria-hidden="true" />
                <PinKey onClick={() => press('0')} label="0" />
                <PinKey onClick={back} aria-label="Delete last digit">
                  <Delete size={20} />
                </PinKey>
              </div>

              <p className="mt-6 text-center text-xs text-slate-400">Demo PIN: 1234</p>
              <button
                onClick={onSignOut}
                className="text-primary hover:text-primary-hover focus-visible:ring-primary-hover mx-auto mt-3 block cursor-pointer rounded text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Sign in as a different user
              </button>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          © West Coast Animal Hospital · Clinical data hidden while locked
        </p>
      </div>
    </div>
  )
}

function PinKey({ label, children, ...props }) {
  return (
    <button
      className="text-charcoal hover:bg-primary/10 focus-visible:ring-primary-hover flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-xl font-semibold transition-all duration-150 select-none focus-visible:ring-2 focus-visible:outline-none active:scale-95"
      {...props}
    >
      {label ?? children}
    </button>
  )
}
