export interface Notification {
  id: string
  title: string
  body?: string
  href?: string
  read: boolean
  createdAt: string
}

function notificationKey(row: Pick<Notification, 'title' | 'body' | 'href'>) {
  return `${row.title.trim().toLowerCase()}::${(row.href ?? row.body ?? '').trim().toLowerCase()}`
}

export function uniqueNotifications(items: Notification[]) {
  const byKey = new Map<string, Notification>()
  for (const row of items) {
    const key = notificationKey(row)
    const prev = byKey.get(key)
    if (!prev || row.createdAt.localeCompare(prev.createdAt) > 0) byKey.set(key, row)
  }
  return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadNotificationCount(items: Notification[]) {
  return uniqueNotifications(items).filter((row) => !row.read).length
}
