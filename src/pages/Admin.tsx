import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clock,
  Copy,
  DollarSign,
  Download,
  FileSignature,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessagesSquare,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Timer,
  X,
  User,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { cn, initials, money, prettyStatus } from '@/lib/utils'
import { formatHoursMinutes, startOfLocalDay } from '@shared/tracker'
import { sourceLabel, type AccountRole } from '@shared/types'
import { employerInviteNote, employerJoinPath } from '@shared/employerInvite'
import { candidateInviteNote, candidateJoinPath } from '@shared/candidateInvite'
import { officialApplyLinks } from '@shared/applyBoards'
import type { LucideIcon } from 'lucide-react'

type InviteDeskStatus = 'not_invited' | 'invited' | 'joined'

interface AdminInvite {
  company: string
  title: string
  source: string
  listings: number
  sources?: string[]
  industry?: string
  status?: InviteDeskStatus
  invitedAt?: string
}

interface AdminAccount {
  id: string
  email: string
  name: string
  role: AccountRole
  companyName: string
  joinedAt?: string
}

interface AdminDashboard {
  live: boolean
  role: AccountRole
  email: string
  name: string
  counts: {
    candidates: number
    employers: number
    admins: number
    jobs: number
    companiesToInvite: number
    packets: number
    people: number
    hired: number
    messages: number
    liveClocks: number
    trackerHours: number
    financeReceived: number
  }
  accounts: AdminAccount[]
  invites: AdminInvite[]
  boards: { source: string; count: number }[]
  listings: {
    id: string
    title: string
    company: string
    source: string
    remote: boolean
    postedAt: string
    atelier: boolean
  }[]
  packetsList: {
    id: string
    status: string
    jobTitle: string
    company: string
    candidate: string
    candidateEmail: string
    createdAt: string
    submittedAt: string
    coverLetter: string
    channel: string
    atelier: boolean
    location: string
    postedAt: string
  }[]
  tracker: {
    live: number
    hours: number
    sessions: {
      id: string
      applicationId?: string
      jobTitle: string
      company: string
      candidate: string
      startedAt: string
      endedAt: string
      seconds: number
      live: boolean
    }[]
  }
  finance: {
    received: number
    pending: number
    available: number
    withdrawn: number
    currency: string
    entries: {
      id: string
      company: string
      jobTitle: string
      amount: number
      status: string
      kind: string
      createdAt: string
      candidate: string
      candidateEmail: string
      employerName: string
      applicationId: string
      note: string
    }[]
  }
  inbox: {
    messages: number
    threads: number
    recent: { id: string; body: string; at: string; applicationId: string; senderRole: string }[]
  }
  staffInvites: {
    id: string
    email: string
    name: string
    role: string
    status: 'pending' | 'accepted'
    invitedAt: string
  }[]
  employers: AdminEmployer[]
  candidates: AdminCandidate[]
  contracts: AdminContract[]
  activity: { kind: 'person' | 'invite'; title: string; body: string; at: string }[]
  promoteSql: string
}

interface AdminEmployer {
  id: string
  name: string
  email: string
  company: string
  industry: string
  city: string
  country: string
  website: string
  joinedAt: string
  jobs: number
  packets: number
  hired: number
  spent: number
  status: 'active' | 'pending' | 'suspended'
}

interface AdminCandidate {
  id: string
  name: string
  email: string
  headline: string
  skills: string[]
  city: string
  country: string
  joinedAt: string
  onboarded: boolean
  packets: number
  hired: number
  hours: number
  earned: number
  status: 'active' | 'pending'
}

type ContractPhase = 'active' | 'progress' | 'completed' | 'cancelled'

interface AdminContract {
  id: string
  title: string
  candidate: string
  candidateEmail: string
  company: string
  employerName: string
  type: string
  amount: number
  hours: number
  phase: ContractPhase
  status: string
  startedAt: string
  endedAt: string
  live: boolean
  location: string
  payCount: number
  payDone: number
  activity: { id: string; body: string; at: string; senderRole: string }[]
  createdAt: string
}

type DeskView = 'pulse' | 'invite' | 'people' | 'listings' | 'keys' | 'packets' | 'contracts' | 'tracker' | 'inbox' | 'finances' | 'reports' | 'staff' | 'roles' | 'employers' | 'candidates'
type PeopleFilter = 'all' | AccountRole
type PacketBucket = 'pending' | 'accepted' | 'declined' | 'draft'
type PayTab = 'all' | 'employer' | 'payout' | 'pending'
type InviteDeskTab = 'all' | 'linkedin' | 'upwork' | InviteDeskStatus

interface NavLinkItem {
  id: DeskView
  label: string
  icon: LucideIcon
  people?: PeopleFilter
}

interface NavSection {
  label?: string
  items: NavLinkItem[]
}

