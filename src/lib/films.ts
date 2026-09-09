import { FILM_CDN } from './filmCdn'

function basename(file: string) {
  return file.replace(/^.*\//, '')
}

function supabaseFilmBase() {
  if (FILM_CDN) return FILM_CDN.replace(/\/$/, '')
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!base || base.includes('YOUR_PROJECT')) return ''
  return `${base}/storage/v1/object/public/films`
}

export function filmLocal(file: string) {
  return `/films/${basename(file)}`
}

export function filmSrc(file: string) {
  const cdn = supabaseFilmBase()
  return cdn ? `${cdn}/${basename(file)}` : filmLocal(file)
}
