import {
  Briefcase,
  Code2,
  Megaphone,
  Palette,
  PenLine,
  Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function jobIconTone(title: string, category: string) {
  const t = `${title} ${category}`.toLowerCase()
  if (/design|figma|ui|ux/.test(t)) return 'bg-[#e6f4f4] text-[#2a8a86]'
  if (/mobile|flutter/.test(t)) return 'bg-[#eaf3ff] text-[#3b6fd8]'
  if (/writer|content|write/.test(t)) return 'bg-[#fff6e0] text-[#c49a12]'
  if (/market|social/.test(t)) return 'bg-[#ffece6] text-[#d2653a]'
  if (/react|laravel|code|develop|ai|genai/.test(t)) return 'bg-[#ece7ff] text-[#6b4fb0]'
  return 'bg-[#e8f3ec] text-[#147a48]'
}

export function JobIcon({
  title,
  category,
  className,
  iconClassName = 'size-4',
}: {
  title: string
  category: string
  className?: string
  iconClassName?: string
}) {
  const t = `${title} ${category}`.toLowerCase()
  let icon = <Briefcase className={iconClassName} />
  if (/design|figma|ui|ux/.test(t)) icon = <Palette className={iconClassName} />
  else if (/mobile|flutter|ios|android/.test(t)) icon = <Smartphone className={iconClassName} />
  else if (/writer|content|write/.test(t)) icon = <PenLine className={iconClassName} />
  else if (/market|social/.test(t)) icon = <Megaphone className={iconClassName} />
  else if (/react|node|code|develop|engineer|software|ai|genai/.test(t)) icon = <Code2 className={iconClassName} />

  return (
    <span className={cn('grid place-items-center rounded-xl', jobIconTone(title, category), className)}>
      {icon}
    </span>
  )
}
