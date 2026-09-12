import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { JobManageAction } from '@/components/employer/jobListing'

export function JobConfirmDialog({
  title,
  action,
  applicants,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string
  action: JobManageAction
  applicants: number
  error?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const heading =
    action === 'delete' ? 'Delete this job?' : action === 'close' ? 'Close this listing?' : 'Reopen this listing?'
  const body =
    action === 'delete'
      ? applicants
        ? `“${title}” has applicants, so it cannot be deleted. Close it instead — it leaves candidate search and keeps the inbox.`
        : `“${title}” will be removed. This cannot be undone.`
      : action === 'close'
        ? `“${title}” will leave candidate search. Applicants stay in your inbox.`
        : `“${title}” will show in candidate search again.`

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#13261f]/45 p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#e4ebe6] bg-white p-5 shadow-[0_20px_50px_rgba(19,38,31,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-confirm-title"
      >
        <h2 id="job-confirm-title" className="font-serif text-2xl text-[var(--forest)]">
          {heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        {error ? <p className="mt-3 text-sm text-[#8f4326]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          {action === 'delete' && applicants ? (
            <Button type="button" className="rounded-xl bg-[#147a48] hover:bg-[#0f5e37]" disabled={busy} onClick={onConfirm}>
              {busy ? 'Closing…' : 'Mark as closed'}
            </Button>
          ) : (
            <Button
              type="button"
              className={cn(
                'rounded-xl',
                action === 'delete' ? 'bg-[#b85c38] hover:bg-[#9a4a2c]' : 'bg-[#147a48] hover:bg-[#0f5e37]',
              )}
              disabled={busy}
              onClick={onConfirm}
            >
              {action === 'delete'
                ? busy
                  ? 'Deleting…'
                  : 'Delete'
                : action === 'close'
                  ? busy
                    ? 'Closing…'
                    : 'Mark as closed'
                  : busy
                    ? 'Reopening…'
                    : 'Reopen'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
