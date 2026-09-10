function parseJobCopy(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return { perks: [] as string[], paragraphs: [] as string[] }
  const chunks = trimmed.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
  const first = chunks[0] ?? ''
  const looksPerks =
    (first.includes('|') || first.includes(' · ')) && first.length < 280 && !/[.!?]\s/.test(first)
  const perks = looksPerks
    ? first.split(/\s*[|·]\s*/).map((s) => s.trim()).filter(Boolean)
    : []
  return { perks, paragraphs: looksPerks ? chunks.slice(1) : chunks }
}

export function JobCopy({ text }: { text: string }) {
  const copy = text.trim()
  if (!copy) {
    return <p className="text-sm leading-relaxed text-muted-foreground">No description was provided with this listing.</p>
  }
  const { perks, paragraphs } = parseJobCopy(copy)
  return (
    <div className="atelier-prose">
      {perks.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {perks.map((perk) => (
            <span
              key={perk}
              className="rounded-full border border-[#c6a15b55] bg-[#f7f1e4] px-3 py-1 text-xs font-medium text-[var(--forest)]"
            >
              {perk}
            </span>
          ))}
        </div>
      ) : null}
      {paragraphs.map((block) => (
        <p key={block.slice(0, 48)} className="whitespace-pre-wrap break-words text-[0.95rem] leading-[1.75] text-foreground/90">
          {block}
        </p>
      ))}
    </div>
  )
}
