import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { app } from '../server/index'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
  api: {
    bodyParser: false,
    sizeLimit: '8mb',
  },
}

function isWebRequest(input: unknown): input is Request {
  return typeof Request !== 'undefined' && input instanceof Request
}

function nodeToRequest(req: IncomingMessage): Request {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
    .split(',')[0]
    .trim()
  const path = req.url || '/'
  const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${proto}://${host}${path}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const method = (req.method || 'GET').toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(req)
  return new Request(url, {
    method,
    headers,
    body,
    duplex: 'half',
  } as RequestInit)
}

async function handle(input: Request | IncomingMessage): Promise<Response> {
  const request = isWebRequest(input) ? input : nodeToRequest(input)
  return app.fetch(request)
}

function writeNodeResponse(res: ServerResponse, response: Response, body: Buffer) {
  res.statusCode = response.status
  const cookies: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value)
    else res.setHeader(key, value)
  })
  if (cookies.length) res.setHeader('set-cookie', cookies)
  res.end(body)
}

export default async function handler(input: Request | IncomingMessage, res?: ServerResponse) {
  try {
    const response = await handle(input)
    const body = Buffer.from(await response.arrayBuffer())
    if (res && typeof res.end === 'function' && !isWebRequest(input)) {
      writeNodeResponse(res, response, body)
      return
    }
    return new Response(body, { status: response.status, headers: response.headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API failed'
    const payload = JSON.stringify({ ok: false, error: message })
    if (res && typeof res.end === 'function' && !isWebRequest(input)) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(payload)
      return
    }
    return new Response(payload, { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

export const GET = (req: Request) => handle(req)
export const POST = (req: Request) => handle(req)
export const PUT = (req: Request) => handle(req)
export const PATCH = (req: Request) => handle(req)
export const DELETE = (req: Request) => handle(req)
export const OPTIONS = (req: Request) => handle(req)
