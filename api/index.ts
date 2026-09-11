export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

/** Static reads so Vercel marks these Production secrets as used by the API. */
void process.env.RAPIDAPI_KEY
void process.env.OPENAI_API_KEY
void process.env.OPENAI_MODEL_LUNA
void process.env.OPENAI_MODEL_TERRA
void process.env.OPENAI_MODEL_SOL
void process.env.SUPABASE_URL
void process.env.SUPABASE_ANON_KEY
void process.env.SUPABASE_SERVICE_ROLE_KEY
void process.env.ADZUNA_APP_ID
void process.env.ADZUNA_APP_KEY
void process.env.USAJOBS_EMAIL
void process.env.STRIPE_SECRET_KEY
void process.env.STRIPE_WEBHOOK_SECRET
void process.env.PAYPAL_CLIENT_ID
void process.env.PAYPAL_CLIENT_SECRET
void process.env.APP_URL

type App = { fetch: (request: Request) => Response | Promise<Response> }

async function loadApp(): Promise<App> {
  const loaded = await import('../dist-api/app.mjs')
  if (!loaded.app?.fetch) throw new Error('API bundle is missing the app export.')
  return loaded.app as App
}

async function handle(request: Request) {
  try {
    const app = await loadApp()
    return await app.fetch(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API failed'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export default { fetch: handle }
export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
