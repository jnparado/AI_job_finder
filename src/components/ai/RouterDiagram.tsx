import { LANE_SPECS, type RouterLane } from '@shared/engine/router'
import { cn } from '@/lib/utils'

export function RouterDiagram({
  variant = 'app',
  active,
}: {
  variant?: 'app' | 'forest'
  active?: RouterLane
}) {
  const forest = variant === 'forest'
  return (
    <div className={cn('space-y-4', forest ? 'text-[var(--paper)]' : '')}>
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]',
            forest ? 'border-[#c9c0ae33] text-[#c6a15b]' : 'border-border text-muted-foreground',
          )}
        >
          AI Job Assistant
        </div>
        <div className={cn('h-6 w-px', forest ? 'bg-[#c9c0ae44]' : 'bg-border')} />
        <div
          className={cn(
            'rounded-xl border px-5 py-2 text-sm font-medium',
            forest ? 'border-[#c6a15b66] bg-[#0d1b16]' : 'border-primary/40 bg-card',
          )}
        >
          AI Router
        </div>
        <div className={cn('h-6 w-px', forest ? 'bg-[#c9c0ae44]' : 'bg-border')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.values(LANE_SPECS) as typeof LANE_SPECS.luna[]).map((lane) => {
          const on = active === lane.id
          return (
            <article
              key={lane.id}
              className={cn(
                'rounded-2xl border p-4',
                forest
                  ? 'border-[#c9c0ae33] bg-[#0d1b16]'
                  : on
                    ? 'border-primary bg-card'
                    : 'border-border bg-card',
              )}
            >
              <p className={cn('text-xs uppercase tracking-[0.14em]', forest ? 'text-[#c6a15b]' : 'text-[var(--copper)]')}>
                {lane.role}
              </p>
              <h3 className="mt-1 text-lg leading-tight">{lane.name}</h3>
              <p className={cn('mt-1 font-mono text-xs', forest ? 'text-[#c9c0ae]' : 'text-muted-foreground')}>
                {lane.model}
              </p>
              <ul className={cn('mt-3 space-y-1 text-sm', forest ? 'text-[#c9c0ae]' : 'text-muted-foreground')}>
                {lane.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </div>
  )
}
