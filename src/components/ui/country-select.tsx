import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { filterCountries } from '@/lib/countries'
import { cn } from '@/lib/utils'

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Search countries',
}: {
  value: string
  onChange: (country: string) => void
  placeholder?: string
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [active, setActive] = useState(0)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const options = useMemo(() => filterCountries(query).slice(0, 12), [query])

  function pick(country: string) {
    onChange(country)
    setQuery(country)
    setOpen(false)
  }

  return (
    <div ref={root} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        className={cn(
          'h-10 w-full rounded-lg border border-input bg-background py-0 pr-10 pl-3 text-sm outline-none placeholder:text-muted-foreground/80 focus:border-ring',
        )}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
          onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault()
            pick(options[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {options.length ? (
            options.map((country, i) => (
              <li key={country} role="option" aria-selected={country === value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted',
                    i === active || country === value ? 'bg-muted' : '',
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(country)}
                >
                  {country}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">No countries match</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
