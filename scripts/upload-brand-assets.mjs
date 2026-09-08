import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !service || /YOUR_PROJECT|your_service_role_key/i.test(`${url}${service}`)) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, service, { auth: { persistSession: false } })
const folder = join(process.cwd(), 'public/brand/auth')
const files = readdirSync(folder).filter((name) => name.endsWith('.png'))

const meta = {
  'auth-candidate-login': { audience: 'candidate', page: 'login', alt: 'Applicant at a window with a laptop' },
  'auth-candidate-signup': { audience: 'candidate', page: 'register', alt: 'Applicant writing at a desk' },
  'auth-candidate-search': { audience: 'candidate', page: 'login', alt: 'Reviewing job matches in a cafe' },
  'auth-employer-login': { audience: 'employer', page: 'login', alt: 'Hiring manager with a tablet' },
  'auth-employer-signup': { audience: 'employer', page: 'register', alt: 'Team reviewing candidates' },
  'auth-employer-inbox': { audience: 'employer', page: 'login', alt: 'Hiring desk with folders' },
  'auth-workshop': { audience: 'shared', page: 'auth', alt: 'Sunlit workshop loft' },
  'auth-window-light': { audience: 'shared', page: 'auth', alt: 'Chair and laptop by a window' },
}

const { error: bucketError } = await supabase.storage.createBucket('brand', { public: true })
if (bucketError && !/already|exists/i.test(bucketError.message)) {
  console.warn('bucket', bucketError.message)
}

let uploaded = 0
for (const file of files) {
  const slug = basename(file, '.png')
  const path = `auth/${file}`
  const bytes = readFileSync(join(folder, file))
  const { error: uploadError } = await supabase.storage.from('brand').upload(path, bytes, {
    contentType: 'image/png',
    upsert: true,
  })
  if (uploadError) {
    console.error(file, uploadError.message)
    continue
  }
  const { data } = supabase.storage.from('brand').getPublicUrl(path)
  const info = meta[slug] ?? { audience: 'shared', page: 'auth', alt: slug }
  const { error: rowError } = await supabase.from('brand_assets').upsert(
    {
      slug,
      path,
      url: data.publicUrl,
      audience: info.audience,
      page: info.page,
      alt: info.alt,
    },
    { onConflict: 'slug' },
  )
  if (rowError) console.warn('row', slug, rowError.message)
  uploaded += 1
  console.log('saved', slug)
}

console.log(`Uploaded ${uploaded}/${files.length} brand photos`)
