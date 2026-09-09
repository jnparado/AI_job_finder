import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { supabaseAdmin } from '../server/supabase'

const ROOT = path.resolve(process.cwd(), 'public/films')
const BUCKET = 'films'
const MAX_BYTES = 50 * 1024 * 1024

const KIND: Record<string, { audience: string; kind: string; alt: string }> = {
  'atelier-ad-16x9.mp4': { audience: 'shared', kind: 'film-wide', alt: 'Atelier brand film' },
  'atelier-ad-candidate.mp4': { audience: 'candidate', kind: 'film-wide', alt: 'Candidate film' },
  'atelier-ad-employer.mp4': { audience: 'employer', kind: 'film-wide', alt: 'Employer film' },
  'atelier-ad-shorts-candidate.mp4': { audience: 'candidate', kind: 'film-reels', alt: 'Candidate Reels cut' },
  'atelier-ad-shorts-employer.mp4': { audience: 'employer', kind: 'film-reels', alt: 'Employer Reels cut' },
  'atelier-ad-feed-square.mp4': { audience: 'shared', kind: 'film-feed', alt: 'Square feed cut' },
  'atelier-ad-feed-4x5-candidate.mp4': { audience: 'candidate', kind: 'film-feed', alt: 'Candidate 4:5 feed cut' },
  'atelier-ad-feed-4x5-employer.mp4': { audience: 'employer', kind: 'film-feed', alt: 'Employer 4:5 feed cut' },
  'atelier-ad-bumper-6s.mp4': { audience: 'shared', kind: 'film-bumper', alt: 'YouTube bumper' },
  'atelier-fb-page-candidate.mp4': { audience: 'candidate', kind: 'film-page', alt: 'Facebook Page candidate video' },
  'atelier-fb-page-employer.mp4': { audience: 'employer', kind: 'film-page', alt: 'Facebook Page employer video' },
  'atelier-fb-feed.mp4': { audience: 'shared', kind: 'film-feed', alt: 'Facebook feed square' },
  'atelier-fb-feed-4x5-candidate.mp4': { audience: 'candidate', kind: 'film-feed', alt: 'Facebook 4:5 candidate cut' },
  'atelier-fb-feed-4x5-employer.mp4': { audience: 'employer', kind: 'film-feed', alt: 'Facebook 4:5 employer cut' },
  'atelier-fb-reels-candidate.mp4': { audience: 'candidate', kind: 'film-reels', alt: 'Facebook Reels candidate cut' },
  'atelier-fb-reels-employer.mp4': { audience: 'employer', kind: 'film-reels', alt: 'Facebook Reels employer cut' },
  'social-copy.txt': { audience: 'shared', kind: 'copy', alt: 'Ad captions' },
}

function contentType(name: string, bytes: Buffer) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (name.endsWith('.mp4')) return 'video/mp4'
  if (name.endsWith('.txt')) return 'text/plain'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}

function audienceFor(name: string) {
  if (name.includes('employer') || name.includes('-e-') || name.includes('hire')) return 'employer'
  if (name.includes('candidate') || name.includes('-c-') || name.includes('cand')) return 'candidate'
  return 'shared'
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.some((b) => b.id === BUCKET)) {
    const created = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    })
    if (created.error) throw created.error
  } else {
    await supabaseAdmin.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['video/mp4', 'image/jpeg', 'image/png', 'text/plain'],
    })
  }

  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  const cdn = `${url}/storage/v1/object/public/${BUCKET}`
  const names = (await readdir(ROOT)).filter((name) => !name.startsWith('.'))
  let uploaded = 0
  let stored = 0

  for (const name of names) {
    const bytes = await readFile(path.join(ROOT, name))
    if (bytes.length > MAX_BYTES) {
      throw new Error(`${name} is larger than 50MB`)
    }
    const type = contentType(name, bytes)
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(name, bytes, {
      contentType: type,
      upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })
    if (upload.error) throw upload.error
    uploaded += 1

    const publicUrl = `${cdn}/${name}`
    const meta = KIND[name] ?? {
      audience: audienceFor(name),
      kind: name.endsWith('.mp4') ? 'film' : name.endsWith('.txt') ? 'copy' : 'poster',
      alt: name,
    }
    const row = {
      slug: `film-${name.replace(/\.[^.]+$/, '')}`,
      path: `films/${name}`,
      url: publicUrl,
      kind: meta.kind,
      audience: meta.audience,
      alt: meta.alt,
    }
    const { error } = await supabaseAdmin.from('brand_assets').upsert(row, { onConflict: 'slug' })
    if (error) {
      console.warn(`storage ok, table skip for ${name}: ${error.message}`)
    } else {
      stored += 1
    }
    console.log(`uploaded ${name}`)
  }

  await writeFile(
    path.resolve(process.cwd(), 'src/lib/filmCdn.ts'),
    `/** Public Storage origin for marketing films. Safe to commit. */\nexport const FILM_CDN = ${JSON.stringify(cdn)}\n`,
  )

  console.log(`done. ${uploaded} files in Storage. ${stored} rows in brand_assets.`)
  console.log(`CDN ${cdn}`)
  if (stored < uploaded) {
    console.log('Run supabase/films.sql in the Supabase SQL editor, then re-run: npm run films:upload')
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
