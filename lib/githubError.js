// Turns a failed GitHub response into a message that says what to fix,
// instead of a bare status code nobody can act on.
export async function describeGithubFailure(ghRes) {
  const detail = await ghRes.json().then((body) => body?.message).catch(() => null)

  if (ghRes.status === 401) {
    return 'GitHub rejected GITHUB_TOKEN (expired, revoked or mistyped). Create a new token and update it in Vercel and .env.'
  }

  if (ghRes.status === 403) {
    return `GitHub refused the request (rate limit or token permissions)${detail ? `: ${detail}` : ''}`
  }

  return `github error ${ghRes.status}${detail ? `: ${detail}` : ''}`
}