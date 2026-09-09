export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

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
