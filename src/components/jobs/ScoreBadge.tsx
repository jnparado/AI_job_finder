import type { MatchCategory } from '@shared/types'
import { cn } from '@/lib/utils'

const TONE: Record<MatchCategory, string> = {
  excellent: 'bg-[#e6f3ea] text-[#1c5c3a]',
  strong: 'bg-[#e8efe8] text-[#244a3c]',
  good: 'bg-[#f6ebe4] text-[#8f4326]',
  possible: 'bg-[#efeae0] text-[#6a6458]',
  poor: 'bg-[#ece9e2] text-[#7a7468]',
}

export function ScoreBadge({
  score,
  category,
  size = 'md',
}: {
  score: number
  category: MatchCategory
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-center rounded-2xl font-serif leading-none',
        TONE[category],
        size === 'sm' && 'h-14 w-14 text-lg',
        size === 'md' && 'h-[4.5rem] w-[4.5rem] text-2xl',
        size === 'lg' && 'h-24 w-24 text-4xl',
      )}
    >
      <span>{score}</span>
      <span className="mt-1 text-[0.62rem] font-sans font-semibold uppercase tracking-wider opacity-70">
        match
      </span>
    </div>
  )
}
