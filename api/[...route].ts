import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { app } from '../server/index'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '8mb',
  },
  maxDuration: 60,
}

function toRequest(req: IncomingMessage): Request {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
  const url = `${proto}://${host}${req.url || '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const method = req.method || 'GET'
  const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(req)
  return new Request(url, {
    method,
    headers,
    body,
    duplex: 'half',
  } as RequestInit)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const response = await app.fetch(toRequest(req))
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}
