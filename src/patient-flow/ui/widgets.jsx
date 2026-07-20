// Small presentational widgets for the triage board.
import { Card } from '../../shared/ui/primitives'

export function StatCard({ icon: Icon, label, children }) {
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

export function Sparkline({ data, className }) {
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
