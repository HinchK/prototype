import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class lists; later classes win conflicts (e.g. `p-4` over `p-2`). */
export const cn = (...inputs) => twMerge(clsx(inputs))
