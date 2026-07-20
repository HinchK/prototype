// PROTOTYPE — wipe me when a style wins.
// Plan: four style variants (shadcn / glass / brutal / editorial) on the root
// route, switchable via ?variant=, each showing BOTH the triage dashboard and
// a new AI staff-scheduling dashboard (60 staff, 4-week horizon, personality
// weights) in that style. Switch with the floating bar or ← / → keys.
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'
import ShadcnVariant from './variants/ShadcnVariant'
import GlassVariant from './variants/GlassVariant'
import BrutalVariant from './variants/BrutalVariant'
import EditorialVariant from './variants/EditorialVariant'

const VARIANTS = [
  { id: 'shadcn', name: 'Slate Clinic · shadcn/ui', C: ShadcnVariant },
  { id: 'glass', name: 'Coastal Glass', C: GlassVariant },
  { id: 'brutal', name: 'Butcher-Paper Brutalist', C: BrutalVariant },
  { id: 'editorial', name: 'Field Notes Editorial', C: EditorialVariant },
]

export default function StylePrototype() {
  const [id, setId] = useState(() => new URLSearchParams(window.location.search).get('variant') || 'shadcn')
  const idx = Math.max(0, VARIANTS.findIndex((v) => v.id === id))

  const go = (delta) => {
    const next = VARIANTS[(idx + delta + VARIANTS.length) % VARIANTS.length].id
    setId(next)
    const url = new URL(window.location)
    url.searchParams.set('variant', next)
    window.history.replaceState(null, '', url)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const Active = VARIANTS[idx].C

  return (
    <>
      <Active />
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-zinc-950/90 px-2 py-1.5 text-white shadow-2xl backdrop-blur">
          <button
            onClick={() => go(-1)}
            aria-label="Previous variant"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/15"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex min-w-56 items-center justify-center gap-2 px-2 text-xs font-semibold whitespace-nowrap">
            <FlaskConical size={13} className="text-amber-400" />
            {idx + 1}/{VARIANTS.length} — {VARIANTS[idx].name}
          </span>
          <button
            onClick={() => go(1)}
            aria-label="Next variant"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/15"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  )
}
