// PROTOTYPE — faithful shadcn/ui component ports (zinc theme) for the
// "Slate Clinic" style variant. shadcn/ui is copy-paste by design; these are
// its Button/Card/Badge/Separator/Progress/Table primitives on cva + tailwind-merge.
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cva } from 'class-variance-authority'

export const cn = (...inputs) => twMerge(clsx(inputs))

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/90',
        secondary: 'bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-100/80',
        outline: 'border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 hover:text-zinc-900',
        ghost: 'hover:bg-zinc-100 hover:text-zinc-900',
        destructive: 'bg-red-500 text-zinc-50 shadow-sm hover:bg-red-500/90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-900 text-zinc-50 shadow',
        secondary: 'border-transparent bg-zinc-100 text-zinc-900',
        outline: 'border-zinc-200 text-zinc-950',
        destructive: 'border-transparent bg-red-500 text-zinc-50 shadow',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm', className)} {...props} />
}
export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn('leading-none font-semibold tracking-tight', className)} {...props} />
}
export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-zinc-500', className)} {...props} />
}
export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}

export function Separator({ className, orientation = 'horizontal', ...props }) {
  return (
    <div
      className={cn('shrink-0 bg-zinc-200', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  )
}

export function Progress({ value = 0, className, indicatorClassName }) {
  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-zinc-900/10', className)}>
      <div
        className={cn('h-full bg-zinc-900 transition-all', indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}
export function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}
export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}
export function TableRow({ className, ...props }) {
  return <tr className={cn('border-b border-zinc-200 transition-colors hover:bg-zinc-100/50', className)} {...props} />
}
export function TableHead({ className, ...props }) {
  return (
    <th className={cn('h-10 px-2 text-left align-middle font-medium text-zinc-500', className)} {...props} />
  )
}
export function TableCell({ className, ...props }) {
  return <td className={cn('p-2 align-middle', className)} {...props} />
}
