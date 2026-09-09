export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
  api: {
    bodyParser: false,
    sizeLimit: '8mb',
  },
}

type App = { fetch: (request: Request) => Response | Promise<Response> }

let loading: Promise<App> | null = null

function loadApp() {
  loading ??= import('../server/index').then((mod) => mod.app as App)
  return loading
}

async function fetch(request: Request) {
  try {
    const app = await loadApp()
    return await app.fetch(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API failed'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export default { fetch }
