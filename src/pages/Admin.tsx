import { BrandMark } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { displayName } from '@shared/types'

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const superAdmin = profile.role === 'super_admin'

  return (
    <div className="min-h-svh bg-[var(--paper)]">
      <header className="bg-[var(--forest)] px-5 py-4 text-[var(--paper)] sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <BrandMark light />
          <Button
            variant="outline"
            type="button"
            className="rounded-xl border-white/20 bg-white/5 text-[var(--paper)] hover:bg-white/10"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper)]">Staff</p>
        <h1 className="mt-2 font-serif text-3xl text-[var(--forest)]">{displayName(profile)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{profile.email}</p>
        <Card className="mt-8 space-y-3">
          <p className="text-sm font-medium text-[var(--forest)]">
            {superAdmin ? 'Super admin' : 'Admin'}
          </p>
          <p className="text-sm text-muted-foreground">
            This account was promoted in the database. Public signup cannot grant staff roles.
          </p>
        </Card>
      </main>
    </div>
  )
}
