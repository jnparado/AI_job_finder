import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

function parseSkills(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinSkills(skills: string[]) {
  return skills.join(', ')
}

function mergeSkills(existing: string[], additions: string[]) {
  const merged = [...existing]
  for (const item of additions) {
    const trimmed = item.trim()
    if (!trimmed) continue
    if (merged.some((s) => s.toLowerCase() === trimmed.toLowerCase())) continue
    merged.push(trimmed)
  }
  return merged
}

interface CommaSkillsInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CommaSkillsInput({ value, onChange, placeholder, className }: CommaSkillsInputProps) {
  const skills = parseSkills(value)
  const [draft, setDraft] = useState('')

  function commitDraft(text: string) {
    const additions = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!additions.length) return
    onChange(joinSkills(mergeSkills(skills, additions)))
    setDraft('')
  }

  function removeSkill(skill: string) {
    onChange(joinSkills(skills.filter((s) => s !== skill)))
  }

  function onDraftChange(raw: string) {
    if (!raw.includes(',')) {
      setDraft(raw)
      return
    }
    const parts = raw.split(',')
    const tail = parts.pop() ?? ''
    const additions = parts.map((s) => s.trim()).filter(Boolean)
    if (additions.length) {
      onChange(joinSkills(mergeSkills(skills, additions)))
    }
    setDraft(tail)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft(draft)
      return
    }
    if (e.key === 'Backspace' && !draft && skills.length) {
      onChange(joinSkills(skills.slice(0, -1)))
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commitDraft(draft)}
        placeholder={placeholder}
      />
      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-md bg-[#eef3f0] py-1 pl-2.5 pr-1 text-sm text-[var(--forest)]"
            >
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-[#e4ebe6] hover:text-[var(--forest)]"
                onClick={() => removeSkill(skill)}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
