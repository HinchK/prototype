// Design system primitives — West Coast Animal Hospital.
// Tokens (slate-blue palette, Open Sans) live in src/index.css under @theme;
// these components are the shadcn/ui-idiom surface every context builds on.
import { cn } from './cn'

export { cn }

const BUTTON_VARIANTS = {
  default: 'bg-primary text-white shadow-sm hover:bg-primary-hover',
  outline: 'border border-slate-300 bg-white text-charcoal hover:border-primary hover:text-primary',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-charcoal',
  success: 'bg-success-text text-white hover:bg-emerald-800',
}

const BUTTON_SIZES = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
}

export function Button({ variant = 'default', size = 'default', className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200',
        'focus-visible:ring-primary-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  )
}

const BADGE_VARIANTS = {
  success: 'bg-success text-success-text',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-800',
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-slate-100 text-slate-600',
}

export function Badge({ variant = 'neutral', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-charcoal',
        'placeholder:text-slate-400',
        'focus-visible:border-primary-hover focus-visible:ring-primary-hover/40 focus-visible:ring-2 focus-visible:outline-none',
        'transition-colors duration-200',
        className,
      )}
      {...props}
    />
  )
}

const AVATAR_SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

export function Avatar({ name, size = 'md', className }) {
  const initials = name
    .replace('Dr. ', '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-accent flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        AVATAR_SIZES[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
