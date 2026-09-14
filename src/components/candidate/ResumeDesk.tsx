import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  FolderKanban,
  GraduationCap,
  Globe,
  Info,
  Link2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Sparkles,
} from 'lucide-react'
import type { CandidateProfile, ParsedResume } from '@shared/types'
import { displayName } from '@shared/types'
import { cn, initials } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type ResumeTab = 'edit' | 'preview' | 'templates' | 'ai'

export interface ResumeChecks {
  summary: boolean
  experience: boolean
  skills: boolean
  projects: boolean
  certifications: boolean
  education: boolean
}

const TABS: { id: ResumeTab; label: string }[] = [
  { id: 'edit', label: 'Edit Resume' },
  { id: 'preview', label: 'Preview' },
  { id: 'templates', label: 'Templates' },
  { id: 'ai', label: 'AI Suggestions' },
]

const TEMPLATES = [
  { id: 'modern', label: 'Modern', accent: 'from-[#e7f6ef] to-[#f4f8f5]' },
  { id: 'professional', label: 'Professional', accent: 'from-[#eef2f0] to-[#f8f9f8]' },
  { id: 'creative', label: 'Creative', accent: 'from-[#fff4e5] to-[#fbf6f0]' },
]

const AI_TIPS = [
  'Use clear and concise language',
  'Keep it to 1–2 pages',
  'Highlight measurable achievements',
  'Tailor skills to each role you target',
]

interface SectionRow {
  id: string
  icon: LucideIcon
  title: string
  hint: string
  done: boolean
  editHref: string
  preview?: React.ReactNode
}

export function buildResumeChecks(profile: CandidateProfile, parsed: ParsedResume | null): ResumeChecks {
  const text = profile.resumeText.toLowerCase()
  const exp = profile.experience.length > 0 || (parsed?.experience?.length ?? 0) > 0
  return {
    summary: Boolean(parsed?.summary || profile.careerGoals || profile.resumeText.length > 80),
    experience: exp,
    skills: profile.skills.length >= 3,
    projects: Boolean(profile.socialLinks?.portfolio || profile.socialLinks?.github || /project/i.test(text)),
    certifications: /certifi|license|credential|aws certified|pmp/i.test(text),
    education: /education|university|college|bachelor|master|degree|b\.s\.|b\.a\./i.test(text),
  }
}

export function resumeStrengthPercent(checks: ResumeChecks): number {
  const values = Object.values(checks)
  return Math.round((values.filter(Boolean).length / values.length) * 100)
}

