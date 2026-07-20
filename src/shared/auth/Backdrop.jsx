import { PawPrint } from 'lucide-react'

const PAWS = [
  { top: '12%', left: '8%', r: -20, s: 34 },
  { top: '22%', left: '85%', r: 15, s: 44 },
  { top: '55%', left: '6%', r: 10, s: 28 },
  { top: '70%', left: '90%', r: -12, s: 36 },
  { top: '8%', left: '55%', r: 25, s: 24 },
  { top: '82%', left: '30%', r: -8, s: 30 },
  { top: '40%', left: '93%', r: 0, s: 22 },
  { top: '65%', left: '70%', r: 18, s: 26 },
]

/** Shared gateway backdrop so the landing and lock screens feel identical. */
export default function Backdrop() {
  return (
    <div className="bg-cream absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="bg-primary-hover/10 absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl" />
      <div className="bg-primary/10 absolute top-40 -left-24 h-80 w-80 rounded-full blur-3xl" />
      {PAWS.map((p, i) => (
        <PawPrint
          key={i}
          className="text-primary absolute"
          style={{ top: p.top, left: p.left, transform: `rotate(${p.r}deg)`, opacity: 0.06 }}
          size={p.s}
        />
      ))}
      <svg
        className="absolute inset-x-0 bottom-0 h-64 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#6297b5"
          fillOpacity="0.10"
          d="M0,160L80,176C160,192,320,224,480,218.7C640,213,800,171,960,160C1120,149,1280,171,1360,181.3L1440,192L1440,320L0,320Z"
        />
        <path
          fill="#516d7d"
          fillOpacity="0.14"
          d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,234.7C1120,245,1280,235,1360,229.3L1440,224L1440,320L0,320Z"
        />
        <path
          fill="#475a6e"
          fillOpacity="0.18"
          d="M0,288L80,272C160,256,320,224,480,224C640,224,800,256,960,266.7C1120,277,1280,267,1360,261.3L1440,256L1440,320L0,320Z"
        />
      </svg>
    </div>
  )
}
