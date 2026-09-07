import { LANE_SPECS, laneFor, type RouterLane, type RouterTask } from '../shared/engine/router'

export interface RouterTrace {
  at: string
  task: RouterTask
  lane: RouterLane
  model: string
  ms: number
  ok: boolean
  error?: string
}

const traces: RouterTrace[] = []

export function openaiReady(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function modelFor(lane: RouterLane): string {
  if (lane === 'luna') return process.env.OPENAI_MODEL_LUNA || LANE_SPECS.luna.model
  if (lane === 'terra') return process.env.OPENAI_MODEL_TERRA || LANE_SPECS.terra.model
  return process.env.OPENAI_MODEL_SOL || LANE_SPECS.sol.model
}

export function routerStatus() {
  return {
    configured: openaiReady(),
    luna: modelFor('luna'),
    terra: modelFor('terra'),
    sol: modelFor('sol'),
    traces: traces.slice(0, 12),
  }
}

function record(trace: RouterTrace) {
  traces.unshift(trace)
  if (traces.length > 40) traces.length = 40
}

async function completeText(task: RouterTask, system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const lane = laneFor(task)
  const model = modelFor(lane)
  const started = Date.now()
  const systemPrompt = `${system}\n\nReturn a single JSON object. Do not invent employers, degrees, or skills that are not in the source text.`
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key, timeout: 28_000 })
    let text = ''
    try {
      const res = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: user,
      })
      text = res.output_text ?? ''
    } catch {
      const completion = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user },
        ],
      })
      text = completion.choices[0]?.message?.content ?? ''
    }
    if (!text) throw new Error('empty model response')
    record({ at: new Date().toISOString(), task, lane, model, ms: Date.now() - started, ok: true })
    return text
  } catch (err) {
    record({
      at: new Date().toISOString(),
      task,
      lane,
      model,
      ms: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : 'failed',
    })
    return null
  }
}

export async function completeJson<T>(task: RouterTask, system: string, user: string): Promise<T | null> {
  const raw = await completeText(task, system, user)
  if (!raw) return null
  try {
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