export function ResumeDeskHeader({
  onDownload,
  canDownload,
}: {
  onDownload: () => void
  canDownload: boolean
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-[#002018] sm:text-3xl">My Resume</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a standout resume and get hired faster with Atelier.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          className="h-10 rounded-full bg-[#002018] !text-white hover:bg-[#001510]"
          disabled={!canDownload}
          onClick={onDownload}
        >
          <Download className="size-4" />
          Download PDF
        </Button>
        <Button variant="outline" className="h-10 rounded-full" asChild>
          <Link to="/app/settings">More</Link>
        </Button>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-[#e7ebe9] text-[#002018] hover:bg-[#f3f5f4]"
          aria-label="More options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function ResumeTabs({ tab, onTab }: { tab: ResumeTab; onTab: (t: ResumeTab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#e7ebe9]">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          className={cn(
            'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            tab === t.id
              ? 'border-[#002018] text-[#002018]'
              : 'border-transparent text-muted-foreground hover:text-[#002018]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ResumeProfileCard({ profile }: { profile: CandidateProfile }) {
  const name = displayName(profile)
  const headline = profile.headline || profile.desiredTitle || profile.currentTitle || 'Candidate'
  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const linkedin = profile.socialLinks?.linkedin
  const github = profile.socialLinks?.github
  const portfolio = profile.socialLinks?.portfolio || profile.socialLinks?.website

  return (
    <section className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="size-16 shrink-0 rounded-full object-cover sm:size-20" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#e7f6ef] font-serif text-xl text-[#002018] sm:size-20 sm:text-2xl">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-1.5 font-serif text-xl text-[#002018] sm:text-2xl">
              <span className="break-words">{name}</span>
              <Link to="/app/profile" className="text-[#2f9a6f] hover:opacity-80" aria-label="Edit name">
                <Pencil className="size-3.5" />
              </Link>
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{headline}</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-[#6b7280]">
              {place ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0 text-[#2f9a6f]" />
                  {place}
                </span>
              ) : null}
              {profile.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-[#2f9a6f]" />
                  <span className="truncate">{profile.email}</span>
                </span>
              ) : null}
            </div>
            {(linkedin || github || portfolio) ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {linkedin ? (
                  <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2f6fed] hover:underline">
                    <Link2 className="size-3.5" />
                    LinkedIn
                  </a>
                ) : null}
                {github ? (
                  <a href={github.startsWith('http') ? github : `https://${github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#002018] hover:underline">
                    <Link2 className="size-3.5" />
                    GitHub
                  </a>
                ) : null}
                {portfolio ? (
                  <a href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2f9a6f] hover:underline">
                    <Globe className="size-3.5" />
                    Portfolio
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <Button variant="outline" className="h-9 shrink-0 rounded-full" asChild>
          <Link to="/app/profile">Edit Profile</Link>
        </Button>
      </div>
    </section>
  )
}

function SectionCard({ row }: { row: SectionRow }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_6px_16px_rgba(19,38,31,0.03)] sm:items-center sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef2f0] text-[#2f9a6f]">
        <row.icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-[#002018]">{row.title}</h3>
        {row.preview ? (
          <div className="mt-1">{row.preview}</div>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">{row.hint}</p>
        )}
      </div>
      <Button variant="outline" size="sm" className="h-8 shrink-0 rounded-full" asChild>
        <Link to={row.editHref}>Edit</Link>
      </Button>
    </article>
  )
}

export function ResumeSectionList({
  profile,
  parsed,
  checks,
}: {
  profile: CandidateProfile
  parsed: ParsedResume | null
  checks: ResumeChecks
}) {
  const summaryText = parsed?.summary || profile.careerGoals
  const expCount = profile.experience.length || parsed?.experience?.length || 0
  const skills = [...new Set([...profile.skills, ...(parsed?.skills ?? [])])]
  const shownSkills = skills.slice(0, 5)
  const extraSkills = skills.length - shownSkills.length

  const rows: SectionRow[] = [
    {
      id: 'summary',
      icon: FileText,
      title: 'Professional Summary',
      hint: 'Write a short summary that highlights your strengths and career goals.',
      done: checks.summary,
      editHref: '/app/profile',
      preview: summaryText ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{summaryText}</p>
      ) : undefined,
    },
    {
      id: 'experience',
      icon: Briefcase,
      title: 'Work Experience',
      hint: 'Add your work history with titles, companies, and key achievements.',
      done: checks.experience,
      editHref: '/app/profile',
      preview: expCount ? (
        <p className="text-sm text-muted-foreground">{expCount} role{expCount === 1 ? '' : 's'} on file</p>
      ) : undefined,
    },
    {
      id: 'education',
      icon: GraduationCap,
      title: 'Education',
      hint: 'Add your educational background.',
      done: checks.education,
      editHref: '/app/resume',
    },
    {
      id: 'skills',
      icon: Sparkles,
      title: 'Skills',
      hint: 'List technical and soft skills the matcher should score against.',
      done: checks.skills,
      editHref: '/app/profile',
      preview: shownSkills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {shownSkills.map((s) => (
            <span key={s} className="rounded-full bg-[#eef2f0] px-2.5 py-0.5 text-xs text-[#002018]">
              {s}
            </span>
          ))}
          {extraSkills > 0 ? (
            <span className="rounded-full bg-[#eef2f0] px-2.5 py-0.5 text-xs text-muted-foreground">
              +{extraSkills}
            </span>
          ) : null}
        </div>
      ) : undefined,
    },
    {
      id: 'projects',
      icon: FolderKanban,
      title: 'Projects',
      hint: 'Showcase your key projects and outcomes.',
      done: checks.projects,
      editHref: '/app/settings',
    },
    {
      id: 'certifications',
      icon: Award,
      title: 'Certifications',
      hint: 'Add your certifications and achievements.',
      done: checks.certifications,
      editHref: '/app/resume',
    },
    {
      id: 'additional',
      icon: Info,
      title: 'Additional Information',
      hint: 'Languages, availability, links, and other details.',
      done: Boolean(profile.workModes.length || profile.employmentTypes.length),
      editHref: '/app/settings',
    },
  ]

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <SectionCard key={row.id} row={row} />
      ))}
    </div>
  )
}

export function ResumePreviewBanner({ onPreview }: { onPreview: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e7ebe9] bg-[#f7faf8] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[#2f9a6f] shadow-sm">
          <FileText className="size-5" />
        </span>
        <div>
          <p className="font-medium text-[#002018]">Preview Your Resume</p>
          <p className="text-sm text-muted-foreground">See how employers will read your resume.</p>
        </div>
      </div>
      <Button variant="outline" className="h-9 rounded-full" onClick={onPreview}>
        View Preview →
      </Button>
    </div>
  )
}

export function ResumeAiTips() {
  return (
    <div className="rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_6px_16px_rgba(19,38,31,0.03)]">
      <p className="flex items-center gap-1.5 text-sm font-medium text-[#002018]">
        <Sparkles className="size-4 text-[#2f9a6f]" />
        AI Tips
      </p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {AI_TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2f9a6f]" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StrengthRing({ value }: { value: number }) {
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div className="relative mx-auto size-24">
      <svg className="size-full -rotate-90" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#eef2f0" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="#2f9a6f"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-serif text-2xl tabular-nums text-[#002018]">
        {value}%
      </span>
    </div>
  )
}

export function ResumeStrengthPanel({ checks, strength }: { checks: ResumeChecks; strength: number }) {
  const items = [
    { key: 'summary', label: 'Summary', done: checks.summary },
    { key: 'experience', label: 'Experience', done: checks.experience },
    { key: 'skills', label: 'Skills', done: checks.skills },
    { key: 'projects', label: 'Projects', done: checks.projects },
    { key: 'certifications', label: 'Certifications', done: checks.certifications },
  ]

  return (
    <div className="rounded-2xl border border-[#e7ebe9] bg-white p-5 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Resume Strength
      </p>
      <div className="mt-4">
        <StrengthRing value={strength} />
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {strength >= 80
          ? 'Great job! Your resume is looking strong.'
          : strength >= 50
            ? 'Good start — fill a few more sections.'
            : 'Upload or complete sections to strengthen your resume.'}
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-[#2f9a6f]" />
            ) : (
              <Circle className="size-4 shrink-0 text-[#d1d5db]" />
            )}
            <span className={item.done ? 'text-[#002018]' : 'text-muted-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ResumeAiPanel({ onImprove }: { onImprove: () => void }) {
  return (
    <div className="rounded-2xl border border-[#d7eadc] bg-gradient-to-br from-[#e8f6ee] to-white p-5 shadow-[0_8px_20px_rgba(19,38,31,0.04)]">
      <p className="flex items-center gap-1.5 text-sm font-medium text-[#002018]">
        <Sparkles className="size-4 text-[#2f9a6f]" />
        Get AI-Powered Suggestions
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Upload or refresh your resume and Atelier will suggest improvements from your real profile data.
      </p>
      <Button className="mt-4 h-10 w-full rounded-full bg-[#002018] !text-white hover:bg-[#001510]" onClick={onImprove}>
        Improve with AI →
      </Button>
    </div>
  )
}

export function ResumeTemplatesPanel({
  selected,
  onSelect,
  compact,
  onSeeAll,
}: {
  selected: string
  onSelect: (id: string) => void
  compact?: boolean
  onSeeAll?: () => void
}) {
  return (
    <div className={cn('rounded-2xl border border-[#e7ebe9] bg-white p-4 shadow-[0_8px_20px_rgba(19,38,31,0.04)]', compact && 'p-4')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resume Templates
        </p>
        {compact && onSeeAll ? (
          <button type="button" className="text-xs font-medium text-[#2f9a6f] hover:underline" onClick={onSeeAll}>
            See all
          </button>
        ) : null}
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'sm:grid-cols-3')}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              'relative overflow-hidden rounded-xl border p-2 text-left transition-colors',
              selected === t.id ? 'border-[#2f9a6f] ring-2 ring-[#2f9a6f]/20' : 'border-[#e7ebe9] hover:border-[#2f9a6f]/50',
            )}
          >
            <div className={cn('aspect-[3/4] rounded-lg bg-gradient-to-br', t.accent, 'p-2')}>
              <div className="h-2 w-8 rounded bg-[#002018]/15" />
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded bg-[#002018]/10" />
                <div className="h-1 w-4/5 rounded bg-[#002018]/10" />
                <div className="h-1 w-3/5 rounded bg-[#002018]/10" />
              </div>
            </div>
            <p className="mt-2 text-center text-xs font-medium text-[#002018]">{t.label}</p>
            {selected === t.id ? (
              <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#2f9a6f] text-white">
                <Check className="size-3" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