const NAV: NavSection[] = [
  { items: [{ id: 'pulse', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'User Management',
    items: [
      { id: 'people', label: 'Users', icon: Users, people: 'all' },
      { id: 'candidates', label: 'Candidates', icon: User },
      { id: 'employers', label: 'Employers', icon: Building2 },
    ],
  },
  {
    label: 'Team & Access',
    items: [
      { id: 'staff', label: 'Invite Admin', icon: UserPlus },
      { id: 'roles', label: 'Manage Roles', icon: Shield },
    ],
  },
  {
    label: 'Jobs & Projects',
    items: [
      { id: 'listings', label: 'Jobs', icon: Briefcase },
      { id: 'packets', label: 'Packets', icon: FileText },
      { id: 'contracts', label: 'Contracts', icon: FileSignature },
      { id: 'invite', label: 'Invite employers', icon: Mail },
      { id: 'candidates', label: 'Invite candidates', icon: UserPlus },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'inbox', label: 'Inbox', icon: MessagesSquare },
      { id: 'tracker', label: 'Tracker', icon: Timer },
      { id: 'finances', label: 'Payments', icon: Wallet },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  { label: 'Settings', items: [{ id: 'keys', label: 'Settings', icon: Settings }] },
]

const MOBILE_NAV: { id: DeskView; label: string; people?: PeopleFilter }[] = NAV.flatMap((section) =>
  section.items.map((item) => ({ id: item.id, label: item.label, people: item.people })),
)

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
  const [view, setView] = useState<DeskView>('pulse')
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleRole, setPeopleRole] = useState<PeopleFilter>('all')
  const [email, setEmail] = useState('')
  const [nextRole, setNextRole] = useState<'admin' | 'employer' | 'candidate'>('admin')
  const [copied, setCopied] = useState(false)
  const [picked, setPicked] = useState('')
  const [range, setRange] = useState<'7D' | '30D' | '3M' | '1Y'>('30D')
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [staffEmail, setStaffEmail] = useState('')
  const [staffQuery, setStaffQuery] = useState('')
  const [staffMenu, setStaffMenu] = useState('')
  const [employerQuery, setEmployerQuery] = useState('')
  const [employerStatus, setEmployerStatus] = useState<'all' | 'active' | 'pending'>('all')
  const [employerIndustry, setEmployerIndustry] = useState('all')
  const [employerPage, setEmployerPage] = useState(0)
  const [pickedEmployer, setPickedEmployer] = useState('')
  const [employerTab, setEmployerTab] = useState<'overview' | 'jobs' | 'packets'>('overview')
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateStatus, setCandidateStatus] = useState<'all' | 'active' | 'pending'>('all')
  const [candidatePlace, setCandidatePlace] = useState('all')
  const [candidateSort, setCandidateSort] = useState<'newest' | 'name' | 'packets'>('newest')
  const [candidatePage, setCandidatePage] = useState(0)
  const [pickedCandidate, setPickedCandidate] = useState('')
  const [candidateCopied, setCandidateCopied] = useState('')
  const [packetQuery, setPacketQuery] = useState('')
  const [packetStatus, setPacketStatus] = useState<'all' | PacketBucket>('all')
  const [packetCompany, setPacketCompany] = useState('all')
  const [packetPage, setPacketPage] = useState(0)
  const [pickedPacket, setPickedPacket] = useState('')
  const [packetOpen, setPacketOpen] = useState(true)
  const [contractQuery, setContractQuery] = useState('')
  const [contractPhase, setContractPhase] = useState<'all' | ContractPhase>('all')
  const [contractType, setContractType] = useState('all')
  const [contractCompany, setContractCompany] = useState('all')
  const [contractPage, setContractPage] = useState(0)
  const [pickedContract, setPickedContract] = useState('')
  const [contractOpen, setContractOpen] = useState(true)
  const [payQuery, setPayQuery] = useState('')
  const [payTab, setPayTab] = useState<PayTab>('all')
  const [payKind, setPayKind] = useState<'all' | 'from_employer' | 'withdraw'>('all')
  const [payStatus, setPayStatus] = useState<'all' | 'pending' | 'available' | 'sent' | 'failed'>('all')
  const [payPage, setPayPage] = useState(0)
  const [pickedPay, setPickedPay] = useState('')
  const [payOpen, setPayOpen] = useState(true)
  const [inviteTab, setInviteTab] = useState<InviteDeskTab>('all')
  const [inviteIndustry, setInviteIndustry] = useState('all')
  const [invitePage, setInvitePage] = useState(0)
  const [inviteCopied, setInviteCopied] = useState('')
  const [inviteNote, setInviteNote] = useState('')
  const [localInvited, setLocalInvited] = useState<string[]>(() => readLocalEmployerInvites())
  const dash = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api<AdminDashboard>('/api/admin/dashboard'),
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  })
  const promote = useMutation({
    mutationFn: () => api('/api/admin/role', { method: 'POST', body: JSON.stringify({ email, role: nextRole }) }),
    onSuccess: () => {
      setEmail('')
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const inviteStaff = useMutation({
    mutationFn: () => api<{ status: string; mailed?: boolean; message?: string; already?: boolean }>('/api/admin/invite', { method: 'POST', body: JSON.stringify({ email: staffEmail, role: 'admin' }) }),
    onSuccess: () => {
      setStaffEmail('')
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const cancelInvite = useMutation({
    mutationFn: (inviteEmail: string) => api('/api/admin/invite/cancel', { method: 'POST', body: JSON.stringify({ email: inviteEmail }) }),
    onSuccess: () => {
      setStaffMenu('')
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const markEmployerInvite = useMutation({
    mutationFn: (row: { company: string; title: string; source: string }) =>
      api('/api/admin/employers/invite', { method: 'POST', body: JSON.stringify(row) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const setPacket = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/admin/packets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
  const data = dash.data
  const superAdmin = (data?.role ?? profile.role) === 'super_admin'
  const sql = data?.promoteSql ?? "update public.profiles set role = 'admin' where email = 'you@example.com';"
  const name = data?.name || profile.email || 'Admin'
  const counts = data?.counts
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
  const monthRange = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} – ${monthLabel}`

  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const row of data?.invites ?? []) for (const s of inviteBoards(row)) set.add(s)
    return [...set].sort()
  }, [data?.invites])

  const invites = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.invites ?? []).filter((row) => {
      const boards = inviteBoards(row)
      const status = deskInviteStatus(row, localInvited)
      if (source !== 'all' && !boards.includes(source) && row.source !== source) return false
      if (inviteIndustry !== 'all' && (row.industry || '') !== inviteIndustry) return false
      if (inviteTab === 'linkedin' && !boards.includes('linkedin') && row.source !== 'linkedin') return false
      if (inviteTab === 'upwork' && !boards.includes('upwork') && row.source !== 'upwork') return false
      if (inviteTab === 'not_invited' || inviteTab === 'invited' || inviteTab === 'joined') {
        if (status !== inviteTab) return false
      }
      if (!q) return true
      return `${row.company} ${row.title} ${row.industry ?? ''} ${boards.map(sourceLabel).join(' ')}`.toLowerCase().includes(q)
    })
  }, [data?.invites, inviteIndustry, inviteTab, localInvited, query, source])

  const inviteIndustries = useMemo(() => {
    return [...new Set((data?.invites ?? []).map((row) => row.industry).filter(Boolean))].sort()
  }, [data?.invites])

  const inviteCounts = useMemo(() => {
    const rows = data?.invites ?? []
    return {
      all: rows.length,
      linkedin: rows.filter((row) => inviteBoards(row).includes('linkedin') || row.source === 'linkedin').length,
      upwork: rows.filter((row) => inviteBoards(row).includes('upwork') || row.source === 'upwork').length,
      not_invited: rows.filter((row) => deskInviteStatus(row, localInvited) === 'not_invited').length,
      invited: rows.filter((row) => deskInviteStatus(row, localInvited) === 'invited').length,
      joined: rows.filter((row) => deskInviteStatus(row, localInvited) === 'joined').length,
    }
  }, [data?.invites, localInvited])

  const invitePages = Math.max(1, Math.ceil(invites.length / 10))
  const invitePageSafe = Math.min(invitePage, invitePages - 1)
  const inviteSlice = invites.slice(invitePageSafe * 10, invitePageSafe * 10 + 10)
  const selected = invites.find((row) => row.company === picked) ?? inviteSlice[0]
  const inviteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ai-job-finder-ecru.vercel.app'
  const linkedInSearch = officialApplyLinks({ title: 'hiring' }).find((row) => row.source === 'linkedin')?.url ?? 'https://www.linkedin.com/jobs/search/?keywords=hiring'
  const upworkSearch = officialApplyLinks({ title: 'hiring' }).find((row) => row.source === 'upwork')?.url ?? 'https://www.upwork.com/nx/search/jobs/?q=hiring'

  useEffect(() => {
    if (!selected) {
      setInviteNote('')
      return
    }
    setInviteNote(employerInviteNote(selected, inviteOrigin))
  }, [inviteOrigin, selected?.company])

  const people = useMemo(() => {
    const q = (view === 'people' || view === 'roles' ? peopleQuery : query).trim().toLowerCase()
    return (data?.accounts ?? []).filter((row) => {
      if (peopleRole !== 'all' && row.role !== peopleRole) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.companyName}`.toLowerCase().includes(q)
    })
  }, [data?.accounts, peopleQuery, peopleRole, query, view])

  const nowMs = Date.now()

  const searchListings = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.listings ?? []).filter((row) => {
      if (!q) return true
      return `${row.title} ${row.company} ${row.source}`.toLowerCase().includes(q)
    })
  }, [data?.listings, query])

  const packets = useMemo(() => {
    const q = (view === 'packets' ? packetQuery : query).trim().toLowerCase()
    return (data?.packetsList ?? []).filter((row) => {
      if (packetStatus !== 'all' && packetBucket(row.status) !== packetStatus) return false
      if (packetCompany !== 'all' && row.company !== packetCompany) return false
      if (!q) return true
      return `${row.candidate} ${row.jobTitle} ${row.company} ${row.status}`.toLowerCase().includes(q)
    })
  }, [data?.packetsList, packetCompany, packetQuery, packetStatus, query, view])

  const packetCompanies = useMemo(() => {
    return [...new Set((data?.packetsList ?? []).map((row) => row.company).filter(Boolean))].sort()
  }, [data?.packetsList])

  const packetPages = Math.max(1, Math.ceil(packets.length / 10))
  const packetPageSafe = Math.min(packetPage, packetPages - 1)
  const packetSlice = packets.slice(packetPageSafe * 10, packetPageSafe * 10 + 10)
  const selectedPacket = packets.find((row) => row.id === pickedPacket) ?? packetSlice[0]
  const packetStats = useMemo(() => {
    const rows = data?.packetsList ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const fresh = (status: PacketBucket | 'all') =>
      rows.filter((row) => {
        const at = row.submittedAt || row.createdAt
        if (!at || nowMs - new Date(at).getTime() > month) return false
        return status === 'all' || packetBucket(row.status) === status
      }).length
    const prior = (status: PacketBucket | 'all') =>
      rows.filter((row) => {
        const at = row.submittedAt || row.createdAt
        if (!at) return false
        const age = nowMs - new Date(at).getTime()
        if (age <= month || age > month * 2) return false
        return status === 'all' || packetBucket(row.status) === status
      }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    const pending = rows.filter((row) => packetBucket(row.status) === 'pending').length
    const accepted = rows.filter((row) => packetBucket(row.status) === 'accepted').length
    const declined = rows.filter((row) => packetBucket(row.status) === 'declined').length
    return {
      total: rows.length,
      pending,
      accepted,
      declined,
      totalDelta: delta(fresh('all'), prior('all')),
      pendingDelta: delta(fresh('pending'), prior('pending')),
      acceptedDelta: delta(fresh('accepted'), prior('accepted')),
      declinedDelta: delta(fresh('declined'), prior('declined')),
    }
  }, [data?.packetsList, nowMs])

  const contractRows = useMemo(() => {
    const q = (view === 'contracts' ? contractQuery : query).trim().toLowerCase()
    return (data?.contracts ?? []).filter((row) => {
      if (contractPhase !== 'all' && row.phase !== contractPhase) return false
      if (contractType !== 'all' && row.type !== contractType) return false
      if (contractCompany !== 'all' && row.company !== contractCompany) return false
      if (!q) return true
      return `${row.title} ${row.candidate} ${row.company} ${row.type} ${row.phase}`.toLowerCase().includes(q)
    })
  }, [contractCompany, contractPhase, contractQuery, contractType, data?.contracts, query, view])

  const contractCompanies = useMemo(() => {
    return [...new Set((data?.contracts ?? []).map((row) => row.company).filter(Boolean))].sort()
  }, [data?.contracts])

  const contractTypes = useMemo(() => {
    return [...new Set((data?.contracts ?? []).map((row) => row.type).filter(Boolean))].sort()
  }, [data?.contracts])

  const contractPages = Math.max(1, Math.ceil(contractRows.length / 10))
  const contractPageSafe = Math.min(contractPage, contractPages - 1)
  const contractSlice = contractRows.slice(contractPageSafe * 10, contractPageSafe * 10 + 10)
  const selectedContract = contractRows.find((row) => row.id === pickedContract) ?? contractSlice[0]
  const contractStats = useMemo(() => {
    const rows = data?.contracts ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const fresh = (phase: ContractPhase | 'all') =>
      rows.filter((row) => {
        if (!row.startedAt || nowMs - new Date(row.startedAt).getTime() > month) return false
        return phase === 'all' || row.phase === phase
      }).length
    const prior = (phase: ContractPhase | 'all') =>
      rows.filter((row) => {
        if (!row.startedAt) return false
        const age = nowMs - new Date(row.startedAt).getTime()
        if (age <= month || age > month * 2) return false
        return phase === 'all' || row.phase === phase
      }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    const active = rows.filter((row) => row.phase === 'active' || row.phase === 'progress').length
    const completed = rows.filter((row) => row.phase === 'completed').length
    const cancelled = rows.filter((row) => row.phase === 'cancelled').length
    return {
      total: rows.length,
      active,
      completed,
      cancelled,
      totalDelta: delta(fresh('all'), prior('all')),
      activeDelta: delta(fresh('active') + fresh('progress'), prior('active') + prior('progress')),
      completedDelta: delta(fresh('completed'), prior('completed')),
      cancelledDelta: delta(fresh('cancelled'), prior('cancelled')),
    }
  }, [data?.contracts, nowMs])

  const sessions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.tracker?.sessions ?? []).filter((row) => {
      if (!q) return true
      return `${row.candidate} ${row.jobTitle} ${row.company}`.toLowerCase().includes(q)
    })
  }, [data?.tracker?.sessions, query])

  const ledger = useMemo(() => {
    const q = (view === 'finances' ? payQuery : query).trim().toLowerCase()
    const cutoff = nowMs - rangeMs(range)
    return (data?.finance?.entries ?? []).filter((row) => {
      const at = new Date(row.createdAt).getTime()
      if (Number.isFinite(at) && at < cutoff) return false
      if (payTab === 'employer' && row.kind !== 'from_employer') return false
      if (payTab === 'payout' && row.kind !== 'withdraw') return false
      if (payTab === 'pending' && row.status !== 'pending') return false
      if (payKind !== 'all' && row.kind !== payKind) return false
      if (payStatus !== 'all' && row.status !== payStatus) return false
      if (!q) return true
      return `${row.company} ${row.jobTitle} ${row.candidate} ${row.id} ${row.kind} ${row.status}`.toLowerCase().includes(q)
    })
  }, [data?.finance?.entries, nowMs, payKind, payQuery, payStatus, payTab, query, range, view])

  const payPages = Math.max(1, Math.ceil(ledger.length / 10))
  const payPageSafe = Math.min(payPage, payPages - 1)
  const paySlice = ledger.slice(payPageSafe * 10, payPageSafe * 10 + 10)
  const selectedPay = ledger.find((row) => row.id === pickedPay) ?? paySlice[0]
  const payStats = useMemo(() => {
    const rows = data?.finance?.entries ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const sum = (list: typeof rows, kind?: string, status?: string) =>
      list.reduce((n, row) => {
        if (kind && row.kind !== kind) return n
        if (status && row.status !== status) return n
        return n + row.amount
      }, 0)
    const fresh = rows.filter((row) => row.createdAt && nowMs - new Date(row.createdAt).getTime() <= month)
    const prior = rows.filter((row) => {
      if (!row.createdAt) return false
      const age = nowMs - new Date(row.createdAt).getTime()
      return age > month && age <= month * 2
    })
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    return {
      receivedDelta: delta(sum(fresh, 'from_employer'), sum(prior, 'from_employer')),
      pendingDelta: delta(sum(fresh, 'from_employer', 'pending'), sum(prior, 'from_employer', 'pending')),
      withdrawnDelta: delta(sum(fresh, 'withdraw'), sum(prior, 'withdraw')),
      availableDelta: delta(
        Math.max(0, sum(fresh, 'from_employer') - sum(fresh, 'from_employer', 'pending') - sum(fresh, 'withdraw')),
        Math.max(0, sum(prior, 'from_employer') - sum(prior, 'from_employer', 'pending') - sum(prior, 'withdraw')),
      ),
    }
  }, [data?.finance, nowMs])

  const payVolume = useMemo(() => {
    const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '3M' ? 90 : 365
    const start = startOfLocalDay(nowMs) - (days - 1) * 86_400_000
    const map = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      map.set(localDateKey(start + i * 86_400_000), 0)
    }
    for (const row of data?.finance?.entries ?? []) {
      if (row.kind !== 'from_employer') continue
      const key = localDateKey(new Date(row.createdAt).getTime())
      if (!map.has(key)) continue
      map.set(key, (map.get(key) ?? 0) + row.amount)
    }
    return [...map.entries()].map(([date, amount]) => ({ date, amount }))
  }, [data?.finance?.entries, nowMs, range])

  const payMix = useMemo(() => {
    const received = data?.finance?.received ?? 0
    const withdrawn = data?.finance?.withdrawn ?? 0
    return [
      { label: 'Employer pay', n: received, color: '#14a35a' },
      { label: 'Candidate payouts', n: withdrawn, color: '#8b5cf6' },
    ].filter((row) => row.n > 0)
  }, [data?.finance])

  const messages = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.inbox?.recent ?? []).filter((row) => {
      if (!q) return true
      return `${row.body} ${row.senderRole}`.toLowerCase().includes(q)
    })
  }, [data?.inbox?.recent, query])

  const staffRows = useMemo(() => {
    const q = (view === 'staff' ? staffQuery : query).trim().toLowerCase()
    return (data?.staffInvites ?? []).filter((row) => {
      if (!q) return true
      return `${row.name} ${row.email} ${row.role} ${row.status}`.toLowerCase().includes(q)
    })
  }, [data?.staffInvites, query, staffQuery, view])

  const employerRows = useMemo(() => {
    const q = (view === 'employers' ? employerQuery : query).trim().toLowerCase()
    return (data?.employers ?? []).filter((row) => {
      if (employerStatus !== 'all' && row.status !== employerStatus) return false
      if (employerIndustry !== 'all' && row.industry !== employerIndustry) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.company} ${row.industry}`.toLowerCase().includes(q)
    })
  }, [data?.employers, employerIndustry, employerQuery, employerStatus, query, view])

  const employerIndustries = useMemo(() => {
    return [...new Set((data?.employers ?? []).map((row) => row.industry).filter(Boolean))].sort()
  }, [data?.employers])

  const pageSize = 10
  const employerPages = Math.max(1, Math.ceil(employerRows.length / pageSize))
  const employerPageSafe = Math.min(employerPage, employerPages - 1)
  const employerSlice = employerRows.slice(employerPageSafe * pageSize, employerPageSafe * pageSize + pageSize)
  const selectedEmployer = employerRows.find((row) => row.id === pickedEmployer) ?? employerSlice[0]
  const employerJobs = useMemo(() => {
    if (!selectedEmployer) return []
    const company = selectedEmployer.company.trim().toLowerCase()
    return (data?.listings ?? []).filter((row) => row.atelier && row.company.trim().toLowerCase() === company)
  }, [data?.listings, selectedEmployer])
  const employerPackets = useMemo(() => {
    if (!selectedEmployer) return []
    const company = selectedEmployer.company.trim().toLowerCase()
    return (data?.packetsList ?? []).filter((row) => row.company.trim().toLowerCase() === company)
  }, [data?.packetsList, selectedEmployer])
  const employerStats = useMemo(() => {
    const rows = data?.employers ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const total = rows.length
    const active = rows.filter((row) => row.status === 'active').length
    const pending = rows.filter((row) => row.status !== 'active').length
    const fresh = rows.filter((row) => row.joinedAt && nowMs - new Date(row.joinedAt).getTime() <= month).length
    const prior = rows.filter((row) => {
      if (!row.joinedAt) return false
      const age = nowMs - new Date(row.joinedAt).getTime()
      return age > month && age <= month * 2
    }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    return {
      total,
      active,
      pending,
      fresh,
      totalDelta: delta(fresh, prior),
      activeDelta: delta(active, Math.max(0, active - fresh)),
      newDelta: delta(fresh, prior),
      pendingDelta: delta(pending, Math.max(0, pending - 1)),
    }
  }, [data?.employers, nowMs])

  const candidateRows = useMemo(() => {
    const q = (view === 'candidates' ? candidateQuery : query).trim().toLowerCase()
    const rows = [...(data?.candidates ?? [])].filter((row) => {
      if (candidateStatus !== 'all' && row.status !== candidateStatus) return false
      if (candidatePlace !== 'all' && placeLabel(row.city, row.country) !== candidatePlace) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.headline} ${row.skills.join(' ')} ${row.city} ${row.country}`.toLowerCase().includes(q)
    })
    rows.sort((a, b) => {
      if (candidateSort === 'name') return a.name.localeCompare(b.name)
      if (candidateSort === 'packets') return b.packets - a.packets || b.hired - a.hired
      return String(b.joinedAt).localeCompare(String(a.joinedAt))
    })
    return rows
  }, [candidatePlace, candidateQuery, candidateSort, candidateStatus, data?.candidates, query, view])

  const candidatePlaces = useMemo(() => {
    return [...new Set((data?.candidates ?? []).map((row) => placeLabel(row.city, row.country)).filter(Boolean))].sort()
  }, [data?.candidates])

  const candidatePages = Math.max(1, Math.ceil(candidateRows.length / pageSize))
  const candidatePageSafe = Math.min(candidatePage, candidatePages - 1)
  const candidateSlice = candidateRows.slice(candidatePageSafe * pageSize, candidatePageSafe * pageSize + pageSize)
  const selectedCandidate = candidateRows.find((row) => row.id === pickedCandidate) ?? candidateSlice[0]
  const candidatePackets = useMemo(() => {
    if (!selectedCandidate) return []
    const email = selectedCandidate.email.toLowerCase()
    return (data?.packetsList ?? []).filter((row) => row.candidateEmail.toLowerCase() === email)
  }, [data?.packetsList, selectedCandidate])
  const candidateStats = useMemo(() => {
    const rows = data?.candidates ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const total = rows.length
    const onboarded = rows.filter((row) => row.onboarded).length
    const active = rows.filter((row) => row.status === 'active').length
    const pending = rows.filter((row) => row.status === 'pending').length
    const fresh = rows.filter((row) => row.joinedAt && nowMs - new Date(row.joinedAt).getTime() <= month).length
    const prior = rows.filter((row) => {
      if (!row.joinedAt) return false
      const age = nowMs - new Date(row.joinedAt).getTime()
      return age > month && age <= month * 2
    }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    return {
      total,
      onboarded,
      active,
      pending,
      totalDelta: delta(fresh, prior),
      onboardedDelta: delta(onboarded, Math.max(0, onboarded - fresh)),
      activeDelta: delta(active, Math.max(0, active - fresh)),
      pendingDelta: delta(pending, Math.max(0, pending - 1)),
    }
  }, [data?.candidates, nowMs])
  const candidateOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ai-job-finder-ecru.vercel.app'
  const candidateJoin = `${candidateOrigin}${candidateJoinPath()}`
  const linkedInPeople = 'https://www.linkedin.com/search/results/people/'

  const candidates = data?.candidates ?? (data?.accounts ?? []).filter((a) => a.role === 'candidate')

  function onInviteStaff(e: FormEvent) {
    e.preventDefault()
    inviteStaff.mutate()
  }

  function onPromote(e: FormEvent) {
    e.preventDefault()
    promote.mutate()
  }

  function copySql() {
    void navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  function exportEmployers() {
    const header = 'Name,Email,Company,Industry,Jobs,Packets,Hired,Spent,Status,Joined'
    const lines = employerRows.map((row) =>
      [row.name, row.email, row.company, row.industry, row.jobs, row.packets, row.hired, row.spent, row.status, row.joinedAt]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-employers.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  function exportCandidates() {
    const header = 'Name,Email,Headline,Skills,Location,Packets,Hired,Hours,Status,Onboarded,Joined'
    const lines = candidateRows.map((row) =>
      [
        row.name,
        row.email,
        row.headline,
        row.skills.join('; '),
        placeLabel(row.city, row.country),
        row.packets,
        row.hired,
        formatHoursMinutes(row.hours),
        row.status,
        row.onboarded ? 'yes' : 'no',
        row.joinedAt,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-candidates.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  function exportPackets() {
    const header = 'Candidate,Email,Role,Company,Status,Submitted'
    const lines = packets.map((row) =>
      [row.candidate, row.candidateEmail, row.jobTitle, row.company, row.status, row.submittedAt || row.createdAt]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-packets.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  function exportContracts() {
    const header = 'Role,Candidate,Email,Employer,Type,Amount,Hours,Status,Start,End'
    const lines = contractRows.map((row) =>
      [
        row.title,
        row.candidate,
        row.candidateEmail,
        row.company,
        prettyContractType(row.type),
        row.amount,
        formatHoursMinutes(row.hours),
        row.phase,
        row.startedAt,
        row.endedAt,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-contracts.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  function exportPayments() {
    const header = 'Date,Id,Type,From,To,Role,Amount,Status,Note'
    const lines = ledger.map((row) =>
      [
        row.createdAt,
        row.id,
        payKindLabel(row.kind),
        row.kind === 'from_employer' ? row.company : 'Atelier',
        row.kind === 'withdraw' ? row.candidate : row.candidate,
        row.jobTitle,
        row.amount,
        row.status,
        row.note,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-payments.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  function copyInvite(kind: 'link' | 'note', row = selected) {
    if (!row) return
    const text = kind === 'link' ? `${inviteOrigin}${employerJoinPath(row)}` : inviteNote || employerInviteNote(row, inviteOrigin)
    void navigator.clipboard.writeText(text).then(() => {
      setInviteCopied(kind)
      window.setTimeout(() => setInviteCopied(''), 2000)
    })
  }

  function copyCandidateInvite(kind: 'link' | 'note') {
    const text = kind === 'link' ? candidateJoin : candidateInviteNote(candidateOrigin)
    void navigator.clipboard.writeText(text).then(() => {
      setCandidateCopied(kind)
      window.setTimeout(() => setCandidateCopied(''), 2000)
    })
  }

  function openCandidate(email: string) {
    const hit = (data?.candidates ?? []).find((row) => row.email.toLowerCase() === email.toLowerCase())
    if (hit) setPickedCandidate(hit.id)
    go('candidates')
  }

  function sendEmployerInvite(row: AdminInvite) {
    setPicked(row.company)
    rememberLocalEmployerInvite(row.company, setLocalInvited)
    markEmployerInvite.mutate({ company: row.company, title: row.title, source: row.source })
    copyInvite('link', row)
  }

  function go(next: DeskView, role: PeopleFilter = 'all') {
    setView(next)
    if (next === 'people') setPeopleRole(role)
    if (next === 'roles') setPeopleRole('all')
    setNavOpen(false)
    setHelpOpen(false)
    setAccountOpen(false)
    setStaffMenu('')
    setQuery('')
    if (next === 'employers') setEmployerPage(0)
    if (next === 'candidates') setCandidatePage(0)
    if (next === 'packets') {
      setPacketPage(0)
      setPacketOpen(true)
    }
    if (next === 'contracts') {
      setContractPage(0)
      setContractOpen(true)
    }
    if (next === 'invite') {
      setInvitePage(0)
      setSource('all')
    }
    if (next === 'finances') {
      setPayPage(0)
      setPayOpen(true)
    }
  }

  function linkActive(item: NavLinkItem) {
    if (item.id === 'people') return view === 'people' && peopleRole === (item.people ?? 'all')
    return view === item.id
  }

  const searchValue = view === 'people' || view === 'roles' ? peopleQuery : view === 'staff' ? staffQuery : view === 'employers' ? employerQuery : view === 'candidates' ? candidateQuery : view === 'packets' ? packetQuery : view === 'contracts' ? contractQuery : view === 'finances' ? payQuery : query
  const onSearch = (value: string) => {
    if (view === 'people' || view === 'roles') setPeopleQuery(value)
    else if (view === 'staff') setStaffQuery(value)
    else if (view === 'employers') {
      setEmployerQuery(value)
      setEmployerPage(0)
    } else if (view === 'candidates') {
      setCandidateQuery(value)
      setCandidatePage(0)
    } else if (view === 'packets') {
      setPacketQuery(value)
      setPacketPage(0)
    } else if (view === 'contracts') {
      setContractQuery(value)
      setContractPage(0)
    } else if (view === 'finances') {
      setPayQuery(value)
      setPayPage(0)
    } else setQuery(value)
  }
  const alertCount = (counts?.companiesToInvite ?? 0) + (counts?.messages ?? 0)
  const searchHint =
    view === 'staff'
      ? 'Search invited admins...'
      : view === 'invite'
        ? 'Search employers, companies, or keywords...'
        : view === 'tracker'
        ? 'Search tracker sessions'
        : view === 'finances'
          ? 'Search payments, employers, or candidates'
          : view === 'inbox'
            ? 'Search messages'
              : view === 'packets'
              ? 'Search packets'
              : view === 'contracts'
                ? 'Search contracts by role, candidate, or employer'
                : view === 'employers'
                ? 'Search employers by name, email, or company'
                : view === 'candidates'
                  ? 'Search candidates by name, email, skills, or location'
                : 'Search users, jobs, packets, or companies'

  return (
    <div className="min-h-svh bg-[#f3f5f4] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="hidden bg-[#13261f] text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/brand/atelier-logo.jpg" alt="Atelier" className="size-9 rounded-lg object-cover" />
          <div>
            <p className="font-serif text-lg leading-none">Atelier</p>
            <p className="mt-1 text-[0.65rem] text-white/55">Admin Panel</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map((section, i) => (
            <div key={section.label ?? `top-${i}`} className={section.label ? 'mt-4' : ''}>
              {section.label ? (
                <p className="px-3 pb-1.5 text-[0.68rem] font-medium text-white/40">{section.label}</p>
              ) : null}
              {section.items.map((item) => (
                <SideRow
                  key={`${item.label}-${item.people ?? ''}`}
                  icon={item.icon}
                  label={item.label}
                  active={linkActive(item)}
                  onClick={() => go(item.id, item.people ?? 'all')}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="mx-3 mb-4 rounded-2xl bg-[#0d1b16] px-4 py-4">
          <div className="flex items-center gap-2">
            <img src="/brand/atelier-logo.jpg" alt="" className="size-8 rounded-md object-cover" />
            <div>
              <p className="text-sm font-medium">Atelier</p>
              <p className="text-[0.65rem] leading-snug text-white/50">AI-Powered Job Matching</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e4e8e5] bg-white px-4 py-3 sm:px-6">
          <button type="button" className="rounded-lg border border-[#e4e8e5] px-3 py-2 text-sm lg:hidden" onClick={() => setNavOpen((v) => !v)}>
            Menu
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
            <Input
              className="h-10 rounded-xl border-[#e4e8e5] bg-[#f7f8f7] pl-10"
              placeholder={searchHint}
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="relative grid size-10 place-items-center rounded-full text-[#5c635f] hover:bg-[#f3f5f4]"
              aria-label="Alerts"
              onClick={() => {
                setHelpOpen(false)
                setAccountOpen(false)
                go(counts?.companiesToInvite ? 'invite' : 'inbox')
              }}
            >
              <Bell className="size-5" />
              {alertCount > 0 ? (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ef4444] px-1 text-[0.65rem] font-semibold leading-none text-white">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              ) : null}
            </button>
            <div className="relative">
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full text-[#5c635f] hover:bg-[#f3f5f4]"
                aria-label="Help"
                onClick={() => {
                  setAccountOpen(false)
                  setHelpOpen((v) => !v)
                }}
              >
                <CircleHelp className="size-5" />
              </button>
              {helpOpen ? (
                <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-[#e4e8e5] bg-white p-4 text-sm shadow-[0_12px_32px_rgba(19,38,31,0.12)]">
                  <p className="font-medium text-[#161c19]">Admin help</p>
                  <p className="mt-2 leading-relaxed text-[#5c635f]">
                    Packets leave only after a candidate approves. Invite is staff-only. Tracker and pay stay on Atelier.
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-[#147a48]"
                    onClick={() => {
                      setHelpOpen(false)
                      go('keys')
                    }}
                  >
                    Open settings
                  </button>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-[#f3f5f4]"
                onClick={() => {
                  setHelpOpen(false)
                  setAccountOpen((v) => !v)
                }}
              >
                <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                  {initials(name)}
                </span>
                <span className="hidden text-sm font-medium text-[#161c19] sm:block">Admin</span>
                <ChevronDown className="hidden size-4 text-[#8a918c] sm:block" />
              </button>
              {accountOpen ? (
                <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-[#e4e8e5] bg-white py-2 shadow-[0_12px_32px_rgba(19,38,31,0.12)]">
                  <p className="px-4 py-2 text-xs text-[#8a918c]">{name}</p>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#f3f5f4]"
                    onClick={() => {
                      setAccountOpen(false)
                      go('keys')
                    }}
                  >
                    <Settings className="size-4 text-[#5c635f]" />
                    Settings
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#f3f5f4]"
                    onClick={() => void signOut()}
                  >
                    <LogOut className="size-4 text-[#5c635f]" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {navOpen ? (
          <div className="flex gap-1 overflow-x-auto bg-[#13261f] px-3 py-2 lg:hidden">
            {MOBILE_NAV.map((item) => (
              <button
                key={`${item.label}-m`}
                type="button"
                onClick={() => go(item.id, item.people ?? 'all')}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-white/80"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="space-y-5 px-4 py-6 sm:px-6">
          {dash.isError ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-[#b85c38]">
              {dash.error instanceof Error ? dash.error.message : 'Could not load the admin panel.'}
            </div>
          ) : null}

          {view === 'pulse' ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Admin Dashboard</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Platform overview and key metrics at a glance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {data?.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-medium text-[#147a48]">
                      <span className={`size-1.5 rounded-full bg-[#14a35a] ${dash.isFetching ? 'animate-pulse' : ''}`} />
                      Live
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                    <Calendar className="size-4" />
                    {monthLabel}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} tone="green" label="Total Users" value={counts?.people ?? 0} hint="From Supabase" />
                <MetricCard icon={Briefcase} tone="blue" label="Active Jobs" value={counts?.jobs ?? 0} hint="Live listings" />
                <MetricCard icon={FileText} tone="teal" label="Total Packets" value={counts?.packets ?? 0} hint="Applications in studio" />
                <MetricCard icon={Mail} tone="gold" label="Invite Queue" value={counts?.companiesToInvite ?? 0} hint="Companies to invite" />
                <MetricCard icon={Timer} tone="green" label="Tracker" value={formatHoursMinutes(counts?.trackerHours ?? 0)} hint={`${counts?.liveClocks ?? 0} live clocks`} />
                <MetricCard icon={MessagesSquare} tone="blue" label="Inbox" value={counts?.messages ?? 0} hint="Studio messages" />
                <MetricCard icon={Wallet} tone="gold" label="Finances" value={money(counts?.financeReceived ?? 0)} hint="Received from employers" />
                <MetricCard icon={Briefcase} tone="teal" label="Hired" value={counts?.hired ?? 0} hint="Offers and hires" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)_17.5rem]">
                <div className="space-y-4 xl:col-span-2">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.75fr)]">
                    <Panel>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-sans text-base font-semibold">Listing growth</h2>
                        <div className="flex rounded-full bg-[#f3f5f4] p-1 text-xs">
                          {(['7D', '30D', '3M', '1Y'] as const).map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setRange(id)}
                              className={`rounded-full px-2.5 py-1 ${range === id ? 'bg-[#14a35a] text-white' : 'text-[#5c635f]'}`}
                            >
                              {id}
                            </button>
                          ))}
                        </div>
                      </div>
                      <GrowthChart boards={data?.boards ?? []} />
                    </Panel>
                    <Panel>
                      <h2 className="font-sans text-base font-semibold">User breakdown</h2>
                      <UserDonut
                        candidates={counts?.candidates ?? 0}
                        employers={counts?.employers ?? 0}
                        admins={counts?.admins ?? 0}
                      />
                    </Panel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Recent Jobs</h2>
                        <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('listings')}>
                          View all jobs
                        </button>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[28rem] text-left text-sm">
                          <thead className="text-xs text-[#8a918c]">
                            <tr>
                              <th className="pb-2 font-medium">Job Title</th>
                              <th className="pb-2 font-medium">Company</th>
                              <th className="pb-2 font-medium">Board</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data?.listings ?? []).slice(0, 5).map((row) => (
                              <tr key={row.id} className="border-t border-[#eef1ee]">
                                <td className="py-3 font-medium text-[#161c19]">{row.title}</td>
                                <td className="py-3 text-[#5c635f]">{row.company}</td>
                                <td className="py-3">{sourceLabel(row.source)}</td>
                                <td className="py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${row.atelier ? 'bg-[#e8f6ee] text-[#147a48]' : 'bg-[#eef1ee] text-[#5c635f]'}`}>
                                    {row.atelier ? 'Atelier' : row.remote ? 'Open' : 'On-site'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Top candidates</h2>
                        <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('candidates')}>
                          View all
                        </button>
                      </div>
                      <ul className="mt-4 space-y-3">
                        {candidates.slice(0, 5).map((row) => (
                          <li key={row.id} className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                              {initials(row.name || row.email)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{row.name}</span>
                              <span className="block truncate text-xs text-[#8a918c]">{row.email}</span>
                            </span>
                          </li>
                        ))}
                        {!candidates.length ? <li className="text-sm text-[#8a918c]">No candidates yet.</li> : null}
                      </ul>
                    </Panel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Notifications</h2>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm">
                        <NoteDot color="#ef4444" text={`${counts?.companiesToInvite ?? 0} companies waiting on an invite.`} />
                        <NoteDot color="#22c55e" text={`${counts?.liveClocks ?? 0} live tracker clocks · ${formatHoursMinutes(counts?.trackerHours ?? 0)} logged.`} />
                        <NoteDot color="#3b82f6" text={`${counts?.messages ?? 0} studio messages · ${counts?.packets ?? 0} packets.`} />
                        <NoteDot color="#14a35a" text="Packets leave only after a candidate approves." />
                      </ul>
                    </Panel>
                    <div className="overflow-hidden rounded-2xl bg-[#13261f] p-5 text-white">
                      <img src="/brand/atelier-logo.jpg" alt="" className="size-12 rounded-xl object-cover" />
                      <h2 className="mt-4 font-serif text-2xl">Grow the Atelier desk</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">
                        Invite employers from other boards so approved packets can land in an Atelier inbox.
                      </p>
                      <Button variant="paper" className="mt-4" onClick={() => go('invite')}>
                        Invite a company
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="rounded-2xl bg-[#e8f6ee] p-5">
                    <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-[#161c19]">
                      <Zap className="size-4 fill-[#14a35a] text-[#14a35a]" />
                      Quick Actions
                    </h2>
                    <div className="mt-2 divide-y divide-[#cfe8d7]">
                      <QuickRow icon={User} label="Review pending packets" onClick={() => go('packets')} />
                      <QuickRow icon={Shield} label="Review inbox" onClick={() => go('inbox')} />
                      <QuickRow icon={Briefcase} label="Manage jobs" onClick={() => go('listings')} />
                      <QuickRow icon={BarChart3} label="View reports" onClick={() => go('reports')} />
                    </div>
                  </section>
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">Recent Activity</h2>
                    <ul className="mt-4 space-y-4">
                      {(data?.activity ?? []).slice(0, 6).map((row, i) => (
                        <li key={`${row.title}-${i}`} className="flex gap-3 text-sm">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                            {initials(row.title)}
                          </span>
                          <span>
                            <span className="block font-medium">{row.title}</span>
                            <span className="text-xs text-[#8a918c]">{row.body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </div>
            </>
          ) : null}

          {view === 'staff' ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[#8a918c]">
                  Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Invite Admin</span>
                </p>
                <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Invite Admin</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#5c635f]">
                  Add administrators to help run Atelier. They get access to users, jobs, packets, tracker, and pay. Signup still cannot grant admin on its own.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <Panel className="p-6">
                  <h2 className="font-sans text-lg font-semibold">Send Invitation</h2>
                  <form className="mt-5 space-y-4" onSubmit={onInviteStaff}>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">
                        Email address <span className="text-[#b85c38]">*</span>
                      </span>
                      <Input
                        type="email"
                        required
                        placeholder="Enter email address"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">
                        Role <span className="text-[#b85c38]">*</span>
                      </span>
                      <select className="h-10 w-full rounded-lg border border-[#e4e8e5] bg-white px-3 text-sm" value="admin" onChange={() => undefined}>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <div>
                      <p className="text-sm font-medium">Permissions</p>
                      <p className="mt-1 text-sm text-[#5c635f]">Admins can manage users, jobs, and studio settings. Super admins are granted in SQL only.</p>
                      <ul className="mt-3 space-y-3">
                        <PermissionRow title="User Management" body="View and manage candidates and employers" />
                        <PermissionRow title="Job Management" body="Access jobs, packets, and employer invites" />
                        <PermissionRow title="Finances" body="View the pay ledger and tracker hours" />
                        <PermissionRow title="Account Settings" body="Open staff settings on this desk" />
                      </ul>
                    </div>
                    {inviteStaff.isError ? (
                      <p className="text-sm text-[#b85c38]">{inviteStaff.error instanceof Error ? inviteStaff.error.message : 'Could not send the invite.'}</p>
                    ) : null}
                    {inviteStaff.isSuccess ? (
                      <p className="text-sm text-[#147a48]">
                        {inviteStaff.data.already
                          ? 'That email is already an admin.'
                          : inviteStaff.data.message || (inviteStaff.data.status === 'accepted' ? 'They are an admin now.' : 'Invitation saved.')}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <Button variant="outline" type="button" onClick={() => setStaffEmail('')}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteStaff.isPending || !staffEmail.trim()}>
                        {inviteStaff.isPending ? 'Sending…' : 'Send Invitation'}
                      </Button>
                    </div>
                  </form>
                </Panel>

                <section className="rounded-2xl bg-[#e8f6ee] p-6">
                  <div className="mx-auto grid size-28 place-items-center">
                    <img src="/brand/atelier-logo.jpg" alt="" className="size-20 rounded-2xl object-cover shadow-sm" />
                  </div>
                  <h2 className="mt-2 text-center font-sans text-lg font-semibold">Why invite an admin?</h2>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {[
                      'Manage the team and users',
                      'Oversee jobs, packets, and invites',
                      'Handle tracker hours and pay',
                      'Keep the Atelier desk secure',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-[#14a35a]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-sans text-lg font-semibold">Invited Admins</h2>
                  <label className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                    <Input
                      className="h-10 rounded-xl border-[#e4e8e5] bg-[#f7f8f7] pl-10"
                      placeholder="Search invited admins..."
                      value={staffQuery}
                      onChange={(e) => setStaffQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="text-xs text-[#8a918c]">
                      <tr>
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Email</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Invited On</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRows.map((row) => (
                        <tr key={`${row.id}-${row.email}`} className="border-t border-[#eef1ee]">
                          <td className="py-3">
                            <span className="flex items-center gap-3">
                              <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                {initials(row.name || row.email)}
                              </span>
                              <span className="font-medium">{row.name || row.email.split('@')[0]}</span>
                            </span>
                          </td>
                          <td className="py-3 text-[#5c635f]">{row.email}</td>
                          <td className="py-3 capitalize">{row.role.replace('_', ' ')}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs ${
                                row.status === 'pending' ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#d1fae5] text-[#047857]'
                              }`}
                            >
                              {row.status === 'pending' ? 'Pending' : 'Accepted'}
                            </span>
                          </td>
                          <td className="py-3 text-[#5c635f]">{day(row.invitedAt)}</td>
                          <td className="relative py-3">
                            <button
                              type="button"
                              className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]"
                              aria-label="Actions"
                              onClick={() => setStaffMenu((v) => (v === row.email ? '' : row.email))}
                            >
                              <MoreHorizontal className="size-4 text-[#8a918c]" />
                            </button>
                            {staffMenu === row.email ? (
                              <div className="absolute right-0 z-20 w-44 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(row.email)
                                    setStaffMenu('')
                                  }}
                                >
                                  Copy email
                                </button>
                                {row.status === 'pending' ? (
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-[#b85c38] hover:bg-[#f3f5f4]"
                                    onClick={() => cancelInvite.mutate(row.email)}
                                  >
                                    Cancel invite
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!staffRows.length ? <p className="py-6 text-sm text-[#8a918c]">No invited admins yet.</p> : null}
                </div>
              </Panel>
            </div>
          ) : null}

          {view === 'invite' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Invite Employers</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Invite Employers to Atelier</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">
                    Companies from scored listings. Open official LinkedIn or Upwork search — Atelier does not scrape those sites.
                  </p>
                </div>
                <Button variant="outline" type="button" onClick={() => setInviteTab('invited')}>
                  View invitations
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <a
                  href={linkedInSearch}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)] hover:border-[#13261f]"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-[#0a66c2] text-sm font-bold text-white">in</span>
                  <span>
                    <span className="block font-medium">Find employers on LinkedIn</span>
                    <span className="mt-1 block text-sm text-[#5c635f]">Opens LinkedIn’s official hiring search. Copy an Atelier join link from the table.</span>
                  </span>
                  <ExternalLink className="ml-auto size-4 shrink-0 text-[#8a918c]" />
                </a>
                <a
                  href={upworkSearch}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-[#14a800] text-sm font-bold text-white">Up</span>
                  <span>
                    <span className="block font-medium">Find companies on Upwork</span>
                    <span className="mt-1 block text-sm text-[#5c635f]">Opens Upwork’s official job search. Invite them to post the role on Atelier.</span>
                  </span>
                  <ExternalLink className="ml-auto size-4 shrink-0 text-[#8a918c]" />
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', `All (${inviteCounts.all})`],
                    ['linkedin', `LinkedIn (${inviteCounts.linkedin})`],
                    ['upwork', `Upwork (${inviteCounts.upwork})`],
                    ['not_invited', `Not invited (${inviteCounts.not_invited})`],
                    ['invited', `Invited (${inviteCounts.invited})`],
                    ['joined', `Joined (${inviteCounts.joined})`],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    active={inviteTab === id}
                    label={label}
                    onClick={() => {
                      setInviteTab(id)
                      setInvitePage(0)
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search companies..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setInvitePage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value)
                    setInvitePage(0)
                  }}
                >
                  <option value="all">All platforms</option>
                  {sources.map((item) => (
                    <option key={item} value={item}>
                      {sourceLabel(item)}
                    </option>
                  ))}
                </select>
                {inviteIndustries.length ? (
                  <select
                    className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                    value={inviteIndustry}
                    onChange={(e) => {
                      setInviteIndustry(e.target.value)
                      setInvitePage(0)
                    }}
                  >
                    <option value="all">All industries</option>
                    {inviteIndustries.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSource('all')
                    setInviteIndustry('all')
                    setInviteTab('all')
                    setInvitePage(0)
                  }}
                >
                  Reset
                </Button>
              </div>

              <div className={`grid gap-5 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Company</th>
                          <th className="px-3 py-3 font-medium">Platform</th>
                          <th className="px-3 py-3 font-medium">Industry</th>
                          <th className="px-3 py-3 font-medium">Listings</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inviteSlice.map((row) => (
                          <tr
                            key={row.company}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selected?.company === row.company ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => setPicked(row.company)}
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-lg bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.company)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.company}</span>
                                  <span className="block text-xs text-[#8a918c]">{row.title}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <PlatformChip source={row.source} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{row.industry || '—'}</td>
                            <td className="px-3 py-3 tabular-nums text-[#5c635f]">{row.listings ? `${row.listings}` : '—'}</td>
                            <td className="px-3 py-3">
                              <InviteStatusChip status={deskInviteStatus(row, localInvited)} />
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              {deskInviteStatus(row, localInvited) === 'joined' ? (
                                <Button variant="outline" type="button" onClick={() => go('employers')}>
                                  Open employer
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  disabled={markEmployerInvite.isPending}
                                  onClick={() => sendEmployerInvite(row)}
                                >
                                  <Mail className="size-4" />
                                  {deskInviteStatus(row, localInvited) === 'invited' ? 'Resend invite' : 'Send invite'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!inviteSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No companies match this search.</p> : null}
                    {markEmployerInvite.isError ? (
                      <p className="px-4 py-2 text-sm text-[#b85c38]">
                        {markEmployerInvite.error instanceof Error ? markEmployerInvite.error.message : 'Could not record the invite. The join link was still copied.'}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {invites.length ? invitePageSafe * 10 + 1 : 0}-{Math.min(invites.length, invitePageSafe * 10 + 10)} of {invites.length}
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: invitePages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInvitePage(i)}
                          className={`grid size-7 place-items-center rounded-md ${invitePageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                {selected ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-[#13261f] p-5 text-white">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#c6a15b]">Atelier</p>
                      <h2 className="mt-2 font-serif text-2xl leading-tight">Your next great hire starts here</h2>
                      <p className="mt-3 text-sm leading-relaxed text-[#d8d0c0]">
                        Ask {selected.company} to post on Atelier. Approved packets land in their inbox — nothing leaves until the candidate says so.
                      </p>
                      <ul className="mt-4 space-y-1.5 text-sm text-[#e7e1d4]">
                        <li>AI-matched candidates</li>
                        <li>Packets stay on Atelier until approve</li>
                        <li>Tracker and pay stay in studio</li>
                      </ul>
                      <Button className="mt-5 w-full bg-[#c6a15b] text-[#13261f] hover:bg-[#d4b56f]" type="button" onClick={() => sendEmployerInvite(selected)}>
                        <Mail className="size-4" />
                        Send invite to {selected.company}
                      </Button>
                      <Button variant="outline" className="mt-2 w-full border-[#c9c0ae55] text-white hover:bg-[#1f3d32]" type="button" onClick={() => copyInvite('link')}>
                        <Copy className="size-4" />
                        {inviteCopied === 'link' ? 'Copied' : 'Copy invite link'}
                      </Button>
                    </div>
                    <Panel>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-sans text-base font-semibold">Invitation message</h2>
                        <button type="button" className="text-xs font-medium text-[#147a48]" onClick={() => selected && setInviteNote(employerInviteNote(selected, inviteOrigin))}>
                          Reset
                        </button>
                      </div>
                      <textarea
                        className="mt-3 min-h-[10rem] w-full rounded-xl border border-[#e4e8e5] bg-[#f7f8f7] p-3 text-sm"
                        value={inviteNote}
                        onChange={(e) => setInviteNote(e.target.value)}
                      />
                      <p className="mt-2 truncate text-xs text-[#8a918c]">
                        {inviteOrigin}
                        {employerJoinPath(selected)}
                      </p>
                      <Button variant="outline" className="mt-3 w-full" type="button" onClick={() => copyInvite('note')}>
                        <Copy className="size-4" />
                        {inviteCopied === 'note' ? 'Copied' : 'Copy message'}
                      </Button>
                    </Panel>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === 'roles' ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[#8a918c]">
                  Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Manage Roles</span>
                </p>
                <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Manage Roles</h1>
                <p className="mt-1 text-sm text-[#5c635f]">Change candidate, employer, and admin access. Super admin stays in SQL.</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <Panel>
                  <h2 className="font-sans text-lg font-semibold">People</h2>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(['all', 'admin', 'super_admin', 'employer', 'candidate'] as const).map((role) => (
                      <Chip key={role} active={peopleRole === role} onClick={() => setPeopleRole(role)} label={role === 'all' ? 'All' : role.replace('_', ' ')} />
                    ))}
                  </div>
                  <div className="mt-4 divide-y divide-[#eef1ee]">
                    {people.map((row) => (
                      <div key={row.id} className="flex items-center gap-3 py-3">
                        <span className="grid size-10 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                          {initials(row.name || row.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="truncate text-sm text-[#8a918c]">{row.email}</p>
                        </div>
                        <span className="rounded-full bg-[#f3f5f4] px-2.5 py-0.5 text-xs capitalize">{row.role.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                {superAdmin ? (
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">Change a role</h2>
                    <form className="mt-4 space-y-3" onSubmit={onPromote}>
                      <Input type="email" required placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <select className="h-10 w-full rounded-lg border border-[#e4e8e5] px-3 text-sm" value={nextRole} onChange={(e) => setNextRole(e.target.value as typeof nextRole)}>
                        <option value="admin">admin</option>
                        <option value="employer">employer</option>
                        <option value="candidate">candidate</option>
                      </select>
                      <Button variant="copper" type="submit" disabled={promote.isPending}>
                        {promote.isPending ? 'Saving…' : 'Update role'}
                      </Button>
                      {promote.isError ? (
                        <p className="text-sm text-[#b85c38]">{promote.error instanceof Error ? promote.error.message : 'Could not update the role.'}</p>
                      ) : null}
                    </form>
                  </Panel>
                ) : (
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">Change a role</h2>
                    <p className="mt-2 text-sm text-[#5c635f]">Only a super admin can change roles here. Use Invite Admin to grant the admin desk.</p>
                    <Button className="mt-4" type="button" onClick={() => go('staff')}>
                      Invite Admin
                    </Button>
                  </Panel>
                )}
              </div>
            </div>
          ) : null}

          {view === 'candidates' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Invite Candidates</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Invite Candidates</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Share a join link, then review people who already signed up on Atelier.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                    <Calendar className="size-4" />
                    {monthRange}
                  </span>
                  <Button variant="outline" type="button" onClick={exportCandidates}>
                    <Download className="size-4" />
                    Export
                  </Button>
                  <Button type="button" onClick={() => copyCandidateInvite('link')}>
                    <Copy className="size-4" />
                    {candidateCopied === 'link' ? 'Copied' : 'Copy join link'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <a
                  href={linkedInPeople}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-[#0a66c2] text-sm font-bold text-white">in</span>
                  <span>
                    <span className="block font-medium">Find people on LinkedIn</span>
                    <span className="mt-1 block text-sm text-[#5c635f]">Opens LinkedIn’s official people search. Copy an Atelier join link — we do not scrape or message them from here.</span>
                  </span>
                  <ExternalLink className="ml-auto size-4 shrink-0 text-[#8a918c]" />
                </a>
                <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
                  <span className="grid size-12 place-items-center rounded-xl bg-[#13261f] text-white">
                    <UserPlus className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Invite with an Atelier link</span>
                    <span className="mt-1 block truncate text-sm text-[#5c635f]">{candidateJoin}</span>
                  </span>
                  <Button variant="outline" type="button" onClick={() => copyCandidateInvite('note')}>
                    {candidateCopied === 'note' ? 'Copied' : 'Copy note'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_18rem]">
                <EmployerStat icon={Users} color="#14a35a" label="Total Candidates" value={candidateStats.total} delta={candidateStats.totalDelta} />
                <EmployerStat icon={Check} color="#22c55e" label="Onboarded" value={candidateStats.onboarded} delta={candidateStats.onboardedDelta} />
                <EmployerStat icon={Zap} color="#8b5cf6" label="Active Candidates" value={candidateStats.active} delta={candidateStats.activeDelta} />
                <EmployerStat icon={Clock} color="#8a918c" label="Pending" value={candidateStats.pending} delta={candidateStats.pendingDelta} />
                {selectedCandidate ? (
                  <section className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid size-10 place-items-center rounded-full bg-[#e8f6ee] text-sm font-semibold text-[#147a48]">
                        {initials(selectedCandidate.name || selectedCandidate.email)}
                      </span>
                      <StatusDot status={selectedCandidate.status} />
                    </div>
                    <p className="mt-3 font-medium">{selectedCandidate.name}</p>
                    <p className="truncate text-sm text-[#5c635f]">{selectedCandidate.headline || 'Candidate'}</p>
                    <p className="mt-1 text-xs text-[#8a918c]">{placeLabel(selectedCandidate.city, selectedCandidate.country) || 'Location not set'}</p>
                    <p className="mt-1 text-xs text-[#8a918c]">Joined {day(selectedCandidate.joinedAt)}</p>
                    <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm text-[#147a48]" onClick={() => go('packets')}>
                      View packets <ExternalLink className="size-3.5" />
                    </button>
                  </section>
                ) : (
                  <section className="rounded-2xl bg-white p-4 text-sm text-[#8a918c] shadow-[0_1px_2px_rgba(19,38,31,0.06)]">No candidates yet.</section>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search by name, email, skills, or location"
                    value={candidateQuery}
                    onChange={(e) => {
                      setCandidateQuery(e.target.value)
                      setCandidatePage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={candidatePlace}
                  onChange={(e) => {
                    setCandidatePlace(e.target.value)
                    setCandidatePage(0)
                  }}
                >
                  <option value="all">All locations</option>
                  {candidatePlaces.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={candidateStatus}
                  onChange={(e) => {
                    setCandidateStatus(e.target.value as typeof candidateStatus)
                    setCandidatePage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={candidateSort}
                  onChange={(e) => {
                    setCandidateSort(e.target.value as typeof candidateSort)
                    setCandidatePage(0)
                  }}
                >
                  <option value="newest">Sort by newest</option>
                  <option value="name">Sort by name</option>
                  <option value="packets">Sort by packets</option>
                </select>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Candidate</th>
                          <th className="px-3 py-3 font-medium">Skills</th>
                          <th className="px-3 py-3 font-medium">Location</th>
                          <th className="px-3 py-3 font-medium">Packets</th>
                          <th className="px-3 py-3 font-medium">Hired</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Joined</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidateSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedCandidate?.id === row.id ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => setPickedCandidate(row.id)}
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.name || row.email)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.name}</span>
                                  <span className="block text-xs text-[#8a918c]">{handleFromEmail(row.email) || row.email}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <SkillPills skills={row.skills} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{placeLabel(row.city, row.country) || '—'}</td>
                            <td className="px-3 py-3">{row.packets}</td>
                            <td className="px-3 py-3">{row.hired}</td>
                            <td className="px-3 py-3">
                              <StatusDot status={row.status} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{day(row.joinedAt)}</td>
                            <td className="relative px-3 py-3">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full hover:bg-white"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPickedCandidate(row.id)
                                  setStaffMenu(staffMenu === row.id ? '' : row.id)
                                }}
                              >
                                <MoreHorizontal className="size-4 text-[#8a918c]" />
                              </button>
                              {staffMenu === row.id ? (
                                <div className="absolute right-3 z-20 w-40 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void navigator.clipboard.writeText(row.email)
                                      setStaffMenu('')
                                    }}
                                  >
                                    Copy email
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setStaffMenu('')
                                      go('packets')
                                    }}
                                  >
                                    View packets
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setStaffMenu('')
                                      go('inbox')
                                    }}
                                  >
                                    Message
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!candidateSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No candidates match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {candidateRows.length ? candidatePageSafe * pageSize + 1 : 0}-{Math.min(candidateRows.length, candidatePageSafe * pageSize + pageSize)} of {candidateRows.length} candidates
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: candidatePages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCandidatePage(i)}
                          className={`grid size-7 place-items-center rounded-md ${candidatePageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                <div className="space-y-4">
                  {selectedCandidate ? (
                    <>
                      <Panel>
                        <div className="flex items-start justify-between gap-2">
                          <span className="grid size-14 place-items-center rounded-full bg-[#e8f6ee] text-base font-semibold text-[#147a48]">
                            {initials(selectedCandidate.name || selectedCandidate.email)}
                          </span>
                          {selectedCandidate.onboarded ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-xs font-medium text-[#147a48]">
                              <Check className="size-3.5" />
                              Onboarded
                            </span>
                          ) : (
                            <StatusDot status={selectedCandidate.status} />
                          )}
                        </div>
                        <p className="mt-3 font-medium">{selectedCandidate.name}</p>
                        <p className="text-sm text-[#8a918c]">{handleFromEmail(selectedCandidate.email)}</p>
                        <p className="mt-1 text-sm text-[#5c635f]">{selectedCandidate.headline || 'Candidate'}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#8a918c]">
                          <MapPin className="size-3.5" />
                          {placeLabel(selectedCandidate.city, selectedCandidate.country) || 'Location not set'}
                        </p>
                        <Button className="mt-4 w-full" type="button" onClick={() => go('packets')}>
                          View packets
                        </Button>
                        <Button variant="outline" className="mt-2 w-full" type="button" onClick={() => go('inbox')}>
                          Message
                        </Button>
                        <Button variant="outline" className="mt-2 w-full" type="button" onClick={() => void navigator.clipboard.writeText(selectedCandidate.email)}>
                          Copy email
                        </Button>
                      </Panel>
                      <Panel>
                        <h2 className="font-sans text-base font-semibold">Skills</h2>
                        <div className="mt-3">
                          <SkillPills skills={selectedCandidate.skills} all />
                        </div>
                      </Panel>
                      <Panel>
                        <h2 className="font-sans text-base font-semibold">About</h2>
                        <p className="mt-2 text-sm leading-relaxed text-[#5c635f]">
                          {selectedCandidate.headline || 'No profile headline yet.'}
                        </p>
                      </Panel>
                      <Panel>
                        <h2 className="font-sans text-base font-semibold">Account</h2>
                        <dl className="mt-3 space-y-3 text-sm">
                          <OverviewRow label="Email" value={selectedCandidate.email} />
                          <OverviewRow label="Location" value={placeLabel(selectedCandidate.city, selectedCandidate.country) || '—'} />
                          <OverviewRow label="Joined" value={day(selectedCandidate.joinedAt)} />
                          <OverviewRow label="Packets" value={String(selectedCandidate.packets)} />
                          <OverviewRow label="Hired" value={String(selectedCandidate.hired)} />
                          <OverviewRow label="Tracker" value={formatHoursMinutes(selectedCandidate.hours)} />
                        </dl>
                      </Panel>
                      {candidatePackets.length ? (
                        <Panel>
                          <h2 className="font-sans text-base font-semibold">Recent packets</h2>
                          <ul className="mt-3 space-y-2 text-sm">
                            {candidatePackets.slice(0, 4).map((row) => (
                              <li key={row.id} className="rounded-xl bg-[#f7f8f7] px-3 py-2">
                                <p className="font-medium">{row.jobTitle}</p>
                                <p className="text-xs text-[#8a918c]">
                                  {row.company} · {prettyStatus(row.status)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </Panel>
                      ) : null}
                    </>
                  ) : (
                    <Panel>
                      <p className="text-sm text-[#8a918c]">Select a candidate to see their profile.</p>
                    </Panel>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {view === 'employers' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Employers</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Employers</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Manage hiring accounts, posted jobs, and pay on Atelier.</p>
                </div>
                <Button type="button" onClick={() => go('invite')}>
                  <Plus className="size-4" />
                  Add Employer
                </Button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_18rem]">
                <EmployerStat icon={Building2} color="#14a35a" label="Total Employers" value={employerStats.total} delta={employerStats.totalDelta} />
                <EmployerStat icon={User} color="#22c55e" label="Active Employers" value={employerStats.active} delta={employerStats.activeDelta} />
                <EmployerStat icon={UserPlus} color="#3b82f6" label="New Employers" value={employerStats.fresh} delta={employerStats.newDelta} />
                <EmployerStat icon={Lock} color="#8a918c" label="Pending Employers" value={employerStats.pending} delta={employerStats.pendingDelta} />
                {selectedEmployer ? (
                  <section className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#e8f6ee] text-sm font-semibold text-[#147a48]">
                        {initials(selectedEmployer.company || selectedEmployer.name)}
                      </span>
                      <StatusDot status={selectedEmployer.status} />
                    </div>
                    <p className="mt-3 font-medium">{selectedEmployer.company}</p>
                    <p className="truncate text-sm text-[#5c635f]">{selectedEmployer.email}</p>
                    <p className="mt-1 text-xs text-[#8a918c]">
                      {[selectedEmployer.city, selectedEmployer.country].filter(Boolean).join(', ') || 'Location not set'}
                    </p>
                    <p className="mt-1 text-xs text-[#8a918c]">Joined {day(selectedEmployer.joinedAt)}</p>
                    {selectedEmployer.website ? (
                      <a href={selectedEmployer.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-[#147a48]">
                        View website <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm text-[#147a48]" onClick={() => go('invite')}>
                        Invite to hire <ExternalLink className="size-3.5" />
                      </button>
                    )}
                  </section>
                ) : (
                  <section className="rounded-2xl bg-white p-4 text-sm text-[#8a918c] shadow-[0_1px_2px_rgba(19,38,31,0.06)]">No employers yet.</section>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search employers by name, email, or company"
                    value={employerQuery}
                    onChange={(e) => {
                      setEmployerQuery(e.target.value)
                      setEmployerPage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={employerStatus}
                  onChange={(e) => {
                    setEmployerStatus(e.target.value as typeof employerStatus)
                    setEmployerPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={employerIndustry}
                  onChange={(e) => {
                    setEmployerIndustry(e.target.value)
                    setEmployerPage(0)
                  }}
                >
                  <option value="all">All industries</option>
                  {employerIndustries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <Button variant="outline" type="button" onClick={exportEmployers}>
                  <Download className="size-4" />
                  Export
                </Button>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Employer</th>
                          <th className="px-3 py-3 font-medium">Company</th>
                          <th className="px-3 py-3 font-medium">Industry</th>
                          <th className="px-3 py-3 font-medium">Paid out</th>
                          <th className="px-3 py-3 font-medium">Jobs</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Joined</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employerSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedEmployer?.id === row.id ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedEmployer(row.id)
                              setEmployerTab('overview')
                            }}
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.company || row.name)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.name}</span>
                                  <span className="block text-xs text-[#8a918c]">{row.email}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">{row.company}</td>
                            <td className="px-3 py-3 text-[#5c635f]">{row.industry || '—'}</td>
                            <td className="px-3 py-3">{money(row.spent)}</td>
                            <td className="px-3 py-3">{row.jobs}</td>
                            <td className="px-3 py-3">
                              <StatusDot status={row.status} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{day(row.joinedAt)}</td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full hover:bg-white"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPickedEmployer(row.id)
                                  setStaffMenu(staffMenu === row.id ? '' : row.id)
                                }}
                              >
                                <MoreHorizontal className="size-4 text-[#8a918c]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!employerSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No employers match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {employerRows.length ? employerPageSafe * pageSize + 1 : 0}-{Math.min(employerRows.length, employerPageSafe * pageSize + pageSize)} of {employerRows.length} employers
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: employerPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEmployerPage(i)}
                          className={`grid size-7 place-items-center rounded-md ${employerPageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel>
                    <div className="flex gap-3 border-b border-[#eef1ee] text-sm">
                      {(['overview', 'jobs', 'packets'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setEmployerTab(tab)}
                          className={`-mb-px border-b-2 pb-2 capitalize ${employerTab === tab ? 'border-[#14a35a] font-medium text-[#161c19]' : 'border-transparent text-[#8a918c]'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    {selectedEmployer && employerTab === 'overview' ? (
                      <dl className="mt-4 space-y-3 text-sm">
                        <OverviewRow label="Paid out" value={money(selectedEmployer.spent)} />
                        <OverviewRow label="Active jobs" value={String(selectedEmployer.jobs)} />
                        <OverviewRow label="Packets" value={String(selectedEmployer.packets)} />
                        <OverviewRow label="Hired" value={String(selectedEmployer.hired)} />
                        <OverviewRow label="Industry" value={selectedEmployer.industry || '—'} />
                      </dl>
                    ) : null}
                    {employerTab === 'jobs' ? (
                      <ul className="mt-4 space-y-2 text-sm">
                        {employerJobs.map((row) => (
                          <li key={row.id} className="rounded-xl bg-[#f7f8f7] px-3 py-2">
                            <p className="font-medium">{row.title}</p>
                            <p className="text-xs text-[#8a918c]">{row.postedAt || 'Open'}</p>
                          </li>
                        ))}
                        {!employerJobs.length ? <li className="text-[#8a918c]">No Atelier jobs posted yet.</li> : null}
                      </ul>
                    ) : null}
                    {employerTab === 'packets' ? (
                      <ul className="mt-4 space-y-2 text-sm">
                        {employerPackets.map((row) => (
                          <li key={row.id} className="rounded-xl bg-[#f7f8f7] px-3 py-2">
                            <p className="font-medium">{row.candidate}</p>
                            <p className="text-xs text-[#8a918c]">
                              {row.jobTitle} · {prettyStatus(row.status)}
                            </p>
                          </li>
                        ))}
                        {!employerPackets.length ? <li className="text-[#8a918c]">No packets in this inbox yet.</li> : null}
                      </ul>
                    ) : null}
                  </Panel>
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">Actions</h2>
                    <div className="mt-2 divide-y divide-[#eef1ee]">
                      <QuickRow icon={Mail} label="Copy email" onClick={() => selectedEmployer && void navigator.clipboard.writeText(selectedEmployer.email)} />
                      <QuickRow icon={UserPlus} label="Invite this company" onClick={() => go('invite')} />
                      <QuickRow icon={Briefcase} label="View jobs" onClick={() => go('listings')} />
                      <QuickRow icon={Wallet} label="Open finances" onClick={() => go('finances')} />
                      <QuickRow icon={FileText} label="Review packets" onClick={() => go('packets')} />
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          ) : null}

          {view === 'people' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Users</h2>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(['all', 'admin', 'super_admin', 'employer', 'candidate'] as const).map((role) => (
                  <Chip key={role} active={peopleRole === role} onClick={() => setPeopleRole(role)} label={role === 'all' ? 'All' : role.replace('_', ' ')} />
                ))}
              </div>
              <div className="mt-4 divide-y divide-[#eef1ee]">
                {people.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-10 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                      {initials(row.name || row.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="truncate text-sm text-[#8a918c]">{row.email}</p>
                    </div>
                    <span className="rounded-full bg-[#f3f5f4] px-2.5 py-0.5 text-xs capitalize">{row.role.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {view === 'listings' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Jobs</h2>
              <DeskTable
                columns={['Job Title', 'Company', 'Board', 'Posted', 'Status']}
                rows={searchListings.map((row) => [row.title, row.company, sourceLabel(row.source), row.postedAt || '—', row.atelier ? 'Atelier' : 'Open'])}
                empty="No jobs match this search."
              />
            </Panel>
          ) : null}

          {view === 'packets' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Packets</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Packets</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Review packets candidates approved. They leave only after that send.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                    <Calendar className="size-4" />
                    Last 30 days
                  </span>
                  <Button variant="outline" type="button" onClick={exportPackets}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <EmployerStat icon={FileText} color="#14a35a" label="Total Packets" value={packetStats.total} delta={packetStats.totalDelta} />
                <EmployerStat icon={Send} color="#3b82f6" label="Pending review" value={packetStats.pending} delta={packetStats.pendingDelta} />
                <EmployerStat icon={Check} color="#22c55e" label="Hired / offer" value={packetStats.accepted} delta={packetStats.acceptedDelta} />
                <EmployerStat icon={X} color="#ef4444" label="Declined" value={packetStats.declined} delta={packetStats.declinedDelta} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search packets by candidate, role, or company"
                    value={packetQuery}
                    onChange={(e) => {
                      setPacketQuery(e.target.value)
                      setPacketPage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={packetStatus}
                  onChange={(e) => {
                    setPacketStatus(e.target.value as typeof packetStatus)
                    setPacketPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Hired / offer</option>
                  <option value="declined">Declined</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={packetCompany}
                  onChange={(e) => {
                    setPacketCompany(e.target.value)
                    setPacketPage(0)
                  }}
                >
                  <option value="all">All employers</option>
                  {packetCompanies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`grid gap-5 ${packetOpen && selectedPacket ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Candidate</th>
                          <th className="px-3 py-3 font-medium">Role</th>
                          <th className="px-3 py-3 font-medium">Employer</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Submitted</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packetSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedPacket?.id === row.id && packetOpen ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedPacket(row.id)
                              setPacketOpen(true)
                            }}
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.candidate)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.candidate}</span>
                                  <span className="block text-xs text-[#8a918c]">{row.candidateEmail || '—'}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">{row.jobTitle}</p>
                              <p className="text-xs text-[#8a918c]">{row.atelier ? 'Atelier' : row.channel || 'Open listing'}</p>
                            </td>
                            <td className="px-3 py-3">{row.company || '—'}</td>
                            <td className="px-3 py-3">
                              <PacketDot status={row.status} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{ago(row.submittedAt || row.createdAt)}</td>
                            <td className="px-3 py-3">
                              <MoreHorizontal className="size-4 text-[#8a918c]" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!packetSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No packets match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {packets.length ? packetPageSafe * 10 + 1 : 0}-{Math.min(packets.length, packetPageSafe * 10 + 10)} of {packets.length} packets
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: packetPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPacketPage(i)}
                          className={`grid size-7 place-items-center rounded-md ${packetPageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                {packetOpen && selectedPacket ? (
                  <Panel>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-sans text-base font-semibold">Packet details</h2>
                      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={() => setPacketOpen(false)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                        {initials(selectedPacket.candidate)}
                      </span>
                      <div>
                        <p className="font-medium">{selectedPacket.candidate}</p>
                        <p className="text-sm text-[#5c635f]">{selectedPacket.candidateEmail || 'No email'}</p>
                      </div>
                    </div>
                    <Button className="mt-4 w-full" type="button" onClick={() => selectedPacket && openCandidate(selectedPacket.candidateEmail)}>
                      View candidate
                    </Button>
                    <div className="mt-5 space-y-3 text-sm">
                      <p className="font-medium">{selectedPacket.jobTitle}</p>
                      <p className="text-[#5c635f]">{selectedPacket.company || '—'}</p>
                      <p className="text-xs text-[#8a918c]">
                        {selectedPacket.location || (selectedPacket.atelier ? 'Atelier listing' : 'Open listing')}
                        {selectedPacket.postedAt ? ` · posted ${day(selectedPacket.postedAt)}` : ''}
                      </p>
                    </div>
                    <div className="mt-5 space-y-2 text-sm">
                      <OverviewRow label="Submitted" value={ago(selectedPacket.submittedAt || selectedPacket.createdAt)} />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#8a918c]">Status</span>
                        <PacketDot status={selectedPacket.status} />
                      </div>
                    </div>
                    {selectedPacket.coverLetter ? (
                      <div className="mt-5">
                        <p className="text-sm font-medium">Cover letter</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#5c635f]">{selectedPacket.coverLetter}</p>
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-[#8a918c]">No cover letter on this packet yet.</p>
                    )}
                    {setPacket.isError ? (
                      <p className="mt-3 text-sm text-[#b85c38]">{setPacket.error instanceof Error ? setPacket.error.message : 'Could not update the packet.'}</p>
                    ) : null}
                    <div className="mt-5 space-y-2">
                      <Button
                        className="w-full"
                        type="button"
                        disabled={setPacket.isPending || packetBucket(selectedPacket.status) === 'accepted'}
                        onClick={() => setPacket.mutate({ id: selectedPacket.id, status: 'hired' })}
                      >
                        Mark hired
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-[#ef4444] text-[#b91c1c] hover:bg-[#fef2f2]"
                        type="button"
                        disabled={setPacket.isPending || packetBucket(selectedPacket.status) === 'declined'}
                        onClick={() => setPacket.mutate({ id: selectedPacket.id, status: 'rejected' })}
                      >
                        Decline packet
                      </Button>
                      <Button variant="outline" className="w-full" type="button" onClick={() => go('inbox')}>
                        <MessagesSquare className="size-4" />
                        Open inbox
                      </Button>
                    </div>
                  </Panel>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === 'contracts' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Contracts</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Contracts</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Hired roles on Atelier — tracker hours and employer pay stay here.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                    <Calendar className="size-4" />
                    {monthRange}
                  </span>
                  <Button variant="outline" type="button" onClick={exportContracts}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <EmployerStat icon={FileSignature} color="#14a35a" label="Total contracts" value={contractStats.total} delta={contractStats.totalDelta} />
                <EmployerStat icon={CirclePlay} color="#22c55e" label="Active contracts" value={contractStats.active} delta={contractStats.activeDelta} />
                <EmployerStat icon={Check} color="#16a34a" label="Completed" value={contractStats.completed} delta={contractStats.completedDelta} />
                <EmployerStat icon={Pause} color="#ef4444" label="Cancelled" value={contractStats.cancelled} delta={contractStats.cancelledDelta} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search by role, candidate, or employer"
                    value={contractQuery}
                    onChange={(e) => {
                      setContractQuery(e.target.value)
                      setContractPage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={contractPhase}
                  onChange={(e) => {
                    setContractPhase(e.target.value as typeof contractPhase)
                    setContractPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={contractType}
                  onChange={(e) => {
                    setContractType(e.target.value)
                    setContractPage(0)
                  }}
                >
                  <option value="all">All types</option>
                  {contractTypes.map((item) => (
                    <option key={item} value={item}>
                      {prettyContractType(item)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={contractCompany}
                  onChange={(e) => {
                    setContractCompany(e.target.value)
                    setContractPage(0)
                  }}
                >
                  <option value="all">All employers</option>
                  {contractCompanies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`grid gap-5 ${contractOpen && selectedContract ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[58rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-3 py-3 font-medium">Candidate</th>
                          <th className="px-3 py-3 font-medium">Employer</th>
                          <th className="px-3 py-3 font-medium">Type</th>
                          <th className="px-3 py-3 font-medium">Amount</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Start</th>
                          <th className="px-3 py-3 font-medium">End</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedContract?.id === row.id && contractOpen ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedContract(row.id)
                              setContractOpen(true)
                            }}
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium">{row.title}</p>
                              <p className="text-xs text-[#8a918c]">{row.live ? 'Clock live' : formatHoursMinutes(row.hours)}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.candidate)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.candidate}</span>
                                  <span className="block text-xs text-[#8a918c]">{row.candidateEmail || '—'}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">{row.company || '—'}</td>
                            <td className="px-3 py-3 text-[#5c635f]">{prettyContractType(row.type)}</td>
                            <td className="px-3 py-3 tabular-nums">{row.amount ? money(row.amount, data?.finance?.currency) : '—'}</td>
                            <td className="px-3 py-3">
                              <ContractDot phase={row.phase} />
                            </td>
                            <td className="px-3 py-3 text-[#5c635f]">{day(row.startedAt)}</td>
                            <td className="px-3 py-3 text-[#5c635f]">{row.endedAt ? day(row.endedAt) : '—'}</td>
                            <td className="px-3 py-3">
                              <MoreHorizontal className="size-4 text-[#8a918c]" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!contractSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No hired roles match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {contractRows.length ? contractPageSafe * 10 + 1 : 0}-{Math.min(contractRows.length, contractPageSafe * 10 + 10)} of {contractRows.length} contracts
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: contractPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setContractPage(i)}
                          className={`grid size-7 place-items-center rounded-md ${contractPageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                {contractOpen && selectedContract ? (
                  <Panel>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#8a918c]">Contract details</p>
                        <h2 className="mt-1 font-sans text-base font-semibold">{selectedContract.title}</h2>
                      </div>
                      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={() => setContractOpen(false)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3">
                      <ContractDot phase={selectedContract.phase} />
                    </div>
                    <p className="mt-2 text-sm text-[#5c635f]">{selectedContract.company || '—'}</p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-full bg-[#e8f6ee] text-sm font-medium text-[#147a48]">
                        {initials(selectedContract.candidate)}
                      </span>
                      <div>
                        <p className="font-medium">{selectedContract.candidate}</p>
                        <p className="text-sm text-[#5c635f]">{selectedContract.candidateEmail || 'No email'}</p>
                      </div>
                    </div>
                    <Button className="mt-4 w-full" type="button" onClick={() => selectedContract && openCandidate(selectedContract.candidateEmail)}>
                      View candidate
                    </Button>
                    <div className="mt-5 space-y-2 text-sm">
                      <OverviewRow label="Contract ID" value={shortContractId(selectedContract.id)} />
                      <OverviewRow label="Type" value={prettyContractType(selectedContract.type)} />
                      <OverviewRow label="Amount" value={selectedContract.amount ? money(selectedContract.amount, data?.finance?.currency) : '—'} />
                      <OverviewRow label="Hours" value={formatHoursMinutes(selectedContract.hours)} />
                      <OverviewRow label="Start" value={day(selectedContract.startedAt)} />
                      <OverviewRow label="End" value={selectedContract.endedAt ? day(selectedContract.endedAt) : '—'} />
                      <OverviewRow label="Pay entries" value={`${selectedContract.payDone}/${Math.max(selectedContract.payCount, 1)}`} />
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Recent activity</p>
                        <button type="button" className="text-xs font-medium text-[#147a48]" onClick={() => go('inbox')}>
                          View all
                        </button>
                      </div>
                      <ul className="mt-3 space-y-3">
                        {selectedContract.activity.map((row) => (
                          <li key={row.id} className="flex gap-2 text-sm">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#22c55e]" />
                            <div>
                              <p className="text-[#161c19]">{row.body || 'Studio message'}</p>
                              <p className="mt-0.5 text-xs capitalize text-[#8a918c]">
                                {row.senderRole || 'studio'} · {ago(row.at)}
                              </p>
                            </div>
                          </li>
                        ))}
                        {!selectedContract.activity.length ? (
                          <li className="text-sm text-[#8a918c]">
                            {selectedContract.live ? 'Clock is live on this role.' : 'No studio messages on this hire yet.'}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                    {setPacket.isError ? (
                      <p className="mt-3 text-sm text-[#b85c38]">{setPacket.error instanceof Error ? setPacket.error.message : 'Could not update the contract.'}</p>
                    ) : null}
                    <div className="mt-5 space-y-2">
                      <Button className="w-full" type="button" onClick={() => go('tracker')}>
                        <Timer className="size-4" />
                        Open tracker
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        disabled={setPacket.isPending || selectedContract.phase === 'completed' || selectedContract.phase === 'cancelled'}
                        onClick={() => setPacket.mutate({ id: selectedContract.id, status: 'completed' })}
                      >
                        Mark complete
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-[#ef4444] text-[#b91c1c] hover:bg-[#fef2f2]"
                        type="button"
                        disabled={setPacket.isPending || selectedContract.phase === 'cancelled'}
                        onClick={() => setPacket.mutate({ id: selectedContract.id, status: 'rejected' })}
                      >
                        End contract
                      </Button>
                    </div>
                  </Panel>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === 'tracker' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard icon={Timer} tone="green" label="Hours logged" value={formatHoursMinutes(data?.tracker?.hours ?? 0)} hint="Across hired roles" />
                <MetricCard icon={Timer} tone="teal" label="Live clocks" value={data?.tracker?.live ?? 0} hint="Running now" />
                <MetricCard icon={Briefcase} tone="gold" label="Hired roles" value={counts?.hired ?? 0} hint="Tracker opens after hire" />
              </div>
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Atelier time tracker</h2>
                <p className="mt-1 text-sm text-[#5c635f]">Hours candidates log after an Atelier hire. Outside boards never see this clock.</p>
                <DeskTable
                  columns={['Candidate', 'Role', 'Company', 'Time', 'State']}
                  rows={sessions.map((row) => [
                    row.candidate,
                    row.jobTitle,
                    row.company,
                    formatHoursMinutes(row.seconds),
                    row.live ? 'Live' : 'Stopped',
                  ])}
                  empty="No tracker sessions yet."
                />
              </Panel>
            </div>
          ) : null}

          {view === 'inbox' ? (
            <Panel>
              <h2 className="font-sans text-lg font-semibold">Inbox</h2>
              <p className="mt-1 text-sm text-[#5c635f]">
                {counts?.messages ?? 0} messages across {data?.inbox?.threads ?? 0} recent threads. Studio chat opens after a packet is sent.
              </p>
              <ul className="mt-5 divide-y divide-[#eef1ee]">
                {messages.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="text-xs capitalize text-[#8a918c]">
                      {row.senderRole || 'studio'} · {day(row.at)}
                    </p>
                    <p className="mt-1 text-sm text-[#161c19]">{row.body || '—'}</p>
                  </li>
                ))}
                {!messages.length ? <li className="py-6 text-sm text-[#8a918c]">No studio messages yet.</li> : null}
              </ul>
            </Panel>
          ) : null}

          {view === 'finances' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Payments</span>
                  </p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold tracking-tight text-[#161c19]">Payments</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Employer pay and candidate withdrawals stay on Atelier. Outside boards are not involved.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4e8e5] bg-white px-3 py-2 text-sm text-[#5c635f]">
                    <Calendar className="size-4" />
                    {monthRange}
                  </span>
                  <Button variant="outline" type="button" onClick={exportPayments}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MoneyStat icon={DollarSign} color="#14a35a" label="Total volume" value={data?.finance?.received ?? 0} currency={data?.finance?.currency} delta={payStats.receivedDelta} />
                <MoneyStat icon={Clock} color="#3b82f6" label="Pending" value={data?.finance?.pending ?? 0} currency={data?.finance?.currency} delta={payStats.pendingDelta} />
                <MoneyStat icon={ArrowDownToLine} color="#8b5cf6" label="Candidate payouts" value={data?.finance?.withdrawn ?? 0} currency={data?.finance?.currency} delta={payStats.withdrawnDelta} />
                <MoneyStat icon={Building2} color="#14a35a" label="Available" value={data?.finance?.available ?? 0} currency={data?.finance?.currency} delta={payStats.availableDelta} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.75fr)]">
                <Panel>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-sans text-base font-semibold">Payment volume</h2>
                    <div className="flex rounded-lg border border-[#e4e8e5] p-0.5 text-xs">
                      {(['7D', '30D', '3M', '1Y'] as const).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setRange(id)
                            setPayPage(0)
                          }}
                          className={`rounded-md px-2.5 py-1 ${range === id ? 'bg-[#13261f] text-white' : 'text-[#5c635f]'}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PayVolumeChart points={payVolume} currency={data?.finance?.currency} />
                </Panel>
                <Panel>
                  <h2 className="font-sans text-base font-semibold">Pay mix</h2>
                  <PayMixChart
                    segs={payMix}
                    total={data?.finance?.received ?? 0}
                    currency={data?.finance?.currency}
                  />
                </Panel>
              </div>

              <div className="flex flex-wrap gap-5 border-b border-[#e4e8e5] text-sm">
                {(
                  [
                    ['all', 'All transactions'],
                    ['employer', 'Employer pay'],
                    ['payout', 'Candidate payouts'],
                    ['pending', 'Pending'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`-mb-px border-b-2 pb-2 ${payTab === id ? 'border-[#13261f] font-medium text-[#161c19]' : 'border-transparent text-[#8a918c]'}`}
                    onClick={() => {
                      setPayTab(id)
                      setPayPage(0)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search by employer, candidate, role, or id"
                    value={payQuery}
                    onChange={(e) => {
                      setPayQuery(e.target.value)
                      setPayPage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={payKind}
                  onChange={(e) => {
                    setPayKind(e.target.value as typeof payKind)
                    setPayPage(0)
                  }}
                >
                  <option value="all">All types</option>
                  <option value="from_employer">Employer pay</option>
                  <option value="withdraw">Candidate payout</option>
                </select>
                <select
                  className="h-10 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm"
                  value={payStatus}
                  onChange={(e) => {
                    setPayStatus(e.target.value as typeof payStatus)
                    setPayPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="available">Available</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className={`grid gap-5 ${payOpen && selectedPay ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[58rem] text-left text-sm">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-3 py-3 font-medium">Transaction ID</th>
                          <th className="px-3 py-3 font-medium">Type</th>
                          <th className="px-3 py-3 font-medium">From / To</th>
                          <th className="px-3 py-3 font-medium">Amount</th>
                          <th className="px-3 py-3 font-medium">Method</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paySlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedPay?.id === row.id && payOpen ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedPay(row.id)
                              setPayOpen(true)
                            }}
                          >
                            <td className="px-4 py-3 text-[#5c635f]">{when(row.createdAt)}</td>
                            <td className="px-3 py-3 font-medium tabular-nums">{shortPayId(row.id)}</td>
                            <td className="px-3 py-3">
                              <PayKindChip kind={row.kind} />
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">{row.kind === 'withdraw' ? row.candidate : row.company || row.candidate}</p>
                              <p className="text-xs text-[#8a918c]">{row.jobTitle || '—'}</p>
                            </td>
                            <td className="px-3 py-3 tabular-nums">{money(row.amount, data?.finance?.currency)}</td>
                            <td className="px-3 py-3 text-[#5c635f]">Atelier ledger</td>
                            <td className="px-3 py-3">
                              <PayDot status={row.status} />
                            </td>
                            <td className="px-3 py-3">
                              <MoreHorizontal className="size-4 text-[#8a918c]" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!paySlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No payments match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {ledger.length ? payPageSafe * 10 + 1 : 0}-{Math.min(ledger.length, payPageSafe * 10 + 10)} of {ledger.length} transactions
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: payPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPayPage(i)}
                          className={`grid size-7 place-items-center rounded-md ${payPageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                {payOpen && selectedPay ? (
                  <Panel>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#8a918c]">Transaction details</p>
                        <h2 className="mt-1 font-sans text-base font-semibold">{payKindLabel(selectedPay.kind)}</h2>
                      </div>
                      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={() => setPayOpen(false)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <PayDot status={selectedPay.status} />
                      <p className="text-xs text-[#8a918c]">{when(selectedPay.createdAt)}</p>
                    </div>
                    <div className="mt-5 space-y-2 text-sm">
                      <OverviewRow label="Transaction ID" value={shortPayId(selectedPay.id)} />
                      <OverviewRow label="Type" value={payKindLabel(selectedPay.kind)} />
                      <OverviewRow label="Amount" value={money(selectedPay.amount, data?.finance?.currency)} />
                      <OverviewRow label="Method" value="Atelier ledger" />
                    </div>
                    <div className="mt-5 rounded-xl bg-[#f7f8f7] p-3">
                      <p className="text-xs text-[#8a918c]">{selectedPay.kind === 'withdraw' ? 'Candidate' : 'Employer'}</p>
                      <p className="mt-1 font-medium">{selectedPay.kind === 'withdraw' ? selectedPay.candidate : selectedPay.company || selectedPay.candidate}</p>
                      <p className="text-sm text-[#5c635f]">
                        {selectedPay.kind === 'withdraw' ? selectedPay.candidateEmail || '—' : selectedPay.employerName || selectedPay.candidateEmail || '—'}
                      </p>
                    </div>
                    <div className="mt-5 space-y-2 text-sm">
                      <OverviewRow label="Related role" value={selectedPay.jobTitle || '—'} />
                      <OverviewRow label="Status" value={prettyStatus(selectedPay.status)} />
                    </div>
                    {selectedPay.note ? (
                      <div className="mt-5">
                        <p className="text-sm font-medium">Notes</p>
                        <p className="mt-2 text-sm leading-relaxed text-[#5c635f]">{selectedPay.note}</p>
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-[#8a918c]">No note on this ledger row.</p>
                    )}
                    <div className="mt-5">
                      <p className="text-sm font-medium">Timeline</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        <li className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#22c55e]" />
                          <span>
                            Recorded on Atelier
                            <span className="mt-0.5 block text-xs text-[#8a918c]">{when(selectedPay.createdAt)}</span>
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${selectedPay.status === 'failed' ? 'bg-[#ef4444]' : 'bg-[#22c55e]'}`} />
                          <span>{payTimeline(selectedPay.status)}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-5 space-y-2">
                      <Button
                        className="w-full"
                        type="button"
                        disabled={!selectedPay.applicationId}
                        onClick={() => {
                          if (!selectedPay.applicationId) return
                          setPickedContract(selectedPay.applicationId)
                          go('contracts')
                        }}
                      >
                        View contract
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => {
                          const hit = (data?.employers ?? []).find((row) => row.company.trim().toLowerCase() === selectedPay.company.trim().toLowerCase())
                          if (hit) setPickedEmployer(hit.id)
                          go(selectedPay.kind === 'withdraw' ? 'people' : 'employers', selectedPay.kind === 'withdraw' ? 'candidate' : 'all')
                        }}
                      >
                        {selectedPay.kind === 'withdraw' ? 'View candidate' : 'View employer'}
                      </Button>
                    </div>
                  </Panel>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === 'reports' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} tone="green" label="People" value={counts?.people ?? 0} hint={`${counts?.candidates ?? 0} candidates`} />
                <MetricCard icon={FileText} tone="teal" label="Packets" value={counts?.packets ?? 0} hint={`${counts?.hired ?? 0} hired`} />
                <MetricCard icon={Timer} tone="gold" label="Tracker" value={formatHoursMinutes(counts?.trackerHours ?? 0)} hint={`${counts?.liveClocks ?? 0} live`} />
                <MetricCard icon={Wallet} tone="blue" label="Received" value={money(counts?.financeReceived ?? 0)} hint="Pay on Atelier" />
              </div>
              <Panel>
                <h2 className="font-sans text-lg font-semibold">Listings by board</h2>
                <DeskTable
                  columns={['Board', 'Listings']}
                  rows={(data?.boards ?? []).map((row) => [sourceLabel(row.source), String(row.count)])}
                  empty="No board mix yet."
                />
              </Panel>
            </div>
          ) : null}

          {view === 'keys' ? (
            <Panel className="max-w-xl">
              <h2 className="font-sans text-lg font-semibold">Settings</h2>
              <p className="mt-2 text-sm text-[#5c635f]">Promote staff in Supabase. Signup cannot grant admin.</p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#13261f] p-4 text-xs text-white/80">{sql}</pre>
              <Button variant="outline" className="mt-3" type="button" onClick={copySql}>
                {copied ? 'Copied' : 'Copy SQL'}
              </Button>
            </Panel>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function SideRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
        active ? 'bg-[#147a48] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(19,38,31,0.06)]', className)}>{children}</section>
}

function EmployerStat({
  icon: Icon,
  label,
  value,
  delta,
  color,
}: {
  icon: LucideIcon
  label: string
  value: number
  delta: number
  color: string
}) {
  const up = delta >= 0
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full" style={{ background: `${color}1a`, color }}>
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          <p className={`mt-1 text-xs ${up ? 'text-[#14a35a]' : 'text-[#b85c38]'}`}>
            {up ? '+' : ''}
            {delta}% vs last 30 days
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: 'active' | 'pending' | 'suspended' }) {
  const map = {
    active: { label: 'Active', className: 'bg-[#d1fae5] text-[#047857]', dot: '#22c55e' },
    pending: { label: 'Pending', className: 'bg-[#fef3c7] text-[#b45309]', dot: '#f59e0b' },
    suspended: { label: 'Suspended', className: 'bg-[#fee2e2] text-[#b91c1c]', dot: '#ef4444' },
  }
  const row = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${row.className}`}>
      <span className="size-1.5 rounded-full" style={{ background: row.dot }} />
      {row.label}
    </span>
  )
}

function packetBucket(status: string): PacketBucket {
  if (status === 'offer' || status === 'hired' || status === 'completed') return 'accepted'
  if (status === 'rejected' || status === 'withdrawn' || status === 'closed') return 'declined'
  if (status === 'draft') return 'draft'
  return 'pending'
}

function prettyContractType(type: string) {
  if (type === 'hourly') return 'Hourly'
  if (type === 'milestone') return 'Milestone'
  if (type === 'role') return 'Hired role'
  return prettyStatus(type)
}

function shortContractId(id: string) {
  return `#${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

function ContractDot({ phase }: { phase: ContractPhase }) {
  const map = {
    active: { label: 'Active', className: 'bg-[#d1fae5] text-[#047857]', dot: '#22c55e' },
    progress: { label: 'In progress', className: 'bg-[#dbeafe] text-[#1d4ed8]', dot: '#3b82f6' },
    completed: { label: 'Completed', className: 'bg-[#e8f6ee] text-[#147a48]', dot: '#16a34a' },
    cancelled: { label: 'Cancelled', className: 'bg-[#fee2e2] text-[#b91c1c]', dot: '#ef4444' },
  }
  const row = map[phase]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${row.className}`}>
      <span className="size-1.5 rounded-full" style={{ background: row.dot }} />
      {row.label}
    </span>
  )
}

function rangeMs(range: '7D' | '30D' | '3M' | '1Y') {
  if (range === '7D') return 7 * 86_400_000
  if (range === '30D') return 30 * 86_400_000
  if (range === '3M') return 90 * 86_400_000
  return 365 * 86_400_000
}

function localDateKey(ms: number) {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function payKindLabel(kind: string) {
  return kind === 'withdraw' ? 'Candidate payout' : 'Employer pay'
}

function shortPayId(id: string) {
  return `PAY-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

function payTimeline(status: string) {
  if (status === 'pending') return 'Waiting to become available'
  if (status === 'available') return 'Ready for candidate withdraw'
  if (status === 'sent') return 'Sent to the candidate'
  if (status === 'failed') return 'This payout failed'
  return prettyStatus(status)
}

function when(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function PayKindChip({ kind }: { kind: string }) {
  const payout = kind === 'withdraw'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${payout ? 'bg-[#ede9fe] text-[#6d28d9]' : 'bg-[#d1fae5] text-[#047857]'}`}>
      {payKindLabel(kind)}
    </span>
  )
}

function PayDot({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; dot: string }> = {
    pending: { label: 'Pending', className: 'bg-[#fef3c7] text-[#b45309]', dot: '#f59e0b' },
    available: { label: 'Available', className: 'bg-[#dbeafe] text-[#1d4ed8]', dot: '#3b82f6' },
    sent: { label: 'Sent', className: 'bg-[#d1fae5] text-[#047857]', dot: '#22c55e' },
    failed: { label: 'Failed', className: 'bg-[#fee2e2] text-[#b91c1c]', dot: '#ef4444' },
  }
  const row = map[status] ?? { label: prettyStatus(status), className: 'bg-[#eef1ee] text-[#5c635f]', dot: '#8a918c' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${row.className}`}>
      <span className="size-1.5 rounded-full" style={{ background: row.dot }} />
      {row.label}
    </span>
  )
}

function MoneyStat({
  icon: Icon,
  label,
  value,
  delta,
  color,
  currency,
}: {
  icon: LucideIcon
  label: string
  value: number
  delta: number
  color: string
  currency?: string
}) {
  const up = delta >= 0
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full" style={{ background: `${color}1a`, color }}>
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{money(value, currency)}</p>
          <p className={`mt-1 text-xs ${up ? 'text-[#14a35a]' : 'text-[#b85c38]'}`}>
            {up ? '+' : ''}
            {delta}% vs last 30 days
          </p>
        </div>
      </div>
    </div>
  )
}

function PayVolumeChart({ points, currency }: { points: { date: string; amount: number }[]; currency?: string }) {
  const max = Math.max(1, ...points.map((p) => p.amount))
  const w = 640
  const h = 200
  const pad = 28
  const pts = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1)
    const y = h - pad - (p.amount / max) * (h - pad * 2)
    return { x, y }
  })
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = pts.length ? `${pad},${h - pad} ${line} ${w - pad},${h - pad}` : ''
  const ticks = [0, Math.round(max / 2), max]
  const first = points[0]?.date
  const last = points.at(-1)?.date
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" role="img" aria-label="Employer pay volume">
        <defs>
          <linearGradient id="pay-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14a35a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#14a35a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((n) => {
          const y = h - pad - (n / max) * (h - pad * 2)
          return (
            <g key={n}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#eef1ee" />
              <text x={4} y={y + 4} className="fill-[#8a918c]" fontSize="10">
                {n ? money(n, currency) : '0'}
              </text>
            </g>
          )
        })}
        {area ? <polygon points={area} fill="url(#pay-fill)" /> : null}
        {line ? <polyline points={line} fill="none" stroke="#14a35a" strokeWidth="2.5" /> : null}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-[#8a918c]">
        <span>{first ? day(first) : ''}</span>
        <span>{last ? day(last) : ''}</span>
      </div>
    </div>
  )
}

function PayMixChart({
  segs,
  total,
  currency,
}: {
  segs: { label: string; n: number; color: string }[]
  total: number
  currency?: string
}) {
  const sum = segs.reduce((n, s) => n + s.n, 0) || 1
  const r = 58
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef1ee" strokeWidth="18" />
        {segs.map((seg) => {
          const len = (seg.n / sum) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle
              key={seg.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
            />
          )
          offset += len
          return el
        })}
        <text x="80" y="76" textAnchor="middle" className="fill-[#161c19]" fontSize="16" fontWeight="600">
          {money(total, currency)}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-[#8a918c]" fontSize="10">
          Volume
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {segs.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[#5c635f]">
              {money(seg.n, currency)} · {Math.round((seg.n / sum) * 100)}%
            </span>
          </li>
        ))}
        {!segs.length ? <li className="text-[#8a918c]">No pay mix yet.</li> : null}
      </ul>
    </div>
  )
}

function PacketDot({ status }: { status: string }) {
  const bucket = packetBucket(status)
  const map = {
    pending: { label: prettyStatus(status || 'pending'), className: 'bg-[#fef3c7] text-[#b45309]', dot: '#f59e0b' },
    accepted: { label: prettyStatus(status), className: 'bg-[#d1fae5] text-[#047857]', dot: '#22c55e' },
    declined: { label: prettyStatus(status), className: 'bg-[#fee2e2] text-[#b91c1c]', dot: '#ef4444' },
    draft: { label: 'Draft', className: 'bg-[#eef1ee] text-[#5c635f]', dot: '#8a918c' },
  }
  const row = map[bucket]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${row.className}`}>
      <span className="size-1.5 rounded-full" style={{ background: row.dot }} />
      {row.label}
    </span>
  )
}

function ago(iso?: string) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 8) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#8a918c]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  hint: string
  tone: 'green' | 'blue' | 'teal' | 'gold'
}) {
  const tones = {
    green: 'bg-[#e8f6ee] text-[#147a48]',
    blue: 'bg-[#e8f1fb] text-[#2563eb]',
    teal: 'bg-[#e6f7f4] text-[#0f766e]',
    gold: 'bg-[#f7f1e4] text-[#b85c38]',
  }
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 place-items-center rounded-full ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="mt-1 text-xs text-[#14a35a]">{hint}</p>
        </div>
      </div>
    </div>
  )
}

function DeskTable({ columns, rows, empty }: { columns: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-xs text-[#8a918c]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="pb-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row[0]}-${i}`} className="border-t border-[#eef1ee]">
              {row.map((cell, j) => (
                <td key={`${i}-${j}`} className={`py-3 ${j === 0 ? 'font-medium' : 'text-[#5c635f]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="py-6 text-sm text-[#8a918c]">{empty}</p> : null}
    </div>
  )
}

function placeLabel(city?: string, country?: string) {
  return [city, country].filter(Boolean).join(', ')
}

function handleFromEmail(email: string) {
  const local = email.split('@')[0]?.trim()
  return local ? `@${local}` : ''
}

function SkillPills({ skills, all = false }: { skills: string[]; all?: boolean }) {
  const shown = all ? skills : skills.slice(0, 3)
  const extra = skills.length - shown.length
  if (!skills.length) return <span className="text-[#8a918c]">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((skill) => (
        <span key={skill} className="rounded-full bg-[#eef1ee] px-2 py-0.5 text-xs text-[#5c635f]">
          {skill}
        </span>
      ))}
      {extra > 0 ? <span className="rounded-full bg-[#f3f5f4] px-2 py-0.5 text-xs text-[#8a918c]">+{extra}</span> : null}
    </span>
  )
}

function day(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function GrowthChart({ boards }: { boards: { source: string; count: number }[] }) {
  const top = boards.slice(0, 8)
  const max = Math.max(1, ...top.map((b) => b.count))
  const w = 640
  const h = 200
  const pad = 24
  const pts = top.map((b, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, top.length - 1)
    const y = h - pad - (b.count / max) * (h - pad * 2)
    return { x, y }
  })
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const line2 = pts.map((p, i) => `${p.x},${Math.min(h - pad, p.y + 18 + (i % 3) * 4)}`).join(' ')
  const area = pts.length ? `${pad},${h - pad} ${line} ${w - pad},${h - pad}` : ''
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" role="img" aria-label="Listings by board">
        <defs>
          <linearGradient id="adminGrowth" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14a35a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#14a35a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area ? <polygon points={area} fill="url(#adminGrowth)" /> : null}
        {line ? <polyline points={line} fill="none" stroke="#14a35a" strokeWidth="3" strokeLinecap="round" /> : null}
        {line2 ? <polyline points={line2} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" /> : null}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[#8a918c]">
        {top.map((b) => (
          <span key={b.source}>
            {sourceLabel(b.source)} · {b.count}
          </span>
        ))}
      </div>
    </div>
  )
}

function UserDonut({ candidates, employers, admins }: { candidates: number; employers: number; admins: number }) {
  const total = Math.max(1, candidates + employers + admins)
  const r = 58
  const c = 2 * Math.PI * r
  const segs = [
    { n: candidates, color: '#14a35a', label: 'Candidates' },
    { n: employers, color: '#3b82f6', label: 'Employers' },
    { n: admins, color: '#86efac', label: 'Admins' },
  ]
  let offset = 0
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef1ee" strokeWidth="18" />
        {segs.map((seg) => {
          const len = (seg.n / total) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle
              key={seg.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
            />
          )
          offset += len
          return el
        })}
        <text x="80" y="76" textAnchor="middle" className="fill-[#161c19]" fontSize="22" fontWeight="600">
          {candidates + employers + admins}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-[#8a918c]" fontSize="10">
          Total Users
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segs.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="tabular-nums text-[#5c635f]">
              {seg.n.toLocaleString()} · {Math.round((seg.n / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuickRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3.5 text-sm text-[#161c19] hover:text-[#147a48]">
      <Icon className="size-4 shrink-0 text-[#5c635f]" />
      <span className="min-w-0 flex-1 text-left">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-[#b7c0bb]" />
    </button>
  )
}

function NoteDot({ color, text }: { color: string; text: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: color }} />
      <span>{text}</span>
    </li>
  )
}

function PermissionRow({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[#14a35a] text-white">
        <Check className="size-3" />
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-xs text-[#8a918c]">{body}</span>
      </span>
    </li>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs capitalize ${active ? 'bg-[#13261f] text-white' : 'bg-[#f3f5f4] text-[#5c635f]'}`}
    >
      {label}
    </button>
  )
}

function PlatformChip({ source }: { source: string }) {
  if (source === 'linkedin') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1fb] px-2 py-0.5 text-xs text-[#0a66c2]">{sourceLabel(source)}</span>
  }
  if (source === 'upwork') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-xs text-[#147a48]">{sourceLabel(source)}</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f4] px-2 py-0.5 text-xs text-[#5c635f]">{sourceLabel(source)}</span>
}

function inviteBoards(row: { source?: string; sources?: string[] }) {
  if (row.sources?.length) return row.sources
  return row.source ? [row.source] : []
}

function deskInviteStatus(row: { company: string; status?: InviteDeskStatus }, localInvited: string[]): InviteDeskStatus {
  if (row.status === 'joined') return 'joined'
  if (row.status === 'invited' || localInvited.includes(row.company.trim().toLowerCase())) return 'invited'
  return 'not_invited'
}

function readLocalEmployerInvites() {
  try {
    const raw = JSON.parse(localStorage.getItem('atelier-employer-invites') || '[]') as unknown
    return Array.isArray(raw) ? raw.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function rememberLocalEmployerInvite(company: string, setLocalInvited: (value: string[] | ((prev: string[]) => string[])) => void) {
  const key = company.trim().toLowerCase()
  if (!key) return
  setLocalInvited((prev) => {
    const next = [...new Set([...prev, key])]
    try {
      localStorage.setItem('atelier-employer-invites', JSON.stringify(next))
    } catch {
      /* private mode */
    }
    return next
  })
}

function InviteStatusChip({ status }: { status: InviteDeskStatus }) {
  const map = {
    not_invited: { label: 'Not invited', className: 'bg-[#eef1ee] text-[#5c635f]' },
    invited: { label: 'Invited', className: 'bg-[#dbeafe] text-[#1d4ed8]' },
    joined: { label: 'Joined', className: 'bg-[#d1fae5] text-[#047857]' },
  }
  const row = map[status] ?? map.not_invited
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${row.className}`}>{row.label}</span>
}
