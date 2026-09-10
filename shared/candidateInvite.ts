export function candidateJoinPath() {
  return '/register?role=candidate'
}

export function candidateInviteNote(origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const link = `${origin}${candidateJoinPath()}`
  return [
    `You're invited to join Atelier as a candidate.`,
    '',
    `Create a free account. We'll score roles against your profile. Packets leave only after you approve.`,
    '',
    link,
  ].join('\n')
}
