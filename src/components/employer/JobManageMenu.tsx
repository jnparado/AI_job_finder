import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import type { Job } from '@shared/types'
import { cn } from '@/lib/utils'
import { isJobClosed, type JobManageAction } from '@/components/employer/jobListing'

export function JobManageMenu({
  job,
  applicants,
  align = 'right',
  onAction,
}: {
  job: Job
  applicants: number
  align?: 'left' | 'right'
  onAction: (action: JobManageAction) => void
}) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const closed = isJobClosed(job)
  const editPath = `/employer/jobs/${encodeURIComponent(job.id)}/edit`

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(action: JobManageAction) {
    setOpen(false)
    onAction(action)
  }

  return (
    <div ref={rootRef} className={cn('relative', open && 'z-50')}>
      <button
        type="button"
        className="grid size-8 place-items-center rounded-lg border border-[#e4ebe6] text-[var(--forest)] hover:bg-[#f4f7f5]"
        aria-label="Job actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute top-[calc(100%+0.25rem)] z-50 w-48 overflow-hidden rounded-xl border border-[#e4ebe6] bg-white py-1 shadow-[0_16px_40px_rgba(19,38,31,0.14)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--forest)] hover:bg-[#f4f7f5]"
            onClick={() => {
              setOpen(false)
              navigate(editPath)
            }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--forest)] hover:bg-[#f4f7f5]"
            onClick={() => pick(closed ? 'reopen' : 'close')}
          >
            {closed ? 'Reopen listing' : 'Mark as closed'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-[#b85c38] hover:bg-[#fbf4f1]"
            onClick={() => pick('delete')}
          >
            Delete
          </button>
          {applicants ? (
            <p className="border-t border-[#eef3f0] px-3 py-2 text-[0.65rem] leading-relaxed text-muted-foreground">
              Has applicants — delete asks you to close instead.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
