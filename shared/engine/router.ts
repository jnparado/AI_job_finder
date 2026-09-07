export type RouterLane = 'luna' | 'terra' | 'sol'

export type RouterTask =
  | 'job_parse'
  | 'resume_parse'
  | 'classify'
  | 'extract'
  | 'job_match'
  | 'cover_letter'
  | 'app_answers'
  | 'recommend'
  | 'career_strategy'
  | 'difficult_match'
  | 'interview_coach'
  | 'agent_decision'

export interface LaneSpec {
  id: RouterLane
  name: string
  model: string
  role: string
  tasks: string[]
}

export const LANE_SPECS: Record<RouterLane, LaneSpec> = {
  luna: {
    id: 'luna',
    name: 'GPT-5.6 Luna',
    model: 'gpt-5.6-luna',
    role: 'High volume',
    tasks: ['Job parsing', 'Resume parsing', 'Classification', 'Extraction'],
  },
  terra: {
    id: 'terra',
    name: 'GPT-5.6 Terra',
    model: 'gpt-5.6-terra',
    role: 'Main AI',
    tasks: ['Job matching', 'Cover letters', 'App answers', 'Recommendations'],
  },
  sol: {
    id: 'sol',
    name: 'GPT-5.6 Sol',
    model: 'gpt-5.6-sol',
    role: 'Complex AI',
    tasks: ['Career strategy', 'Difficult matching', 'Interview coaching', 'Agent decisions'],
  },
}

const TASK_LANE: Record<RouterTask, RouterLane> = {
  job_parse: 'luna',
  resume_parse: 'luna',
  classify: 'luna',
  extract: 'luna',
  job_match: 'terra',
  cover_letter: 'terra',
  app_answers: 'terra',
  recommend: 'terra',
  career_strategy: 'sol',
  difficult_match: 'sol',
  interview_coach: 'sol',
  agent_decision: 'sol',
}

export function laneFor(task: RouterTask): RouterLane {
  return TASK_LANE[task]
}

export function laneLabel(lane?: RouterLane | string): string {
  if (!lane) return ''
  return LANE_SPECS[lane as RouterLane]?.name ?? lane
}
