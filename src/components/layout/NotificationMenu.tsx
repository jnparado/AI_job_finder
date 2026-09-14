import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { type Notification, uniqueNotifications, unreadNotificationCount } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationMenu({
  open,
  onOpenChange,
  fallbackHref,
  emptyLabel,
  variant = 'employer',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fallbackHref: string
  emptyLabel: string
  variant?: 'employer' | 'candidate'
}) {
  const qc = useQueryClient()
  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notification[]>('/api/notifications'),
    staleTime: 60_000,
  })

  const list = useMemo(() => uniqueNotifications(notes.data ?? []), [notes.data])
  const unread = unreadNotificationCount(notes.data ?? [])

  const markAll = useMutation({
    mutationFn: () => api<{ notifications: Notification[] }>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: (res) => {
      qc.setQueryData(['notifications'], res.notifications)
    },
  })

  const markOne = useMutation({
    mutationFn: (id: string) =>
      api<{ notifications: Notification[] }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    onSuccess: (res) => {
      qc.setQueryData(['notifications'], res.notifications)
    },
  })

  const bellClass =
    variant === 'employer'
      ? 'relative grid size-10 place-items-center rounded-full text-[var(--forest)] hover:bg-[#eef3f0]'
      : 'relative grid size-10 place-items-center rounded-full text-[#002018] hover:bg-[#eef3f0]'

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        className={bellClass}
        onClick={() => onOpenChange(!open)}
      >
        <Bell className="size-5 stroke-[1.5]" />
        {unread ? (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#e23d3d] px-1 text-[0.6rem] font-semibold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-white text-[var(--forest)] shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Notifications</p>
            {unread ? (
              <button
                type="button"
                className="text-xs font-medium text-[#147a48] hover:underline disabled:opacity-60"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                {markAll.isPending ? 'Updating…' : 'Mark all as read'}
              </button>
            ) : null}
          </div>
          {list.length ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {list.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.href || fallbackHref}
                    className={cn(
                      'block px-4 py-2.5 hover:bg-muted',
                      !n.read && 'bg-[#f3faf6]/80',
                    )}
                    onClick={() => {
                      if (!n.read) markOne.mutate(n.id)
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#147a48]" aria-hidden />
                      ) : (
                        <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <p className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</p>
                        {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </>
  )
}
