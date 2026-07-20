// Toast notifications — shared module.
// Interface: const { toasts, notify, dismiss } = useToasts(); render <Toaster toasts={toasts} onDismiss={dismiss} />.
// notify(message, tone) with tone 'success' | 'error' | 'info'. Auto-dismisses; timers are cleaned up on unmount.
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../ui/primitives'

const AUTO_DISMISS_MS = 3800

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current.get(id))
    timersRef.current.delete(id)
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'info') => {
      const id = crypto.randomUUID()
      setToasts((t) => [...t, { id, message, tone }])
      timersRef.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  return { toasts, notify, dismiss }
}

const TONE_BORDER = {
  success: 'border-emerald-200',
  error: 'border-red-200',
  info: 'border-slate-200',
}
const TONE_ICON = {
  success: [CheckCircle2, 'text-emerald-600'],
  error: [AlertTriangle, 'text-red-600'],
  info: [Info, 'text-primary'],
}

export function Toaster({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 bottom-4 z-50 w-80 space-y-2" aria-live="polite">
      {toasts.map((t) => {
        const [Icon, iconColor] = TONE_ICON[t.tone] ?? TONE_ICON.info
        return (
          <div
            key={t.id}
            className={cn(
              'animate-toast-in flex items-start gap-2.5 rounded-xl border bg-white p-3 shadow-lg',
              TONE_BORDER[t.tone] ?? TONE_BORDER.info,
            )}
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', iconColor)} />
            <p className="text-charcoal flex-1 text-sm font-medium">{t.message}</p>
            <button
              aria-label="Dismiss notification"
              onClick={() => onDismiss(t.id)}
              className="hover:text-charcoal flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
