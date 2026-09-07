import type {
  CandidateProfile,
  CareerInsights,
  FollowUpDraft,
  JobMatch,
  PreparedPacket,
} from '../types'
import { displayName } from '../types'

export function preparePacket(
  match: JobMatch,
  profile: CandidateProfile,
): PreparedPacket {
  const name = displayName(profile)
  const { job, matchedSkills, missingSkills, preferredMissing } = match
  const confirmed = matchedSkills
  const unconfirmed = [...new Set([...missingSkills, ...preferredMissing])]
  const location = [profile.city, profile.country].filter(Boolean).join(', ')

  const tailoredResume = `${name}
${profile.desiredTitle || profile.currentTitle || profile.headline}
${profile.email} · ${location}

TARGET ROLE
${job.title} — ${job.company}

SUMMARY
${profile.yearsExperience}-year ${profile.careerLevel} focused on ${[...profile.skills, ...profile.aiSkills].slice(0, 6).join(', ')}.

CONFIRMED SKILLS FOR THIS ROLE
${confirmed.join(' · ') || 'See profile'}

NOT CLAIMED (do not fabricate)
${unconfirmed.join(' · ') || 'None material'}

EXPERIENCE
${
  profile.experience.length
    ? profile.experience
        .map(
          (e) =>
            `${e.title}, ${e.company} (${e.start}–${e.end})\n${e.bullets.map((b) => `• ${b}`).join('\n')}`,
        )
        .join('\n\n')
    : profile.resumeText.slice(0, 1200)
}
`

  const coverLetter = `Dear ${job.company} hiring team,

I am applying for the ${job.title} role. I am a ${profile.yearsExperience}-year ${profile.careerLevel} ${profile.currentTitle || 'engineer'} and this listing matches the work I want to do next: ${profile.desiredTitle || profile.headline || 'product engineering'}.

My recent work covers ${confirmed.slice(0, 5).join(', ') || 'the core stack in the listing'}. ${
    unconfirmed.length
      ? `I have not listed ${unconfirmed.slice(0, 2).join(' or ')} as confirmed experience, and I will not claim it.`
      : 'Skill coverage against the required list is already high.'
  }

I am targeting ${profile.currency} ${profile.salaryMin.toLocaleString()}–${profile.salaryDesired.toLocaleString()} and prefer ${profile.workModes.join(' / ')}. I would welcome a conversation about the first 90 days on this team.

Thank you,
${name}
${profile.email}
`

  const answers = [
    {
      question: `Why do you want to work at ${job.company}?`,
      answer: `${job.company} is a deliberate target because the ${job.title} work sits on ${confirmed.slice(0, 3).join(', ') || 'a stack I already use'}. I am not spraying applications — this matches the seniority and arrangement I set in my profile.`,
    },
    {
      question: 'What is your salary expectation?',
      answer: `${profile.currency} ${profile.salaryMin.toLocaleString()}–${profile.salaryDesired.toLocaleString()} for this scope, calibrating for level and equity.`,
    },
    {
      question: `Describe your ${confirmed[0] ?? 'relevant'} experience.`,
      answer: confirmed[0]
        ? `I have used ${confirmed[0]} in production as a ${profile.careerLevel} ${profile.currentTitle || 'engineer'} over about ${profile.yearsExperience} years. Happy to walk through a specific system in interview.`
        : 'I would map adjacent experience honestly rather than stretching the title.',
    },
    {
      question: 'Are you authorized to work in the job location?',
      answer: `I am based in ${[profile.city, profile.country].filter(Boolean).join(', ') || 'my stated location'}${profile.remoteWorldwide ? ' and open to remote worldwide' : ''}.`,
    },
  ]

  const recruiterMessage = `Hi ${job.company} team,

I came across the ${job.title} position at ${job.company}.

My experience with ${confirmed.slice(0, 5).join(', ') || 'the posted stack'} closely aligns with the role. I'd be happy to discuss the opportunity.

Best,
${name}
`

  return {
    tailoredResume: tailoredResume.trim(),
    coverLetter: coverLetter.trim(),
    answers,
    recruiterMessage,
    resumeNotes: { confirmed, unconfirmed },
  }
}

export function followUps(match: JobMatch, profile: CandidateProfile): FollowUpDraft[] {
  const name = displayName(profile)
  return [
    {
      dayOffset: 5,
      title: 'Polite check-in',
      body: `Hi ${match.job.company} team,\n\nI wanted to follow up regarding my application for the ${match.job.title} position. I'm still very interested in the opportunity and would be happy to provide any additional information.\n\nBest,\n${name}`,
    },
    {
      dayOffset: 12,
      title: 'Second follow-up',
      body: `Hi — following up once more on my ${match.job.title} application at ${match.job.company}. Happy to share a short walkthrough of relevant work if useful. If the role has closed, I appreciate the signal either way.\n\n${name}`,
    },
  ]
}

export function interviewQuestions(match: JobMatch, profile: CandidateProfile): string[] {
  const skills = [...match.matchedSkills, ...match.missingSkills].slice(0, 6)
  return [
    `Explain your experience with ${skills[0] ?? profile.skills[0] ?? 'your core stack'}.`,
    `How would you design a scalable ${skills.includes('Node.js') ? 'Node.js API' : 'service'} for this product?`,
    skills.includes('PostgreSQL')
      ? 'How have you used PostgreSQL in production?'
      : `Walk through a production incident you owned related to ${profile.currentTitle || 'this work'}.`,
    profile.aiSkills.length
      ? `Tell us about an AI agent or RAG system you built.`
      : `How do you decide what belongs in a design system versus one-off UI?`,
    `Why ${match.job.company}, and why this level rather than a different scope?`,
  ]
}

export function careerInsights(
  applications: { status: string; title: string }[],
): CareerInsights {
  const buckets = [
    { label: 'Frontend roles', re: /frontend|react engineer|web engineer/i },
    { label: 'Full Stack roles', re: /full stack/i },
    { label: 'AI Engineer roles', re: /ai |automation|ml /i },
  ]
  const rates = buckets.map((b) => {
    const subset = applications.filter((a) => b.re.test(a.title))
    const responses = subset.filter((a) =>
      ['under_review', 'interview', 'technical_interview', 'hr_interview', 'final_interview', 'offer'].includes(
        a.status,
      ),
    )
    return {
      label: b.label,
      rate: subset.length ? Math.round((responses.length / subset.length) * 100) : 0,
    }
  })
  const best = [...rates].sort((a, b) => b.rate - a.rate)[0]
  return {
    headline: `You applied to ${applications.length} jobs. Strongest response so far: ${best?.label ?? 'n/a'}.`,
    rates,
    advice: [
      'Add 2 AI projects to your portfolio if you want AI Engineer response rates to rise.',
      'Keep Python and RAG work visible on the resume when targeting agent roles.',
      'Do not invent AWS/Docker experience — list it only after you have a real example.',
      `Lean into ${best?.label ?? 'your highest-response cluster'} while you close skill gaps.`,
    ],
  }
}
