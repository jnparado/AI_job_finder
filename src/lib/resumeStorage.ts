import { supabase } from './supabase'

export function resumeMime(file: File) {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (name.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

export function safeResumeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'resume'
}

export async function saveResumeToSupabase(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
) {
  if (!supabase) throw new Error('Add your Supabase keys, then restart the app.')
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.access_token) throw new Error('Sign in again, then upload the file.')

  const path = `${userId}/${Date.now()}-${safeResumeFileName(file.name)}`
  const mime = resumeMime(file)
  onProgress?.(12)

  const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: mime,
  })
  if (uploadError) {
    const msg = uploadError.message || 'Could not save the file.'
    if (/bucket|not found/i.test(msg)) {
      throw new Error('The resumes bucket is missing. Run supabase/resumes.sql in the Supabase SQL editor, then try again.')
    }
    if (/row-level security|policy|unauthorized|jwt/i.test(msg)) {
      throw new Error('Supabase blocked the upload. Run supabase/resumes.sql, then sign in again.')
    }
    throw new Error(msg)
  }
  onProgress?.(72)

  const { error: rowError } = await supabase.from('resumes').insert({
    user_id: userId,
    file_path: path,
    file_name: file.name,
    mime_type: mime,
    is_primary: true,
  })
  if (rowError && !/row-level security|policy/i.test(rowError.message)) {
    console.warn('resume row', rowError.message)
  }
  onProgress?.(82)
  return { path, mime }
}

export async function listOwnResumes(userId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('resumes')
    .select('id, file_name, file_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)
  if (error) return []
  return data ?? []
}
