import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { supabaseAdmin } from '../server/supabase'

const DIR = path.resolve(process.cwd(), 'public/brand/auth')
const BUCKET = 'brand'

const META: Record<string, { audience: string; kind: string; alt: string }> = {
  'auth-candidate-login.png': { audience: 'candidate', kind: 'auth-login', alt: 'Applicant reviewing roles by a window' },
  'auth-candidate-signup.png': { audience: 'candidate', kind: 'auth-register', alt: 'Applicant preparing a profile' },
  'auth-candidate-desk.png': { audience: 'candidate', kind: 'auth', alt: 'Applicant reviewing match scores' },
  'auth-candidate-search.png': { audience: 'candidate', kind: 'auth', alt: 'Applicant searching authorized listings' },
  'auth-interview.png': { audience: 'candidate', kind: 'auth', alt: 'Applicant on a video interview' },
  'auth-window-light.png': { audience: 'candidate', kind: 'auth', alt: 'Morning light in a home workshop' },
  'auth-employer-login.png': { audience: 'employer', kind: 'auth-login', alt: 'Hiring manager reviewing a shortlist' },
  'auth-employer-signup.png': { audience: 'employer', kind: 'auth-register', alt: 'Hiring team posting a role' },
  'auth-employer-inbox.png': { audience: 'employer', kind: 'auth', alt: 'Employer reviewing approved packets' },
  'auth-workshop.png': { audience: 'shared', kind: 'auth', alt: 'A calm workshop loft' },
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.some((b) => b.id === BUCKET)) {
    const created = await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 8 * 1024 * 1024 })
    if (created.error) throw created.error
  } else {
    await supabaseAdmin.storage.updateBucket(BUCKET, { public: true })
  }

  const files = (await readdir(DIR)).filter((name) => name.endsWith('.png'))
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  let stored = 0

  for (const file of files) {
    const objectPath = `auth/${file}`
    const bytes = await readFile(path.join(DIR, file))
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: 'image/png',
      upsert: true,
    })
    if (upload.error) throw upload.error

    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`
    const meta = META[file] ?? { audience: 'shared', kind: 'auth', alt: file }
    const row = {
      slug: file.replace(/\.png$/, ''),
      path: objectPath,
      url: publicUrl,
      kind: meta.kind,
      audience: meta.audience,
      alt: meta.alt,
    }
    const { error } = await supabaseAdmin.from('brand_assets').upsert(row, { onConflict: 'slug' })
    if (error) {
      console.warn(`storage ok, table skip for ${file}: ${error.message}`)
    } else {
      stored += 1
    }
    console.log(`uploaded ${objectPath}`)
  }

  console.log(`done. ${files.length} files in Storage. ${stored} rows in brand_assets.`)
  if (stored < files.length) {
    console.log('Run the brand_assets block at the end of supabase/schema.sql in the Supabase SQL editor, then re-run: npm run brand:upload')
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
