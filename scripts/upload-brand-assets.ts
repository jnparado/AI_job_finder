import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { supabaseAdmin } from '../server/supabase'

const ROOT = path.resolve(process.cwd(), 'public/brand')
const BUCKET = 'brand'
const FOLDERS = ['auth', 'candidate', 'employer'] as const

const META: Record<string, { audience: string; kind: string; alt: string }> = {
  'auth/auth-candidate-login.jpg': { audience: 'candidate', kind: 'auth-login', alt: 'Applicant reviewing roles by a window' },
  'auth/auth-candidate-signup.jpg': { audience: 'candidate', kind: 'auth-register', alt: 'Applicant preparing a profile' },
  'auth/auth-candidate-desk.jpg': { audience: 'candidate', kind: 'auth', alt: 'Applicant reviewing match scores' },
  'auth/auth-candidate-search.jpg': { audience: 'candidate', kind: 'auth', alt: 'Applicant searching authorized listings' },
  'auth/auth-interview.jpg': { audience: 'candidate', kind: 'auth', alt: 'Applicant on a video interview' },
  'auth/auth-window-light.jpg': { audience: 'candidate', kind: 'auth', alt: 'Morning light in a home workshop' },
  'auth/auth-employer-login.jpg': { audience: 'employer', kind: 'auth-login', alt: 'Hiring manager reviewing a shortlist' },
  'auth/auth-employer-signup.jpg': { audience: 'employer', kind: 'auth-register', alt: 'Hiring team posting a role' },
  'auth/auth-employer-inbox.jpg': { audience: 'employer', kind: 'auth', alt: 'Employer reviewing approved packets' },
  'auth/auth-workshop.jpg': { audience: 'shared', kind: 'auth', alt: 'A calm workshop loft' },
  'candidate/candidate-hero.jpg': { audience: 'candidate', kind: 'carousel', alt: 'Applicant reviewing matched roles by a window' },
  'candidate/candidate-window.jpg': { audience: 'candidate', kind: 'carousel', alt: 'Applicant pausing by a sunlit workshop window' },
  'candidate/candidate-approve.jpg': { audience: 'candidate', kind: 'carousel', alt: 'Applicant reviewing a packet before sending' },
  'candidate/candidate-cafe.jpg': { audience: 'candidate', kind: 'carousel', alt: 'Applicant searching roles in a quiet cafe' },
  'candidate/candidate-notebook.jpg': { audience: 'candidate', kind: 'carousel', alt: 'Applicant taking notes after a match search' },
  'candidate/candidate-match.jpg': { audience: 'candidate', kind: 'landing', alt: 'Match scores on a desk' },
  'candidate/candidate-prepare.jpg': { audience: 'candidate', kind: 'landing', alt: 'Preparing an application packet' },
  'candidate/candidate-track.jpg': { audience: 'candidate', kind: 'landing', alt: 'Tracking interviews' },
  'candidate/candidate-life.jpg': { audience: 'candidate', kind: 'landing', alt: 'People working quietly in a sunlit loft' },
  'employer/employer-hero.jpg': { audience: 'employer', kind: 'carousel', alt: 'Hiring manager reviewing matches on a tablet' },
  'employer/employer-tablet.jpg': { audience: 'employer', kind: 'carousel', alt: 'Hiring lead with a shortlist on a tablet' },
  'employer/employer-meeting.jpg': { audience: 'employer', kind: 'carousel', alt: 'A hiring pair reviewing an approved packet' },
  'employer/employer-review.jpg': { audience: 'employer', kind: 'carousel', alt: 'Founder reviewing candidates at a standing desk' },
  'employer/employer-studio.jpg': { audience: 'employer', kind: 'carousel', alt: 'Studio founder walking through the workshop' },
  'employer/employer-inbox.jpg': { audience: 'employer', kind: 'landing', alt: 'Employer inbox' },
  'employer/employer-team.jpg': { audience: 'employer', kind: 'landing', alt: 'Hiring team' },
  'employer/employer-interview.jpg': { audience: 'employer', kind: 'landing', alt: 'Interview decision' },
  'employer/employer-office.jpg': { audience: 'employer', kind: 'landing', alt: 'A calm modern office' },
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

  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  let stored = 0
  let uploaded = 0

  for (const folder of FOLDERS) {
    const names = (await readdir(path.join(ROOT, folder))).filter((name) => name.endsWith('.jpg'))
    for (const file of names) {
      const objectPath = `${folder}/${file}`
      const bytes = await readFile(path.join(ROOT, folder, file))
      const upload = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (upload.error) throw upload.error
      uploaded += 1

      const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`
      const meta = META[objectPath] ?? { audience: folder === 'auth' ? 'shared' : folder, kind: 'brand', alt: file }
      const row = {
        slug: objectPath.replace(/\.jpg$/, '').replace(/\//g, '-'),
        path: objectPath,
        url: publicUrl,
        kind: meta.kind,
        audience: meta.audience,
        alt: meta.alt,
      }
      const { error } = await supabaseAdmin.from('brand_assets').upsert(row, { onConflict: 'slug' })
      if (error) {
        console.warn(`storage ok, table skip for ${objectPath}: ${error.message}`)
      } else {
        stored += 1
      }
      console.log(`uploaded ${objectPath}`)
    }
  }

  console.log(`done. ${uploaded} files in Storage. ${stored} rows in brand_assets.`)
  if (stored < uploaded) {
    console.log('Run the brand_assets block at the end of supabase/schema.sql in the Supabase SQL editor, then re-run: npm run brand:upload')
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
