import { useEffect, useState, type ReactNode } from 'react'
import { brandSrc, localBrandPath, type LandingSlide } from '@/lib/brandAssets'

export function BrandCarousel({
  folder,
  slides,
  children,
}: {
  folder: 'candidate' | 'employer'
  slides: LandingSlide[]
  children?: ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || slides.length < 2) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500)
    return () => window.clearInterval(t)
  }, [paused, slides.length])

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-36px_rgba(0,0,0,0.7)] sm:aspect-[4/5] lg:aspect-[3/4]">
        {slides.map((slide, i) => {
          const next = (index + 1) % slides.length
          const prev = (index - 1 + slides.length) % slides.length
          if (i !== index && i !== next && i !== prev) return null
          return (
            <BrandSlide
              key={slide.file}
              folder={folder}
              file={slide.file}
              alt={slide.alt}
              active={i === index}
            />
          )
        })}
        {slides.length > 1 ? (
          <div className="absolute top-4 right-4 z-10 flex gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.file}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-[#c6a15b]' : 'w-1.5 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-4 lg:absolute lg:inset-x-6 lg:bottom-6 lg:mt-0">{children}</div> : null}
    </div>
  )
}

function BrandSlide({
  folder,
  file,
  alt,
  active,
}: {
  folder: 'candidate' | 'employer'
  file: string
  alt: string
  active: boolean
}) {
  const remote = brandSrc(file, folder)
  const local = localBrandPath(file, folder)
  const [src, setSrc] = useState(remote)

  return (
    <img
      src={src}
      alt={active ? alt : ''}
      loading={active ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (src !== local) setSrc(local)
      }}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
