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
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clock,
  Copy,
  Crown,
  DollarSign,
  Download,
  FileSignature,
  ExternalLink,
  FileText,
  LayoutDashboard,
  ListFilter,
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
  Globe,
  Timer,
  X,
  Menu,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { cn, initials, money, moneyBand, prettyStatus } from '@/lib/utils'
import { formatHoursMinutes, startOfLocalDay } from '@shared/tracker'
import { isStaffRole, sourceLabel, type AccountRole, type Currency, type EmploymentType } from '@shared/types'
import { employerInviteNote, employerJoinPath } from '@shared/employerInvite'
import { candidateInviteNote, candidateJoinPath } from '@shared/candidateInvite'
import { listingUrl, officialApplyLinks } from '@shared/applyBoards'
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
  city?: string
  country?: string
  website?: string
  industry?: string
  headline?: string
  onboarded?: boolean
  lastActive?: string
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
    description: string
    location: string
    employmentType: string
    salaryMin?: number
    salaryMax?: number
    currency: string
    skills: string[]
    seniority: string
    employerId: string
    applicationUrl: string
    applicants: number
    pending: number
    hired: number
    shortlisted: number
  }[]
  packetsList: {
    id: string
    jobId: string
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
type UserTypeFilter = 'all' | 'candidate' | 'employer' | 'admin'
type PacketBucket = 'pending' | 'accepted' | 'declined' | 'draft'
type CandidateDeskTab = 'all' | 'active' | 'pending' | 'onboarded' | 'hired'
type JobDeskTab = 'all' | 'atelier' | 'boards' | 'remote' | 'packets'
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
      { id: 'people', label: 'Users', icon: Users },
      { id: 'candidates', label: 'Candidates', icon: User },
      { id: 'employers', label: 'Employers', icon: Building2 },
    ],
  },
  {
    label: 'Team & Access',
    items: [
      { id: 'staff', label: 'Invite Admin', icon: UserPlus },
      { id: 'invite', label: 'Invite employers', icon: Mail },
      { id: 'roles', label: 'Manage Roles', icon: Shield },
    ],
  },
  {
    label: 'Jobs & Projects',
    items: [
      { id: 'listings', label: 'Jobs', icon: Briefcase },
      { id: 'packets', label: 'Packets', icon: FileText },
      { id: 'contracts', label: 'Contracts', icon: FileSignature },
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

const STUDIO_ROLES: {
  id: AccountRole
  name: string
  blurb: string
  icon: LucideIcon
  color: string
  invite: 'candidate' | 'employer' | 'admin' | 'sql'
  groups: { title: string; items: string[] }[]
}[] = [
  {
    id: 'super_admin',
    name: 'Super admin',
    blurb: 'Full studio access, including changing roles. Granted in SQL only — signup cannot create this.',
    icon: Crown,
    color: '#b85c38',
    invite: 'sql',
    groups: [
      { title: 'User management', items: ['View every account', 'Change candidate, employer, and admin roles', 'Invite admins'] },
      { title: 'Jobs & projects', items: ['Jobs, packets, and contracts', 'Invite employers', 'Invite candidates'] },
      { title: 'Operations', items: ['Inbox, tracker, payments, and reports'] },
      { title: 'Settings', items: ['Studio settings and staff SQL'] },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    blurb: 'Run the Atelier desk: users, jobs, packets, invites, tracker, and pay. Cannot grant super admin.',
    icon: Shield,
    color: '#2563eb',
    invite: 'admin',
    groups: [
      { title: 'User management', items: ['View candidates and employers', 'Invite admins'] },
      { title: 'Jobs & projects', items: ['Jobs, packets, and contracts', 'Invite employers', 'Invite candidates'] },
      { title: 'Operations', items: ['Inbox, tracker, payments, and reports'] },
      { title: 'Settings', items: ['Open studio settings'] },
    ],
  },
  {
    id: 'employer',
    name: 'Employer',
    blurb: 'Post roles on Atelier and receive packets only after a candidate approves.',
    icon: Building2,
    color: '#147a48',
    invite: 'employer',
    groups: [
      { title: 'Hiring', items: ['Post Atelier roles', 'Review approved packets in inbox'] },
      { title: 'Work', items: ['Message candidates', 'See hired tracker hours'] },
      { title: 'Pay', items: ['Fund work on the Atelier ledger'] },
    ],
  },
  {
    id: 'candidate',
    name: 'Candidate',
    blurb: 'Match roles, prepare packets, and send only after you approve. Nothing leaves without that send.',
    icon: User,
    color: '#7c3aed',
    invite: 'candidate',
    groups: [
      { title: 'Matching', items: ['Score roles against your profile'] },
      { title: 'Packets', items: ['Prepare a packet', 'Send only after you approve'] },
      { title: 'Work', items: ['Clock hired Atelier work', 'Message Atelier employers'] },
      { title: 'Pay', items: ['View the ledger and withdraw'] },
    ],
  },
]

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const qc = useQueryClient()
  const [view, setView] = useState<DeskView>('pulse')
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleType, setPeopleType] = useState<UserTypeFilter>('all')
  const [peopleStatus, setPeopleStatus] = useState<'all' | 'active' | 'pending'>('all')
  const [peopleCountry, setPeopleCountry] = useState('all')
  const [peoplePage, setPeoplePage] = useState(0)
  const [pickedPerson, setPickedPerson] = useState('')
  const [peopleInviteOpen, setPeopleInviteOpen] = useState(false)
  const [peopleInviteKind, setPeopleInviteKind] = useState<'' | 'candidate' | 'employer' | 'admin'>('')
  const [peopleInviteEmail, setPeopleInviteEmail] = useState('')
  const [peopleInviteCompany, setPeopleInviteCompany] = useState('')
  const [peopleInviteNotice, setPeopleInviteNotice] = useState('')
  const [peopleNextRole, setPeopleNextRole] = useState<'admin' | 'employer' | 'candidate'>('candidate')
  const [roleQuery, setRoleQuery] = useState('')
  const [pickedRole, setPickedRole] = useState<AccountRole>('admin')
  const [roleTab, setRoleTab] = useState<'access' | 'users' | 'assign'>('access')
  const [email, setEmail] = useState('')
  const [nextRole, setNextRole] = useState<'admin' | 'employer' | 'candidate'>('admin')
  const [copied, setCopied] = useState(false)
  const [picked, setPicked] = useState('')
  const [range, setRange] = useState<'7D' | '30D' | '3M' | '1Y'>('30D')
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
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
  const [candidateTab, setCandidateTab] = useState<CandidateDeskTab>('all')
  const [candidateStatus, setCandidateStatus] = useState<'all' | 'active' | 'pending'>('all')
  const [candidatePlace, setCandidatePlace] = useState('all')
  const [candidateSkill, setCandidateSkill] = useState('all')
  const [candidateSort, setCandidateSort] = useState<'newest' | 'name' | 'packets'>('newest')
  const [candidatePage, setCandidatePage] = useState(0)
  const [candidatePageSize, setCandidatePageSize] = useState(10)
  const [pickedCandidate, setPickedCandidate] = useState('')
  const [candidateOpen, setCandidateOpen] = useState(true)
  const [candidateInviteOpen, setCandidateInviteOpen] = useState(false)
  const [candidateCopied, setCandidateCopied] = useState('')
  const [jobQuery, setJobQuery] = useState('')
  const [jobTab, setJobTab] = useState<JobDeskTab>('all')
  const [jobSource, setJobSource] = useState('all')
  const [jobType, setJobType] = useState('all')
  const [jobStatus, setJobStatus] = useState<'all' | 'atelier' | 'open'>('all')
  const [jobSort, setJobSort] = useState<'newest' | 'title' | 'applicants'>('newest')
  const [jobPage, setJobPage] = useState(0)
  const [jobPageSize, setJobPageSize] = useState(10)
  const [pickedJob, setPickedJob] = useState('')
  const [jobOpen, setJobOpen] = useState(true)
  const [jobPostOpen, setJobPostOpen] = useState(false)
  const [jobPostEmployer, setJobPostEmployer] = useState('')
  const [jobPostTitle, setJobPostTitle] = useState('')
  const [jobPostDescription, setJobPostDescription] = useState('')
  const [jobPostLocation, setJobPostLocation] = useState('Remote worldwide')
  const [jobPostRemote, setJobPostRemote] = useState(true)
  const [jobPostEmployment, setJobPostEmployment] = useState<EmploymentType>('full-time')
  const [jobPostSalaryMin, setJobPostSalaryMin] = useState('')
  const [jobPostSalaryMax, setJobPostSalaryMax] = useState('')
  const [jobPostCurrency, setJobPostCurrency] = useState<Currency>('USD')
  const [jobPostSkills, setJobPostSkills] = useState('')
  const [jobPostNotice, setJobPostNotice] = useState('')
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
  const inviteUser = useMutation({
    mutationFn: (body: { email: string; role: 'candidate' | 'employer' | 'admin'; company?: string }) =>
      api<{ status?: string; mailed?: boolean; message?: string; already?: boolean; joinUrl?: string }>('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (row) => {
      setPeopleInviteNotice(row.message || (row.already ? 'That email is already on Atelier.' : 'Invitation saved.'))
      if (row.joinUrl && !row.mailed && !row.already) {
        void navigator.clipboard.writeText(row.joinUrl).catch(() => undefined)
      }
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
    onError: (err) => setPeopleInviteNotice(err instanceof Error ? err.message : 'Could not send the invite.'),
  })
  const postAdminJob = useMutation({
    mutationFn: (body: {
      employerId: string
      title: string
      description: string
      location: string
      remote: boolean
      employmentType: EmploymentType
      salaryMin?: number
      salaryMax?: number
      currency: Currency
      skills: string
    }) => api('/api/admin/jobs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setJobPostNotice('')
      setJobPostOpen(false)
      setJobPostTitle('')
      setJobPostDescription('')
      setJobPostSkills('')
      setJobPostSalaryMin('')
      setJobPostSalaryMax('')
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
    onError: (err) => setJobPostNotice(err instanceof Error ? err.message : 'Could not post the job.'),
  })
  const changeUserRole = useMutation({
    mutationFn: (body: { email: string; role: 'admin' | 'employer' | 'candidate' }) =>
      api('/api/admin/role', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-dashboard'] }),
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

  const roleRows = useMemo(() => {
    const q = (view === 'roles' ? roleQuery : query).trim().toLowerCase()
    return STUDIO_ROLES.filter((row) => {
      if (!q) return true
      return `${row.name} ${row.blurb} ${row.id} ${row.groups.map((g) => g.title).join(' ')}`.toLowerCase().includes(q)
    })
  }, [query, roleQuery, view])

  const selectedStudioRole = STUDIO_ROLES.find((row) => row.id === pickedRole) ?? roleRows[0] ?? STUDIO_ROLES[1]
  const SelectedRoleIcon = selectedStudioRole.icon
  const roleUsers = (data?.accounts ?? []).filter((row) => row.role === selectedStudioRole.id)
  const rolePermissionCount = STUDIO_ROLES.reduce((n, row) => n + row.groups.reduce((m, group) => m + group.items.length, 0), 0)

  const userRows = useMemo(() => {
    const q = (view === 'people' ? peopleQuery : query).trim().toLowerCase()
    return (data?.accounts ?? []).filter((row) => {
      if (peopleType === 'candidate' && row.role !== 'candidate') return false
      if (peopleType === 'employer' && row.role !== 'employer') return false
      if (peopleType === 'admin' && !isStaffRole(row.role)) return false
      if (peopleStatus !== 'all' && accountStatus(row) !== peopleStatus) return false
      if (peopleCountry !== 'all' && (row.country || '') !== peopleCountry) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.companyName} ${row.role} ${row.id} ${row.city ?? ''} ${row.country ?? ''}`.toLowerCase().includes(q)
    })
  }, [data?.accounts, peopleCountry, peopleQuery, peopleStatus, peopleType, query, view])

  const userCountries = useMemo(() => {
    return [...new Set((data?.accounts ?? []).map((row) => row.country).filter(Boolean) as string[])].sort()
  }, [data?.accounts])

  const nowMs = Date.now()

  const searchListings = useMemo(() => {
    const q = (view === 'listings' ? jobQuery : query).trim().toLowerCase()
    const rows = [...(data?.listings ?? [])]
    const filtered = rows.filter((row) => {
      if (jobTab === 'atelier' && !row.atelier) return false
      if (jobTab === 'boards' && row.atelier) return false
      if (jobTab === 'remote' && !row.remote) return false
      if (jobTab === 'packets' && (row.applicants ?? 0) < 1) return false
      if (jobSource !== 'all' && row.source !== jobSource) return false
      if (jobType !== 'all' && row.employmentType !== jobType) return false
      if (jobStatus === 'atelier' && !row.atelier) return false
      if (jobStatus === 'open' && row.atelier) return false
      if (!q) return true
      return `${row.title} ${row.company} ${row.source} ${(row.skills ?? []).join(' ')} ${row.location}`.toLowerCase().includes(q)
    })
    filtered.sort((a, b) => {
      if (jobSort === 'title') return a.title.localeCompare(b.title)
      if (jobSort === 'applicants') return b.applicants - a.applicants || a.title.localeCompare(b.title)
      return String(b.postedAt ?? '').localeCompare(String(a.postedAt ?? '')) || a.title.localeCompare(b.title)
    })
    return filtered
  }, [data?.listings, jobQuery, jobSort, jobSource, jobStatus, jobTab, jobType, query, view])

  const jobSources = useMemo(() => {
    return [...new Set((data?.listings ?? []).map((row) => row.source).filter(Boolean))].sort()
  }, [data?.listings])
  const jobTypes = useMemo(() => {
    return [...new Set((data?.listings ?? []).map((row) => row.employmentType).filter(Boolean))].sort()
  }, [data?.listings])
  const jobPages = Math.max(1, Math.ceil(searchListings.length / jobPageSize))
  const jobPageSafe = Math.min(jobPage, jobPages - 1)
  const jobSlice = searchListings.slice(jobPageSafe * jobPageSize, jobPageSafe * jobPageSize + jobPageSize)
  const selectedJob = searchListings.find((row) => row.id === pickedJob) ?? jobSlice[0]
  const jobEmployers = data?.employers ?? []
  const jobStats = useMemo(() => {
    const rows = data?.listings ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const postedMs = (row: { postedAt: string }) => {
      if (!row.postedAt) return NaN
      const t = new Date(row.postedAt).getTime()
      return Number.isNaN(t) ? NaN : t
    }
    const fresh = rows.filter((row) => {
      const t = postedMs(row)
      return Number.isFinite(t) && nowMs - t <= month
    }).length
    const prior = rows.filter((row) => {
      const t = postedMs(row)
      if (!Number.isFinite(t)) return false
      const age = nowMs - t
      return age > month && age <= month * 2
    }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    const atelier = rows.filter((row) => row.atelier).length
    const boards = rows.filter((row) => !row.atelier).length
    const remote = rows.filter((row) => row.remote).length
    const packets = rows.filter((row) => (row.applicants ?? 0) > 0).length
    return {
      total: rows.length,
      atelier,
      boards,
      remote,
      packets,
      totalDelta: delta(fresh, prior),
      atelierDelta: delta(atelier, Math.max(0, atelier - fresh)),
      boardsDelta: delta(boards, Math.max(0, boards - Math.min(boards, fresh))),
      remoteDelta: delta(remote, Math.max(0, remote - Math.min(remote, fresh))),
      packetsDelta: delta(packets, Math.max(0, packets - Math.min(packets, fresh))),
    }
  }, [data?.listings, nowMs])

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

  const userPages = Math.max(1, Math.ceil(userRows.length / pageSize))
  const userPageSafe = Math.min(peoplePage, userPages - 1)
  const userSlice = userRows.slice(userPageSafe * pageSize, userPageSafe * pageSize + pageSize)
  const selectedUser = userRows.find((row) => row.id === pickedPerson) ?? userSlice[0]
  const selectedUserCandidate = (data?.candidates ?? []).find((row) => row.id === selectedUser?.id)
  const selectedUserEmployer = (data?.employers ?? []).find((row) => row.id === selectedUser?.id)
  const userStats = useMemo(() => {
    const rows = data?.accounts ?? []
    const month = 30 * 24 * 60 * 60 * 1000
    const total = rows.length
    const candidatesN = rows.filter((row) => row.role === 'candidate').length
    const employersN = rows.filter((row) => row.role === 'employer').length
    const adminsN = rows.filter((row) => isStaffRole(row.role)).length
    const fresh = (role: UserTypeFilter) =>
      rows.filter((row) => {
        if (!row.joinedAt || nowMs - new Date(row.joinedAt).getTime() > month) return false
        if (role === 'candidate') return row.role === 'candidate'
        if (role === 'employer') return row.role === 'employer'
        if (role === 'admin') return isStaffRole(row.role)
        return true
      }).length
    const prior = (role: UserTypeFilter) =>
      rows.filter((row) => {
        if (!row.joinedAt) return false
        const age = nowMs - new Date(row.joinedAt).getTime()
        if (age <= month || age > month * 2) return false
        if (role === 'candidate') return row.role === 'candidate'
        if (role === 'employer') return row.role === 'employer'
        if (role === 'admin') return isStaffRole(row.role)
        return true
      }).length
    const delta = (cur: number, prev: number) => {
      if (!prev && !cur) return 0
      if (!prev) return 100
      return Math.round(((cur - prev) / prev) * 100)
    }
    return {
      total,
      candidates: candidatesN,
      employers: employersN,
      admins: adminsN,
      totalDelta: delta(fresh('all'), prior('all')),
      candidatesDelta: delta(fresh('candidate'), prior('candidate')),
      employersDelta: delta(fresh('employer'), prior('employer')),
      adminsDelta: delta(fresh('admin'), prior('admin')),
    }
  }, [data?.accounts, nowMs])

  const candidateRows = useMemo(() => {
    const q = (view === 'candidates' ? candidateQuery : query).trim().toLowerCase()
    const rows = [...(data?.candidates ?? [])].filter((row) => {
      if (candidateTab === 'active' && row.status !== 'active') return false
      if (candidateTab === 'pending' && row.status !== 'pending') return false
      if (candidateTab === 'onboarded' && !row.onboarded) return false
      if (candidateTab === 'hired' && row.hired < 1) return false
      if (candidateStatus !== 'all' && row.status !== candidateStatus) return false
      if (candidatePlace !== 'all' && placeLabel(row.city, row.country) !== candidatePlace) return false
      if (candidateSkill !== 'all' && !row.skills.includes(candidateSkill)) return false
      if (!q) return true
      return `${row.name} ${row.email} ${row.headline} ${row.skills.join(' ')} ${row.city} ${row.country}`.toLowerCase().includes(q)
    })
    rows.sort((a, b) => {
      if (candidateSort === 'name') return a.name.localeCompare(b.name)
      if (candidateSort === 'packets') return b.packets - a.packets || b.hired - a.hired
      return String(b.joinedAt).localeCompare(String(a.joinedAt))
    })
    return rows
  }, [candidatePlace, candidateQuery, candidateSkill, candidateSort, candidateStatus, candidateTab, data?.candidates, query, view])

  const candidatePlaces = useMemo(() => {
    return [...new Set((data?.candidates ?? []).map((row) => placeLabel(row.city, row.country)).filter(Boolean))].sort()
  }, [data?.candidates])
  const candidateSkills = useMemo(() => {
    return [...new Set((data?.candidates ?? []).flatMap((row) => row.skills).filter(Boolean))].sort()
  }, [data?.candidates])

  const candidatePages = Math.max(1, Math.ceil(candidateRows.length / candidatePageSize))
  const candidatePageSafe = Math.min(candidatePage, candidatePages - 1)
  const candidateSlice = candidateRows.slice(candidatePageSafe * candidatePageSize, candidatePageSafe * candidatePageSize + candidatePageSize)
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
    const hired = rows.filter((row) => row.hired > 0).length
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
      hired,
      totalDelta: delta(fresh, prior),
      onboardedDelta: delta(onboarded, Math.max(0, onboarded - fresh)),
      activeDelta: delta(active, Math.max(0, active - fresh)),
      pendingDelta: delta(pending, Math.max(0, pending - 1)),
      hiredDelta: delta(hired, Math.max(0, hired - Math.min(hired, fresh))),
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

  function exportUsers() {
    const header = 'Name,Email,Role,Company,Country,City,Status,Onboarded,Joined,LastActive'
    const lines = userRows.map((row) =>
      [
        row.name,
        row.email,
        prettyRole(row.role),
        row.companyName,
        row.country ?? '',
        row.city ?? '',
        accountStatus(row),
        row.onboarded ? 'yes' : 'no',
        row.joinedAt ?? '',
        row.lastActive ?? '',
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-users.csv'
    a.click()
    URL.revokeObjectURL(href)
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

  function exportJobs() {
    const header = 'Title,Company,Board,Type,Location,Budget,Applicants,Status,Posted'
    const lines = searchListings.map((row) =>
      [
        row.title,
        row.company,
        sourceLabel(row.source),
        prettyEmployment(row.employmentType),
        row.location || (row.remote ? 'Remote' : ''),
        jobBudget(row),
        row.applicants,
        row.atelier ? 'Atelier' : 'Open',
        row.postedAt,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([`${header}\n${lines.join('\n')}`], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'atelier-jobs.csv'
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

  function openAddUser(kind: 'candidate' | 'employer' | 'admin') {
    setPeopleInviteKind(kind)
    setPeopleInviteOpen(false)
    setPeopleInviteNotice('')
    setPeopleInviteEmail('')
    setPeopleInviteCompany('')
    inviteUser.reset()
  }

  function closeAddUser() {
    setPeopleInviteKind('')
    setPeopleInviteNotice('')
    inviteUser.reset()
  }

  function addUserJoinUrl() {
    if (peopleInviteKind === 'employer') {
      const company = peopleInviteCompany.trim() || 'your company'
      return `${candidateOrigin}/register?role=employer&company=${encodeURIComponent(company)}`
    }
    if (peopleInviteKind === 'admin') return `${candidateOrigin}/register`
    return candidateJoin
  }

  function copyAddUserLink() {
    void navigator.clipboard.writeText(addUserJoinUrl()).then(() => {
      setPeopleInviteNotice('Join link copied.')
    })
  }

  function onAddUserSubmit(e: FormEvent) {
    e.preventDefault()
    if (!peopleInviteKind) return
    setPeopleInviteNotice('')
    inviteUser.mutate({
      email: peopleInviteEmail.trim(),
      role: peopleInviteKind,
      company: peopleInviteCompany.trim() || undefined,
    })
  }

  function pickPerson(row: AdminAccount) {
    setPickedPerson(row.id)
    setPeopleNextRole(row.role === 'employer' ? 'employer' : row.role === 'admin' || row.role === 'super_admin' ? 'admin' : 'candidate')
    changeUserRole.reset()
  }

  function openCandidate(email: string) {
    const hit = (data?.candidates ?? []).find((row) => row.email.toLowerCase() === email.toLowerCase())
    if (hit) setPickedCandidate(hit.id)
    go('candidates')
  }

  function openUserDesk(row: AdminAccount) {
    if (row.role === 'candidate') {
      setPickedCandidate(row.id)
      go('candidates')
      return
    }
    if (row.role === 'employer') {
      setPickedEmployer(row.id)
      go('employers')
      return
    }
    setEmail(row.email)
    go('roles')
  }

  function inviteStudioRole(role: (typeof STUDIO_ROLES)[number] = selectedStudioRole) {
    if (role.invite === 'candidate') {
      copyCandidateInvite('link')
      return
    }
    if (role.invite === 'employer') {
      go('invite')
      return
    }
    if (role.invite === 'admin') {
      go('staff')
      return
    }
    void navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  function sendEmployerInvite(row: AdminInvite) {
    setPicked(row.company)
    rememberLocalEmployerInvite(row.company, setLocalInvited)
    markEmployerInvite.mutate({ company: row.company, title: row.title, source: row.source })
    copyInvite('link', row)
  }

  function go(next: DeskView, role: PeopleFilter = 'all') {
    setView(next)
    if (next === 'people') {
      setPeopleType(role === 'candidate' || role === 'employer' || role === 'admin' ? role : 'all')
      setPeopleStatus('all')
      setPeopleCountry('all')
      setPeoplePage(0)
      setPeopleInviteOpen(false)
      setPeopleInviteKind('')
      setPeopleInviteNotice('')
    }
    if (next === 'roles') {
      setRoleTab('access')
    }
    setNavOpen(false)
    setHelpOpen(false)
    setAccountOpen(false)
    setAlertsOpen(false)
    setStaffMenu('')
    setQuery('')
    if (next !== 'people') {
      setPeopleInviteKind('')
      setPeopleInviteOpen(false)
    }
    if (next === 'employers') setEmployerPage(0)
    if (next === 'candidates') setCandidatePage(0)
    if (next === 'listings') {
      setJobPage(0)
      setJobOpen(true)
    }
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
    return view === item.id
  }

  const searchValue = view === 'people' ? peopleQuery : view === 'roles' ? roleQuery : view === 'staff' ? staffQuery : view === 'employers' ? employerQuery : view === 'candidates' ? candidateQuery : view === 'listings' ? jobQuery : view === 'packets' ? packetQuery : view === 'contracts' ? contractQuery : view === 'finances' ? payQuery : query
  const onSearch = (value: string) => {
    if (view === 'people') {
      setPeopleQuery(value)
      setPeoplePage(0)
    } else if (view === 'roles') setRoleQuery(value)
    else if (view === 'staff') setStaffQuery(value)
    else if (view === 'employers') {
      setEmployerQuery(value)
      setEmployerPage(0)
    } else if (view === 'candidates') {
      setCandidateQuery(value)
      setCandidatePage(0)
    } else if (view === 'listings') {
      setJobQuery(value)
      setJobPage(0)
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
                : view === 'listings'
                  ? 'Search jobs by title, company, or keyword...'
                : view === 'people'
                  ? 'Search users by name, email, or role'
                : view === 'roles'
                  ? 'Search roles by name or access'
                : 'Search users, jobs, packets, or companies'

  return (
    <div className="min-h-svh overflow-x-clip bg-[#f3f5f4] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 h-svh w-[min(18.5rem,88vw)] flex-col overflow-y-auto bg-[#13261f] text-white lg:static lg:flex lg:h-auto lg:w-auto',
          navOpen ? 'flex' : 'hidden lg:flex',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <img src="/brand/atelier-logo.jpg" alt="Atelier" className="size-9 rounded-lg object-cover" />
            <div>
              <p className="font-serif text-lg leading-none">Atelier</p>
              <p className="mt-1 text-[0.65rem] text-white/55">Admin Panel</p>
            </div>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-lg text-white/70 lg:hidden" aria-label="Close menu" onClick={() => setNavOpen(false)}>
            <X className="size-5" />
          </button>
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
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#e4e8e5] bg-white px-3 py-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#e4e8e5] text-[#5c635f] lg:hidden"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <X className="size-5" /> : <Menu className="size-5" />}
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
            <div className="relative">
              <button
                type="button"
                className="relative grid size-10 place-items-center rounded-full text-[#5c635f] hover:bg-[#f3f5f4]"
                aria-label="Alerts"
                onClick={() => {
                  setHelpOpen(false)
                  setAccountOpen(false)
                  setAlertsOpen((v) => !v)
                }}
              >
                <Bell className="size-5" />
                {alertCount > 0 ? (
                  <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ef4444] px-1 text-[0.65rem] font-semibold leading-none text-white">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                ) : null}
              </button>
              {alertsOpen ? (
                <div className="fixed inset-x-3 top-[4.25rem] z-40 max-h-[min(32rem,calc(100svh-5rem))] overflow-y-auto rounded-2xl border border-[#e4e8e5] bg-white shadow-[0_12px_32px_rgba(19,38,31,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[22rem] sm:max-h-none">
                  <div className="flex items-center justify-between border-b border-[#eef1ee] px-4 py-3">
                    <p className="text-sm font-medium">Notifications</p>
                    <span className="text-xs text-[#8a918c]">{alertCount} waiting</span>
                  </div>
                  <div className="border-b border-[#eef1ee] px-4 py-3">
                    <p className="text-sm font-medium">Invite candidates</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#8a918c]">
                      Copy a join link and share it. Atelier does not email them. Packets leave only after they approve.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="flex-1"
                        type="button"
                        onClick={() => copyCandidateInvite('link')}
                      >
                        <Copy className="size-4" />
                        {candidateCopied === 'link' ? 'Copied' : 'Copy link'}
                      </Button>
                      <Button variant="outline" type="button" onClick={() => copyCandidateInvite('note')}>
                        {candidateCopied === 'note' ? 'Copied' : 'Copy note'}
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-sm font-medium text-[#147a48]"
                      onClick={() => {
                        setAlertsOpen(false)
                        go('candidates')
                      }}
                    >
                      Open candidates desk
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f8f7]"
                      onClick={() => {
                        setAlertsOpen(false)
                        go('invite')
                      }}
                    >
                      <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-[#fef3c7] text-[#b45309]">
                        <Mail className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">Invite employers</span>
                        <span className="mt-0.5 block text-xs text-[#8a918c]">
                          {counts?.companiesToInvite ?? 0} companies waiting on a join link
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f8f7]"
                      onClick={() => {
                        setAlertsOpen(false)
                        go('inbox')
                      }}
                    >
                      <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-[#dbeafe] text-[#1d4ed8]">
                        <MessagesSquare className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">Inbox</span>
                        <span className="mt-0.5 block text-xs text-[#8a918c]">{counts?.messages ?? 0} studio messages</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f8f7]"
                      onClick={() => {
                        setAlertsOpen(false)
                        go('packets')
                      }}
                    >
                      <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-[#e8f6ee] text-[#147a48]">
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">Packets</span>
                        <span className="mt-0.5 block text-xs text-[#8a918c]">{counts?.packets ?? 0} in studio</span>
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                className="hidden size-10 shrink-0 place-items-center rounded-full text-[#5c635f] hover:bg-[#f3f5f4] sm:grid"
                aria-label="Help"
                onClick={() => {
                  setAccountOpen(false)
                  setAlertsOpen(false)
                  setHelpOpen((v) => !v)
                }}
              >
                <CircleHelp className="size-5" />
              </button>
              {helpOpen ? (
                <div className="absolute right-0 top-12 z-40 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-[#e4e8e5] bg-white p-4 text-sm shadow-[0_12px_32px_rgba(19,38,31,0.12)]">
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
                  setAlertsOpen(false)
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

        <main className="min-w-0 space-y-5 overflow-x-clip px-3 py-5 sm:px-6 sm:py-6">
          {dash.isError ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-[#b85c38]">
              {dash.error instanceof Error ? dash.error.message : 'Could not load the admin panel.'}
            </div>
          ) : null}

          {view === 'pulse' ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Admin Dashboard</h1>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button type="button" className="text-left" onClick={() => go('people')}>
                  <MetricCard icon={Users} tone="green" label="Total Users" value={counts?.people ?? 0} hint="From Supabase" />
                </button>
                <button type="button" className="text-left" onClick={() => go('listings')}>
                  <MetricCard icon={Briefcase} tone="blue" label="Active Jobs" value={counts?.jobs ?? 0} hint="Live listings" />
                </button>
                <button type="button" className="text-left" onClick={() => go('packets')}>
                  <MetricCard icon={FileText} tone="teal" label="Total Packets" value={counts?.packets ?? 0} hint="Applications in studio" />
                </button>
                <button type="button" className="text-left" onClick={() => go('invite')}>
                  <MetricCard icon={Mail} tone="gold" label="Invite Queue" value={counts?.companiesToInvite ?? 0} hint="Companies to invite" />
                </button>
                <button type="button" className="text-left" onClick={() => go('tracker')}>
                  <MetricCard icon={Timer} tone="green" label="Tracker" value={formatHoursMinutes(counts?.trackerHours ?? 0)} hint={`${counts?.liveClocks ?? 0} live clocks`} />
                </button>
                <button type="button" className="text-left" onClick={() => go('inbox')}>
                  <MetricCard icon={MessagesSquare} tone="blue" label="Inbox" value={counts?.messages ?? 0} hint="Studio messages" />
                </button>
                <button type="button" className="text-left" onClick={() => go('finances')}>
                  <MetricCard icon={Wallet} tone="gold" label="Finances" value={money(counts?.financeReceived ?? 0)} hint="Received from employers" />
                </button>
                <button type="button" className="text-left" onClick={() => go('contracts')}>
                  <MetricCard icon={FileSignature} tone="teal" label="Hired" value={counts?.hired ?? 0} hint="Offers and hires" />
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-4">
                  <Panel>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-sans text-base font-semibold">Listings by board</h2>
                      <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('listings')}>
                        View jobs
                      </button>
                    </div>
                    <GrowthChart boards={data?.boards ?? []} />
                  </Panel>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between">
                        <h2 className="font-sans text-base font-semibold">Recent Jobs</h2>
                        <button type="button" className="text-sm text-[#14a35a]" onClick={() => go('listings')}>
                          View all
                        </button>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-0 text-left text-sm md:min-w-[24rem]">
                          <thead className="text-xs text-[#8a918c]">
                            <tr>
                              <th className="pb-2 font-medium">Job Title</th>
                              <th className="hidden pb-2 font-medium md:table-cell">Company</th>
                              <th className="hidden pb-2 font-medium lg:table-cell">Board</th>
                              <th className="pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data?.listings ?? []).slice(0, 5).map((row) => (
                              <tr key={row.id} className="border-t border-[#eef1ee]">
                                <td className="py-3 font-medium text-[#161c19]">{row.title}</td>
                                <td className="hidden py-3 text-[#5c635f] md:table-cell">{row.company}</td>
                                <td className="hidden py-3 lg:table-cell">{sourceLabel(row.source)}</td>
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
                </div>

                <div className="space-y-4">
                  <Panel>
                    <h2 className="font-sans text-base font-semibold">User breakdown</h2>
                    <UserDonut
                      candidates={counts?.candidates ?? 0}
                      employers={counts?.employers ?? 0}
                      admins={counts?.admins ?? 0}
                    />
                  </Panel>
                  <section className="rounded-2xl bg-[#e8f6ee] p-5">
                    <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-[#161c19]">
                      <Zap className="size-4 fill-[#14a35a] text-[#14a35a]" />
                      Quick Actions
                    </h2>
                    <div className="mt-2 divide-y divide-[#cfe8d7]">
                      <QuickRow
                        icon={UserPlus}
                        label="Invite candidates"
                        onClick={() => {
                          copyCandidateInvite('link')
                          setAlertsOpen(true)
                        }}
                      />
                      <QuickRow icon={Mail} label="Invite employers" onClick={() => go('invite')} />
                      <QuickRow icon={FileText} label="Review packets" onClick={() => go('packets')} />
                      <QuickRow icon={MessagesSquare} label="Open inbox" onClick={() => go('inbox')} />
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
                <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Invite Admin</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#5c635f]">
                  Add administrators to help run Atelier. They get access to users, jobs, packets, tracker, and pay. Signup still cannot grant admin on its own.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
                  <table className="w-full min-w-0 text-left text-sm md:min-w-[32rem]">
                    <thead className="text-xs text-[#8a918c]">
                      <tr>
                        <th className="pb-2 font-medium">Name</th>
                        <th className="hidden pb-2 font-medium md:table-cell">Email</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="hidden pb-2 font-medium lg:table-cell">Invited On</th>
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
                          <td className="hidden py-3 text-[#5c635f] md:table-cell">{row.email}</td>
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
                          <td className="hidden py-3 text-[#5c635f] lg:table-cell">{day(row.invitedAt)}</td>
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
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Invite Employers to Atelier</h1>
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
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                    className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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

              <div className={`grid gap-5 ${selected ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[36rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Company</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Platform</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Industry</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Listings</th>
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
                            <td className="hidden px-3 py-3 lg:table-cell">
                              <PlatformChip source={row.source} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{row.industry || '—'}</td>
                            <td className="hidden px-3 py-3 tabular-nums text-[#5c635f] md:table-cell">{row.listings ? `${row.listings}` : '—'}</td>
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
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Manage Roles</span>
                  </p>
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Manage Roles</h1>
                  <p className="mt-1 max-w-2xl text-sm text-[#5c635f]">
                    Atelier has four system roles. Invite people into them — signup cannot grant admin, and super admin stays in SQL.
                  </p>
                </div>
                <Button type="button" onClick={() => go('staff')}>
                  <Plus className="size-4" />
                  Invite Admin
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HintStat icon={Shield} color="#14a35a" label="System roles" value={STUDIO_ROLES.length} hint="Candidate, employer, admin, super admin" />
                <HintStat icon={Check} color="#22c55e" label="In use" value={STUDIO_ROLES.filter((row) => (data?.accounts ?? []).some((account) => account.role === row.id)).length} hint="Roles with at least one account" />
                <HintStat icon={Users} color="#8b5cf6" label="Users assigned" value={data?.accounts.length ?? 0} hint="Live accounts on Atelier" />
                <HintStat icon={Lock} color="#2563eb" label="Access items" value={rolePermissionCount} hint="Real desk capabilities, not a custom matrix" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search roles by name or access"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[32rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Description</th>
                          <th className="px-3 py-3 font-medium">Users</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Kind</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roleRows.map((row) => {
                          const users = (data?.accounts ?? []).filter((account) => account.role === row.id).length
                          const Icon = row.icon
                          return (
                            <tr
                              key={row.id}
                              className={`cursor-pointer border-b border-[#eef1ee] ${selectedStudioRole.id === row.id ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                              onClick={() => {
                                setPickedRole(row.id)
                                setRoleTab('access')
                                if (row.id === 'admin' || row.id === 'employer' || row.id === 'candidate') setNextRole(row.id)
                              }}
                            >
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-3">
                                  <span className="grid size-9 place-items-center rounded-full" style={{ background: `${row.color}1a`, color: row.color }}>
                                    <Icon className="size-4" />
                                  </span>
                                  <span>
                                    <span className="block font-medium">{row.name}</span>
                                    <span className="block text-xs text-[#8a918c]">{row.id.replace('_', ' ')}</span>
                                  </span>
                                </span>
                              </td>
                              <td className="hidden max-w-[18rem] px-3 py-3 text-[#5c635f] lg:table-cell">{row.blurb}</td>
                              <td className="px-3 py-3">{users}</td>
                              <td className="px-3 py-3">
                                <StatusDot status="active" />
                              </td>
                              <td className="hidden px-3 py-3 md:table-cell">
                                <span className="rounded-full bg-[#eef1ee] px-2 py-0.5 text-xs text-[#5c635f]">System</span>
                              </td>
                              <td className="relative px-3 py-3">
                                <button
                                  type="button"
                                  className="grid size-8 place-items-center rounded-full hover:bg-white"
                                  aria-label="Actions"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPickedRole(row.id)
                                    setStaffMenu(staffMenu === row.id ? '' : row.id)
                                  }}
                                >
                                  <MoreHorizontal className="size-4 text-[#8a918c]" />
                                </button>
                                {staffMenu === row.id ? (
                                  <div className="absolute right-3 z-20 w-44 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setStaffMenu('')
                                        inviteStudioRole(row)
                                      }}
                                    >
                                      {row.invite === 'sql' ? 'Copy SQL' : row.invite === 'admin' ? 'Invite admin' : row.invite === 'employer' ? 'Invite employer' : 'Copy join link'}
                                    </button>
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setStaffMenu('')
                                        setRoleTab('users')
                                      }}
                                    >
                                      View users
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {!roleRows.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No roles match this search.</p> : null}
                  </div>
                  <div className="border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    Showing {roleRows.length} of {STUDIO_ROLES.length} system roles
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">Role details</p>
                    </div>
                    <div className="mt-3 flex items-start gap-3">
                      <span className="grid size-12 place-items-center rounded-full" style={{ background: `${selectedStudioRole.color}1a`, color: selectedStudioRole.color }}>
                        <SelectedRoleIcon className="size-5" />
                      </span>
                      <div>
                        <p className="font-medium">{selectedStudioRole.name}</p>
                        <span className="mt-1 inline-flex rounded-full bg-[#eef1ee] px-2 py-0.5 text-xs text-[#5c635f]">System role</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#5c635f]">{selectedStudioRole.blurb}</p>
                    <Button className="mt-4 w-full" type="button" onClick={() => inviteStudioRole()}>
                      {selectedStudioRole.invite === 'sql' ? (copied ? 'Copied SQL' : 'Copy super admin SQL') : selectedStudioRole.invite === 'admin' ? 'Invite admin' : selectedStudioRole.invite === 'employer' ? 'Invite employer' : candidateCopied === 'link' ? 'Copied join link' : 'Copy candidate join link'}
                    </Button>
                    <div className="mt-4 flex gap-3 border-b border-[#eef1ee] text-sm">
                      {([
                        ['access', 'Access'],
                        ['users', `Users (${roleUsers.length})`],
                        ['assign', 'Assign'],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRoleTab(id)}
                          className={`-mb-px border-b-2 pb-2 ${roleTab === id ? 'border-[#14a35a] font-medium text-[#161c19]' : 'border-transparent text-[#8a918c]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {roleTab === 'access' ? (
                      <ul className="mt-4 space-y-4">
                        {selectedStudioRole.groups.map((group) => (
                          <li key={group.title}>
                            <p className="text-sm font-medium">{group.title}</p>
                            <p className="mt-0.5 text-xs text-[#8a918c]">
                              {group.items.length}/{group.items.length} on this desk
                            </p>
                            <ul className="mt-2 space-y-1.5 text-sm text-[#5c635f]">
                              {group.items.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#14a35a]" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {roleTab === 'users' ? (
                      <ul className="mt-4 space-y-2">
                        {roleUsers.slice(0, 8).map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#f7f8f7]"
                              onClick={() => {
                                setPickedPerson(row.id)
                                go('people')
                              }}
                            >
                              <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                {initials(row.name || row.email)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{row.name}</span>
                                <span className="block truncate text-xs text-[#8a918c]">{row.email}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                        {!roleUsers.length ? <li className="text-sm text-[#8a918c]">No accounts with this role yet.</li> : null}
                      </ul>
                    ) : null}
                    {roleTab === 'assign' ? (
                      superAdmin ? (
                        <form className="mt-4 space-y-3" onSubmit={onPromote}>
                          <Input type="email" required placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                          <select className="h-10 w-full rounded-lg border border-[#e4e8e5] px-3 text-sm" value={nextRole} onChange={(e) => setNextRole(e.target.value as typeof nextRole)}>
                            <option value="admin">Admin</option>
                            <option value="employer">Employer</option>
                            <option value="candidate">Candidate</option>
                          </select>
                          <p className="text-xs text-[#8a918c]">Super admin cannot be assigned here. Use SQL in Settings.</p>
                          <Button type="submit" disabled={promote.isPending}>
                            {promote.isPending ? 'Saving…' : 'Update role'}
                          </Button>
                          {promote.isError ? (
                            <p className="text-sm text-[#b85c38]">{promote.error instanceof Error ? promote.error.message : 'Could not update the role.'}</p>
                          ) : null}
                          {promote.isSuccess ? <p className="text-sm text-[#147a48]">Role updated.</p> : null}
                        </form>
                      ) : (
                        <div className="mt-4">
                          <p className="text-sm text-[#5c635f]">Only a super admin can change roles here. Invite an admin, or use SQL for super admin.</p>
                          <Button className="mt-3 w-full" type="button" onClick={() => go('staff')}>
                            Invite Admin
                          </Button>
                        </div>
                      )
                    ) : null}
                  </Panel>
                  <div className="rounded-2xl bg-[#e8f6ee] p-4 text-sm text-[#147a48]">
                    This is a system role. Atelier does not create custom roles such as moderator or support.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === 'candidates' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Candidates</span>
                  </p>
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Candidates</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Manage candidate accounts, packets, and hiring progress.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Button
                      type="button"
                      className="bg-[#147a48] hover:bg-[#0f6a3d]"
                      onClick={() => setCandidateInviteOpen((v) => !v)}
                    >
                      <Plus className="size-4" />
                      Invite Candidate
                    </Button>
                    {candidateInviteOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                          onClick={() => {
                            copyCandidateInvite('link')
                            setCandidateInviteOpen(false)
                          }}
                        >
                          Copy join link
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                          onClick={() => {
                            copyCandidateInvite('note')
                            setCandidateInviteOpen(false)
                          }}
                        >
                          Copy invite note
                        </button>
                        <a
                          href={linkedInPeople}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-3 py-2 hover:bg-[#f3f5f4]"
                          onClick={() => setCandidateInviteOpen(false)}
                        >
                          Find people on LinkedIn
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <Button variant="outline" type="button" onClick={exportCandidates}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <EmployerStat icon={Briefcase} color="#2563eb" label="Total Candidates" value={candidateStats.total} delta={candidateStats.totalDelta} />
                <EmployerStat icon={Check} color="#22c55e" label="Active Candidates" value={candidateStats.active} delta={candidateStats.activeDelta} />
                <EmployerStat icon={Pause} color="#f59e0b" label="Pending" value={candidateStats.pending} delta={candidateStats.pendingDelta} />
                <EmployerStat icon={UserCheck} color="#3b82f6" label="Hired" value={candidateStats.hired} delta={candidateStats.hiredDelta} />
              </div>

              <div className="flex gap-5 overflow-x-auto border-b border-[#e4e8e5] text-sm">
                {(
                  [
                    ['all', 'All Candidates', candidateStats.total],
                    ['active', 'Active', candidateStats.active],
                    ['pending', 'Pending', candidateStats.pending],
                    ['onboarded', 'Onboarded', candidateStats.onboarded],
                    ['hired', 'Hired', candidateStats.hired],
                  ] as const
                ).map(([id, label, n]) => (
                  <button
                    key={id}
                    type="button"
                    className={`-mb-px shrink-0 border-b-2 pb-2.5 ${
                      candidateTab === id ? 'border-[#147a48] font-medium text-[#161c19]' : 'border-transparent text-[#8a918c]'
                    }`}
                    onClick={() => {
                      setCandidateTab(id)
                      setCandidatePage(0)
                    }}
                  >
                    {label} ({n.toLocaleString()})
                  </button>
                ))}
              </div>

              <div className={`grid gap-5 ${candidateOpen && selectedCandidate ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1ee] px-4 py-3">
                    <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                      <Input
                        className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                        placeholder="Search by name, skills, or location"
                        value={candidateQuery}
                        onChange={(e) => {
                          setCandidateQuery(e.target.value)
                          setCandidatePage(0)
                        }}
                      />
                    </label>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={candidateSkill}
                      onChange={(e) => {
                        setCandidateSkill(e.target.value)
                        setCandidatePage(0)
                      }}
                    >
                      <option value="all">All skills</option>
                      {candidateSkills.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={candidateSort}
                      onChange={(e) => {
                        setCandidateSort(e.target.value as typeof candidateSort)
                        setCandidatePage(0)
                      }}
                    >
                      <option value="newest">Newest</option>
                      <option value="name">Name</option>
                      <option value="packets">Packets</option>
                    </select>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setCandidateQuery('')
                        setCandidateTab('all')
                        setCandidateStatus('all')
                        setCandidatePlace('all')
                        setCandidateSkill('all')
                        setCandidateSort('newest')
                        setCandidatePage(0)
                      }}
                    >
                      <ListFilter className="size-4" />
                      Reset
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[44rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="w-10 px-4 py-3 font-medium">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="px-3 py-3 font-medium">Candidate</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Skills</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Location</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Packets</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Hired</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Joined</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidateSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedCandidate?.id === row.id && candidateOpen ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedCandidate(row.id)
                              setCandidateOpen(true)
                              setStaffMenu('')
                            }}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="size-4 rounded border-[#d4dbd6] accent-[#147a48]"
                                checked={selectedCandidate?.id === row.id && candidateOpen}
                                onChange={() => {
                                  setPickedCandidate(row.id)
                                  setCandidateOpen(true)
                                }}
                                aria-label={`Select ${row.name}`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.name || row.email)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block font-medium">{row.name}</span>
                                  <span className="block truncate text-xs text-[#8a918c]">{row.headline || handleFromEmail(row.email) || row.email}</span>
                                </span>
                              </span>
                            </td>
                            <td className="hidden px-3 py-3 lg:table-cell">
                              {(row.skills ?? [])[0] ? (
                                <span className="rounded-md bg-[#eef6ff] px-2 py-0.5 text-xs text-[#1d4ed8]">{row.skills[0]}</span>
                              ) : (
                                <span className="text-[#8a918c]">—</span>
                              )}
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] md:table-cell">{placeLabel(row.city, row.country) || '—'}</td>
                            <td className="hidden px-3 py-3 tabular-nums md:table-cell">{row.packets}</td>
                            <td className="hidden px-3 py-3 tabular-nums lg:table-cell">{row.hired}</td>
                            <td className="px-3 py-3">
                              <StatusDot status={row.status} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{day(row.joinedAt)}</td>
                            <td className="relative px-3 py-3">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full hover:bg-white"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPickedCandidate(row.id)
                                  setCandidateOpen(true)
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {candidateRows.length ? candidatePageSafe * candidatePageSize + 1 : 0}–
                      {Math.min(candidateRows.length, candidatePageSafe * candidatePageSize + candidatePageSize)} of {candidateRows.length} candidates
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-md hover:bg-[#f3f5f4] disabled:opacity-40"
                          disabled={candidatePageSafe === 0}
                          onClick={() => setCandidatePage((p) => Math.max(0, p - 1))}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: candidatePages }, (_, i) => i)
                          .filter((i) => i === 0 || i === candidatePages - 1 || Math.abs(i - candidatePageSafe) <= 1)
                          .reduce<(number | 'gap')[]>((acc, i) => {
                            if (acc.length && acc[acc.length - 1] !== 'gap' && typeof acc[acc.length - 1] === 'number' && i - (acc[acc.length - 1] as number) > 1) acc.push('gap')
                            acc.push(i)
                            return acc
                          }, [])
                          .map((item, idx) =>
                            item === 'gap' ? (
                              <span key={`gap-${idx}`} className="px-1">
                                …
                              </span>
                            ) : (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCandidatePage(item)}
                                className={`grid size-7 place-items-center rounded-md ${candidatePageSafe === item ? 'bg-[#147a48] text-white' : 'hover:bg-[#f3f5f4]'}`}
                              >
                                {item + 1}
                              </button>
                            ),
                          )}
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-md hover:bg-[#f3f5f4] disabled:opacity-40"
                          disabled={candidatePageSafe >= candidatePages - 1}
                          onClick={() => setCandidatePage((p) => Math.min(candidatePages - 1, p + 1))}
                          aria-label="Next page"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2">
                        Show
                        <select
                          className="h-8 rounded-lg border border-[#e4e8e5] bg-white px-2"
                          value={candidatePageSize}
                          onChange={(e) => {
                            setCandidatePageSize(Number(e.target.value))
                            setCandidatePage(0)
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        per page
                      </label>
                    </div>
                  </div>
                </Panel>

                {candidateOpen && selectedCandidate ? (
                  <Panel className="h-fit p-0">
                    <div className="flex items-start justify-between gap-3 border-b border-[#eef1ee] px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#161c19]">Candidate Details</p>
                      </div>
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-full text-[#8a918c] hover:bg-[#f3f5f4]"
                        aria-label="Close details"
                        onClick={() => setCandidateOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="space-y-5 px-5 py-5">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-sans text-lg font-semibold leading-snug text-[#161c19]">{selectedCandidate.name}</h2>
                          <StatusDot status={selectedCandidate.status} />
                        </div>
                        <p className="mt-1 text-sm text-[#8a918c]">Joined {day(selectedCandidate.joinedAt)}</p>
                        <p className="mt-3 text-sm leading-relaxed text-[#5c635f]">
                          {selectedCandidate.headline || 'No profile headline yet.'}
                        </p>
                      </div>
                      {selectedCandidate.skills.length ? (
                        <div>
                          <SkillPills skills={selectedCandidate.skills} all />
                        </div>
                      ) : null}
                      <ul className="space-y-2.5 text-sm text-[#5c635f]">
                        <li className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0 text-[#8a918c]" />
                          {placeLabel(selectedCandidate.city, selectedCandidate.country) || 'Location not set'}
                        </li>
                        <li className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-[#8a918c]" />
                          {selectedCandidate.packets} packets
                        </li>
                        <li className="flex items-center gap-2">
                          <UserCheck className="size-4 shrink-0 text-[#8a918c]" />
                          {selectedCandidate.hired} hired
                        </li>
                        <li className="flex items-center gap-2">
                          <Timer className="size-4 shrink-0 text-[#8a918c]" />
                          {formatHoursMinutes(selectedCandidate.hours)} tracked
                        </li>
                      </ul>
                      <div className="rounded-2xl border border-[#eef1ee] p-3">
                        <p className="text-xs font-medium text-[#8a918c]">Account</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-[#e8f6ee] text-sm font-semibold text-[#147a48]">
                            {initials(selectedCandidate.name || selectedCandidate.email)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{selectedCandidate.name}</p>
                            <p className="truncate text-xs text-[#8a918c]">{selectedCandidate.email}</p>
                          </div>
                        </div>
                        {selectedCandidate.onboarded ? (
                          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-xs font-medium text-[#147a48]">
                            <Check className="size-3.5" />
                            Onboarded
                          </span>
                        ) : (
                          <span className="mt-3 inline-flex rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-medium text-[#b45309]">Setup incomplete</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{selectedCandidate.packets}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Packets</p>
                        </div>
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{selectedCandidate.hired}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Hired</p>
                        </div>
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{formatHoursMinutes(selectedCandidate.hours)}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Hours</p>
                        </div>
                      </div>
                      {candidatePackets.length ? (
                        <div>
                          <p className="text-sm font-medium">Recent packets</p>
                          <ul className="mt-2 space-y-2 text-sm">
                            {candidatePackets.slice(0, 3).map((row) => (
                              <li key={row.id} className="rounded-xl bg-[#f7f8f7] px-3 py-2">
                                <p className="font-medium">{row.jobTitle}</p>
                                <p className="text-xs text-[#8a918c]">
                                  {row.company} · {prettyStatus(row.status)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Button className="w-full bg-[#147a48] hover:bg-[#0f6a3d]" type="button" onClick={() => go('packets')}>
                          View packets
                        </Button>
                        <Button variant="outline" className="w-full" type="button" onClick={() => void navigator.clipboard.writeText(selectedCandidate.email)}>
                          Copy email
                        </Button>
                        <Button variant="outline" className="w-full" type="button" onClick={() => go('inbox')}>
                          Message
                        </Button>
                      </div>
                    </div>
                  </Panel>
                ) : null}
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
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Employers</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Manage hiring accounts, posted jobs, and pay on Atelier.</p>
                </div>
                <Button type="button" onClick={() => go('invite')}>
                  <Plus className="size-4" />
                  Add Employer
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[36rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Employer</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Company</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Industry</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Paid out</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Jobs</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Joined</th>
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
                            <td className="hidden px-3 py-3 md:table-cell">{row.company}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{row.industry || '—'}</td>
                            <td className="hidden px-3 py-3 lg:table-cell">{money(row.spent)}</td>
                            <td className="hidden px-3 py-3 md:table-cell">{row.jobs}</td>
                            <td className="px-3 py-3">
                              <StatusDot status={row.status} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{day(row.joinedAt)}</td>
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
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
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
            <div className="space-y-5">
              {peopleInviteKind ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                  <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close invite" onClick={closeAddUser} />
                  <Panel className="relative z-10 w-full max-w-md p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-sans text-lg font-semibold">
                          {peopleInviteKind === 'admin' ? 'Invite admin' : peopleInviteKind === 'employer' ? 'Invite employer' : 'Invite candidate'}
                        </h2>
                        <p className="mt-1 text-sm text-[#5c635f]">
                          {peopleInviteKind === 'admin'
                            ? 'They get the admin desk. Signup still cannot grant admin on its own.'
                            : peopleInviteKind === 'employer'
                              ? 'They create a hiring account. Approved packets land in their inbox.'
                              : 'They create a candidate account. Packets leave only after they approve.'}
                        </p>
                      </div>
                      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={closeAddUser}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <form className="mt-5 space-y-4" onSubmit={onAddUserSubmit}>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          Email <span className="text-[#b85c38]">*</span>
                        </span>
                        <Input
                          type="email"
                          required
                          placeholder="name@company.com"
                          value={peopleInviteEmail}
                          onChange={(e) => setPeopleInviteEmail(e.target.value)}
                        />
                      </label>
                      {peopleInviteKind === 'employer' ? (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">
                            Company <span className="text-[#b85c38]">*</span>
                          </span>
                          <Input
                            required
                            placeholder="Company name"
                            value={peopleInviteCompany}
                            onChange={(e) => setPeopleInviteCompany(e.target.value)}
                          />
                        </label>
                      ) : null}
                      {peopleInviteNotice ? (
                        <p className={`text-sm ${inviteUser.isError ? 'text-[#b85c38]' : 'text-[#147a48]'}`}>{peopleInviteNotice}</p>
                      ) : null}
                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <Button variant="outline" type="button" onClick={copyAddUserLink}>
                          <Copy className="size-4" />
                          Copy join link
                        </Button>
                        <Button type="submit" disabled={inviteUser.isPending || !peopleInviteEmail.trim()}>
                          {inviteUser.isPending ? 'Sending…' : 'Send invite'}
                        </Button>
                      </div>
                    </form>
                  </Panel>
                </div>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Users</span>
                  </p>
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Users</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Invite people to Atelier, then review candidate, employer, and admin accounts.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Button type="button" onClick={() => setPeopleInviteOpen((v) => !v)}>
                      <Plus className="size-4" />
                      Add User
                    </Button>
                    {peopleInviteOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                          onClick={() => openAddUser('candidate')}
                        >
                          Invite candidate
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                          onClick={() => openAddUser('employer')}
                        >
                          Invite employer
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                          onClick={() => openAddUser('admin')}
                        >
                          Invite admin
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Button variant="outline" type="button" onClick={exportUsers}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EmployerStat icon={Users} color="#14a35a" label="Total Users" value={userStats.total} delta={userStats.totalDelta} />
                <EmployerStat icon={User} color="#3b82f6" label="Candidates" value={userStats.candidates} delta={userStats.candidatesDelta} />
                <EmployerStat icon={Building2} color="#22c55e" label="Employers" value={userStats.employers} delta={userStats.employersDelta} />
                <EmployerStat icon={Shield} color="#8b5cf6" label="Admins" value={userStats.admins} delta={userStats.adminsDelta} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                  <Input
                    className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                    placeholder="Search users by name, email, or ID"
                    value={peopleQuery}
                    onChange={(e) => {
                      setPeopleQuery(e.target.value)
                      setPeoplePage(0)
                    }}
                  />
                </label>
                <select
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                  value={peopleType}
                  onChange={(e) => {
                    setPeopleType(e.target.value as UserTypeFilter)
                    setPeoplePage(0)
                  }}
                >
                  <option value="all">All types</option>
                  <option value="candidate">Candidates</option>
                  <option value="employer">Employers</option>
                  <option value="admin">Admins</option>
                </select>
                <select
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                  value={peopleStatus}
                  onChange={(e) => {
                    setPeopleStatus(e.target.value as typeof peopleStatus)
                    setPeoplePage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                  value={peopleCountry}
                  onChange={(e) => {
                    setPeopleCountry(e.target.value)
                    setPeoplePage(0)
                  }}
                >
                  <option value="all">All countries</option>
                  {userCountries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[36rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-3 py-3 font-medium">Type</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Email</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Country</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Joined</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Last active</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedUser?.id === row.id ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => pickPerson(row)}
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="grid size-9 place-items-center rounded-full bg-[#e8f6ee] text-xs font-medium text-[#147a48]">
                                  {initials(row.name || row.email)}
                                </span>
                                <span>
                                  <span className="block font-medium">{row.name}</span>
                                  <span className="block text-xs text-[#8a918c]">{shortUserId(row.id)}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <RoleChip role={row.role} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{row.email}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] md:table-cell">{row.country || '—'}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{day(row.joinedAt)}</td>
                            <td className="px-3 py-3">
                              <StatusDot status={accountStatus(row)} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{ago(row.lastActive || row.joinedAt)}</td>
                            <td className="relative px-3 py-3">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full hover:bg-white"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  pickPerson(row)
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
                                      openUserDesk(row)
                                    }}
                                  >
                                    View profile
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
                    {!userSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No users match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {userRows.length ? userPageSafe * pageSize + 1 : 0}-{Math.min(userRows.length, userPageSafe * pageSize + pageSize)} of {userRows.length} users
                    </p>
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
                      {Array.from({ length: userPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPeoplePage(i)}
                          className={`grid size-7 place-items-center rounded-md ${userPageSafe === i ? 'bg-[#13261f] text-white' : 'hover:bg-[#f3f5f4]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </Panel>

                <div className="space-y-4">
                  {selectedUser ? (
                    <Panel>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">User details</p>
                        <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={() => setPickedPerson('')}>
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <span className="grid size-14 place-items-center rounded-full bg-[#e8f6ee] text-base font-semibold text-[#147a48]">
                          {initials(selectedUser.name || selectedUser.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{selectedUser.name}</p>
                          <p className="text-xs text-[#8a918c]">{shortUserId(selectedUser.id)}</p>
                          <div className="mt-1">
                            <StatusDot status={accountStatus(selectedUser)} />
                          </div>
                        </div>
                      </div>
                      <Button className="mt-4 w-full" type="button" onClick={() => openUserDesk(selectedUser)}>
                        View profile
                      </Button>
                      {selectedUser.role === 'super_admin' ? (
                        <p className="mt-2 rounded-xl bg-[#f7f8f7] px-3 py-2 text-xs text-[#5c635f]">Super admin is SQL only.</p>
                      ) : superAdmin ? (
                        <form
                          className="mt-2 space-y-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            changeUserRole.mutate({ email: selectedUser.email, role: peopleNextRole })
                          }}
                        >
                          <select
                            className="h-10 w-full rounded-lg border border-[#e4e8e5] px-3 text-sm"
                            value={peopleNextRole}
                            onChange={(e) => setPeopleNextRole(e.target.value as typeof peopleNextRole)}
                          >
                            <option value="candidate">Candidate</option>
                            <option value="employer">Employer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button variant="outline" className="w-full" type="submit" disabled={changeUserRole.isPending}>
                            {changeUserRole.isPending ? 'Saving…' : 'Save role'}
                          </Button>
                          {changeUserRole.isError ? (
                            <p className="text-sm text-[#b85c38]">
                              {changeUserRole.error instanceof Error ? changeUserRole.error.message : 'Could not update the role.'}
                            </p>
                          ) : null}
                          {changeUserRole.isSuccess ? <p className="text-sm text-[#147a48]">Role updated.</p> : null}
                        </form>
                      ) : selectedUser.role === 'admin' ? (
                        <p className="mt-2 rounded-xl bg-[#f7f8f7] px-3 py-2 text-xs text-[#5c635f]">Only a super admin can change an admin’s role.</p>
                      ) : (
                        <Button
                          variant="outline"
                          className="mt-2 w-full"
                          type="button"
                          disabled={inviteUser.isPending}
                          onClick={() => {
                            setPeopleInviteNotice('')
                            inviteUser.mutate({ email: selectedUser.email, role: 'admin' })
                          }}
                        >
                          {inviteUser.isPending ? 'Saving…' : 'Make admin'}
                        </Button>
                      )}
                      {!peopleInviteKind && peopleInviteNotice ? (
                        <p className={`mt-2 text-sm ${inviteUser.isError ? 'text-[#b85c38]' : 'text-[#147a48]'}`}>{peopleInviteNotice}</p>
                      ) : null}
                      <div className="mt-5">
                        <p className="text-sm font-medium">Account</p>
                        <dl className="mt-3 space-y-3 text-sm">
                          <OverviewRow label="Email" value={selectedUser.email} />
                          <OverviewRow label="Type" value={prettyRole(selectedUser.role)} />
                          <OverviewRow label="Location" value={placeLabel(selectedUser.city, selectedUser.country) || '—'} />
                          <OverviewRow label="Company" value={selectedUser.companyName || '—'} />
                          <OverviewRow label="Joined" value={day(selectedUser.joinedAt)} />
                          <OverviewRow label="Last active" value={ago(selectedUser.lastActive || selectedUser.joinedAt)} />
                          <OverviewRow label="Onboarded" value={selectedUser.onboarded ? 'Yes' : 'Not yet'} />
                        </dl>
                      </div>
                      {selectedUserCandidate ? (
                        <div className="mt-5">
                          <p className="text-sm font-medium">Candidate</p>
                          <dl className="mt-3 space-y-3 text-sm">
                            <OverviewRow label="Packets" value={String(selectedUserCandidate.packets)} />
                            <OverviewRow label="Hired" value={String(selectedUserCandidate.hired)} />
                            <OverviewRow label="Tracker" value={formatHoursMinutes(selectedUserCandidate.hours)} />
                          </dl>
                        </div>
                      ) : null}
                      {selectedUserEmployer ? (
                        <div className="mt-5">
                          <p className="text-sm font-medium">Employer</p>
                          <dl className="mt-3 space-y-3 text-sm">
                            <OverviewRow label="Jobs" value={String(selectedUserEmployer.jobs)} />
                            <OverviewRow label="Packets" value={String(selectedUserEmployer.packets)} />
                            <OverviewRow label="Hired" value={String(selectedUserEmployer.hired)} />
                            <OverviewRow label="Paid out" value={money(selectedUserEmployer.spent)} />
                          </dl>
                        </div>
                      ) : null}
                      <div className="mt-5 divide-y divide-[#eef1ee]">
                        <QuickRow icon={Mail} label="Copy email" onClick={() => void navigator.clipboard.writeText(selectedUser.email)} />
                        <QuickRow icon={MessagesSquare} label="Open inbox" onClick={() => go('inbox')} />
                        {selectedUser.role === 'candidate' ? (
                          <QuickRow icon={Copy} label="Copy candidate join link" onClick={() => copyCandidateInvite('link')} />
                        ) : null}
                        {selectedUser.role === 'employer' ? (
                          <QuickRow icon={UserPlus} label="Invite employers" onClick={() => go('invite')} />
                        ) : null}
                        {isStaffRole(selectedUser.role) ? (
                          <QuickRow icon={UserPlus} label="Invite admin" onClick={() => go('staff')} />
                        ) : null}
                      </div>
                    </Panel>
                  ) : (
                    <Panel>
                      <p className="text-sm text-[#8a918c]">Select a user to see their account.</p>
                    </Panel>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {view === 'listings' ? (
            <div className="space-y-5">
              {jobPostOpen ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                  <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close post job" onClick={() => setJobPostOpen(false)} />
                  <Panel className="relative z-10 w-full max-w-lg p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-sans text-lg font-semibold">Post a Job</h2>
                        <p className="mt-1 text-sm text-[#5c635f]">Publish an Atelier listing for an employer. Packets land in their inbox after the candidate approves.</p>
                      </div>
                      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-[#f3f5f4]" aria-label="Close" onClick={() => setJobPostOpen(false)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    {jobEmployers.length ? (
                      <form
                        className="mt-5 space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          setJobPostNotice('')
                          if (!jobPostEmployer) {
                            setJobPostNotice('Choose an employer.')
                            return
                          }
                          postAdminJob.mutate({
                            employerId: jobPostEmployer,
                            title: jobPostTitle,
                            description: jobPostDescription,
                            location: jobPostLocation,
                            remote: jobPostRemote,
                            employmentType: jobPostEmployment,
                            salaryMin: jobPostSalaryMin ? Number(jobPostSalaryMin) : undefined,
                            salaryMax: jobPostSalaryMax ? Number(jobPostSalaryMax) : undefined,
                            currency: jobPostCurrency,
                            skills: jobPostSkills,
                          })
                        }}
                      >
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">
                            Employer <span className="text-[#b85c38]">*</span>
                          </span>
                          <select
                            required
                            className="h-10 w-full rounded-lg border border-[#e4e8e5] bg-white px-3 text-sm"
                            value={jobPostEmployer}
                            onChange={(e) => setJobPostEmployer(e.target.value)}
                          >
                            <option value="">Select employer</option>
                            {jobEmployers.map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.company || row.name} · {row.email}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">
                            Job title <span className="text-[#b85c38]">*</span>
                          </span>
                          <Input required value={jobPostTitle} onChange={(e) => setJobPostTitle(e.target.value)} placeholder="React Developer for SaaS Platform" />
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">
                            Description <span className="text-[#b85c38]">*</span>
                          </span>
                          <textarea
                            required
                            className="min-h-28 w-full rounded-lg border border-[#e4e8e5] bg-white px-3 py-2 text-sm"
                            value={jobPostDescription}
                            onChange={(e) => setJobPostDescription(e.target.value)}
                            placeholder="What the role does, the stack, and who should apply."
                          />
                          <p className={`text-xs ${jobPostDescription.trim().length >= 40 ? 'text-[#8a918c]' : 'text-[#b85c38]'}`}>
                            {jobPostDescription.trim().length}/40 characters minimum
                          </p>
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">Skills (comma separated)</span>
                          <Input value={jobPostSkills} onChange={(e) => setJobPostSkills(e.target.value)} placeholder="React, TypeScript, Node.js" />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium">Location</span>
                            <Input value={jobPostLocation} onChange={(e) => setJobPostLocation(e.target.value)} />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium">Type</span>
                            <select
                              className="h-10 w-full rounded-lg border border-[#e4e8e5] bg-white px-3 text-sm"
                              value={jobPostEmployment}
                              onChange={(e) => setJobPostEmployment(e.target.value as EmploymentType)}
                            >
                              {(['full-time', 'part-time', 'contract', 'freelance'] as const).map((t) => (
                                <option key={t} value={t}>
                                  {prettyEmployment(t)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium">Salary min</span>
                            <Input type="number" min={0} value={jobPostSalaryMin} onChange={(e) => setJobPostSalaryMin(e.target.value)} placeholder="Optional" />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium">Salary max</span>
                            <Input type="number" min={0} value={jobPostSalaryMax} onChange={(e) => setJobPostSalaryMax(e.target.value)} placeholder="Optional" />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium">Currency</span>
                            <select
                              className="h-10 w-full rounded-lg border border-[#e4e8e5] bg-white px-3 text-sm"
                              value={jobPostCurrency}
                              onChange={(e) => setJobPostCurrency(e.target.value as Currency)}
                            >
                              {(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PHP', 'CHF'] as const).map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center gap-2 pt-6 text-sm">
                            <input type="checkbox" checked={jobPostRemote} onChange={(e) => setJobPostRemote(e.target.checked)} />
                            Remote
                          </label>
                        </div>
                        {jobPostNotice ? (
                          <p className={`text-sm ${postAdminJob.isError || jobPostNotice.startsWith('Choose') ? 'text-[#b85c38]' : 'text-[#147a48]'}`}>{jobPostNotice}</p>
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                          <Button variant="outline" type="button" onClick={() => setJobPostOpen(false)}>
                            Cancel
                          </Button>
                          <Button className="bg-[#147a48] hover:bg-[#0f6a3d]" type="submit" disabled={postAdminJob.isPending}>
                            {postAdminJob.isPending ? 'Publishing…' : 'Publish job'}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-5">
                        <p className="text-sm text-[#5c635f]">Invite an employer first. Jobs on Atelier are posted for a hiring account so packets have an inbox.</p>
                        <Button
                          className="mt-4 bg-[#147a48] hover:bg-[#0f6a3d]"
                          type="button"
                          onClick={() => {
                            setJobPostOpen(false)
                            go('invite')
                          }}
                        >
                          Invite employer
                        </Button>
                      </div>
                    )}
                  </Panel>
                </div>
              ) : null}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Jobs</span>
                  </p>
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Jobs</h1>
                  <p className="mt-1 text-sm text-[#5c635f]">Manage job postings, monitor packets, and track hiring progress.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="bg-[#147a48] hover:bg-[#0f6a3d]"
                    onClick={() => {
                      setJobPostNotice('')
                      setJobPostOpen(true)
                      if (!jobPostEmployer && jobEmployers[0]) setJobPostEmployer(jobEmployers[0].id)
                    }}
                  >
                    <Plus className="size-4" />
                    Post a Job
                  </Button>
                  <Button variant="outline" type="button" onClick={exportJobs}>
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <EmployerStat icon={Briefcase} color="#2563eb" label="Total Jobs" value={jobStats.total} delta={jobStats.totalDelta} />
                <EmployerStat icon={Check} color="#22c55e" label="Atelier" value={jobStats.atelier} delta={jobStats.atelierDelta} />
                <EmployerStat icon={Pause} color="#f59e0b" label="Board listings" value={jobStats.boards} delta={jobStats.boardsDelta} />
                <EmployerStat icon={UserCheck} color="#3b82f6" label="With packets" value={jobStats.packets} delta={jobStats.packetsDelta} />
              </div>

              <div className="flex gap-5 overflow-x-auto border-b border-[#e4e8e5] text-sm">
                {(
                  [
                    ['all', 'All Jobs', jobStats.total],
                    ['atelier', 'Atelier', jobStats.atelier],
                    ['boards', 'Boards', jobStats.boards],
                    ['remote', 'Remote', jobStats.remote],
                    ['packets', 'With packets', jobStats.packets],
                  ] as const
                ).map(([id, label, n]) => (
                  <button
                    key={id}
                    type="button"
                    className={`-mb-px shrink-0 border-b-2 pb-2.5 ${
                      jobTab === id ? 'border-[#147a48] font-medium text-[#161c19]' : 'border-transparent text-[#8a918c]'
                    }`}
                    onClick={() => {
                      setJobTab(id)
                      setJobPage(0)
                    }}
                  >
                    {label} ({n.toLocaleString()})
                  </button>
                ))}
              </div>

              <div className={`grid gap-5 ${jobOpen && selectedJob ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1ee] px-4 py-3">
                    <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a918c]" />
                      <Input
                        className="h-10 rounded-xl border-[#e4e8e5] bg-white pl-10"
                        placeholder="Search jobs by title, client, or keyword..."
                        value={jobQuery}
                        onChange={(e) => {
                          setJobQuery(e.target.value)
                          setJobPage(0)
                        }}
                      />
                    </label>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={jobSource}
                      onChange={(e) => {
                        setJobSource(e.target.value)
                        setJobPage(0)
                      }}
                    >
                      <option value="all">All categories</option>
                      {jobSources.map((item) => (
                        <option key={item} value={item}>
                          {sourceLabel(item)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={jobType}
                      onChange={(e) => {
                        setJobType(e.target.value)
                        setJobPage(0)
                      }}
                    >
                      <option value="all">All job types</option>
                      {jobTypes.map((item) => (
                        <option key={item} value={item}>
                          {prettyEmployment(item)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={jobStatus}
                      onChange={(e) => {
                        setJobStatus(e.target.value as typeof jobStatus)
                        setJobPage(0)
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="atelier">Atelier</option>
                      <option value="open">Open boards</option>
                    </select>
                    <select
                      className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
                      value={jobSort}
                      onChange={(e) => {
                        setJobSort(e.target.value as typeof jobSort)
                        setJobPage(0)
                      }}
                    >
                      <option value="newest">Newest</option>
                      <option value="title">Title</option>
                      <option value="applicants">Packets</option>
                    </select>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setJobQuery('')
                        setJobTab('all')
                        setJobSource('all')
                        setJobType('all')
                        setJobStatus('all')
                        setJobSort('newest')
                        setJobPage(0)
                      }}
                    >
                      <ListFilter className="size-4" />
                      Reset
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[44rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="w-10 px-4 py-3 font-medium">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="px-3 py-3 font-medium">Job Title</th>
                          <th className="px-3 py-3 font-medium">Client</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Category</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Type</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Budget</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Applicants</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Posted Date</th>
                          <th className="px-3 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobSlice.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-[#eef1ee] ${selectedJob?.id === row.id && jobOpen ? 'bg-[#f3f8f5]' : 'hover:bg-[#f7f8f7]'}`}
                            onClick={() => {
                              setPickedJob(row.id)
                              setJobOpen(true)
                              setStaffMenu('')
                            }}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="size-4 rounded border-[#d4dbd6] accent-[#147a48]"
                                checked={selectedJob?.id === row.id && jobOpen}
                                onChange={() => {
                                  setPickedJob(row.id)
                                  setJobOpen(true)
                                }}
                                aria-label={`Select ${row.title}`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <span className="block font-medium leading-snug">{row.title}</span>
                              <span className="mt-0.5 block text-xs text-[#8a918c]">{sourceLabel(row.source)}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-2.5">
                                <span
                                  className="grid size-8 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold text-white"
                                  style={{ background: companyMark(row.company) }}
                                >
                                  {initials(row.company)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{row.company}</span>
                                  {row.atelier ? <span className="block text-[0.65rem] text-[#147a48]">Atelier employer</span> : null}
                                </span>
                              </span>
                            </td>
                            <td className="hidden px-3 py-3 lg:table-cell">
                              {(row.skills ?? [])[0] ? (
                                <span className="rounded-md bg-[#eef6ff] px-2 py-0.5 text-xs text-[#1d4ed8]">{row.skills[0]}</span>
                              ) : (
                                <span className="text-[#8a918c]">—</span>
                              )}
                            </td>
                            <td className="hidden px-3 py-3 md:table-cell">
                              <JobTypeChip type={row.employmentType} />
                            </td>
                            <td className="hidden px-3 py-3 tabular-nums text-[#5c635f] lg:table-cell">{jobBudget(row)}</td>
                            <td className="hidden px-3 py-3 tabular-nums md:table-cell">{row.applicants}</td>
                            <td className="px-3 py-3">
                              <JobStatusChip atelier={row.atelier} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{day(row.postedAt)}</td>
                            <td className="relative px-3 py-3">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full hover:bg-white"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPickedJob(row.id)
                                  setJobOpen(true)
                                  setStaffMenu(staffMenu === row.id ? '' : row.id)
                                }}
                              >
                                <MoreHorizontal className="size-4 text-[#8a918c]" />
                              </button>
                              {staffMenu === row.id ? (
                                <div className="absolute right-3 z-20 w-44 overflow-hidden rounded-xl border border-[#e4e8e5] bg-white py-1 text-sm shadow-[0_8px_24px_rgba(19,38,31,0.12)]">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setStaffMenu('')
                                      setPacketQuery(row.title)
                                      setPacketCompany(row.company || 'all')
                                      setPacketPage(0)
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
                                      void navigator.clipboard.writeText(jobPublicHref(row, candidateOrigin))
                                      setStaffMenu('')
                                    }}
                                  >
                                    Copy listing
                                  </button>
                                  {!row.atelier ? (
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left hover:bg-[#f3f5f4]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setStaffMenu('')
                                        go('invite')
                                      }}
                                    >
                                      Invite employer
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!jobSlice.length ? <p className="px-4 py-8 text-sm text-[#8a918c]">No jobs match this search.</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1ee] px-4 py-3 text-xs text-[#8a918c]">
                    <p>
                      Showing {searchListings.length ? jobPageSafe * jobPageSize + 1 : 0}–
                      {Math.min(searchListings.length, jobPageSafe * jobPageSize + jobPageSize)} of {searchListings.length} jobs
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-md hover:bg-[#f3f5f4] disabled:opacity-40"
                          disabled={jobPageSafe === 0}
                          onClick={() => setJobPage((p) => Math.max(0, p - 1))}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: jobPages }, (_, i) => i)
                          .filter((i) => i === 0 || i === jobPages - 1 || Math.abs(i - jobPageSafe) <= 1)
                          .reduce<(number | 'gap')[]>((acc, i) => {
                            if (acc.length && acc[acc.length - 1] !== 'gap' && typeof acc[acc.length - 1] === 'number' && i - (acc[acc.length - 1] as number) > 1) acc.push('gap')
                            acc.push(i)
                            return acc
                          }, [])
                          .map((item, idx) =>
                            item === 'gap' ? (
                              <span key={`gap-${idx}`} className="px-1">
                                …
                              </span>
                            ) : (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setJobPage(item)}
                                className={`grid size-7 place-items-center rounded-md ${jobPageSafe === item ? 'bg-[#147a48] text-white' : 'hover:bg-[#f3f5f4]'}`}
                              >
                                {item + 1}
                              </button>
                            ),
                          )}
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-md hover:bg-[#f3f5f4] disabled:opacity-40"
                          disabled={jobPageSafe >= jobPages - 1}
                          onClick={() => setJobPage((p) => Math.min(jobPages - 1, p + 1))}
                          aria-label="Next page"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2">
                        Show
                        <select
                          className="h-8 rounded-lg border border-[#e4e8e5] bg-white px-2"
                          value={jobPageSize}
                          onChange={(e) => {
                            setJobPageSize(Number(e.target.value))
                            setJobPage(0)
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        per page
                      </label>
                    </div>
                  </div>
                </Panel>

                {jobOpen && selectedJob ? (
                  <Panel className="h-fit p-0">
                    <div className="flex items-start justify-between gap-3 border-b border-[#eef1ee] px-5 py-4">
                      <p className="text-sm font-medium text-[#161c19]">Job Details</p>
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-full text-[#8a918c] hover:bg-[#f3f5f4]"
                        aria-label="Close details"
                        onClick={() => setJobOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="space-y-5 px-5 py-5">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-sans text-lg font-semibold leading-snug text-[#161c19]">{selectedJob.title}</h2>
                          <JobStatusChip atelier={selectedJob.atelier} />
                        </div>
                        <p className="mt-1 text-sm text-[#8a918c]">Posted {day(selectedJob.postedAt)}</p>
                        <p className="mt-3 text-sm leading-relaxed text-[#5c635f]">
                          {selectedJob.description || 'No description on this listing.'}
                        </p>
                      </div>
                      {(selectedJob.skills ?? []).length ? <SkillPills skills={selectedJob.skills ?? []} all /> : null}
                      <ul className="space-y-2.5 text-sm text-[#5c635f]">
                        <li className="flex items-center gap-2">
                          <Briefcase className="size-4 shrink-0 text-[#8a918c]" />
                          {(selectedJob.skills ?? [])[0] || sourceLabel(selectedJob.source)}
                        </li>
                        <li className="flex items-center gap-2">
                          <DollarSign className="size-4 shrink-0 text-[#8a918c]" />
                          {jobBudget(selectedJob)}
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="size-4 shrink-0 text-[#8a918c]" />
                          {prettyEmployment(selectedJob.employmentType)}
                          {selectedJob.seniority ? ` · ${prettyEmployment(selectedJob.seniority)}` : ''}
                        </li>
                        <li className="flex items-center gap-2">
                          <Globe className="size-4 shrink-0 text-[#8a918c]" />
                          {selectedJob.location || (selectedJob.remote ? 'Remote' : 'Location not set')}
                        </li>
                      </ul>
                      <div className="rounded-2xl border border-[#eef1ee] p-3">
                        <p className="text-xs font-medium text-[#8a918c]">Posted by</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span
                            className="grid size-10 place-items-center rounded-full text-sm font-semibold text-white"
                            style={{ background: companyMark(selectedJob.company) }}
                          >
                            {initials(selectedJob.company)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{selectedJob.company}</p>
                            <p className="truncate text-xs text-[#8a918c]">{selectedJob.atelier ? 'Atelier employer' : sourceLabel(selectedJob.source)}</p>
                          </div>
                        </div>
                        {selectedJob.atelier ? (
                          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-xs font-medium text-[#147a48]">
                            <Check className="size-3.5" />
                            Atelier listing
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{selectedJob.applicants}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Applicants</p>
                        </div>
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{selectedJob.shortlisted}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Shortlisted</p>
                        </div>
                        <div className="rounded-xl bg-[#f7f8f7] py-3">
                          <p className="text-lg font-semibold tabular-nums">{selectedJob.hired}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[#8a918c]">Hired</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-[#147a48] hover:bg-[#0f6a3d]"
                          type="button"
                          onClick={() => {
                            setPacketQuery(selectedJob.title)
                            setPacketCompany(selectedJob.company || 'all')
                            setPacketPage(0)
                            go('packets')
                          }}
                        >
                          View Applications
                        </Button>
                        {selectedJob.atelier ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            type="button"
                            onClick={() => {
                              const hit = jobEmployers.find(
                                (row) =>
                                  (selectedJob.employerId && row.id === selectedJob.employerId) ||
                                  row.company.trim().toLowerCase() === selectedJob.company.trim().toLowerCase(),
                              )
                              if (hit) setPickedEmployer(hit.id)
                              go('employers')
                            }}
                          >
                            View employer
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" type="button" onClick={() => go('invite')}>
                            Invite employer
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(jobPublicHref(selectedJob, candidateOrigin))}
                        >
                          Copy listing
                        </Button>
                        {!selectedJob.atelier ? (
                          <a
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#e4e8e5] bg-white text-sm font-medium hover:bg-[#f7f8f7]"
                            href={jobPublicHref(selectedJob, candidateOrigin)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="size-4" />
                            Official board
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </Panel>
                ) : null}
              </div>
            </div>
          ) : null}

          {view === 'packets' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#8a918c]">
                    Admin <span className="text-[#c5cbc7]">›</span> <span className="text-[#161c19]">Packets</span>
                  </p>
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Packets</h1>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EmployerStat icon={FileText} color="#14a35a" label="Total Packets" value={packetStats.total} delta={packetStats.totalDelta} />
                <EmployerStat icon={Send} color="#3b82f6" label="Pending review" value={packetStats.pending} delta={packetStats.pendingDelta} />
                <EmployerStat icon={Check} color="#22c55e" label="Hired / offer" value={packetStats.accepted} delta={packetStats.acceptedDelta} />
                <EmployerStat icon={X} color="#ef4444" label="Declined" value={packetStats.declined} delta={packetStats.declinedDelta} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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

              <div className={`grid gap-5 ${packetOpen && selectedPacket ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[36rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Candidate</th>
                          <th className="px-3 py-3 font-medium">Role</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Employer</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Submitted</th>
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
                            <td className="hidden px-3 py-3 md:table-cell">{row.company || '—'}</td>
                            <td className="px-3 py-3">
                              <PacketDot status={row.status} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{ago(row.submittedAt || row.createdAt)}</td>
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
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
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
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Contracts</h1>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EmployerStat icon={FileSignature} color="#14a35a" label="Total contracts" value={contractStats.total} delta={contractStats.totalDelta} />
                <EmployerStat icon={CirclePlay} color="#22c55e" label="Active contracts" value={contractStats.active} delta={contractStats.activeDelta} />
                <EmployerStat icon={Check} color="#16a34a" label="Completed" value={contractStats.completed} delta={contractStats.completedDelta} />
                <EmployerStat icon={Pause} color="#ef4444" label="Cancelled" value={contractStats.cancelled} delta={contractStats.cancelledDelta} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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

              <div className={`grid gap-5 ${contractOpen && selectedContract ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[40rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-3 py-3 font-medium">Candidate</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Employer</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Type</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Amount</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Start</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">End</th>
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
                            <td className="hidden px-3 py-3 md:table-cell">{row.company || '—'}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{prettyContractType(row.type)}</td>
                            <td className="hidden px-3 py-3 tabular-nums md:table-cell">{row.amount ? money(row.amount, data?.finance?.currency) : '—'}</td>
                            <td className="px-3 py-3">
                              <ContractDot phase={row.phase} />
                            </td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{day(row.startedAt)}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">{row.endedAt ? day(row.endedAt) : '—'}</td>
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
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
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
                  <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-[#161c19] sm:text-[1.75rem]">Payments</h1>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MoneyStat icon={DollarSign} color="#14a35a" label="Total volume" value={data?.finance?.received ?? 0} currency={data?.finance?.currency} delta={payStats.receivedDelta} />
                <MoneyStat icon={Clock} color="#3b82f6" label="Pending" value={data?.finance?.pending ?? 0} currency={data?.finance?.currency} delta={payStats.pendingDelta} />
                <MoneyStat icon={ArrowDownToLine} color="#8b5cf6" label="Candidate payouts" value={data?.finance?.withdrawn ?? 0} currency={data?.finance?.currency} delta={payStats.withdrawnDelta} />
                <MoneyStat icon={Building2} color="#14a35a" label="Available" value={data?.finance?.available ?? 0} currency={data?.finance?.currency} delta={payStats.availableDelta} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.75fr)]">
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
                <label className="relative min-w-0 w-full flex-1 sm:min-w-[16rem]">
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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
                  className="h-10 w-full min-w-0 rounded-xl border border-[#e4e8e5] bg-white px-3 text-sm sm:w-auto"
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

              <div className={`grid gap-5 ${payOpen && selectedPay ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
                <Panel className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 text-left text-sm md:min-w-[40rem]">
                      <thead className="text-xs text-[#8a918c]">
                        <tr className="border-b border-[#eef1ee]">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Transaction ID</th>
                          <th className="hidden px-3 py-3 font-medium md:table-cell">Type</th>
                          <th className="px-3 py-3 font-medium">From / To</th>
                          <th className="px-3 py-3 font-medium">Amount</th>
                          <th className="hidden px-3 py-3 font-medium lg:table-cell">Method</th>
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
                            <td className="hidden px-3 py-3 font-medium tabular-nums lg:table-cell">{shortPayId(row.id)}</td>
                            <td className="hidden px-3 py-3 md:table-cell">
                              <PayKindChip kind={row.kind} />
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">{row.kind === 'withdraw' ? row.candidate : row.company || row.candidate}</p>
                              <p className="text-xs text-[#8a918c]">{row.jobTitle || '—'}</p>
                            </td>
                            <td className="px-3 py-3 tabular-nums">{money(row.amount, data?.finance?.currency)}</td>
                            <td className="hidden px-3 py-3 text-[#5c635f] lg:table-cell">Atelier ledger</td>
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
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: `${color}1a`, color }}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-[1.65rem] font-semibold tabular-nums leading-none tracking-tight">{value.toLocaleString()}</p>
          <p className={`mt-2 text-xs ${up ? 'text-[#14a35a]' : 'text-[#b85c38]'}`}>
            {up ? '↑' : '↓'} {Math.abs(delta)}% vs. last 30 days
          </p>
        </div>
      </div>
    </div>
  )
}

function HintStat({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: LucideIcon
  label: string
  value: number
  hint: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(19,38,31,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-full" style={{ background: `${color}1a`, color }}>
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#8a918c]">{hint}</p>
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

function JobStatusChip({ atelier }: { atelier: boolean }) {
  if (atelier) return <StatusDot status="active" />
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs text-[#1d4ed8]">
      <span className="size-1.5 rounded-full bg-[#3b82f6]" />
      Open
    </span>
  )
}

function JobTypeChip({ type }: { type?: string }) {
  if (!type) return <span className="text-[#8a918c]">—</span>
  const freelance = type === 'contract' || type === 'freelance'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${freelance ? 'bg-[#ede9fe] text-[#6d28d9]' : 'bg-[#d1fae5] text-[#047857]'}`}>
      {prettyEmployment(type)}
    </span>
  )
}

function prettyEmployment(type?: string) {
  if (!type) return '—'
  return type.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function jobBudget(row: { salaryMin?: number; salaryMax?: number; currency?: string }) {
  const currency = row.currency || 'USD'
  if (row.salaryMin != null && row.salaryMax != null) return moneyBand(row.salaryMin, row.salaryMax, currency)
  if (row.salaryMin != null) return money(row.salaryMin, currency)
  if (row.salaryMax != null) return money(row.salaryMax, currency)
  return '—'
}

const COMPANY_MARKS = ['#2563eb', '#7c3aed', '#0f766e', '#b85c38', '#db2777', '#0369a1']

function companyMark(name: string) {
  let n = 0
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i) * (i + 1)) % COMPANY_MARKS.length
  return COMPANY_MARKS[n]
}

function jobPublicHref(
  row: { atelier: boolean; id: string; title: string; company: string; source: string; applicationUrl?: string },
  origin: string,
) {
  if (row.atelier) return `${origin}/app/jobs/${row.id}`
  if (row.applicationUrl?.startsWith('http')) return row.applicationUrl
  return listingUrl({ title: row.title, company: row.company, source: row.source, applicationUrl: row.applicationUrl }) ?? `${origin}/app/jobs/${row.id}`
}

function prettyRole(role: AccountRole) {
  if (role === 'super_admin') return 'Super admin'
  if (role === 'admin') return 'Admin'
  if (role === 'employer') return 'Employer'
  return 'Candidate'
}

function accountStatus(row: { role: AccountRole; onboarded?: boolean }): 'active' | 'pending' {
  if (isStaffRole(row.role) || row.onboarded) return 'active'
  return 'pending'
}

function shortUserId(id: string) {
  return `#${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

function RoleChip({ role }: { role: AccountRole }) {
  const label = prettyRole(role)
  const className = isStaffRole(role)
    ? 'bg-[#ede9fe] text-[#6d28d9]'
    : role === 'employer'
      ? 'bg-[#d1fae5] text-[#047857]'
      : 'bg-[#dbeafe] text-[#1d4ed8]'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${className}`}>{label}</span>
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
        <div className="min-w-0">
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 break-all text-2xl font-semibold tabular-nums">{money(value, currency)}</p>
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
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" className="size-32 shrink-0 sm:size-40">
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
        <div className="min-w-0">
          <p className="text-sm text-[#5c635f]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="mt-1 text-xs text-[#14a35a]">{hint}</p>
        </div>
      </div>
    </div>
  )
}

function DeskTable({ columns, rows, empty }: { columns: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-0 text-left text-sm md:min-w-[28rem]">
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
  if (!top.length) return <p className="mt-6 text-sm text-[#8a918c]">No listings yet.</p>
  return (
    <ul className="mt-4 space-y-3">
      {top.map((b) => (
        <li key={b.source}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{sourceLabel(b.source)}</span>
            <span className="tabular-nums text-[#8a918c]">{b.count}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef1ee]">
            <div className="h-2 rounded-full bg-[#14a35a]" style={{ width: `${Math.max(6, (b.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
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
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" className="size-32 shrink-0 sm:size-40">
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
