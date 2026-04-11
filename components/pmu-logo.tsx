import { cn } from '@/lib/utils'

/** Same white frame + ring in light and dark so the PNG renders identically in both themes. */
const FRAME =
  'inline-flex shrink-0 items-center justify-center bg-white shadow-sm ring-1 ring-black/10 dark:bg-white dark:ring-black/10 dark:shadow-sm'

const SIZES = {
  sidebar: { wrap: cn(FRAME, 'rounded-lg p-2'), img: 'h-[52px] max-h-[52px] w-auto max-w-[200px]' },
  mobile: { wrap: cn(FRAME, 'rounded-lg p-1.5'), img: 'h-9 max-h-10 w-auto max-w-[160px]' },
  topbar: { wrap: cn(FRAME, 'rounded-lg p-2'), img: 'h-[52px] max-h-[60px] w-auto max-w-[220px]' },
  landing: { wrap: cn(FRAME, 'rounded-lg p-2'), img: 'h-[52px] max-h-[60px] w-auto max-w-[200px]' },
  hero: { wrap: cn(FRAME, 'rounded-xl p-3'), img: 'h-auto max-h-[80px] w-auto max-w-[260px]' },
  compact: { wrap: cn(FRAME, 'h-9 w-9 rounded-full p-1'), img: 'h-full w-full object-contain' },
} as const

export type PmuLogoSize = keyof typeof SIZES

export function PmuLogo({
  size,
  className,
  imgClassName,
  alt = 'PMU',
}: {
  size: PmuLogoSize
  className?: string
  imgClassName?: string
  alt?: string
}) {
  const s = SIZES[size]
  return (
    <span className={cn(s.wrap, className)}>
      <img
        src="/img/pmulogo.png"
        alt={alt}
        className={cn('object-contain object-center', s.img, imgClassName)}
      />
    </span>
  )
}
