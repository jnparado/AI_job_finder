export const SKILL_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  node: 'Node.js',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  python: 'Python',
  sql: 'SQL',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  aws: 'AWS',
  'amazon web services': 'AWS',
  gcp: 'GCP',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  graphql: 'GraphQL',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  css: 'CSS',
  html: 'HTML',
  git: 'Git',
  vite: 'Vite',
  'ci/cd': 'CI/CD',
  testing: 'Testing',
  jest: 'Jest',
  playwright: 'Playwright',
  java: 'Java',
  go: 'Go',
  'system design': 'System Design',
  leadership: 'Leadership',
  mentoring: 'Mentoring',
  communication: 'Communication',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  redis: 'Redis',
  mongodb: 'MongoDB',
  terraform: 'Terraform',
  linux: 'Linux',
  openai: 'OpenAI',
  'ai agents': 'AI Agents',
  rag: 'RAG',
  n8n: 'n8n',
  langchain: 'LangChain',
  llm: 'LLMs',
  llms: 'LLMs',
  embeddings: 'Embeddings',
  supabase: 'Supabase',
}

export const AI_SKILLS = new Set([
  'OpenAI',
  'AI Agents',
  'RAG',
  'n8n',
  'LangChain',
  'LLMs',
  'Embeddings',
])

const MULTI_WORD = Object.keys(SKILL_ALIASES)
  .filter((k) => k.includes(' ') || k.includes('.') || k.includes('/'))
  .sort((a, b) => b.length - a.length)

export function canonicalizeSkill(raw: string): string | null {
  const key = raw.trim().toLowerCase()
  if (!key) return null
  return SKILL_ALIASES[key] ?? null
}

export function extractSkills(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `
  const found = new Set<string>()
  for (const phrase of MULTI_WORD) {
    if (lower.includes(phrase)) {
      const canon = SKILL_ALIASES[phrase]
      if (canon) found.add(canon)
    }
  }
  for (const token of text.split(/[^A-Za-z0-9.+#/]+/)) {
    const canon = canonicalizeSkill(token)
    if (canon) found.add(canon)
  }
  return [...found]
}

export function splitAiSkills(skills: string[]) {
  const core: string[] = []
  const ai: string[] = []
  for (const s of skills) {
    if (AI_SKILLS.has(s)) ai.push(s)
    else core.push(s)
  }
  return { core, ai }
}

export function skillOverlap(candidate: string[], required: string[]) {
  const cand = new Set(candidate.map((s) => s.toLowerCase()))
  const matched: string[] = []
  const missing: string[] = []
  for (const skill of required) {
    if (cand.has(skill.toLowerCase())) matched.push(skill)
    else missing.push(skill)
  }
  return { matched, missing }
}
