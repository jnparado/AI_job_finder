import { app } from '../server/index'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
  api: {
    bodyParser: false,
    sizeLimit: '8mb',
  },
}

export default {
  async fetch(request: Request) {
    try {
      return await app.fetch(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'API failed'
      return Response.json({ ok: false, error: message }, { status: 500 })
    }
  },
}
